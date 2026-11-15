use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use regex::Regex;
use tauri::{AppHandle, Emitter};

use crate::utils::{find_executable, TaskProgressPayload};

const SCRIPT_CONTENT: &str = include_str!("../scripts/pdf_tools.py");

fn get_or_create_script(_app: &AppHandle) -> Result<PathBuf, String> {
    // 1. Try local dev directory
    let local_script = PathBuf::from("src-tauri/scripts/pdf_tools.py");
    if local_script.exists() {
        return Ok(local_script);
    }
    let local_script2 = PathBuf::from("scripts/pdf_tools.py");
    if local_script2.exists() {
        return Ok(local_script2);
    }

    // 2. Otherwise write embedded script into app cache directory
    let temp_dir = std::env::temp_dir().join("multimedia_studio");
    let _ = std::fs::create_dir_all(&temp_dir);
    let script_path = temp_dir.join("pdf_tools.py");
    std::fs::write(&script_path, SCRIPT_CONTENT)
        .map_err(|e| format!("Gagal menulis helper script PDF: {}", e))?;

    Ok(script_path)
}

#[tauri::command]
pub fn start_pdf_to_docx(
    app: AppHandle,
    task_id: String,
    input_path: String,
    output_dir: String,
) -> Result<(), String> {
    let python_path = find_executable("python")
        .or_else(|| find_executable("python3"))
        .ok_or_else(|| "Python 3 tidak ditemukan di sistem. Harap pasang Python untuk konversi PDF ke Word.".to_string())?;

    let script_path = get_or_create_script(&app)?;
    let in_path = PathBuf::from(&input_path);
    if !in_path.exists() {
        return Err("File PDF input tidak ditemukan.".to_string());
    }

    let file_stem = in_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("converted_doc");

    let output_filename = format!("{}.docx", file_stem);
    let output_file_path = Path::new(&output_dir).join(&output_filename);
    let out_str = output_file_path.to_string_lossy().to_string();

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    let out_str_clone = out_str.clone();

    std::thread::spawn(move || {
        let mut cmd = Command::new(python_path);
        cmd.arg(&script_path)
            .arg("docx")
            .arg(&input_path)
            .arg(&out_str_clone);

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

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
                        message: Some(format!("Gagal menjalankan proses PDF: {}", e)),
                        output_path: None,
                    },
                );
                return;
            }
        };

        let progress_regex = Regex::new(r"\[PROGRESS\]\s+(\d+)%\s*-\s*(.+)").unwrap();
        let mut last_progress = 10.0;

        if let Some(stdout) = child.stdout.take() {
            let reader = BufReader::new(stdout);
            for line_res in reader.lines() {
                if let Ok(line) = line_res {
                    if let Some(caps) = progress_regex.captures(&line) {
                        if let (Some(p_match), Some(msg_match)) = (caps.get(1), caps.get(2)) {
                            if let Ok(p) = p_match.as_str().parse::<f64>() {
                                last_progress = p;
                                let _ = app_handle.emit(
                                    "task-progress",
                                    TaskProgressPayload {
                                        task_id: task_id_clone.clone(),
                                        progress: last_progress,
                                        speed: None,
                                        eta: None,
                                        status: "processing".to_string(),
                                        message: Some(msg_match.as_str().to_string()),
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
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
                        task_id: task_id_clone,
                        progress: 100.0,
                        speed: None,
                        eta: None,
                        status: "completed".to_string(),
                        message: Some("Konversi PDF ke Word (.docx) selesai.".to_string()),
                        output_path: Some(out_str_clone),
                    },
                );
            }
            Ok(exit_status) => {
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
                        task_id: task_id_clone,
                        progress: last_progress,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(format!("Proses PDF gagal (code: {:?})", exit_status.code())),
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

#[tauri::command]
pub fn start_pdf_compress(
    app: AppHandle,
    task_id: String,
    input_path: String,
    quality_level: String,
    output_dir: String,
) -> Result<(), String> {
    let python_path = find_executable("python")
        .or_else(|| find_executable("python3"))
        .ok_or_else(|| "Python 3 tidak ditemukan di sistem.".to_string())?;

    let script_path = get_or_create_script(&app)?;
    let in_path = PathBuf::from(&input_path);
    if !in_path.exists() {
        return Err("File PDF tidak ditemukan.".to_string());
    }

    let file_stem = in_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("compressed_pdf");

    let output_filename = format!("{}_compressed.pdf", file_stem);
    let output_file_path = Path::new(&output_dir).join(&output_filename);
    let out_str = output_file_path.to_string_lossy().to_string();

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    let out_str_clone = out_str.clone();

    std::thread::spawn(move || {
        let mut cmd = Command::new(python_path);
        cmd.arg(&script_path)
            .arg("compress")
            .arg(&input_path)
            .arg(&out_str_clone)
            .arg(&quality_level);

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

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
                        message: Some(format!("Gagal memulai kompresi PDF: {}", e)),
                        output_path: None,
                    },
                );
                return;
            }
        };

        let progress_regex = Regex::new(r"\[PROGRESS\]\s+(\d+)%\s*-\s*(.+)").unwrap();
        let mut last_progress = 20.0;

        if let Some(stdout) = child.stdout.take() {
            let reader = BufReader::new(stdout);
            for line_res in reader.lines() {
                if let Ok(line) = line_res {
                    if let Some(caps) = progress_regex.captures(&line) {
                        if let (Some(p_match), Some(msg_match)) = (caps.get(1), caps.get(2)) {
                            if let Ok(p) = p_match.as_str().parse::<f64>() {
                                last_progress = p;
                                let _ = app_handle.emit(
                                    "task-progress",
                                    TaskProgressPayload {
                                        task_id: task_id_clone.clone(),
                                        progress: last_progress,
                                        speed: None,
                                        eta: None,
                                        status: "processing".to_string(),
                                        message: Some(msg_match.as_str().to_string()),
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
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
                        task_id: task_id_clone,
                        progress: 100.0,
                        speed: None,
                        eta: None,
                        status: "completed".to_string(),
                        message: Some("Kompresi PDF selesai.".to_string()),
                        output_path: Some(out_str_clone),
                    },
                );
            }
            Ok(exit_status) => {
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
                        task_id: task_id_clone,
                        progress: last_progress,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(format!("Kompresi gagal (code: {:?})", exit_status.code())),
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

#[tauri::command]
pub fn start_pdf_merge(
    app: AppHandle,
    task_id: String,
    input_paths: Vec<String>,
    output_filename: String,
    output_dir: String,
) -> Result<(), String> {
    let python_path = find_executable("python")
        .or_else(|| find_executable("python3"))
        .ok_or_else(|| "Python 3 tidak ditemukan di sistem.".to_string())?;

    let script_path = get_or_create_script(&app)?;
    if input_paths.len() < 2 {
        return Err("Minimal 2 dokumen PDF diperlukan untuk penggabungan.".to_string());
    }

    let output_file_path = Path::new(&output_dir).join(&output_filename);
    let out_str = output_file_path.to_string_lossy().to_string();

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    let out_str_clone = out_str.clone();

    std::thread::spawn(move || {
        let mut cmd = Command::new(python_path);
        cmd.arg(&script_path)
            .arg("merge")
            .arg(&out_str_clone);

        for path in &input_paths {
            cmd.arg(path);
        }

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

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
                        message: Some(format!("Gagal memulai merge PDF: {}", e)),
                        output_path: None,
                    },
                );
                return;
            }
        };

        let progress_regex = Regex::new(r"\[PROGRESS\]\s+(\d+)%\s*-\s*(.+)").unwrap();
        let mut last_progress = 15.0;

        if let Some(stdout) = child.stdout.take() {
            let reader = BufReader::new(stdout);
            for line_res in reader.lines() {
                if let Ok(line) = line_res {
                    if let Some(caps) = progress_regex.captures(&line) {
                        if let (Some(p_match), Some(msg_match)) = (caps.get(1), caps.get(2)) {
                            if let Ok(p) = p_match.as_str().parse::<f64>() {
                                last_progress = p;
                                let _ = app_handle.emit(
                                    "task-progress",
                                    TaskProgressPayload {
                                        task_id: task_id_clone.clone(),
                                        progress: last_progress,
                                        speed: None,
                                        eta: None,
                                        status: "processing".to_string(),
                                        message: Some(msg_match.as_str().to_string()),
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
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
                        task_id: task_id_clone,
                        progress: 100.0,
                        speed: None,
                        eta: None,
                        status: "completed".to_string(),
                        message: Some("Penggabungan PDF selesai.".to_string()),
                        output_path: Some(out_str_clone),
                    },
                );
            }
            Ok(exit_status) => {
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
                        task_id: task_id_clone,
                        progress: last_progress,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(format!("Merge gagal (code: {:?})", exit_status.code())),
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
