use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum OperatingSystem {
    Linux,
    Windows,
    Other,
}

#[tauri::command]
pub fn get_operating_system() -> OperatingSystem {
    if cfg!(target_os = "linux") {
        OperatingSystem::Linux
    } else if cfg!(target_os = "windows") {
        OperatingSystem::Windows
    } else {
        OperatingSystem::Other
    }
}
