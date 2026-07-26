use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;

#[derive(Serialize, Deserialize)]
pub enum MediaResolution {
    K360,
    K480,
    K720,
    K1080,
}

#[derive(Serialize, Deserialize)]
pub enum MediaFallbackStrategy {
    Lowest,
    Highest,
}

#[derive(Serialize, Deserialize)]
pub struct Settings {
    pub savePath: Option<String>,
    pub preferredQuality: MediaResolution,
    pub fallbackStrategy: MediaFallbackStrategy,
    pub maxTitlesPerPage: u8,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            savePath: None,
            preferredQuality: MediaResolution::K1080,
            fallbackStrategy: MediaFallbackStrategy::Highest,
            maxTitlesPerPage: 10,
        }
    }
}

fn settings_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("settings.json")
}

#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> Settings {
    let path = settings_path(&app);

    if !path.exists() {
        return Settings::default();
    }

    let data = fs::read_to_string(path).unwrap();
    serde_json::from_str(&data).unwrap_or_default()
}

#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, settings: Settings) {
    let path = settings_path(&app);

    fs::create_dir_all(path.parent().unwrap()).unwrap();

    let data = serde_json::to_string_pretty(&settings).unwrap();

    fs::write(path, data).unwrap();
}
