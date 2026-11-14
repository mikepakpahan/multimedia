import React, { useState } from 'react';
import { Video, UploadCloud, Play, FileVideo } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface VideoTabProps {
  outputDir: string;
}

export const VideoTab: React.FC<VideoTabProps> = ({ outputDir }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState('mp4');
  const [compressionPreset, setCompressionPreset] = useState('whatsapp');

  const handleSelectVideo = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv'] }],
      });
      if (selected && typeof selected === 'string') {
        setSelectedFile(selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-900/30 p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Video className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Video Converter & Compressor</h2>
            <p className="text-sm text-slate-300">
              Konversi video antar format (MP4, MKV, MOV, WebM), kompresi ukuran file untuk WhatsApp/Email, dan ekstraksi audio.
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
        {selectedFile ? (
          <div>
            <p className="text-sm font-semibold text-white flex items-center justify-center gap-2">
              <FileVideo className="w-4 h-4 text-blue-400" /> {selectedFile}
            </p>
            <p className="text-xs text-slate-400 mt-1">Klik untuk memilih file video lain</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-white">Klik untuk memilih file Video</p>
            <p className="text-xs text-slate-400 mt-1">Mendukung MP4, MKV, MOV, AVI, WebM, FLV</p>
          </div>
        )}
      </div>

      {/* Options */}
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
              <option value="mp3">Ekstrak Audio Langsung ke MP3</option>
              <option value="wav">Ekstrak Audio Langsung ke WAV</option>
            </select>
          </div>

          {/* Compression Preset */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Preset Kompresi
            </label>
            <select
              value={compressionPreset}
              onChange={(e) => setCompressionPreset(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="whatsapp">Kompresi WhatsApp (&lt; 64 MB)</option>
              <option value="medium">Kualitas Sedang (CRF 24 - Seimbang)</option>
              <option value="high">Kualitas Tinggi (CRF 18 - Visual Tajam)</option>
              <option value="passthrough">Tanpa Re-encoding (Fast Remux / Copy Codec)</option>
            </select>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Tersimpan di: <span className="font-mono text-slate-300">{outputDir}</span>
          </div>
          <button
            disabled={!selectedFile}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4" /> Proses Video
          </button>
        </div>
      </div>
    </div>
  );
};
