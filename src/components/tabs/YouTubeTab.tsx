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
  Clock,
  User,
} from 'lucide-react';
import { YouTubeIcon } from '../icons/YouTubeIcon';
import { EngineStatus, YouTubeMetadata } from '../../types';
import { invoke } from '@tauri-apps/api/core';

interface YouTubeTabProps {
  engineStatus: EngineStatus | null;
  outputDir: string;
  onStartDownload: (url: string, format: string, metadata?: YouTubeMetadata) => void;
}

export const YouTubeTab: React.FC<YouTubeTabProps> = ({
  engineStatus,
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
      title: 'Preset Church Audio (WAV 48kHz)',
      desc: 'Format tanpa kompresi murni untuk sound system gereja, keyboard sampler, dan DAW aransemen.',
      icon: Volume2,
      badge: 'Rekomendasi Gereja',
      type: 'audio',
      accent: 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      id: 'mp3-320',
      title: 'High Quality MP3 (320 kbps)',
      desc: 'Audio jernih dengan ukuran hemat, sangat pas dibagikan ke grup singers & pemusik via WhatsApp.',
      icon: Music,
      badge: 'Favorit',
      type: 'audio',
      accent: 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40',
    },
    {
      id: 'mp4-1080',
      title: 'Video Full HD (1080p MP4)',
      desc: 'Kualitas video tajam untuk layar proyektor ibadah, slide khotbah, atau arsip multimedia.',
      icon: Video,
      type: 'video',
      accent: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      id: 'mp4-720',
      title: 'Video HD (720p MP4)',
      desc: 'Ukuran file lebih ringan, proses download lebih cepat, pas untuk referensi cepat.',
      icon: Video,
      type: 'video',
      accent: 'border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40',
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Engine Status Warning if yt-dlp missing */}
      {engineStatus && !engineStatus.ytdlp_installed && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
          <span>⚠️ Engine <strong>yt-dlp</strong> belum terdeteksi. Silakan periksa instalasi di menu Pengaturan.</span>
        </div>
      )}

      {/* Hero Banner (Google Style Simple & Elegant) */}
      <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-6 md:p-8 rounded-3xl shadow-xs transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <YouTubeIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-normal text-slate-800 dark:text-slate-100 tracking-tight">
              YouTube & Church Audio Downloader
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Download audio murni untuk keyboard/sound system gereja atau video ibadah dalam kualitas tertinggi.
            </p>
          </div>
        </div>
      </div>

      {/* Google Search Style URL Input */}
      <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-6 rounded-3xl shadow-xs space-y-5 transition-colors">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
            Masukkan Link Video YouTube
          </label>
          <div className="relative flex items-center bg-[#F0F4F9] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-full px-4 py-1.5 focus-within:border-[#0B57D0] focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40 transition">
            <Link2 className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mr-2.5" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFetchMetadata(url);
              }}
              placeholder="Tempel link https://www.youtube.com/watch?v=... atau https://youtu.be/..."
              className="flex-1 bg-transparent py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button
                onClick={handlePaste}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-full transition"
              >
                Paste
              </button>
              <button
                onClick={() => handleFetchMetadata(url)}
                disabled={!url.trim() || isLoadingMetadata}
                className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] disabled:opacity-40 text-white text-xs font-medium rounded-full shadow-xs transition flex items-center gap-1.5"
              >
                {isLoadingMetadata ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                Periksa
              </button>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoadingMetadata && (
          <div className="py-6 px-4 bg-[#F8FAFD] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl flex items-center justify-center gap-3 text-slate-600 dark:text-slate-300 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-[#0B57D0]" />
            Sedang mengambil informasi video dari YouTube...
          </div>
        )}

        {/* Error message */}
        {metadataError && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-700 dark:text-red-300">
            {metadataError}
          </div>
        )}

        {/* Video Preview Card (Google Material 3 Card) */}
        {metadata && (
          <div className="p-4 bg-[#F8FAFD] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl flex flex-col sm:flex-row gap-4 items-center sm:items-start animate-fadeIn">
            {metadata.thumbnail && (
              <img
                src={metadata.thumbnail}
                alt={metadata.title}
                className="w-44 h-26 object-cover rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 shrink-0"
              />
            )}
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                {metadata.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 justify-center sm:justify-start">
                {metadata.uploader && (
                  <span className="inline-flex items-center gap-1 bg-white dark:bg-[#1E1F20] px-2.5 py-1 rounded-full border border-slate-200 dark:border-neutral-700">
                    <User className="w-3 h-3 text-[#0B57D0]" /> {metadata.uploader}
                  </span>
                )}
                {metadata.duration_string && (
                  <span className="inline-flex items-center gap-1 bg-white dark:bg-[#1E1F20] px-2.5 py-1 rounded-full border border-slate-200 dark:border-neutral-700">
                    <Clock className="w-3 h-3 text-amber-500" /> {metadata.duration_string}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Format Presets */}
        <div className="pt-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-3">
            Pilih Format Unduhan
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {presets.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedFormat === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedFormat(preset.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#0B57D0] bg-blue-50/50 dark:bg-blue-950/30 shadow-xs'
                      : 'border-[#E0E2EC] dark:border-[#444746]/60 bg-[#F8FAFD] dark:bg-[#28292A] hover:bg-white dark:hover:bg-[#333538]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${preset.accent}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{preset.title}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#0B57D0] flex items-center justify-center text-white">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-10">{preset.desc}</p>
                  {preset.badge && (
                    <div className="pl-10 mt-2">
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                        {preset.badge}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button & Output info */}
        <div className="pt-4 flex items-center justify-between border-t border-[#E0E2EC] dark:border-[#444746]/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Tersimpan di: <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{outputDir}</span>
          </div>
          <button
            onClick={handleDownload}
            disabled={!url.trim()}
            className="px-7 py-2.5 bg-[#0B57D0] hover:bg-[#0842A0] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-full shadow-xs hover:shadow-md transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Sekarang
          </button>
        </div>
      </div>
    </div>
  );
};
