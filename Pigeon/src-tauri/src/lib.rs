mod download;
mod secrets;
mod settings;
mod romSearch;
mod consoles;
use tauri_plugin_updater::Builder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            download::download_file,
            download::load_stored_data,
            download::get_file_info,
            settings::get_settings,
            settings::save_settings,
            romSearch::search_roms,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
