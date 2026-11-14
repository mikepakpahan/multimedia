use std::path::PathBuf;
use std::process::Command;
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct TaskProgressPayload {
    pub task_id: String,
    pub progress: f64,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub status: String, // "processing", "completed", "failed"
    pub message: Option<String>,
    pub output_path: Option<String>,
}

pub fn find_executable(name: &str) -> Option<PathBuf> {
    // 1. Check local bundled binaries directory first (for installed app on other PCs or dev)
    #[cfg(target_os = "windows")]
    {
        // A. Check next to running executable (production install: <dir>/binaries/ or <dir>/)
        if let Ok(curr_exe) = std::env::current_exe() {
            if let Some(exe_dir) = curr_exe.parent() {
                let check_paths = [
                    exe_dir.join("binaries").join(format!("{}.exe", name)),
                    exe_dir.join(format!("{}.exe", name)),
                    exe_dir.join("resources").join("binaries").join(format!("{}.exe", name)),
                    exe_dir.join("..").join("binaries").join(format!("{}.exe", name)),
                ];
                for p in &check_paths {
                    if p.exists() {
                        return Some(p.clone());
                    }
                }
            }
        }

        // B. Check relative to current working directory (in development mode)
        let dev_paths = [
            PathBuf::from(format!("src-tauri/binaries/{}.exe", name)),
            PathBuf::from(format!("binaries/{}.exe", name)),
            PathBuf::from(format!("../binaries/{}.exe", name)),
        ];
        for dp in &dev_paths {
            if dp.exists() {
                if let Ok(abs) = std::fs::canonicalize(dp) {
                    return Some(abs);
                }
                return Some(dp.clone());
            }
        }

        // 2. Try standard command check via where.exe on Windows
        if let Ok(output) = Command::new("where.exe").arg(name).output() {
            if output.status.success() {
                if let Ok(text) = String::from_utf8(output.stdout) {
                    for line in text.lines() {
                        let path = PathBuf::from(line.trim());
                        if path.exists() {
                            return Some(path);
                        }
                    }
                }
            }
        }

        // 2. Check common installation directories
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            let possible_paths = [
                // Python Scripts (typical for yt-dlp installed via pip)
                format!("{}\\AppData\\Local\\Programs\\Python\\Python310\\Scripts\\{}.exe", userprofile, name),
                format!("{}\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\{}.exe", userprofile, name),
                format!("{}\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\{}.exe", userprofile, name),
                format!("{}\\AppData\\Local\\Microsoft\\WindowsApps\\{}.exe", userprofile, name),
                // Scoop / Chocolatey / Winget standard paths
                format!("{}\\scoop\\shims\\{}.exe", userprofile, name),
                format!("C:\\ProgramData\\chocolatey\\bin\\{}.exe", name),
                format!("{}\\AppData\\Local\\Microsoft\\WinGet\\Links\\{}.exe", userprofile, name),
                format!("{}\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\{}.exe", userprofile, name),
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
