import React, { useState } from 'react';
import { Music, UploadCloud, FileAudio, Play, X } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { EngineStatus } from '../../types';

interface AudioTabProps {
  outputDir: string;
  engineStatus: EngineStatus | null;
  onStartConversion: (filePath: string, targetFormat: string, bitrate: string) => void;
}

export const AudioTab: React.FC<AudioTabProps> = ({
  outputDir,
  engineStatus,
  onStartConversion,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [targetFormat, setTargetFormat] = useState('wav');
  const [bitrate, setBitrate] = useState('320');

  const handleSelectAudio = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'aiff'] }],
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
      onStartConversion(file, targetFormat, bitrate);
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
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-normal text-slate-800 dark:text-slate-100 tracking-tight">
              Audio Converter & Studio Suite
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Konversi musik ke WAV tanpa kompresi untuk playback keyboard/sound system gereja, atau kompres MP3 untuk dibagikan via grup chat.
            </p>
          </div>
        </div>
      </div>

      {/* File Dropzone / Picker */}
      <div
        onClick={handleSelectAudio}
        className="border-2 border-dashed border-[#C4C7C5] dark:border-[#444746] hover:border-indigo-600 dark:hover:border-indigo-400 bg-[#F8FAFD] dark:bg-[#28292A] p-8 rounded-3xl text-center cursor-pointer transition space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Klik untuk memilih file Audio</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mendukung MP3, WAV, FLAC, M4A, OGG, AAC, AIFF (Bisa pilih banyak file)</p>
        </div>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-5 rounded-3xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
            <span>Daftar Audio yang Dipilih ({selectedFiles.length})</span>
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
                  <FileAudio className="w-4 h-4 text-indigo-600 shrink-0" />
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
              Format Output
            </label>
            <select
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
              className="w-full bg-[#F0F4F9] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
            >
              <option value="wav">WAV (PCM Uncompressed - Rekomendasi Sound/DAW)</option>
              <option value="mp3">MP3 (MPEG Layer 3 - Universal)</option>
              <option value="flac">FLAC (Lossless Compressed)</option>
              <option value="m4a">M4A (AAC Audio - Apple & Mobile)</option>
              <option value="ogg">OGG (Vorbis Codec)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Bitrate / Kualitas
            </label>
            <select
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value)}
              disabled={targetFormat === 'wav' || targetFormat === 'flac'}
              className="w-full bg-[#F0F4F9] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-600 disabled:opacity-40"
            >
              <option value="320">320 kbps (High Fidelity Audio / Jernih)</option>
              <option value="256">256 kbps (Studio Quality)</option>
              <option value="192">192 kbps (Standard Quality)</option>
              <option value="128">128 kbps (Compact / Hemat Ukuran)</option>
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
            className="px-7 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-full shadow-xs hover:shadow-md transition flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Proses {selectedFiles.length > 0 ? `(${selectedFiles.length} Audio)` : 'Audio'}
          </button>
        </div>
      </div>
    </div>
  );
};
