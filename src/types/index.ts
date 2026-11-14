export type TabType = 'youtube' | 'video' | 'audio' | 'image' | 'pdf' | 'settings';

export interface EngineStatus {
  ffmpeg_installed: boolean;
  ffmpeg_path: string | null;
  ytdlp_installed: boolean;
  ytdlp_path: string | null;
  default_output_dir: string;
}

export interface MediaTask {
  id: string;
  name: string;
  type: 'youtube' | 'video' | 'audio' | 'image' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0 - 100
  targetFormat: string;
  outputPath?: string;
  speed?: string;
  eta?: string;
  error?: string;
  createdAt: number;
}
