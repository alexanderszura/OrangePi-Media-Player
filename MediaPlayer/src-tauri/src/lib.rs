mod api;
mod responses;

use api::fetch_searched_media;
use responses::MediaSearchResult;

#[tauri::command]
async fn search_media(query: String) -> Result<Vec<MediaSearchResult>, String> {    
    fetch_searched_media(&query)
        .await
        .map_err(|e| format!("Failed to fetch media: {}", e))
}

#[tauri::command]
async fn get_title_info(media_type: String, id: u32) -> Result<responses::MediaDetails, String> {
    api::fetch_title_info(&media_type, id)
        .await
        .map_err(|e| format!("Failed to fetch title info: {}", e))
}

#[tauri::command]
async fn get_season_info(tv_id: u32, season_number: u32) -> Result<responses::SeasonDetails, String> {
    api::fetch_season_info(tv_id, season_number)
        .await
        .map_err(|e| format!("Failed to fetch season info: {}", e))
}

#[tauri::command]
async fn get_available_downloads(
    id: u32,
    media_type: String,
    episode: Option<i32>,
    season: Option<i32>,
) -> Result<responses::AvailableDownloads, String> {
    api::fetch_available_downloads(id, &media_type, episode, season)
        .await
        .map_err(|e| format!("Failed to fetch available downloads: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![search_media, get_title_info, get_season_info, get_available_downloads])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}