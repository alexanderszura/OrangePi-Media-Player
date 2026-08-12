mod command_runner;
mod consoles;
mod download;
mod emulator;
mod platform;
mod secrets;
mod settings;
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
            command_runner::run_system_command,
            settings::get_settings,
            settings::save_settings,
            platform::get_operating_system,
            emulator::cache_rom_metadata,
            emulator::quick_search_roms,
            emulator::search_roms,
            emulator::game_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
