use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use crate::utils::{find_executable, TaskProgressPayload};

const TRANSCRIBE_SCRIPT_CONTENT: &str = include_str!("../scripts/transcribe.py");

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TranscriptSegment {
    pub start: f64,
    pub end: f64,
    pub text: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ExportedFiles {
    pub txt: Option<String>,
    pub srt: Option<String>,
    pub vtt: Option<String>,
    pub json: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TranscriptionResultPayload {
    #[serde(default)]
    pub task_id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub duration: f64,
    #[serde(default)]
    pub full_text: String,
    #[serde(default)]
    pub segments: Vec<TranscriptSegment>,
    pub exported_files: Option<ExportedFiles>,
}

fn get_or_create_transcribe_script() -> Result<PathBuf, String> {
    let local_script = PathBuf::from("src-tauri/scripts/transcribe.py");
    if local_script.exists() {
        return Ok(local_script);
    }
    let local_script2 = PathBuf::from("scripts/transcribe.py");
    if local_script2.exists() {
        return Ok(local_script2);
    }

    let temp_dir = std::env::temp_dir().join("multimedia_studio");
    let _ = std::fs::create_dir_all(&temp_dir);
    let script_path = temp_dir.join("transcribe.py");
    std::fs::write(&script_path, TRANSCRIBE_SCRIPT_CONTENT)
        .map_err(|e| format!("Gagal menulis script Transcriber: {}", e))?;

    Ok(script_path)
}

#[tauri::command]
pub fn start_transcription(
    app: AppHandle,
    task_id: String,
    input: String, // file path or YouTube URL
    model: String, // "tiny", "base", "small"
    language: String, // "auto", "id", "en"
    _output_dir: String,
) -> Result<(), String> {
    let python_exec = find_executable("python")
        .ok_or_else(|| "Python 3 tidak ditemukan. Pastikan Python terinstall untuk menjalankan AI Speech-to-Text.".to_string())?;

    let script_path = get_or_create_transcribe_script()?;

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();

    std::thread::spawn(move || {
        let _ = app_handle.emit(
            "task-progress",
            TaskProgressPayload {
                task_id: task_id_clone.clone(),
                progress: 5.0,
                speed: None,
                eta: None,
                status: "processing".to_string(),
                message: Some("Menyiapkan mesin transkripsi...".to_string()),
                output_path: None,
            },
        );

        let mut cmd = Command::new(python_exec);
        cmd.arg(&script_path)
            .arg("--input")
            .arg(&input)
            .arg("--model")
            .arg(&model)
            .arg("--language")
            .arg(&language)
            .arg("--task-id")
            .arg(&task_id_clone);

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
                        message: Some(format!("Gagal memulai proses transkripsi: {}", e)),
                        output_path: None,
                    },
                );
                return;
            }
        };

        // Drain stderr in background to avoid pipe deadlocks and capture error messages
        let err_pipe = child.stderr.take();
        let stderr_thread = std::thread::spawn(move || {
            let mut err_str = String::new();
            if let Some(mut pipe) = err_pipe {
                use std::io::Read;
                let _ = pipe.read_to_string(&mut err_str);
            }
            err_str
        });

        let mut json_raw = String::new();
        let mut final_txt_path = None;

        if let Some(stdout) = child.stdout.take() {
            let reader = BufReader::new(stdout);
            for line_res in reader.lines() {
                if let Ok(line) = line_res {
                    if line.starts_with("PROGRESS:") {
                        let parts: Vec<&str> = line.splitn(3, ':').collect();
                        if parts.len() >= 3 {
                            let pct = parts[1].parse::<f64>().unwrap_or(50.0);
                            let msg = parts[2].to_string();
                            let _ = app_handle.emit(
                                "task-progress",
                                TaskProgressPayload {
                                    task_id: task_id_clone.clone(),
                                    progress: pct,
                                    speed: None,
                                    eta: None,
                                    status: "processing".to_string(),
                                    message: Some(msg),
                                    output_path: None,
                                },
                            );
                        }
                    } else if line.starts_with("JSON_RESULT:") {
                        json_raw = line.replace("JSON_RESULT:", "").trim().to_string();
                    }
                }
            }
        }

        let status = child.wait();
        let success = status.map(|s| s.success()).unwrap_or(false);
        let err_output = stderr_thread.join().unwrap_or_default();

        if success && !json_raw.is_empty() {
            match serde_json::from_str::<TranscriptionResultPayload>(&json_raw) {
                Ok(mut parsed) => {
                    if parsed.task_id.is_empty() {
                        parsed.task_id = task_id_clone.clone();
                    }

                    if let Some(ref files) = parsed.exported_files {
                        final_txt_path = files.txt.clone();
                    }

                    // Emit full result event for the UI transcript viewer
                    let _ = app_handle.emit("transcription-result", parsed);

                    let _ = app_handle.emit(
                        "task-progress",
                        TaskProgressPayload {
                            task_id: task_id_clone,
                            progress: 100.0,
                            speed: None,
                            eta: None,
                            status: "completed".to_string(),
                            message: Some("Transkripsi berhasil diselesaikan!".to_string()),
                            output_path: final_txt_path,
                        },
                    );
                    return;
                }
                Err(e) => {
                    eprintln!("Deserialization error for transcription JSON: {}", e);
                    let _ = app_handle.emit(
                        "task-progress",
                        TaskProgressPayload {
                            task_id: task_id_clone,
                            progress: 0.0,
                            speed: None,
                            eta: None,
                            status: "failed".to_string(),
                            message: Some(format!("Gagal membaca data hasil transkripsi: {}", e)),
                            output_path: None,
                        },
                    );
                    return;
                }
            }
        }

        // If failed
        let err_msg = if !err_output.trim().is_empty() {
            let last_line = err_output.trim().lines().last().unwrap_or("").to_string();
            format!("Gagal transkripsi: {}", last_line)
        } else {
            "Gagal memproses transkripsi video. Pastikan format video/link valid.".to_string()
        };

        let _ = app_handle.emit(
            "task-progress",
            TaskProgressPayload {
                task_id: task_id_clone,
                progress: 0.0,
                speed: None,
                eta: None,
                status: "failed".to_string(),
                message: Some(err_msg),
                output_path: None,
            },
        );
    });

    Ok(())
}

