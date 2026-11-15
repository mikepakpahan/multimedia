use std::io::{BufRead, BufReader};
use std::path::PathBuf;
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
    pub task_id: String,
    pub title: String,
    pub language: String,
    pub duration: f64,
    pub full_text: String,
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
    output_dir: String,
) -> Result<(), String> {
    let python_exec = find_executable("python")
        .ok_or_else(|| "Python 3 tidak ditemukan. Pastikan Python terinstall untuk menjalankan AI Speech-to-Text.".to_string())?;

    let script_path = get_or_create_transcribe_script()?;

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    let out_dir = output_dir.clone();

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
            .arg("--output-dir")
            .arg(&out_dir);

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

        if success && !json_raw.is_empty() {
            if let Ok(mut parsed) = serde_json::from_str::<TranscriptionResultPayload>(&json_raw) {
                parsed.task_id = task_id_clone.clone();

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
        }

        // If failed
        let _ = app_handle.emit(
            "task-progress",
            TaskProgressPayload {
                task_id: task_id_clone,
                progress: 0.0,
                speed: None,
                eta: None,
                status: "failed".to_string(),
                message: Some("Gagal memproses transkripsi video. Pastikan format video/link valid.".to_string()),
                output_path: None,
            },
        );
    });

    Ok(())
}
