use futures_util::StreamExt;
use reqwest::Client;
use tokio::{
    fs::File,
    io::AsyncWriteExt,
};
use tauri::{AppHandle, Emitter, Manager};
use urlencoding::encode;


#[derive(serde::Serialize, Clone)]
struct DownloadProgress {
    downloaded: u64,
    total: u64,
}


#[tauri::command]
pub async fn download_file(
    app: AppHandle,
    url: String,
    filename: String,
    folder: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn(async move {
        if let Err(e) = download(app, url, filename, folder).await {
            eprintln!("Download failed: {}", e);
        }
    });

    Ok(())
}

pub async fn download(
    app: AppHandle,
    url: String,
    filename: String,
    folder: String,
) -> Result<(), String> {
    let client = Client::new();

    let final_url = format!(
        "https://dl.gemlelispe.workers.dev/{}",
        encode(&url)
    );

    let response = client
        .get(final_url)
        .header("Referer", "https://vidvault.ru/")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;


    let total_size = response
        .content_length()
        .unwrap_or(0);


    let mut downloaded = 0u64;

    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    tokio::fs::create_dir_all(&app_dir)
        .await
        .map_err(|e| e.to_string())?;

    let filepath = std::path::PathBuf::from(folder).join(filename);

    let mut file = File::create(&filepath)
        .await
        .map_err(|e| e.to_string())?;


    let mut stream = response.bytes_stream();

    let mut started = false;
    

    while let Some(chunk) = stream.next().await {

        let chunk = chunk
            .map_err(|e| e.to_string())?;


        file.write_all(&chunk)
            .await
            .map_err(|e| e.to_string())?;


        downloaded += chunk.len() as u64;

        // Send download progress back to the frontend
        app.emit(
            "download-progress",
            DownloadProgress {
                downloaded,
                total: total_size,
            },
        )
        .map_err(|e| e.to_string())?;

        // Wait for mp4 header to fully download
        if (downloaded > 5_000_000 && !started) {
            started = true;
            app.emit(
                "download-started",
                filepath.to_string_lossy().to_string()
            )
            .map_err(|e| e.to_string())?;
        }
    }

    let filepath = filepath
        .canonicalize()
        .map_err(|e| e.to_string())?;

    app.emit(
        "download-complete",
        filepath.to_string_lossy().to_string()
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}