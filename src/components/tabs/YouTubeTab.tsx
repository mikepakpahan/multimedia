import React, { useState } from 'react';
import {
  Music,
  Video,
  Download,
  Link2,
  Volume2,
  Check,
  Loader2,
  Search,
} from 'lucide-react';
import { YouTubeIcon } from '../icons/YouTubeIcon';
import { EngineStatus, YouTubeMetadata } from '../../types';
import { invoke } from '@tauri-apps/api/core';

interface YouTubeTabProps {
  engineStatus?: EngineStatus | null;
  outputDir: string;
  onStartDownload: (url: string, format: string, metadata?: YouTubeMetadata) => void;
}

export const YouTubeTab: React.FC<YouTubeTabProps> = ({
  outputDir,
  onStartDownload,
}) => {
  const [url, setUrl] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('wav');
  const [metadata, setMetadata] = useState<YouTubeMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const presets = [
    {
      id: 'wav',
      title: 'Sound System Gereja / Keyboard (WAV)',
      subtitle: 'Kualitas Murni Tanpa Kompresi (48kHz)',
      desc: 'Sangat direkomendasikan untuk backing track, input sampler keyboard, dan sound system ibadah.',
      icon: Volume2,
      badge: 'Pilihan Musik Gereja',
      type: 'audio',
      accent: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'mp3-320',
      title: 'Kirim via WhatsApp / HP (MP3)',
      subtitle: 'Kualitas Jernih 320 kbps (Hemat Ukuran)',
      desc: 'Pas dibagikan ke grup singers & pemain musik untuk latihan mandiri di rumah.',
      icon: Music,
      badge: 'Hemat Ukuran',
      type: 'audio',
      accent: 'text-red-500 bg-red-500/10 border-red-500/20',
    },
    {
      id: 'mp4-1080',
      title: 'Video Full HD (1080p MP4)',
      subtitle: 'Visual Jernih Resolusi Tinggi',
      desc: 'Ideal untuk layar proyektor ibadah atau arsip visual acara gereja.',
      icon: Video,
      type: 'video',
      accent: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'mp4-720',
      title: 'Video Hemat (720p MP4)',
      subtitle: 'Cepat Diunduh & Ringan',
      desc: 'Cocok untuk referensi cepat gerakan tari / panduan vokal.',
      icon: Video,
      type: 'video',
      accent: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
  ];

  const handleFetchMetadata = async (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;
    setIsLoadingMetadata(true);
    setMetadataError(null);
    try {
      const data = await invoke<YouTubeMetadata>('fetch_youtube_metadata', { url: trimmed });
      setMetadata(data);
    } catch (err) {
      setMetadataError(String(err));
      setMetadata(null);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.includes('youtube.com') || text.includes('youtu.be'))) {
        setUrl(text.trim());
        handleFetchMetadata(text.trim());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    if (!url.trim()) return;
    onStartDownload(url.trim(), selectedFormat, metadata || undefined);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-6 animate-fadeIn">
      {/* Header Banner (macOS Style) */}
      <div className="bg-white dark:bg-neutral-800/90 border border-black/[0.06] dark:border-white/[0.08] p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
            <YouTubeIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              Download Musik YouTube (Khusus Ibadah & MIDI)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tiga langkah mudah: Tempel link, pilih format kebutuhan gereja, lalu download.
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Input URL */}
      <div className="bg-white dark:bg-neutral-800/90 border border-black/[0.06] dark:border-white/[0.08] p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">1</span>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Tempel Link YouTube
          </h2>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative flex items-center bg-[#F6F6F6] dark:bg-neutral-900/80 border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-1.5 focus-within:border-blue-500 transition">
            <Link2 className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFetchMetadata(url);
              }}
              placeholder="Tempel link https://www.youtube.com/watch?v=..."
              className="flex-1 bg-transparent py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            <button
              onClick={handlePaste}
              className="px-2.5 py-1 text-[11px] font-medium text-blue-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] rounded-lg transition"
            >
              Paste Link
            </button>
          </div>

          <button
            onClick={() => handleFetchMetadata(url)}
            disabled={!url.trim() || isLoadingMetadata}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-medium rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            {isLoadingMetadata ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Cek Info</span>
          </button>
        </div>

        {/* Loading */}
        {isLoadingMetadata && (
          <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>Sedang memeriksa video...</span>
          </div>
        )}

        {/* Error */}
        {metadataError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-300">
            {metadataError}
          </div>
        )}

        {/* Metadata Preview */}
        {metadata && (
          <div className="p-3.5 bg-[#F6F6F6] dark:bg-neutral-900/60 border border-black/[0.06] dark:border-white/[0.06] rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-3 animate-fadeIn">
            {metadata.thumbnail && (
              <img
                src={metadata.thumbnail}
                alt=""
                className="w-36 h-22 object-cover rounded-xl shadow-2xs shrink-0"
              />
            )}
            <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
                {metadata.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 justify-center sm:justify-start">
                {metadata.uploader && <span>👤 {metadata.uploader}</span>}
                {metadata.duration_string && <span>⏱️ {metadata.duration_string}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Choose Preset Format */}
      <div className="bg-white dark:bg-neutral-800/90 border border-black/[0.06] dark:border-white/[0.08] p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">2</span>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Pilih Format Kebutuhan
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {presets.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedFormat === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedFormat(p.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/[0.06] shadow-xs'
                    : 'border-black/[0.06] dark:border-white/[0.08] bg-[#F6F6F6]/60 dark:bg-neutral-900/40 hover:bg-[#F6F6F6]'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${p.accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100">{p.title}</h4>
                      <p className="text-[10px] text-slate-400">{p.subtitle}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 pl-9 leading-relaxed">
                  {p.desc}
                </p>
                {p.badge && (
                  <div className="pl-9 mt-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                      {p.badge}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 3: Download Button */}
      <div className="bg-white dark:bg-neutral-800/90 border border-black/[0.06] dark:border-white/[0.08] p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Folder Output: <span className="font-mono text-slate-700 dark:text-neutral-300">{outputDir}</span>
        </div>
        <button
          onClick={handleDownload}
          disabled={!url.trim()}
          className="w-full sm:w-auto px-7 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-medium text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Mulai Download</span>
        </button>
      </div>
    </div>
  );
};
