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
      {/* Engine warning banner */}
      {engineStatus && !engineStatus.ffmpeg_installed && (
        <div className="bg-amber-950/40 border border-amber-900/60 p-4 rounded-xl text-amber-300 text-xs flex items-center gap-2">
          <span>⚠️ Engine <strong>FFmpeg</strong> belum terdeteksi di komputer. Harap periksa status di menu Pengaturan.</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-900/30 p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Video className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Video Converter & Compressor</h2>
            <p className="text-sm text-slate-300">
              Konversi video antar format (MP4, MKV, MOV, WebM), kompresi ukuran file untuk WhatsApp/Email, dan ekstraksi audio langsung ke MP3/WAV.
            </p>
          </div>
        </div>
      </div>

      {/* File Dropzone / Picker */}
      <div
        onClick={handleSelectVideo}
        className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-900/50 hover:bg-slate-900/80 p-8 rounded-2xl text-center cursor-pointer transition space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-slate-800 text-blue-400 mx-auto flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Klik untuk memilih file Video</p>
          <p className="text-xs text-slate-400 mt-1">Mendukung banyak file sekaligus (MP4, MKV, MOV, AVI, WebM, FLV)</p>
        </div>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            <span>Daftar Video yang Dipilih ({selectedFiles.length})</span>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-slate-400 hover:text-red-400 transition"
            >
              Hapus Semua
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200"
              >
                <div className="flex items-center gap-2 truncate mr-2">
                  <FileVideo className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate" title={file}>{file}</span>
                </div>
                <button
                  onClick={() => handleRemoveFile(idx)}
                  className="text-slate-400 hover:text-red-400 transition p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options Card */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Format */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Format Tujuan
            </label>
            <select
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="mp4">MP4 (H.264 / AAC - Kompatibilitas Tertinggi)</option>
              <option value="mkv">MKV (Matroska - Multi Audio/Subtitle)</option>
              <option value="mov">MOV (Apple QuickTime)</option>
              <option value="webm">WebM (Optimal untuk Web)</option>
              <option value="mp3">Ekstrak Audio Langsung ke MP3 (320k)</option>
              <option value="wav">Ekstrak Audio Langsung ke WAV (Uncompressed)</option>
            </select>
          </div>

          {/* Compression Preset */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Preset Kompresi & Kualitas
            </label>
            <select
              value={compressionPreset}
              onChange={(e) => setCompressionPreset(e.target.value)}
              disabled={targetFormat === 'mp3' || targetFormat === 'wav'}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-40"
            >
              <option value="whatsapp">Kompresi WhatsApp (&lt; 64 MB / Hemat Kuota)</option>
              <option value="medium">Kualitas Sedang (CRF 23 - Seimbang untuk Arsip)</option>
              <option value="high">Kualitas Tinggi (CRF 18 - Visual Tajam)</option>
              <option value="passthrough">Tanpa Re-encoding (Fast Remux / Copy Stream)</option>
            </select>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Tersimpan di: <span className="font-mono text-slate-300">{outputDir}</span>
          </div>
          <button
            onClick={handleProcess}
            disabled={selectedFiles.length === 0}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4" /> Proses {selectedFiles.length > 0 ? `(${selectedFiles.length} Video)` : 'Video'}
          </button>
        </div>
      </div>
    </div>
  );
};
