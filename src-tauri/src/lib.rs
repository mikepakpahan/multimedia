use std::path::{Path, PathBuf};
use std::process::Command;
use serde::Serialize;

#[derive(Serialize)]
pub struct EngineStatus {
    pub ffmpeg_installed: bool,
    pub ffmpeg_path: Option<String>,
    pub ytdlp_installed: bool,
    pub ytdlp_path: Option<String>,
    pub default_output_dir: String,
}

fn find_executable(name: &str) -> Option<PathBuf> {
    // 1. Try standard command check via where.exe on Windows
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("where.exe").arg(name).output() {
            if output.status.success() {
                if let Ok(text) = String::from_utf8(output.stdout) {
                    if let Some(first_line) = text.lines().next() {
                        let path = PathBuf::from(first_line.trim());
                        if path.exists() {
                            return Some(path);
                        }
                    }
                }
            }
        }

        // 2. Fallback check common locations (e.g. Python Scripts for yt-dlp)
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            let possible_paths = [
                format!("{}\\AppData\\Local\\Programs\\Python\\Python310\\Scripts\\{}.exe", userprofile, name),
                format!("{}\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\{}.exe", userprofile, name),
                format!("{}\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\{}.exe", userprofile, name),
                format!("{}\\scoop\\shims\\{}.exe", userprofile, name),
                format!("C:\\ProgramData\\chocolatey\\bin\\{}.exe", name),
            ];

            for p in &possible_paths {
                let pb = PathBuf::from(p);
                if pb.exists() {
                    return Some(pb);
                }
            }
        }
    }

    None
}

#[tauri::command]
fn check_system_engines() -> EngineStatus {
    let ffmpeg_path = find_executable("ffmpeg");
    let ytdlp_path = find_executable("yt-dlp");

    let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string());
    let default_output = Path::new(&user_profile)
        .join("Downloads")
        .join("MultiMedia");

    // Ensure the output directory exists
    let _ = std::fs::create_dir_all(&default_output);

    EngineStatus {
        ffmpeg_installed: ffmpeg_path.is_some(),
        ffmpeg_path: ffmpeg_path.map(|p| p.to_string_lossy().to_string()),
        ytdlp_installed: ytdlp_path.is_some(),
        ytdlp_path: ytdlp_path.map(|p| p.to_string_lossy().to_string()),
        default_output_dir: default_output.to_string_lossy().to_string(),
    }
}

#[tauri::command]
fn open_output_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            check_system_engines,
            open_output_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
