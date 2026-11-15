pub mod utils;
pub mod youtube;
pub mod media_converter;
pub mod image_studio;
pub mod pdf_suite;
pub mod transcriber;

use std::path::Path;
use std::process::Command;
use serde::Serialize;
use utils::find_executable;

#[derive(Serialize)]
pub struct EngineStatus {
    pub ffmpeg_installed: bool,
    pub ffmpeg_path: Option<String>,
    pub ytdlp_installed: bool,
    pub ytdlp_path: Option<String>,
    pub default_output_dir: String,
}

#[tauri::command]
fn check_system_engines() -> EngineStatus {
    let ffmpeg_path = find_executable("ffmpeg");
    let ytdlp_path = find_executable("yt-dlp");

    let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string());
    let default_output = Path::new(&user_profile)
        .join("Downloads")
        .join("MultiMedia");

    // Ensure output directory exists
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

#[tauri::command]
fn window_close(window: tauri::Window) {
    let _ = window.close();
}

#[tauri::command]
fn window_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn window_toggle_maximize(window: tauri::Window) {
    if let Ok(is_maximized) = window.is_maximized() {
        if is_maximized {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    } else {
        let _ = window.maximize();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            window_close,
            window_minimize,
            window_toggle_maximize,
            check_system_engines,
            open_output_folder,
            youtube::fetch_youtube_metadata,
            youtube::start_youtube_download,
            media_converter::start_video_conversion,
            media_converter::start_audio_conversion,
            image_studio::process_image,
            image_studio::start_remove_background,
            image_studio::load_image_base64,
            image_studio::remove_background_preview,
            image_studio::save_image_from_base64,
            pdf_suite::start_pdf_to_docx,
            pdf_suite::start_pdf_compress,
            pdf_suite::start_pdf_merge,
            transcriber::start_transcription,
            transcriber::save_transcription_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
