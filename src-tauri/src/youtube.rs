use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::utils::find_executable;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct YouTubeMetadata {
    pub title: String,
    pub thumbnail: Option<String>,
    pub duration: Option<f64>,
    pub duration_string: Option<String>,
    pub uploader: Option<String>,
    pub webpage_url: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct ProgressPayload {
    pub task_id: String,
    pub progress: f64,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub status: String, // "processing", "completed", "failed"
    pub message: Option<String>,
    pub output_path: Option<String>,
}

#[tauri::command]
pub fn fetch_youtube_metadata(url: String) -> Result<YouTubeMetadata, String> {
    let ytdlp_path = find_executable("yt-dlp")
        .ok_or_else(|| "Engine yt-dlp tidak ditemukan di sistem.".to_string())?;

    let output = Command::new(ytdlp_path)
        .arg("--dump-single-json")
        .arg("--no-warnings")
        .arg("--no-playlist")
        .arg(&url)
        .output()
        .map_err(|e| format!("Gagal menjalankan yt-dlp: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Gagal mengambil metadata: {}", err));
    }

    let json_val: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Gagal mem-parsing metadata JSON: {}", e))?;

    let title = json_val
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("Untitled Video")
        .to_string();

    let thumbnail = json_val
        .get("thumbnail")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let duration = json_val.get("duration").and_then(|v| v.as_f64());

    let duration_string = json_val
        .get("duration_string")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let uploader = json_val
        .get("uploader")
        .or_else(|| json_val.get("channel"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok(YouTubeMetadata {
        title,
        thumbnail,
        duration,
        duration_string,
        uploader,
        webpage_url: url,
    })
}

#[tauri::command]
pub fn start_youtube_download(
    app: AppHandle,
    task_id: String,
    url: String,
    format_preset: String,
    output_dir: String,
) -> Result<(), String> {
    let ytdlp_path = find_executable("yt-dlp")
        .ok_or_else(|| "Engine yt-dlp tidak ditemukan di sistem.".to_string())?;

    let ffmpeg_path = find_executable("ffmpeg");

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();

    // Spawn download worker on background thread
    std::thread::spawn(move || {
        let mut cmd = Command::new(ytdlp_path);
        cmd.arg("--newline")
            .arg("--no-playlist")
            .arg("-o")
            .arg(format!("{}/%(title)s.%(ext)s", output_dir));

        // If FFmpeg is found in custom directory, supply it
        if let Some(ref ff) = ffmpeg_path {
            if let Some(parent) = ff.parent() {
                cmd.arg("--ffmpeg-location").arg(parent.to_string_lossy().to_string());
            }
        }

        // Apply format presets
        match format_preset.as_str() {
            "wav" => {
                // Church Audio / MIDI Accompaniment (High quality uncompressed PCM WAV)
                cmd.arg("-x")
                    .arg("--audio-format")
                    .arg("wav")
                    .arg("--audio-quality")
                    .arg("0");
            }
            "mp3-320" => {
                // High Quality MP3 320 kbps CBR
                cmd.arg("-x")
                    .arg("--audio-format")
                    .arg("mp3")
                    .arg("--audio-quality")
                    .arg("0");
            }
            "mp4-1080" => {
                cmd.arg("-f")
                    .arg("bestvideo[height<=1080]+bestaudio/best[height<=1080]")
                    .arg("--merge-output-format")
                    .arg("mp4");
            }
            "mp4-720" => {
                cmd.arg("-f")
                    .arg("bestvideo[height<=720]+bestaudio/best[height<=720]")
                    .arg("--merge-output-format")
                    .arg("mp4");
            }
            _ => {
                // Default best audio
                cmd.arg("-x")
                    .arg("--audio-format")
                    .arg("mp3");
            }
        }

        cmd.arg(&url);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = app_handle.emit(
                    "task-progress",
                    ProgressPayload {
                        task_id: task_id_clone,
                        progress: 0.0,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(format!("Gagal memulai proses download: {}", e)),
                        output_path: None,
                    },
                );
                return;
            }
        };

        let progress_regex = Regex::new(r"\[download\]\s+(\d+(?:\.\d+)?)%").unwrap();
        let speed_regex = Regex::new(r"at\s+([^\s]+)").unwrap();
        let eta_regex = Regex::new(r"ETA\s+([^\s]+)").unwrap();
        let dest_regex = Regex::new(r"Destination:\s+(.+)").unwrap();
        let merge_regex = Regex::new(r"Merging formats into\s+[\x22'](.+)[\x22']").unwrap();

        let mut last_output_file: Option<String> = None;
        let mut last_progress = 0.0;

        if let Some(stdout) = child.stdout.take() {
            let reader = BufReader::new(stdout);
            for line_res in reader.lines() {
                if let Ok(line) = line_res {
                    // Check for output file path
                    if let Some(caps) = dest_regex.captures(&line) {
                        if let Some(dest) = caps.get(1) {
                            last_output_file = Some(dest.as_str().trim().to_string());
                        }
                    } else if let Some(caps) = merge_regex.captures(&line) {
                        if let Some(dest) = caps.get(1) {
                            last_output_file = Some(dest.as_str().trim().to_string());
                        }
                    }

                    // Check for download percentage
                    if let Some(caps) = progress_regex.captures(&line) {
                        if let Some(p_str) = caps.get(1) {
                            if let Ok(p) = p_str.as_str().parse::<f64>() {
                                last_progress = p;

                                let speed = speed_regex
                                    .captures(&line)
                                    .and_then(|c| c.get(1).map(|m| m.as_str().to_string()));

                                let eta = eta_regex
                                    .captures(&line)
                                    .and_then(|c| c.get(1).map(|m| m.as_str().to_string()));

                                let _ = app_handle.emit(
                                    "task-progress",
                                    ProgressPayload {
                                        task_id: task_id_clone.clone(),
                                        progress: last_progress,
                                        speed,
                                        eta,
                                        status: "processing".to_string(),
                                        message: Some(line.clone()),
                                        output_path: None,
                                    },
                                );
                            }
                        }
                    }
                }
            }
        }

        let status = child.wait();
        match status {
            Ok(exit_status) if exit_status.success() => {
                let final_path = last_output_file.unwrap_or(output_dir);
                let _ = app_handle.emit(
                    "task-progress",
                    ProgressPayload {
                        task_id: task_id_clone,
                        progress: 100.0,
                        speed: None,
                        eta: None,
                        status: "completed".to_string(),
                        message: Some("Download & konversi selesai.".to_string()),
                        output_path: Some(final_path),
                    },
                );
            }
            Ok(exit_status) => {
                let _ = app_handle.emit(
                    "task-progress",
                    ProgressPayload {
                        task_id: task_id_clone,
                        progress: last_progress,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(format!("Proses selesai dengan error (code: {:?})", exit_status.code())),
                        output_path: None,
                    },
                );
            }
            Err(e) => {
                let _ = app_handle.emit(
                    "task-progress",
                    ProgressPayload {
                        task_id: task_id_clone,
                        progress: last_progress,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(format!("Error: {}", e)),
                        output_path: None,
                    },
                );
            }
        }
    });

    Ok(())
}
