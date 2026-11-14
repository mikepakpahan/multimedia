import React, { useState } from 'react';
import { Video, UploadCloud, Play, FileVideo, X } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { EngineStatus } from '../../types';

interface VideoTabProps {
  outputDir: string;
  engineStatus: EngineStatus | null;
  onStartConversion: (filePath: string, targetFormat: string, preset: string) => void;
}

export const VideoTab: React.FC<VideoTabProps> = ({
  outputDir,
  engineStatus,
  onStartConversion,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [targetFormat, setTargetFormat] = useState('mp4');
  const [compressionPreset, setCompressionPreset] = useState('whatsapp');

  const handleSelectVideo = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'wmv', 'ts'] }],
      });
      if (selected) {
        if (Array.isArray(selected)) {
          setSelectedFiles((prev) => Array.from(new Set([...prev, ...selected])));
        } else if (typeof selected === 'string') {
          setSelectedFiles((prev) => Array.from(new Set([...prev, selected])));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = () => {
    if (selectedFiles.length === 0) return;
    for (const file of selectedFiles) {
      onStartConversion(file, targetFormat, compressionPreset);
    }
    setSelectedFiles([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Engine Status Warning */}
      {engineStatus && !engineStatus.ffmpeg_installed && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
          <span>⚠️ Engine <strong>FFmpeg</strong> belum terdeteksi. Silakan periksa di menu Pengaturan.</span>
        </div>
      )}

      {/* Hero Banner (Google Style Simple & Elegant) */}
      <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-6 md:p-8 rounded-3xl shadow-xs transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#0B57D0] dark:text-[#A8C7FA] shrink-0">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-normal text-slate-800 dark:text-slate-100 tracking-tight">
              Video Converter & Compressor
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Konversi video antar format (MP4, MKV, MOV, WebM), kompresi ukuran file untuk WhatsApp, dan ekstraksi audio.
            </p>
          </div>
        </div>
      </div>

      {/* File Dropzone / Picker */}
      <div
        onClick={handleSelectVideo}
        className="border-2 border-dashed border-[#C4C7C5] dark:border-[#444746] hover:border-[#0B57D0] dark:hover:border-[#A8C7FA] bg-[#F8FAFD] dark:bg-[#28292A] p-8 rounded-3xl text-center cursor-pointer transition space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0B57D0] dark:text-[#A8C7FA] mx-auto flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Klik untuk memilih file Video</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mendukung MP4, MKV, MOV, AVI, WebM, FLV (Bisa pilih banyak file)</p>
        </div>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-5 rounded-3xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
            <span>Daftar Video yang Dipilih ({selectedFiles.length})</span>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-rose-600 hover:underline transition"
            >
              Hapus Semua
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-[#F8FAFD] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-xl text-xs text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2 truncate mr-2">
                  <FileVideo className="w-4 h-4 text-[#0B57D0] shrink-0" />
                  <span className="truncate" title={file}>{file}</span>
                </div>
                <button
                  onClick={() => handleRemoveFile(idx)}
                  className="text-slate-400 hover:text-rose-500 transition p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options Card */}
      <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-6 rounded-3xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Format Tujuan
            </label>
            <select
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
              className="w-full bg-[#F0F4F9] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0B57D0]"
            >
              <option value="mp4">MP4 (H.264 / AAC - Kompatibilitas Tertinggi)</option>
              <option value="mkv">MKV (Matroska - Multi Audio/Subtitle)</option>
              <option value="mov">MOV (Apple QuickTime)</option>
              <option value="webm">WebM (Optimal untuk Web)</option>
              <option value="mp3">Ekstrak Audio Langsung ke MP3 (320k)</option>
              <option value="wav">Ekstrak Audio Langsung ke WAV (Uncompressed)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Preset Kompresi & Kualitas
            </label>
            <select
              value={compressionPreset}
              onChange={(e) => setCompressionPreset(e.target.value)}
              disabled={targetFormat === 'mp3' || targetFormat === 'wav'}
              className="w-full bg-[#F0F4F9] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0B57D0] disabled:opacity-40"
            >
              <option value="whatsapp">Kompresi WhatsApp (&lt; 64 MB / Hemat Kuota)</option>
              <option value="medium">Kualitas Sedang (CRF 23 - Seimbang untuk Arsip)</option>
              <option value="high">Kualitas Tinggi (CRF 18 - Visual Tajam)</option>
              <option value="passthrough">Tanpa Re-encoding (Fast Remux / Copy Stream)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-[#E0E2EC] dark:border-[#444746]/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Tersimpan di: <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{outputDir}</span>
          </div>
          <button
            onClick={handleProcess}
            disabled={selectedFiles.length === 0}
            className="px-7 py-2.5 bg-[#0B57D0] hover:bg-[#0842A0] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-full shadow-xs hover:shadow-md transition flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Proses {selectedFiles.length > 0 ? `(${selectedFiles.length} Video)` : 'Video'}
          </button>
        </div>
      </div>
    </div>
  );
};
