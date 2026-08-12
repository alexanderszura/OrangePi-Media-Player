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
    // pub version: String,
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

fn settings_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;
    Ok(dir.join("settings.json"))
}

#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    let path = settings_path(&app)?;

    if !path.exists() {
        return Ok(Settings::default());
    }

    let data = fs::read_to_string(&path).map_err(|e| format!("Failed to read settings: {}", e))?;
    Ok(serde_json::from_str(&data).unwrap_or_default())
}

#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, settings: Settings) -> Result<(), String> {
    let path = settings_path(&app)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }

    let data = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&path, data).map_err(|e| format!("Failed to write settings: {}", e))
}

// #[tauri::command]
// pub fn update_version(app: tauri::AppHandle, version: String) {
//     let settings = get_settings(app);

//     settings.version = version;

//     save_settings(settings);
// }
