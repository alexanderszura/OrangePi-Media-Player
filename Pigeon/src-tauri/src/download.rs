use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::{
    fs::{File, OpenOptions},
    io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt},
};
use std::io::SeekFrom;
use urlencoding::encode;

#[derive(Serialize, Clone)]
struct DownloadProgress {
    filename: String,
    downloaded: u64,
    total: u64,
}

#[derive(Serialize, Clone)]
struct DownloadComplete {
    filename: String,
    filepath: String,
}

#[derive(Serialize)]
pub struct LocalMediaCheck {
    filepath: String,
    filename: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Genre {
    id: u64,
    name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Season {
    id: u64,
    air_date: Option<String>,
    name: String,
    overview: String,
    episode_count: u64,
    poster_path: Option<String>,
    season_number: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeasonEpisode {
    episode_number: u64,
    episode_type: String,
    id: u64,
    name: String,
    overview: String,
    runtime: Option<u64>,
    season_number: u64,
    show_id: u64,
    still_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaDetails {
    id: u64,
    title: String,
    overview: String,
    poster_path: Option<String>,
    backdrop_path: Option<String>,
    release_date: Option<String>,
    vote_average: f64,
    genres: Vec<Genre>,
    runtime: Option<u64>,
    seasons: Option<Vec<Season>>,
    
    #[serde(default)]
    episode: Option<SeasonEpisode>,
}

#[tauri::command]
pub async fn download_file(
    app: AppHandle,
    url: String,
    filename: String,
    folder: String,
    info: MediaDetails
) -> Result<(), String> {
    download(app, url, filename, folder, info).await
}

pub async fn download(
    app: AppHandle,
    url: String,
    filename: String,
    folder: String,
    info: MediaDetails,
) -> Result<(), String> {
    let client = Client::new();
    let final_url = format!("https://dl.gemlelispe.workers.dev/{}", encode(&url));

    let response = client
        .get(final_url)
        .header("Referer", "https://vidvault.ru/")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded = 0u64;

    let save_dir = PathBuf::from(&folder);
    tokio::fs::create_dir_all(&save_dir)
        .await
        .map_err(|e| e.to_string())?;

    let final_filepath = save_dir.join(&filename);
    let part_filepath = save_dir.join(format!("{}.part", filename));

    let mut file = File::create(&part_filepath)
        .await
        .map_err(|e| e.to_string())?;

    let mut stream = response.bytes_stream();
    let mut last_emit = Instant::now();
    let emit_interval = Duration::from_millis(100);

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        if last_emit.elapsed() >= emit_interval || downloaded == total_size {
            let _ = app.emit(
                "download-progress",
                DownloadProgress {
                    filename: filename.clone(),
                    downloaded,
                    total: total_size,
                },
            );
            last_emit = Instant::now();
        }
    }

    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    tokio::fs::rename(&part_filepath, &final_filepath)
        .await
        .map_err(|e| format!("Failed to finalize file: {}", e))?;

    // 3. Attach Info to the MP4 file as a UUID box
    let json_data = serde_json::to_vec(&info).map_err(|e| e.to_string())?;
    
    // MP4 Box Size = 4 (size) + 4 (type) + 16 (uuid) + payload length
    let box_size = (24 + json_data.len()) as u32;

    let mut final_file = OpenOptions::new()
        .append(true)
        .open(&final_filepath)
        .await
        .map_err(|e| e.to_string())?;

    // Write standard box structure
    final_file.write_all(&box_size.to_be_bytes()).await.map_err(|e| e.to_string())?;
    final_file.write_all(b"uuid").await.map_err(|e| e.to_string())?;
    
    // Write our custom 16-byte UUID (must be exactly 16 bytes)
    let custom_uuid = b"VidVaultMedia123";
    final_file.write_all(custom_uuid).await.map_err(|e| e.to_string())?;
    
    // Write JSON payload
    final_file.write_all(&json_data).await.map_err(|e| e.to_string())?;
    final_file.flush().await.map_err(|e| e.to_string())?;

    // 4. Emit complete event to React
    let final_path_str = final_filepath.to_string_lossy().to_string();
    app.emit(
        "download-complete",
        DownloadComplete {
            filename: filename.clone(),
            filepath: final_path_str,
        },
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Helper to rapidly scan an MP4 file and extract the embedded MediaDetails
async fn extract_media_details(path: &Path) -> Result<MediaDetails, String> {
    let mut file = File::open(path).await.map_err(|e| e.to_string())?;
    let file_size = file.metadata().await.map_err(|e| e.to_string())?.len();
    let mut current_pos = 0u64;

    while current_pos < file_size {
        let mut size_buf = [0u8; 4];
        if file.read_exact(&mut size_buf).await.is_err() { break; }
        let mut box_size = u32::from_be_bytes(size_buf) as u64;

        let mut type_buf = [0u8; 4];
        if file.read_exact(&mut type_buf).await.is_err() { break; }

        let mut header_size = 8u64;

        // Handle large boxes (e.g., movie data often exceeds 4GB)
        if box_size == 1 {
            let mut ext_size_buf = [0u8; 8];
            file.read_exact(&mut ext_size_buf).await.map_err(|e| e.to_string())?;
            box_size = u64::from_be_bytes(ext_size_buf);
            header_size = 16;
        } else if box_size == 0 {
            box_size = file_size - current_pos;
        }

        // If it's a UUID box, check if it's ours
        if &type_buf == b"uuid" {
            let mut uuid_buf = [0u8; 16];
            file.read_exact(&mut uuid_buf).await.map_err(|e| e.to_string())?;
            header_size += 16;

            if &uuid_buf == b"VidVaultMedia123" {
                let payload_size = box_size - header_size;
                let mut payload = vec![0u8; payload_size as usize];
                file.read_exact(&mut payload).await.map_err(|e| e.to_string())?;
                
                let details: MediaDetails = serde_json::from_slice(&payload)
                    .map_err(|e| format!("Failed to parse JSON: {}", e))?;
                
                return Ok(details);
            }
        }

        // Jump to the next box
        current_pos += box_size;
        file.seek(SeekFrom::Start(current_pos)).await.map_err(|e| e.to_string())?;
    }
    
    Err("No matching uuid box found".into())
}

#[tauri::command]
pub async fn load_stored_data(folder: String) -> Vec<MediaDetails> {
    let mut results = Vec::new();
    
    let mut entries = match tokio::fs::read_dir(&folder).await {
        Ok(e) => e,
        Err(_) => return results, // Return empty if folder doesn't exist
    };

    while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();
        
        // Only process .mp4 files
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("mp4") {
            if let Ok(details) = extract_media_details(&path).await {
                results.push(details);
            }
        }
    }
    
    results
}

#[tauri::command]
pub async fn get_file_info(folder: String, filename: String) -> Option<MediaDetails> {
    let path: PathBuf = PathBuf::from(folder).join(filename);

    // Ensure the file exists and is an mp4
    if !path.is_file() || path.extension().and_then(|s| s.to_str()) != Some("mp4") {
        return None;
    }

    extract_media_details(&path).await.ok()
}