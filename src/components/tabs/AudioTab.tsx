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
      {/* Engine warning banner */}
      {engineStatus && !engineStatus.ffmpeg_installed && (
        <div className="bg-amber-950/40 border border-amber-900/60 p-4 rounded-xl text-amber-300 text-xs flex items-center gap-2">
          <span>⚠️ Engine <strong>FFmpeg</strong> belum terdeteksi di komputer. Harap periksa status di menu Pengaturan.</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-900/30 p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Music className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Audio Converter & Studio Suite</h2>
            <p className="text-sm text-slate-300">
              Konversi musik ke WAV tanpa kompresi untuk playback keyboard/sound system gereja, atau kompres bitrate MP3 untuk dibagikan via grup chat.
            </p>
          </div>
        </div>
      </div>

      {/* File Dropzone / Picker */}
      <div
        onClick={handleSelectAudio}
        className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/50 hover:bg-slate-900/80 p-8 rounded-2xl text-center cursor-pointer transition space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-slate-800 text-indigo-400 mx-auto flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Klik untuk memilih file Audio</p>
          <p className="text-xs text-slate-400 mt-1">Mendukung MP3, WAV, FLAC, M4A, OGG, AAC, AIFF</p>
        </div>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            <span>Daftar Audio yang Dipilih ({selectedFiles.length})</span>
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
                  <FileAudio className="w-4 h-4 text-indigo-400 shrink-0" />
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
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Format Output
            </label>
            <select
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="wav">WAV (PCM Uncompressed - Rekomendasi Sound/DAW)</option>
              <option value="mp3">MP3 (MPEG Layer 3 - Universal)</option>
              <option value="flac">FLAC (Lossless Compressed)</option>
              <option value="m4a">M4A (AAC Audio - Apple & Mobile)</option>
              <option value="ogg">OGG (Vorbis Codec)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Bitrate / Sample Quality
            </label>
            <select
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value)}
              disabled={targetFormat === 'wav' || targetFormat === 'flac'}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-40"
            >
              <option value="320">320 kbps (High Fidelity Audio / Jernih)</option>
              <option value="256">256 kbps (Studio Quality)</option>
              <option value="192">192 kbps (Standard Quality)</option>
              <option value="128">128 kbps (Compact / Hemat Ukuran)</option>
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
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4" /> Proses {selectedFiles.length > 0 ? `(${selectedFiles.length} Audio)` : 'Audio'}
          </button>
        </div>
      </div>
    </div>
  );
};