fn format_timestamp_srt(seconds: f64) -> String {
    let hrs = (seconds / 3600.0) as u32;
    let mins = ((seconds % 3600.0) / 60.0) as u32;
    let secs = (seconds % 60.0) as u32;
    let msecs = ((seconds - seconds.floor()) * 1000.0).round() as u32;
    format!("{:02}:{:02}:{:02},{:03}", hrs, mins, secs, msecs)
}

fn format_timestamp_vtt(seconds: f64) -> String {
    let hrs = (seconds / 3600.0) as u32;
    let mins = ((seconds % 3600.0) / 60.0) as u32;
    let secs = (seconds % 60.0) as u32;
    let msecs = ((seconds - seconds.floor()) * 1000.0).round() as u32;
    format!("{:02}:{:02}:{:02}.{:03}", hrs, mins, secs, msecs)
}

fn format_duration_display(seconds: f64) -> String {
    let hrs = (seconds / 3600.0) as u32;
    let mins = ((seconds % 3600.0) / 60.0) as u32;
    let secs = (seconds % 60.0) as u32;
    if hrs > 0 {
        format!("{:02}:{:02}:{:02}", hrs, mins, secs)
    } else {
        format!("{:02}:{:02}", mins, secs)
    }
}

#[tauri::command]
pub fn save_transcription_file(
    output_dir: String,
    filename: String,
    format: String, // "txt", "srt", "vtt", "json", "all"
    title: String,
    language: String,
    duration: f64,
    full_text: String,
    segments: Vec<TranscriptSegment>,
) -> Result<String, String> {
    let out_dir = Path::new(&output_dir);
    if !out_dir.exists() {
        std::fs::create_dir_all(out_dir).map_err(|e| format!("Gagal membuat folder tujuan: {}", e))?;
    }

    // Clean filename stem
    let clean_stem = filename
        .trim()
        .replace(['\\', '/', '*', '?', ':', '"', '<', '>', '|'], "_");
    let base_stem = if let Some(idx) = clean_stem.rfind('.') {
        &clean_stem[..idx]
    } else {
        &clean_stem
    };
    let base_name = if base_stem.is_empty() { "transkrip" } else { base_stem };

    let save_txt = |path: &Path| -> Result<(), String> {
        let content = format!(
            "# Transkrip: {}\n# Bahasa: {} | Durasi: {}\n\n{}",
            title,
            language.to_uppercase(),
            format_duration_display(duration),
            full_text
        );
        std::fs::write(path, content).map_err(|e| format!("Gagal menyimpan file TXT: {}", e))
    };

    let save_srt = |path: &Path| -> Result<(), String> {
        let mut content = String::new();
        for (idx, seg) in segments.iter().enumerate() {
            content.push_str(&format!(
                "{}\n{} --> {}\n{}\n\n",
                idx + 1,
                format_timestamp_srt(seg.start),
                format_timestamp_srt(seg.end),
                seg.text
            ));
        }
        std::fs::write(path, content).map_err(|e| format!("Gagal menyimpan file SRT: {}", e))
    };

    let save_vtt = |path: &Path| -> Result<(), String> {
        let mut content = String::from("WEBVTT\n\n");
        for seg in &segments {
            content.push_str(&format!(
                "{} --> {}\n{}\n\n",
                format_timestamp_vtt(seg.start),
                format_timestamp_vtt(seg.end),
                seg.text
            ));
        }
        std::fs::write(path, content).map_err(|e| format!("Gagal menyimpan file VTT: {}", e))
    };

    let save_json = |path: &Path| -> Result<(), String> {
        let payload = serde_json::json!({
            "title": title,
            "language": language,
            "duration": duration,
            "full_text": full_text,
            "segments": segments
        });
        let json_str = serde_json::to_string_pretty(&payload)
            .map_err(|e| format!("Gagal memformat JSON: {}", e))?;
        std::fs::write(path, json_str).map_err(|e| format!("Gagal menyimpan file JSON: {}", e))
    };

    let saved_main_path = match format.to_lowercase().as_str() {
        "txt" => {
            let p = out_dir.join(format!("{}.txt", base_name));
            save_txt(&p)?;
            p.to_string_lossy().to_string()
        }
        "srt" => {
            let p = out_dir.join(format!("{}.srt", base_name));
            save_srt(&p)?;
            p.to_string_lossy().to_string()
        }
        "vtt" => {
            let p = out_dir.join(format!("{}.vtt", base_name));
            save_vtt(&p)?;
            p.to_string_lossy().to_string()
        }
        "json" => {
            let p = out_dir.join(format!("{}.json", base_name));
            save_json(&p)?;
            p.to_string_lossy().to_string()
        }
        "all" => {
            let p_txt = out_dir.join(format!("{}.txt", base_name));
            let p_srt = out_dir.join(format!("{}.srt", base_name));
            let p_vtt = out_dir.join(format!("{}.vtt", base_name));
            let p_json = out_dir.join(format!("{}.json", base_name));
            save_txt(&p_txt)?;
            save_srt(&p_srt)?;
            save_vtt(&p_vtt)?;
            save_json(&p_json)?;
            p_txt.to_string_lossy().to_string()
        }
        _ => return Err("Format ekspor tidak didukung. Pilih txt, srt, vtt, json, atau all.".to_string()),
    };

    Ok(saved_main_path)
}
