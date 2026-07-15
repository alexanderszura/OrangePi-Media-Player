use futures_util::StreamExt;
use reqwest::Client;
use tokio::{
    fs::File,
    io::AsyncWriteExt,
};
use tauri::{AppHandle, Emitter};


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
) -> Result<(), String> {

    let client = Client::new();

    let response = client
        .get(url)
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

    let mut file = File::create(&filename)
        .await
        .map_err(|e| e.to_string())?;


    let mut stream = response.bytes_stream();


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
    }


    Ok(())
}