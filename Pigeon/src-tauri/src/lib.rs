mod database;

use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_updater::Builder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data = app.path().app_data_dir()?;

            std::fs::create_dir_all(&app_data)?;

            let db_path = app_data.join("pigeon.db");

            let conn = database::init_db(&db_path).expect("Failed to initialize database");

            app.manage(database::Database(Mutex::new(conn)));

            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            database::set_watched_movie,
            database::set_watched_tv,
            database::get_multi_watch,
            database::get_latest_tv,
            database::get_watched_tv_season,
            database::get_latest_unfinished,
            database::get_latest_watched
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
