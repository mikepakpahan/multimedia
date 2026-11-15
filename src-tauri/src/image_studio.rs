use std::fs::File;
use std::io::{BufRead, BufReader, BufWriter};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::ImageFormat;
use tauri::{AppHandle, Emitter};
use crate::utils::{find_executable, TaskProgressPayload};

const BG_SCRIPT_CONTENT: &str = include_str!("../scripts/bg_remover.py");

fn get_or_create_bg_script() -> Result<PathBuf, String> {
    let local_script = PathBuf::from("src-tauri/scripts/bg_remover.py");
    if local_script.exists() {
        return Ok(local_script);
    }
    let local_script2 = PathBuf::from("scripts/bg_remover.py");
    if local_script2.exists() {
        return Ok(local_script2);
    }

    let temp_dir = std::env::temp_dir().join("multimedia_studio");
    let _ = std::fs::create_dir_all(&temp_dir);
    let script_path = temp_dir.join("bg_remover.py");
    std::fs::write(&script_path, BG_SCRIPT_CONTENT)
        .map_err(|e| format!("Gagal menulis helper script Background Remover: {}", e))?;

    Ok(script_path)
}

fn parse_hex_color(hex: &str) -> Option<image::Rgba<u8>> {
    let clean = hex.trim().trim_start_matches('#');
    if clean.eq_ignore_ascii_case("transparent") || clean.is_empty() {
        return None;
    }
    if clean.len() == 6 {
        let r = u8::from_str_radix(&clean[0..2], 16).ok()?;
        let g = u8::from_str_radix(&clean[2..4], 16).ok()?;
        let b = u8::from_str_radix(&clean[4..6], 16).ok()?;
        return Some(image::Rgba([r, g, b, 255]));
    }
    None
}

