#[tauri::command]
pub async fn update() -> Result<DeviceUpdateResult, String> {
    update_device().await
}

#[tauri::command]
pub async fn check_device_update() -> Result<Option<DeviceUpdateCheck>, String> {
    check_device_update_impl().await
}

#[derive(Debug, serde::Serialize)]
pub struct DeviceUpdateCheck {
    pub current_version: String,
    pub version: String,
}

#[derive(Debug, serde::Serialize)]
pub struct DeviceUpdateResult {
    pub version: String,
    pub updated: bool,
    pub message: String,
}

#[cfg(not(target_os = "linux"))]
async fn update_device() -> Result<DeviceUpdateResult, String> {
    Ok(DeviceUpdateResult {
        version: env!("CARGO_PKG_VERSION").to_string(),
        updated: false,
        message: "Device web and launcher updates are only needed on Linux.".to_string(),
    })
}

#[cfg(not(target_os = "linux"))]
async fn check_device_update_impl() -> Result<Option<DeviceUpdateCheck>, String> {
    Ok(None)
}

#[cfg(target_os = "linux")]
async fn update_device() -> Result<DeviceUpdateResult, String> {
    linux::update_device().await
}

#[cfg(target_os = "linux")]
async fn check_device_update_impl() -> Result<Option<DeviceUpdateCheck>, String> {
    linux::check_device_update().await
}

#[cfg(target_os = "linux")]
mod linux {
    use super::{DeviceUpdateCheck, DeviceUpdateResult};
    use flate2::read::GzDecoder;
    use serde::Deserialize;
    use sha2::{Digest, Sha256};
    use std::env;
    use std::fs::{self, File, OpenOptions};
    use std::io::{self, Write};
    use std::os::unix::fs::PermissionsExt;
    use std::path::{Path, PathBuf};
    use tar::Archive;

    const DEVICE_MANIFEST_URL: &str =
        "https://github.com/alexanderszura/OrangePi-Media-Player/releases/latest/download/device.json";
    const DEVICE_MANIFEST_URL_ENV: &str = "PIGEON_DEVICE_MANIFEST_URL";
    const DEFAULT_PIGEON_HOME: &str = "/opt/pigeon";

    #[derive(Debug, Deserialize)]
    struct DeviceManifest {
        version: String,
        web: DeviceAsset,
        launcher: DeviceAsset,
    }

    #[derive(Debug, Deserialize)]
    struct DeviceAsset {
        url: String,
        sha256: String,
    }

    pub async fn check_device_update() -> Result<Option<DeviceUpdateCheck>, String> {
        let home = pigeon_home();
        let manifest = fetch_manifest().await?;
        validate_version(&manifest.version)?;

        let installed_version = current_version(&home);
        let current_version = installed_version
            .clone()
            .unwrap_or_else(|| "not installed".to_string());

        if installed_version.as_deref() == Some(manifest.version.as_str()) {
            Ok(None)
        } else {
            Ok(Some(DeviceUpdateCheck {
                current_version,
                version: manifest.version,
            }))
        }
    }

    pub async fn update_device() -> Result<DeviceUpdateResult, String> {
        let home = pigeon_home();
        fs::create_dir_all(home.join("releases")).map_err(|e| describe_path("create", &home, e))?;

        log(&home, "Checking device manifest")?;
        let manifest = fetch_manifest().await?;
        validate_version(&manifest.version)?;

        if current_version(&home).as_deref() == Some(manifest.version.as_str()) {
            log(&home, &format!("Already on {}", manifest.version))?;

            return Ok(DeviceUpdateResult {
                version: manifest.version,
                updated: false,
                message: "Device release is already current.".to_string(),
            });
        }

        log(
            &home,
            &format!("Installing device release {}", manifest.version),
        )?;

        let downloads = home.join("downloads");
        fs::create_dir_all(&downloads).map_err(|e| describe_path("create", &downloads, e))?;

        let web_archive = downloads.join(format!("Pigeon-web-{}.tar.gz", manifest.version));
        download_verified(&manifest.web, &web_archive).await?;

        let launcher_new = home.join("launcher.new");
        download_verified(&manifest.launcher, &launcher_new).await?;
        fs::set_permissions(&launcher_new, fs::Permissions::from_mode(0o755))
            .map_err(|e| describe_path("chmod", &launcher_new, e))?;

        let releases = home.join("releases");
        let release_dir = releases.join(&manifest.version);
        let staging_dir = releases.join(format!(".staging-{}", manifest.version));

        reset_dir(&staging_dir)?;
        fs::create_dir_all(&staging_dir).map_err(|e| describe_path("create", &staging_dir, e))?;
        extract_web_archive(&web_archive, &staging_dir)?;
        verify_web_release(&staging_dir)?;

        if release_dir.exists() {
            fs::remove_dir_all(&release_dir)
                .map_err(|e| describe_path("remove", &release_dir, e))?;
        }

        fs::rename(&staging_dir, &release_dir)
            .map_err(|e| describe_path("promote", &release_dir, e))?;
        switch_current_symlink(&home, &release_dir)?;

        log(
            &home,
            &format!(
                "Installed {}; launcher staged at {}",
                manifest.version,
                launcher_new.display()
            ),
        )?;

        Ok(DeviceUpdateResult {
            version: manifest.version,
            updated: true,
            message: "Device web release installed and launcher update staged.".to_string(),
        })
    }

