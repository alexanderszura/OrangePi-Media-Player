use futures_util::StreamExt;
use reqwest::Client;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use tokio::{fs::File, io::AsyncWriteExt};
use urlencoding::encode;

#[derive(serde::Serialize, Clone)]
struct DownloadProgress {
    filename: String,
    downloaded: u64,
    total: u64,
}

#[derive(serde::Serialize, Clone)]
struct DownloadComplete {
    filename: String,
    filepath: String,
}

#[derive(serde::Serialize)]
pub struct LocalMediaCheck {
    filepath: String,
    filename: String,
}

fn get_registry_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let _ = std::fs::create_dir_all(&app_dir);
    Ok(app_dir.join("title_lookup.json"))
}

#[tauri::command]
pub async fn download_file(
    app: AppHandle,
    url: String,
    filename: String,
    folder: String,
    title_id: u32,
    base_title: String,
) -> Result<(), String> {
    download(app, url, filename, folder, title_id, base_title).await
}

pub async fn download(
    app: AppHandle,
    url: String,
    filename: String,
    folder: String,
    title_id: u32,
    base_title: String,
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

    // Ensure save directory exists
    let save_dir = PathBuf::from(&folder);
    tokio::fs::create_dir_all(&save_dir)
        .await
        .map_err(|e| e.to_string())?;

    // 1. Target files: download into .part file first to prevent premature detection
    let final_filepath = save_dir.join(&filename);
    let part_filepath = save_dir.join(format!("{}.part", filename));

    let mut file = File::create(&part_filepath)
        .await
        .map_err(|e| e.to_string())?;

    let mut stream = response.bytes_stream();

    // Throttle IPC emissions to avoid UI lockup
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

    // Flush disk buffer and drop handle before renaming
    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    // 2. Download is 100% complete! Rename .part -> .mp4
    tokio::fs::rename(&part_filepath, &final_filepath)
        .await
        .map_err(|e| format!("Failed to finalize file: {}", e))?;

    // 3. Save "TITLE_ID: Base Title" into the lookup table
    if let Ok(registry_path) = get_registry_path(&app) {
        let mut lookup_table: HashMap<String, String> = HashMap::new();

        if let Ok(data) = std::fs::read_to_string(&registry_path) {
            if let Ok(existing) = serde_json::from_str(&data) {
                lookup_table = existing;
            }
        }

        lookup_table.insert(title_id.to_string(), base_title);

        if let Ok(json) = serde_json::to_string(&lookup_table) {
            let _ = std::fs::write(registry_path, json);
        }
    }

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

#[tauri::command]
pub fn check_download(
    app: AppHandle,
    id: u32,
    season: Option<u32>,
    episode: Option<u32>,
    save_path: String,
) -> Option<LocalMediaCheck> {
    let registry_path = get_registry_path(&app).ok()?;

    let data = std::fs::read_to_string(registry_path).ok()?;
    let lookup_table: HashMap<String, String> = serde_json::from_str(&data).ok()?;

    // 1. Find the base title
    let base_title = lookup_table.get(&id.to_string())?;

    // 2. Build target filename
    let mut filename = base_title.clone();
    if let (Some(s), Some(e)) = (season, episode) {
        filename.push_str(&format!(" S{}E{}", s, e));
    }
    filename.push_str(".mp4");

    // 3. Check if the completed .mp4 file exists in save_path
    let filepath = Path::new(&save_path).join(&filename);
    if filepath.exists() {
        return Some(LocalMediaCheck {
            filepath: filepath.to_string_lossy().to_string(),
            filename,
        });
    }

    None
}
