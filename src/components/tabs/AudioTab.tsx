import React, { useState } from 'react';
import { Music, UploadCloud, FileAudio, Play } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface AudioTabProps {
  outputDir: string;
}

export const AudioTab: React.FC<AudioTabProps> = ({ outputDir }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState('mp3');
  const [bitrate, setBitrate] = useState('320');

  const handleSelectAudio = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'] }],
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
      <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-900/30 p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Music className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Audio Converter & Normalizer</h2>
            <p className="text-sm text-slate-300">
              Ubah format musik, ekstrak ke WAV untuk keyboard/DAW gereja, atau kompres bitrate MP3 untuk dibagikan via chat.
            </p>
          </div>
        </div>
      </div>

      <div
        onClick={handleSelectAudio}
        className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/50 hover:bg-slate-900/80 p-8 rounded-2xl text-center cursor-pointer transition space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-slate-800 text-indigo-400 mx-auto flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        {selectedFile ? (
          <div>
            <p className="text-sm font-semibold text-white flex items-center justify-center gap-2">
              <FileAudio className="w-4 h-4 text-indigo-400" /> {selectedFile}
            </p>
            <p className="text-xs text-slate-400 mt-1">Klik untuk memilih file audio lain</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-white">Klik untuk memilih file Audio</p>
            <p className="text-xs text-slate-400 mt-1">Mendukung MP3, WAV, FLAC, M4A, OGG, AAC</p>
          </div>
        )}
      </div>

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
              <option value="mp3">MP3 (MPEG Layer 3)</option>
              <option value="flac">FLAC (Lossless Compressed)</option>
              <option value="m4a">M4A (AAC Audio)</option>
              <option value="ogg">OGG (Vorbis)</option>
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
              <option value="320">320 kbps (High Fidelity Audio)</option>
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
            disabled={!selectedFile}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4" /> Proses Audio
          </button>
        </div>
      </div>
    </div>
  );
};
