mod download;
mod settings;
mod emulator;
mod secrets;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(
            tauri::generate_handler![
                download::download_file,
                settings::get_settings,
                settings::save_settings,
                emulator::get_games,
                emulator::launch_game,
                emulator::stop_emulator,
                emulator::search_games,
                emulator::game_info
            ]
        )
        .run(
            tauri::generate_context!()
        )
        .expect("error while running tauri application");
}