import React, { useState } from 'react';
import {
  Video,
  UploadCloud,
  Play,
  FileVideo,
  X,
  Smartphone,
  Tv,
  Sparkles,
  Music,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
  const [activePreset, setActivePreset] = useState<'whatsapp' | 'medium' | 'high' | 'audio_mp3' | 'custom'>('whatsapp');
  const [customFormat, setCustomFormat] = useState('mp4');
  const [customPreset, setCustomPreset] = useState('medium');
  const [showAdvanced, setShowAdvanced] = useState(false);

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

    let targetFormat = 'mp4';
    let preset = 'medium';

    if (activePreset === 'whatsapp') {
      targetFormat = 'mp4';
      preset = 'whatsapp';
    } else if (activePreset === 'medium') {
      targetFormat = 'mp4';
      preset = 'medium';
    } else if (activePreset === 'high') {
      targetFormat = 'mp4';
      preset = 'high';
    } else if (activePreset === 'audio_mp3') {
      targetFormat = 'mp3';
      preset = 'high';
    } else if (activePreset === 'custom') {
      targetFormat = customFormat;
      preset = customPreset;
    }

    for (const file of selectedFiles) {
      onStartConversion(file, targetFormat, preset);
    }
    setSelectedFiles([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-8">
      {/* Engine Status Warning */}
      {engineStatus && !engineStatus.ffmpeg_installed && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
          <span>⚠️ Engine <strong>FFmpeg</strong> belum terdeteksi. Silakan periksa di menu Pengaturan.</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-6 md:p-7 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              Video Converter & Compressor
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Kompres rekaman video agar muat dikirim di WhatsApp atau ubah format video untuk proyektor gereja & TV.
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: File Dropzone / Picker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
              Pilih File Video
            </h2>
          </div>
          {selectedFiles.length > 0 && (
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-rose-500 hover:underline cursor-pointer"
            >
              Hapus Semua ({selectedFiles.length})
            </button>
          )}
        </div>

        <div
          onClick={handleSelectVideo}
          className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 bg-white/60 dark:bg-neutral-800/40 p-7 rounded-3xl text-center cursor-pointer transition space-y-2 group"
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 group-hover:scale-110 transition mx-auto flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-neutral-200">
            Klik untuk Memilih File Video
          </p>
          <p className="text-xs text-slate-400 dark:text-neutral-500">
            Mendukung MP4, MKV, MOV, AVI, WebM (Bisa pilih banyak file sekaligus)
          </p>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-4 rounded-2xl space-y-2 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400 block px-1">
              {selectedFiles.length} video siap diproses:
            </span>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-neutral-800/70 border border-black/[0.04] dark:border-white/[0.06] rounded-xl text-xs text-slate-700 dark:text-neutral-200"
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <FileVideo className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="truncate font-mono text-[11px]" title={file}>
                      {file.split('\\').pop() || file}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    className="text-slate-400 hover:text-rose-500 transition p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Choose Preset (Beginner Friendly) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">
            2
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
            Pilih Kebutuhan Anda
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Preset WhatsApp */}
          <div
            onClick={() => setActivePreset('whatsapp')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              activePreset === 'whatsapp'
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-blue-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Kompres untuk WhatsApp
                </span>
                <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-md font-semibold">
                  Rekomendasi WA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Ukuran video diperkecil otomatis di bawah 64MB tanpa membuat gambar buram.
              </p>
            </div>
          </div>

          {/* Preset Standar HD */}
          <div
            onClick={() => setActivePreset('medium')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              activePreset === 'medium'
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-blue-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                MP4 Standar HD (TV & Proyektor)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Format seimbang untuk diputar di laptop, TV proyektor ibadah, atau YouTube.
              </p>
            </div>
          </div>

          {/* Preset Kualitas Tinggi */}
          <div
            onClick={() => setActivePreset('high')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              activePreset === 'high'
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-blue-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Kualitas Tinggi (Master Arsip)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Kualitas gambar sangat tajam (CRF 18), cocok untuk arsip video jangka panjang.
              </p>
            </div>
          </div>

          {/* Preset Ekstrak Audio */}
          <div
            onClick={() => setActivePreset('audio_mp3')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              activePreset === 'audio_mp3'
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-blue-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Ekstrak Audio Saja (MP3 320k)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Ambil suara rekaman khotbah atau lagu dari video tanpa gambarnya.
              </p>
            </div>
          </div>
        </div>

        {/* Optional Advanced Accordion */}
        <div className="pt-1">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400 hover:text-blue-500 cursor-pointer font-medium"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Pengaturan Lanjutan (Format Custom & Bitrate)</span>
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-white/70 dark:bg-neutral-800/60 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-neutral-300 uppercase tracking-wider block">
                  Pilih Format Manual
                </label>
                <select
                  value={customFormat}
                  onChange={(e) => {
                    setCustomFormat(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full bg-white dark:bg-neutral-700 border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-neutral-100"
                >
                  <option value="mp4">MP4 (H.264 / AAC)</option>
                  <option value="mkv">MKV (Matroska)</option>
                  <option value="mov">MOV (Apple QuickTime)</option>
                  <option value="webm">WebM (VP9 / Opus)</option>
                  <option value="mp3">MP3 Audio</option>
                  <option value="wav">WAV Audio</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-neutral-300 uppercase tracking-wider block">
                  Preset Enkoding
                </label>
                <select
                  value={customPreset}
                  onChange={(e) => {
                    setCustomPreset(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full bg-white dark:bg-neutral-700 border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-neutral-100"
                >
                  <option value="whatsapp">Kompres WhatsApp (&lt; 64MB)</option>
                  <option value="medium">Kualitas Sedang (CRF 23)</option>
                  <option value="high">Kualitas Tinggi (CRF 18)</option>
                  <option value="passthrough">Copy Stream (Tanpa Re-encode)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Run Action */}
      <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="text-xs text-slate-500 dark:text-neutral-400">
          Tersimpan di:{' '}
          <span className="font-mono text-slate-700 dark:text-neutral-200 font-medium">
            {outputDir ? outputDir.split('\\').pop() || outputDir : 'Folder Default'}
          </span>
        </div>

        <button
          onClick={handleProcess}
          disabled={selectedFiles.length === 0}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs rounded-xl shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-white" /> Mulai Proses{' '}
          {selectedFiles.length > 0 ? `(${selectedFiles.length} Video)` : ''}
        </button>
      </div>
    </div>
  );
};