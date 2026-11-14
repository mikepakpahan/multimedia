use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use regex::Regex;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::utils::find_executable;

#[derive(Serialize, Clone, Debug)]
pub struct ConversionProgressPayload {
    pub task_id: String,
    pub progress: f64,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub status: String,
    pub message: Option<String>,
    pub output_path: Option<String>,
}

fn time_to_seconds(h: &str, m: &str, s: &str) -> f64 {
    let hours: f64 = h.parse().unwrap_or(0.0);
    let minutes: f64 = m.parse().unwrap_or(0.0);
    let seconds: f64 = s.parse().unwrap_or(0.0);
    hours * 3600.0 + minutes * 60.0 + seconds
}

#[tauri::command]
pub fn start_video_conversion(
    app: AppHandle,
    task_id: String,
    input_path: String,
    target_format: String,
    preset: String,
    output_dir: String,
) -> Result<(), String> {
    let ffmpeg_path = find_executable("ffmpeg")
        .ok_or_else(|| "Engine FFmpeg tidak ditemukan di sistem.".to_string())?;

    let in_path = PathBuf::from(&input_path);
    if !in_path.exists() {
        return Err("File input tidak ditemukan.".to_string());
    }

    let file_stem = in_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("converted_video");

    let output_filename = format!("{}_{}.{}", file_stem, preset, target_format.to_lowercase());
    let output_file_path = Path::new(&output_dir).join(&output_filename);
    let out_str = output_file_path.to_string_lossy().to_string();

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    let out_str_clone = out_str.clone();

    std::thread::spawn(move || {
        let mut cmd = Command::new(ffmpeg_path);
        cmd.arg("-y") // Overwrite output files without asking
            .arg("-i")
            .arg(&input_path);

        // Configure codecs and parameters based on preset and format
        match target_format.to_lowercase().as_str() {
            "mp3" => {
                cmd.arg("-vn").arg("-c:a").arg("libmp3lame").arg("-q:a").arg("0");
            }
            "wav" => {
                cmd.arg("-vn").arg("-c:a").arg("pcm_s16le");
            }
            _ => {
                match preset.as_str() {
                    "whatsapp" => {
                        // Compress aggressively for WhatsApp (<64MB / mobile)
                        cmd.arg("-vf")
                            .arg("scale='min(1280,iw)':-2")
                            .arg("-c:v")
                            .arg("libx264")
                            .arg("-crf")
                            .arg("28")
                            .arg("-preset")
                            .arg("faster")
                            .arg("-c:a")
                            .arg("aac")
                            .arg("-b:a")
                            .arg("128k");
                    }
                    "medium" => {
                        // Balanced quality
                        cmd.arg("-c:v")
                            .arg("libx264")
                            .arg("-crf")
                            .arg("23")
                            .arg("-preset")
                            .arg("medium")
                            .arg("-c:a")
                            .arg("aac")
                            .arg("-b:a")
                            .arg("192k");
                    }
                    "high" => {
                        // High visual fidelity
                        cmd.arg("-c:v")
                            .arg("libx264")
                            .arg("-crf")
                            .arg("18")
                            .arg("-preset")
                            .arg("slow")
                            .arg("-c:a")
                            .arg("aac")
                            .arg("-b:a")
                            .arg("256k");
                    }
                    "passthrough" => {
                        // Fast remux without re-encoding
                        cmd.arg("-c").arg("copy");
                    }
                    _ => {
                        cmd.arg("-c:v").arg("libx264").arg("-c:a").arg("aac");
                    }
                }
            }
        }

        cmd.arg(&out_str_clone);
        cmd.stdout(Stdio::null());
        cmd.stderr(Stdio::piped());

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = app_handle.emit(
                    "task-progress",
                    ConversionProgressPayload {
                        task_id: task_id_clone,
                        progress: 0.0,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(format!("Gagal memulai FFmpeg: {}", e)),
                        output_path: None,
                    },
                );
                return;
            }
        };

        let duration_regex = Regex::new(r"Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)").unwrap();
        let time_regex = Regex::new(r"time=\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)").unwrap();
        let speed_regex = Regex::new(r"speed=\s*([0-9\.]+x)").unwrap();

        let mut total_duration_secs: Option<f64> = None;
        let mut last_progress = 0.0;

        if let Some(stderr) = child.stderr.take() {
            let reader = BufReader::new(stderr);
            for line_res in reader.lines() {
                if let Ok(line) = line_res {
                    // Extract total duration
                    if total_duration_secs.is_none() {
                        if let Some(caps) = duration_regex.captures(&line) {
                            if let (Some(h), Some(m), Some(s)) = (caps.get(1), caps.get(2), caps.get(3)) {
                                total_duration_secs = Some(time_to_seconds(h.as_str(), m.as_str(), s.as_str()));
                            }
                        }
                    }

                    // Extract current elapsed time
                    if let Some(caps) = time_regex.captures(&line) {
                        if let (Some(h), Some(m), Some(s)) = (caps.get(1), caps.get(2), caps.get(3)) {
                            let current_secs = time_to_seconds(h.as_str(), m.as_str(), s.as_str());
                            if let Some(total) = total_duration_secs {
                                if total > 0.0 {
                                    last_progress = ((current_secs / total) * 100.0).clamp(0.0, 99.0);
                                    let speed = speed_regex
                                        .captures(&line)
                                        .and_then(|c| c.get(1).map(|m| m.as_str().to_string()));

                                    let _ = app_handle.emit(
                                        "task-progress",
                                        ConversionProgressPayload {
                                            task_id: task_id_clone.clone(),
                                            progress: last_progress,
                                            speed,
                                            eta: None,
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
        }

        let status = child.wait();
        match status {
            Ok(exit_status) if exit_status.success() => {
                let _ = app_handle.emit(
                    "task-progress",
                    ConversionProgressPayload {
                        task_id: task_id_clone,
                        progress: 100.0,
                        speed: None,
                        eta: None,
                        status: "completed".to_string(),
                        message: Some("Konversi video selesai.".to_string()),
                        output_path: Some(out_str_clone),
                    },
                );
            }
            Ok(exit_status) => {
                let _ = app_handle.emit(
                    "task-progress",
                    ConversionProgressPayload {
                        task_id: task_id_clone,
                        progress: last_progress,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(format!("FFmpeg keluar dengan status error (code: {:?})", exit_status.code())),
                        output_path: None,
                    },
                );
            }
            Err(e) => {
                let _ = app_handle.emit(
                    "task-progress",
                    ConversionProgressPayload {
                        task_id: task_id_clone,
                        progress: last_progress,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(format!("Error FFmpeg: {}", e)),
                        output_path: None,
                    },
                );
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn start_audio_conversion(
    app: AppHandle,
    task_id: String,
    input_path: String,
    target_format: String,
    bitrate: String,
    output_dir: String,
) -> Result<(), String> {
    let ffmpeg_path = find_executable("ffmpeg")
        .ok_or_else(|| "Engine FFmpeg tidak ditemukan di sistem.".to_string())?;

    let in_path = PathBuf::from(&input_path);
    if !in_path.exists() {
        return Err("File audio input tidak ditemukan.".to_string());
    }

    let file_stem = in_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("converted_audio");

    let output_filename = format!("{}_{}k.{}", file_stem, bitrate, target_format.to_lowercase());
    let output_file_path = Path::new(&output_dir).join(&output_filename);
    let out_str = output_file_path.to_string_lossy().to_string();

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    let out_str_clone = out_str.clone();

    std::thread::spawn(move || {
        let mut cmd = Command::new(ffmpeg_path);
        cmd.arg("-y")
            .arg("-i")
            .arg(&input_path);

        match target_format.to_lowercase().as_str() {
            "wav" => {
                // High fidelity PCM WAV for church sound & keyboards
                cmd.arg("-c:a").arg("pcm_s16le");
            }
            "flac" => {
                cmd.arg("-c:a").arg("flac");
            }
            "m4a" => {
                cmd.arg("-c:a").arg("aac").arg("-b:a").arg(format!("{}k", bitrate));
            }
            "ogg" => {
                cmd.arg("-c:a").arg("libvorbis").arg("-b:a").arg(format!("{}k", bitrate));
            }
            _ => {
                // MP3 default
                cmd.arg("-c:a").arg("libmp3lame").arg("-b:a").arg(format!("{}k", bitrate));
            }
        }

        cmd.arg(&out_str_clone);
        cmd.stdout(Stdio::null());
        cmd.stderr(Stdio::piped());

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = app_handle.emit(
                    "task-progress",
                    ConversionProgressPayload {
                        task_id: task_id_clone,
                        progress: 0.0,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(format!("Gagal memulai konversi audio: {}", e)),
                        output_path: None,
                    },
                );
                return;
            }
        };

        let duration_regex = Regex::new(r"Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)").unwrap();
        let time_regex = Regex::new(r"time=\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)").unwrap();
        let speed_regex = Regex::new(r"speed=\s*([0-9\.]+x)").unwrap();

        let mut total_duration_secs: Option<f64> = None;
        let mut last_progress = 0.0;

        if let Some(stderr) = child.stderr.take() {
            let reader = BufReader::new(stderr);
            for line_res in reader.lines() {
                if let Ok(line) = line_res {
                    if total_duration_secs.is_none() {
                        if let Some(caps) = duration_regex.captures(&line) {
                            if let (Some(h), Some(m), Some(s)) = (caps.get(1), caps.get(2), caps.get(3)) {
                                total_duration_secs = Some(time_to_seconds(h.as_str(), m.as_str(), s.as_str()));
                            }
                        }
                    }

                    if let Some(caps) = time_regex.captures(&line) {
                        if let (Some(h), Some(m), Some(s)) = (caps.get(1), caps.get(2), caps.get(3)) {
                            let current_secs = time_to_seconds(h.as_str(), m.as_str(), s.as_str());
                            if let Some(total) = total_duration_secs {
                                if total > 0.0 {
                                    last_progress = ((current_secs / total) * 100.0).clamp(0.0, 99.0);
                                    let speed = speed_regex
                                        .captures(&line)
                                        .and_then(|c| c.get(1).map(|m| m.as_str().to_string()));

                                    let _ = app_handle.emit(
                                        "task-progress",
                                        ConversionProgressPayload {
                                            task_id: task_id_clone.clone(),
                                            progress: last_progress,
                                            speed,
                                            eta: None,
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
        }

        let status = child.wait();
        match status {
            Ok(exit_status) if exit_status.success() => {
                let _ = app_handle.emit(
                    "task-progress",
                    ConversionProgressPayload {
                        task_id: task_id_clone,
                        progress: 100.0,
                        speed: None,
                        eta: None,
                        status: "completed".to_string(),
                        message: Some("Konversi audio selesai.".to_string()),
                        output_path: Some(out_str_clone),
                    },
                );
            }
            Ok(exit_status) => {
                let _ = app_handle.emit(
                    "task-progress",
                    ConversionProgressPayload {
                        task_id: task_id_clone,
                        progress: last_progress,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(format!("Error konversi audio (code: {:?})", exit_status.code())),
                        output_path: None,
                    },
                );
            }
            Err(e) => {
                let _ = app_handle.emit(
                    "task-progress",
                    ConversionProgressPayload {
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
