mod download;
mod settings;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(
            tauri::generate_handler![
                download::download_file,
                settings::get_settings,
                settings::save_settings
            ]
        )
        .run(
            tauri::generate_context!()
        )
        .expect("error while running tauri application");
}