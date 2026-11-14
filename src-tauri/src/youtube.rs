use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::utils::{find_executable, TaskProgressPayload};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct YouTubeMetadata {
    pub title: String,
    pub thumbnail: Option<String>,
    pub duration: Option<f64>,
    pub duration_string: Option<String>,
    pub uploader: Option<String>,
    pub webpage_url: String,
}

fn format_duration(seconds: f64) -> String {
    let total_secs = seconds.round() as u64;
    let mins = total_secs / 60;
    let secs = total_secs % 60;
    let hours = mins / 60;
    let mins_rem = mins % 60;

    if hours > 0 {
        format!("{:02}:{:02}:{:02}", hours, mins_rem, secs)
    } else {
        format!("{:02}:{:02}", mins_rem, secs)
    }
}

#[tauri::command]
pub fn fetch_youtube_metadata(url: String) -> Result<YouTubeMetadata, String> {
    let ytdlp_path = find_executable("yt-dlp")
        .ok_or_else(|| "Engine yt-dlp tidak ditemukan di sistem. Harap periksa instalasi.".to_string())?;

    let trimmed_url = url.trim();
    if trimmed_url.is_empty() {
        return Err("URL YouTube tidak boleh kosong.".to_string());
    }

    let mut cmd = Command::new(&ytdlp_path);
    cmd.arg("--dump-single-json")
        .arg("--no-warnings")
        .arg("--no-playlist")
        .arg("--skip-download")
        .arg(trimmed_url);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Gagal menjalankan yt-dlp: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let clean_err = err.lines().filter(|l| l.contains("ERROR:")).collect::<Vec<&str>>().join(" ");
        let error_msg = if clean_err.is_empty() {
            "Gagal mengambil metadata video. Pastikan link YouTube valid dan dapat diakses publik.".to_string()
        } else {
            clean_err
        };
        return Err(error_msg);
    }

    let json_val: serde_json::Value = match serde_json::from_slice(&output.stdout) {
        Ok(v) => v,
        Err(_) => {
            let s = String::from_utf8_lossy(&output.stdout);
            if let (Some(start), Some(end)) = (s.find('{'), s.rfind('}')) {
                serde_json::from_str(&s[start..=end])
                    .map_err(|e| format!("Gagal mem-parsing metadata JSON dari YouTube: {}", e))?
            } else {
                return Err("Output YouTube tidak valid atau video tidak dapat diakses.".to_string());
            }
        }
    };

    // In case yt-dlp returned a search/playlist result, extract first entry
    let target_obj = if let Some(entries) = json_val.get("entries").and_then(|e| e.as_array()) {
        entries.first().unwrap_or(&json_val)
    } else {
        &json_val
    };

    let title = target_obj
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("Untitled Video")
        .to_string();

    let thumbnail = target_obj
        .get("thumbnail")
        .or_else(|| {
            target_obj
                .get("thumbnails")
                .and_then(|t| t.as_array())
                .and_then(|arr| arr.last())
                .and_then(|thumb| thumb.get("url"))
        })
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let duration = target_obj.get("duration").and_then(|v| v.as_f64());

    let duration_string = target_obj
        .get("duration_string")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| duration.map(format_duration));

    let uploader = target_obj
        .get("uploader")
        .or_else(|| target_obj.get("channel"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let webpage_url = target_obj
        .get("webpage_url")
        .and_then(|v| v.as_str())
        .unwrap_or(trimmed_url)
        .to_string();

    Ok(YouTubeMetadata {
        title,
        thumbnail,
        duration,
        duration_string,
        uploader,
        webpage_url,
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

    let trimmed_url = url.trim().to_string();
    if trimmed_url.is_empty() {
        return Err("URL YouTube tidak boleh kosong.".to_string());
    }

    // Ensure target output directory exists and is valid
    let safe_output_dir = if output_dir.trim().is_empty() {
        let userprofile = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string());
        PathBuf::from(userprofile).join("Downloads").join("MultiMedia")
    } else {
        PathBuf::from(output_dir)
    };
    let _ = std::fs::create_dir_all(&safe_output_dir);
    let out_dir_str = safe_output_dir.to_string_lossy().to_string();

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();

    // Spawn download worker on background thread
    std::thread::spawn(move || {
        let mut cmd = Command::new(&ytdlp_path);
        cmd.arg("-P")
            .arg(&out_dir_str)
            .arg("--windows-filenames")
            .arg("-o")
            .arg("%(title)s.%(ext)s")
            .arg("--newline")
            .arg("--no-playlist")
            .arg("--no-warnings");

        // Supply ffmpeg location if available
        if let Some(ref ff) = ffmpeg_path {
            cmd.arg("--ffmpeg-location").arg(ff.to_string_lossy().to_string());
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

        cmd.arg(&trimmed_url);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
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

        // Drain stderr concurrently to prevent OS pipe buffer deadlock
        let err_buffer = Arc::new(Mutex::new(Vec::new()));
        let err_buffer_clone = Arc::clone(&err_buffer);
        if let Some(stderr) = child.stderr.take() {
            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line_res in reader.lines() {
                    if let Ok(line) = line_res {
                        let mut buf = err_buffer_clone.lock().unwrap();
                        if buf.len() > 20 {
                            buf.remove(0);
                        }
                        buf.push(line);
                    }
                }
            });
        }

        let progress_regex = Regex::new(r"\[download\]\s+(\d+(?:\.\d+)?)%").unwrap();
        let speed_regex = Regex::new(r"at\s+([^\s]+)").unwrap();
        let eta_regex = Regex::new(r"ETA\s+([^\s]+)").unwrap();
        let dest_regex = Regex::new(r"(?:Destination:|Merging formats into)\s+[\x22']?([^\x22'\r\n]+)[\x22']?").unwrap();

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
                                    TaskProgressPayload {
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
                let final_path = last_output_file.unwrap_or(out_dir_str);
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
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
                let recent_err = {
                    let buf = err_buffer.lock().unwrap();
                    buf.join("\n")
                };
                let err_msg = if recent_err.is_empty() {
                    format!("Proses selesai dengan status error (code: {:?})", exit_status.code())
                } else {
                    recent_err
                };

                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
                        task_id: task_id_clone,
                        progress: last_progress,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(err_msg),
                        output_path: None,
                    },
                );
            }
            Err(e) => {
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
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
