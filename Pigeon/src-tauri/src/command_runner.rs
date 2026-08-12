use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandRequest {
    pub command: String,
    pub as_admin: Option<bool>,
    pub working_directory: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub status: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

#[tauri::command]
pub fn run_system_command(request: CommandRequest) -> Result<CommandResult, String> {
    let command = request.command.trim();

    if command.is_empty() {
        return Err("Command cannot be empty".to_string());
    }

    if request.as_admin.unwrap_or(false) {
        return run_admin_command(command, request.working_directory.as_deref());
    }

    run_user_command(command, request.working_directory.as_deref())
}

fn run_user_command(command: &str, working_directory: Option<&str>) -> Result<CommandResult, String> {
    let mut process = shell_command(command);

    if let Some(directory) = working_directory {
        process.current_dir(directory);
    }

    let output = process
        .output()
        .map_err(|e| format!("Failed to run command: {}", e))?;

    Ok(CommandResult {
        status: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

fn shell_command(command: &str) -> Command {
    #[cfg(target_os = "windows")]
    {
        let mut process = Command::new("cmd");
        process.args(["/C", command]);
        process
    }

    #[cfg(target_os = "linux")]
    {
        let mut process = Command::new("sh");
        process.args(["-c", command]);
        process
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        let mut process = Command::new("sh");
        process.args(["-c", command]);
        process
    }
}

fn run_admin_command(command: &str, working_directory: Option<&str>) -> Result<CommandResult, String> {
    #[cfg(target_os = "windows")]
    {
        run_windows_admin_command(command, working_directory)
    }

    #[cfg(target_os = "linux")]
    {
        run_linux_admin_command(command, working_directory)
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        let _ = working_directory;
        Err("Administrative command execution is only supported on Windows and Linux".to_string())
    }
}

#[cfg(target_os = "windows")]
fn run_windows_admin_command(command: &str, working_directory: Option<&str>) -> Result<CommandResult, String> {
    let escaped_command = powershell_quote(command);
    let working_directory_arg = working_directory
        .map(|directory| format!(" -WorkingDirectory {}", powershell_quote(directory)))
        .unwrap_or_default();
    let script = format!(
        "$process = Start-Process -FilePath 'cmd.exe' -ArgumentList '/C', {}{} -Verb RunAs -Wait -PassThru; exit $process.ExitCode",
        escaped_command, working_directory_arg
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script])
        .output()
        .map_err(|e| format!("Failed to request administrator permissions: {}", e))?;

    Ok(CommandResult {
        status: output.status.code(),
        stdout: String::new(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[cfg(target_os = "windows")]
fn powershell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

#[cfg(target_os = "linux")]
fn run_linux_admin_command(command: &str, working_directory: Option<&str>) -> Result<CommandResult, String> {
    if is_linux_root()? {
        return run_user_command(command, working_directory);
    }

    let mut process = Command::new("sudo");
    process.args(["-n", "sh", "-c", command]);

    if let Some(directory) = working_directory {
        process.current_dir(directory);
    }

    let output = process
        .output()
        .map_err(|e| format!("Failed to request administrator permissions with sudo: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if stderr.contains("a password is required") || stderr.contains("a terminal is required") {
            return Err(
                "Administrator permissions require passwordless sudo, or Pigeon must be launched as root."
                    .to_string(),
            );
        }

        return Ok(CommandResult {
            status: output.status.code(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr,
        });
    }

    Ok(CommandResult {
        status: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[cfg(target_os = "linux")]
fn is_linux_root() -> Result<bool, String> {
    let output = Command::new("id")
        .arg("-u")
        .output()
        .map_err(|e| format!("Failed to check current user permissions: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout).trim() == "0")
}
