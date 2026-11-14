import React, { useState } from 'react';
import {
  Music,
  UploadCloud,
  FileAudio,
  Play,
  X,
  Volume2,
  Headphones,
  Zap,
  Disc,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
  const [preset, setPreset] = useState<'church_wav' | 'clear_mp3' | 'compact_mp3' | 'flac' | 'custom'>('church_wav');
  const [customFormat, setCustomFormat] = useState('wav');
  const [customBitrate, setCustomBitrate] = useState('320');
  const [showAdvanced, setShowAdvanced] = useState(false);

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

    let targetFormat = 'wav';
    let targetBitrate = '320';

    if (preset === 'church_wav') {
      targetFormat = 'wav';
      targetBitrate = '320';
    } else if (preset === 'clear_mp3') {
      targetFormat = 'mp3';
      targetBitrate = '320';
    } else if (preset === 'compact_mp3') {
      targetFormat = 'mp3';
      targetBitrate = '128';
    } else if (preset === 'flac') {
      targetFormat = 'flac';
      targetBitrate = '320';
    } else if (preset === 'custom') {
      targetFormat = customFormat;
      targetBitrate = customBitrate;
    }

    for (const file of selectedFiles) {
      onStartConversion(file, targetFormat, targetBitrate);
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
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              Audio Converter & Church Sound Studio
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Konversi musik ke format WAV uncompressed untuk sound gereja & backing track, atau MP3 jernih untuk grup vokal.
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
              Pilih File Audio
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
          onClick={handleSelectAudio}
          className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-purple-500 dark:hover:border-purple-400 bg-white/60 dark:bg-neutral-800/40 p-7 rounded-3xl text-center cursor-pointer transition space-y-2 group"
        >
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 group-hover:scale-110 transition mx-auto flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-neutral-200">
            Klik untuk Memilih File Audio
          </p>
          <p className="text-xs text-slate-400 dark:text-neutral-500">
            Mendukung MP3, WAV, FLAC, M4A, OGG, AAC, AIFF (Bisa pilih banyak file)
          </p>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-4 rounded-2xl space-y-2 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400 block px-1">
              {selectedFiles.length} file audio siap diproses:
            </span>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-neutral-800/70 border border-black/[0.04] dark:border-white/[0.06] rounded-xl text-xs text-slate-700 dark:text-neutral-200"
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <FileAudio className="w-4 h-4 text-purple-500 shrink-0" />
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

      {/* Step 2: Choose Sound Preset */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">
            2
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
            Pilih Standar Kualitas Suara
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* WAV Gereja */}
          <div
            onClick={() => setPreset('church_wav')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              preset === 'church_wav'
                ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-500 dark:border-purple-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-purple-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  WAV 48kHz (Sound Gereja & Keyboard)
                </span>
                <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.2 rounded-md font-semibold">
                  Murni
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Tanpa kompresi audio (PCM). Menjaga dinamika bas dan vokal agar tidak pecah di mixer/speaker sound system.
              </p>
            </div>
          </div>

          {/* MP3 320k */}
          <div
            onClick={() => setPreset('clear_mp3')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              preset === 'clear_mp3'
                ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-500 dark:border-purple-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-purple-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                MP3 320 kbps (High Fidelity)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Kualitas MP3 tertinggi yang sangat jernih. Ukuran hemat (~8-10MB), ideal untuk dibagikan ke WhatsApp tim singers.
              </p>
            </div>
          </div>

          {/* FLAC */}
          <div
            onClick={() => setPreset('flac')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              preset === 'flac'
                ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-500 dark:border-purple-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-purple-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                FLAC Lossless Audio
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Kompresi tanpa kehilangan detail bit suara sedikitpun. Cocok untuk koleksi master audio.
              </p>
            </div>
          </div>

          {/* Compact MP3 */}
          <div
            onClick={() => setPreset('compact_mp3')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              preset === 'compact_mp3'
                ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-500 dark:border-purple-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-purple-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                MP3 128 kbps (Hemat Ukuran)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Ukuran file kecil (~3MB) untuk preview cepat rekaman khotbah atau rekaman latihan.
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
            <span>Pengaturan Lanjutan (Format Manual & Custom Bitrate)</span>
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-white/70 dark:bg-neutral-800/60 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-neutral-300 uppercase tracking-wider block">
                  Format Output
                </label>
                <select
                  value={customFormat}
                  onChange={(e) => {
                    setCustomFormat(e.target.value);
                    setPreset('custom');
                  }}
                  className="w-full bg-white dark:bg-neutral-700 border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-neutral-100"
                >
                  <option value="wav">WAV (PCM)</option>
                  <option value="mp3">MP3</option>
                  <option value="flac">FLAC</option>
                  <option value="m4a">M4A (AAC)</option>
                  <option value="ogg">OGG</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-neutral-300 uppercase tracking-wider block">
                  Bitrate Audio
                </label>
                <select
                  value={customBitrate}
                  onChange={(e) => {
                    setCustomBitrate(e.target.value);
                    setPreset('custom');
                  }}
                  disabled={customFormat === 'wav' || customFormat === 'flac'}
                  className="w-full bg-white dark:bg-neutral-700 border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-neutral-100 disabled:opacity-40"
                >
                  <option value="320">320 kbps</option>
                  <option value="256">256 kbps</option>
                  <option value="192">192 kbps</option>
                  <option value="128">128 kbps</option>
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
          <Play className="w-3.5 h-3.5 fill-white" /> Mulai Konversi{' '}
          {selectedFiles.length > 0 ? `(${selectedFiles.length} Audio)` : ''}
        </button>
      </div>
    </div>
  );
};