fn remove_background_native(
    input_path: &Path,
    output_path: &Path,
    bg_color: &str,
) -> Result<(), String> {
    let img = image::open(input_path)
        .map_err(|e| format!("Gagal membuka gambar: {}", e))?
        .to_rgba8();

    let (width, height) = img.dimensions();
    if width == 0 || height == 0 {
        return Err("Ukuran gambar tidak valid.".to_string());
    }

    // Sample 4 corners to detect average background color
    let corners = [
        img.get_pixel(0, 0),
        img.get_pixel(width - 1, 0),
        img.get_pixel(0, height - 1),
        img.get_pixel(width - 1, height - 1),
    ];
    let bg_r = (corners.iter().map(|c| c[0] as u32).sum::<u32>() / 4) as f32;
    let bg_g = (corners.iter().map(|c| c[1] as u32).sum::<u32>() / 4) as f32;
    let bg_b = (corners.iter().map(|c| c[2] as u32).sum::<u32>() / 4) as f32;

    let target_rgba = parse_hex_color(bg_color);

    let mut output_img = image::RgbaImage::new(width, height);
    let threshold = 40.0;
    let feather = 20.0;

    for y in 0..height {
        for x in 0..width {
            let px = img.get_pixel(x, y);
            let dr = px[0] as f32 - bg_r;
            let dg = px[1] as f32 - bg_g;
            let db = px[2] as f32 - bg_b;
            let dist = (dr * dr + dg * dg + db * db).sqrt();

            if dist < threshold {
                if let Some(fill) = target_rgba {
                    output_img.put_pixel(x, y, fill);
                } else {
                    output_img.put_pixel(x, y, image::Rgba([0, 0, 0, 0]));
                }
            } else if dist < threshold + feather {
                let alpha_ratio = (dist - threshold) / feather;
                let original_alpha = (px[3] as f32 / 255.0) * alpha_ratio;
                if let Some(fill) = target_rgba {
                    let r = (px[0] as f32 * original_alpha + fill[0] as f32 * (1.0 - original_alpha)) as u8;
                    let g = (px[1] as f32 * original_alpha + fill[1] as f32 * (1.0 - original_alpha)) as u8;
                    let b = (px[2] as f32 * original_alpha + fill[2] as f32 * (1.0 - original_alpha)) as u8;
                    output_img.put_pixel(x, y, image::Rgba([r, g, b, 255]));
                } else {
                    let new_alpha = (px[3] as f32 * alpha_ratio) as u8;
                    output_img.put_pixel(x, y, image::Rgba([px[0], px[1], px[2], new_alpha]));
                }
            } else {
                output_img.put_pixel(x, y, *px);
            }
        }
    }

    output_img.save(output_path)
        .map_err(|e| format!("Gagal menyimpan gambar hasil: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn process_image(
    app: AppHandle,
    task_id: String,
    input_path: String,
    target_format: String,
    quality: u8,
    scale_percent: Option<u32>,
    output_dir: String,
) -> Result<(), String> {
    let in_path = PathBuf::from(&input_path);
    if !in_path.exists() {
        return Err("File gambar tidak ditemukan.".to_string());
    }

    let file_stem = in_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("optimized_image");

    let ext = match target_format.to_lowercase().as_str() {
        "jpg" | "jpeg" => "jpg",
        "png" => "png",
        "webp" => "webp",
        "ico" => "ico",
        "bmp" => "bmp",
        _ => "webp",
    };

    let output_filename = format!("{}_opt_{}q.{}", file_stem, quality, ext);
    let output_file_path = Path::new(&output_dir).join(&output_filename);
    let out_str = output_file_path.to_string_lossy().to_string();

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    let out_str_clone = out_str.clone();

    std::thread::spawn(move || {
        let _ = app_handle.emit(
            "task-progress",
            TaskProgressPayload {
                task_id: task_id_clone.clone(),
                progress: 10.0,
                speed: None,
                eta: None,
                status: "processing".to_string(),
                message: Some("Membaca data gambar...".to_string()),
                output_path: None,
            },
        );

        let save_op = || -> Result<(), String> {
            let mut dynamic_img = image::open(&input_path)
                .map_err(|e| format!("Gagal membuka gambar: {}", e))?;

            if let Some(scale) = scale_percent {
                if scale > 0 && scale < 100 {
                    let nwidth = (dynamic_img.width() * scale) / 100;
                    let nheight = (dynamic_img.height() * scale) / 100;
                    dynamic_img = dynamic_img.resize_exact(nwidth.max(1), nheight.max(1), FilterType::Lanczos3);
                }
            }

            let _ = app_handle.emit(
                "task-progress",
                TaskProgressPayload {
                    task_id: task_id_clone.clone(),
                    progress: 60.0,
                    speed: None,
                    eta: None,
                    status: "processing".to_string(),
                    message: Some("Mengompresi dan mengenkoding...".to_string()),
                    output_path: None,
                },
            );

            let out_file = File::create(&output_file_path)
                .map_err(|e| format!("Gagal membuat file tujuan: {}", e))?;
            let mut writer = BufWriter::new(out_file);

            match ext {
                "jpg" => {
                    let mut encoder = JpegEncoder::new_with_quality(&mut writer, quality);
                    encoder.encode_image(&dynamic_img)
                        .map_err(|e| format!("Gagal menyimpan JPEG: {}", e))?;
                }
                "png" => {
                    dynamic_img.write_to(&mut writer, ImageFormat::Png)
                        .map_err(|e| format!("Gagal menyimpan PNG: {}", e))?;
                }
                "webp" => {
                    dynamic_img.write_to(&mut writer, ImageFormat::WebP)
                        .map_err(|e| format!("Gagal menyimpan WebP: {}", e))?;
                }
                "bmp" => {
                    dynamic_img.write_to(&mut writer, ImageFormat::Bmp)
                        .map_err(|e| format!("Gagal menyimpan BMP: {}", e))?;
                }
                "ico" => {
                    let resized_ico = dynamic_img.resize_exact(256, 256, FilterType::Lanczos3);
                    resized_ico.write_to(&mut writer, ImageFormat::Ico)
                        .map_err(|e| format!("Gagal menyimpan ICO: {}", e))?;
                }
                _ => {
                    dynamic_img.write_to(&mut writer, ImageFormat::WebP)
                        .map_err(|e| format!("Gagal menyimpan format default: {}", e))?;
                }
            }

            Ok(())
        };

        match save_op() {
            Ok(_) => {
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
                        task_id: task_id_clone,
                        progress: 100.0,
                        speed: None,
                        eta: None,
                        status: "completed".to_string(),
                        message: Some("Optimasi gambar selesai.".to_string()),
                        output_path: Some(out_str_clone),
                    },
                );
            }
            Err(e) => {
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
                        task_id: task_id_clone,
                        progress: 0.0,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(e),
                        output_path: None,
                    },
                );
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn start_remove_background(
    app: AppHandle,
    task_id: String,
    input_path: String,
    method: String, // "ai" or "color"
    bg_color: String, // "transparent", "#DC2626", "#2563EB", "#FFFFFF", "#000000"
    output_dir: String,
) -> Result<(), String> {
    let in_path = PathBuf::from(&input_path);
    if !in_path.exists() {
        return Err("File gambar input tidak ditemukan.".to_string());
    }

    let file_stem = in_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("nobg_image");

    let is_transparent = bg_color.to_lowercase() == "transparent" || bg_color.trim().is_empty();
    let ext = if is_transparent { "png" } else { "jpg" };
    let output_filename = format!("{}_nobg.{}", file_stem, ext);
    let output_file_path = Path::new(&output_dir).join(&output_filename);
    let out_str = output_file_path.to_string_lossy().to_string();

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    let out_str_clone = out_str.clone();

    std::thread::spawn(move || {
        let _ = app_handle.emit(
            "task-progress",
            TaskProgressPayload {
                task_id: task_id_clone.clone(),
                progress: 10.0,
                speed: None,
                eta: None,
                status: "processing".to_string(),
                message: Some("Menyiapkan proses penghapus latar belakang...".to_string()),
                output_path: None,
            },
        );

        // Check if Python is available for advanced AI removal
        let python_exec = find_executable("python");

        if let Some(py_path) = python_exec {
            if let Ok(script_path) = get_or_create_bg_script() {
                let mut cmd = Command::new(py_path);
                cmd.arg(&script_path)
                    .arg("--input")
                    .arg(&input_path)
                    .arg("--output")
                    .arg(&out_str_clone)
                    .arg("--method")
                    .arg(&method)
                    .arg("--bg-color")
                    .arg(&bg_color);

                cmd.stdout(Stdio::piped());
                cmd.stderr(Stdio::piped());

                #[cfg(target_os = "windows")]
                {
                    use std::os::windows::process::CommandExt;
                    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
                }

                if let Ok(mut child) = cmd.spawn() {
                    let mut final_out = out_str_clone.clone();

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
                                } else if line.starts_with("OUTPUT:") {
                                    final_out = line.replace("OUTPUT:", "").trim().to_string();
                                }
                            }
                        }
                    }

                    let status = child.wait();
                    if let Ok(exit_status) = status {
                        if exit_status.success() {
                            let _ = app_handle.emit(
                                "task-progress",
                                TaskProgressPayload {
                                    task_id: task_id_clone.clone(),
                                    progress: 100.0,
                                    speed: None,
                                    eta: None,
                                    status: "completed".to_string(),
                                    message: Some("Latar belakang berhasil dihapus!".to_string()),
                                    output_path: Some(final_out),
                                },
                            );
                            return;
                        }
                    }
                }
            }
        }

        // Native fallback (pure Rust) when python/rembg is not available
        let _ = app_handle.emit(
            "task-progress",
            TaskProgressPayload {
                task_id: task_id_clone.clone(),
                progress: 50.0,
                speed: None,
                eta: None,
                status: "processing".to_string(),
                message: Some("Memproses dengan engine native...".to_string()),
                output_path: None,
            },
        );

        match remove_background_native(&in_path, &output_file_path, &bg_color) {
            Ok(_) => {
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
                        task_id: task_id_clone,
                        progress: 100.0,
                        speed: None,
                        eta: None,
                        status: "completed".to_string(),
                        message: Some("Latar belakang berhasil dihapus (Native Engine)!".to_string()),
                        output_path: Some(out_str_clone),
                    },
                );
            }
            Err(e) => {
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
                        task_id: task_id_clone,
                        progress: 0.0,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(e),
                        output_path: None,
                    },
                );
            }
        }
    });

    Ok(())
}