    fn pigeon_home() -> PathBuf {
        env::var_os("PIGEON_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(DEFAULT_PIGEON_HOME))
    }

    async fn fetch_manifest() -> Result<DeviceManifest, String> {
        let url =
            env::var(DEVICE_MANIFEST_URL_ENV).unwrap_or_else(|_| DEVICE_MANIFEST_URL.to_string());

        reqwest::get(&url)
            .await
            .map_err(|e| format!("Failed to fetch device manifest: {e}"))?
            .error_for_status()
            .map_err(|e| format!("Device manifest request failed: {e}"))?
            .json::<DeviceManifest>()
            .await
            .map_err(|e| format!("Device manifest is invalid: {e}"))
    }

    async fn download_verified(asset: &DeviceAsset, destination: &Path) -> Result<(), String> {
        let bytes = reqwest::get(&asset.url)
            .await
            .map_err(|e| format!("Failed to download {}: {e}", asset.url))?
            .error_for_status()
            .map_err(|e| format!("Download failed for {}: {e}", asset.url))?
            .bytes()
            .await
            .map_err(|e| format!("Failed to read {}: {e}", asset.url))?;

        let actual = format!("{:x}", Sha256::digest(&bytes));
        if !actual.eq_ignore_ascii_case(asset.sha256.trim()) {
            return Err(format!(
                "SHA-256 mismatch for {}: expected {}, got {}",
                asset.url, asset.sha256, actual
            ));
        }

        fs::write(destination, bytes).map_err(|e| describe_path("write", destination, e))
    }

    fn extract_web_archive(archive_path: &Path, destination: &Path) -> Result<(), String> {
        let archive_file =
            File::open(archive_path).map_err(|e| describe_path("open", archive_path, e))?;
        let decoder = GzDecoder::new(archive_file);
        let mut archive = Archive::new(decoder);

        archive
            .unpack(destination)
            .map_err(|e| describe_path("extract", destination, e))
    }

    fn verify_web_release(release_dir: &Path) -> Result<(), String> {
        let index = release_dir.join("index.html");

        if index.is_file() {
            Ok(())
        } else {
            Err(format!(
                "Extracted web release is missing {}",
                index.display()
            ))
        }
    }

    fn current_version(home: &Path) -> Option<String> {
        let current = home.join("current");
        let target = fs::read_link(current).ok()?;

        target
            .file_name()
            .and_then(|name| name.to_str())
            .map(ToOwned::to_owned)
    }

    fn switch_current_symlink(home: &Path, release_dir: &Path) -> Result<(), String> {
        let current = home.join("current");
        let next = home.join("current.next");

        if fs::symlink_metadata(&next).is_ok() {
            fs::remove_file(&next).map_err(|e| describe_path("remove", &next, e))?;
        }

        std::os::unix::fs::symlink(release_dir, &next)
            .map_err(|e| describe_path("symlink", &next, e))?;
        fs::rename(&next, &current).map_err(|e| describe_path("switch", &current, e))
    }

    fn reset_dir(path: &Path) -> Result<(), String> {
        if path.exists() {
            fs::remove_dir_all(path).map_err(|e| describe_path("remove", path, e))?;
        }

        Ok(())
    }

    fn validate_version(version: &str) -> Result<(), String> {
        let valid = !version.is_empty()
            && version
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'));

        if valid {
            Ok(())
        } else {
            Err(format!(
                "Device manifest contains an invalid version: {version}"
            ))
        }
    }

    fn log(home: &Path, message: &str) -> Result<(), String> {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(home.join("update.log"))
            .map_err(|e| format!("Failed to write update log: {e}"))?;

        writeln!(file, "{message}").map_err(|e| format!("Failed to write update log: {e}"))
    }

    fn describe_path(action: &str, path: &Path, error: io::Error) -> String {
        format!("Failed to {action} {}: {error}", path.display())
    }
}
