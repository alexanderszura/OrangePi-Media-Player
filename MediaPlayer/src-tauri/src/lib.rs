mod api;
mod responses;

use api::fetch_searched_media;
use responses::MediaSearchResult;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn search_media(query: String) -> Result<Vec<MediaSearchResult>, String> {    
    fetch_searched_media(&query)
        .await
        .map_err(|e| format!("Failed to fetch media: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, search_media])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
