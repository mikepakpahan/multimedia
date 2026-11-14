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
    // 1. Try standard command check via where.exe on Windows
    #[cfg(target_os = "windows")]
    {
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
