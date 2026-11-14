use std::fs::File;
use std::io::BufWriter;
use std::path::{Path, PathBuf};
use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::ImageFormat;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use crate::utils::TaskProgressPayload;

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
                progress: 25.0,
                speed: None,
                eta: None,
                status: "processing".to_string(),
                message: Some("Membaca dan memproses gambar...".to_string()),
                output_path: None,
            },
        );

        let mut img = match image::open(&in_path) {
            Ok(img) => img,
            Err(e) => {
                let _ = app_handle.emit(
                    "task-progress",
                    TaskProgressPayload {
                        task_id: task_id_clone,
                        progress: 0.0,
                        speed: None,
                        eta: None,
                        status: "failed".to_string(),
                        message: Some(format!("Gagal membuka gambar: {}", e)),
                        output_path: None,
                    },
                );
                return;
            }
        };

        // Resize if scale percentage is specified and not 100
        if let Some(scale) = scale_percent {
            if scale > 0 && scale < 100 {
                let (w, h) = (img.width(), img.height());
                let new_w = ((w as f64) * (scale as f64) / 100.0).round() as u32;
                let new_h = ((h as f64) * (scale as f64) / 100.0).round() as u32;
                if new_w > 0 && new_h > 0 {
                    img = img.resize(new_w, new_h, FilterType::Lanczos3);
                }
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
                message: Some("Mengompresi dan menyimpan format baru...".to_string()),
                output_path: None,
            },
        );

        let save_op = || -> Result<(), String> {
            match ext {
                "jpg" => {
                    let file = File::create(&output_file_path)
                        .map_err(|e| format!("Gagal membuat file tujuan: {}", e))?;
                    let mut writer = BufWriter::new(file);
                    let mut encoder = JpegEncoder::new_with_quality(&mut writer, quality.clamp(1, 100));
                    encoder
                        .encode_image(&img)
                        .map_err(|e| format!("Gagal encode JPEG: {}", e))?;
                    Ok(())
                }
                "png" => img
                    .save_with_format(&output_file_path, ImageFormat::Png)
                    .map_err(|e| format!("Gagal menyimpan PNG: {}", e)),
                "webp" => img
                    .save_with_format(&output_file_path, ImageFormat::WebP)
                    .map_err(|e| format!("Gagal menyimpan WebP: {}", e)),
                "ico" => {
                    let ico_img = if img.width() > 256 || img.height() > 256 {
                        img.resize(256, 256, FilterType::Lanczos3)
                    } else {
                        img
                    };
                    ico_img
                        .save_with_format(&output_file_path, ImageFormat::Ico)
                        .map_err(|e| format!("Gagal menyimpan ICO: {}", e))
                }
                "bmp" => img
                    .save_with_format(&output_file_path, ImageFormat::Bmp)
                    .map_err(|e| format!("Gagal menyimpan BMP: {}", e)),
                _ => img
                    .save(&output_file_path)
                    .map_err(|e| format!("Gagal menyimpan: {}", e)),
            }
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
