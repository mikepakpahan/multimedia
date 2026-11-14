import React, { useState } from 'react';
import {
  Music,
  Video,
  Download,
  Link,
  Volume2,
  Check,
} from 'lucide-react';
import { YouTubeIcon } from '../icons/YouTubeIcon';
import { EngineStatus } from '../../types';

interface YouTubeTabProps {
  engineStatus: EngineStatus | null;
  outputDir: string;
  onStartDownload: (url: string, format: string) => void;
}

export const YouTubeTab: React.FC<YouTubeTabProps> = ({
  outputDir,
  onStartDownload,
}) => {
  const [url, setUrl] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('wav'); // 'wav' | 'mp3-320' | 'mp4-1080' | 'mp4-720'

  const presets = [
    {
      id: 'wav',
      title: 'Preset: Church Audio / MIDI Source (WAV 48kHz)',
      desc: 'Format tanpa kompresi, kualitas murni untuk sound system gereja, DAW, & keyboard sampler.',
      icon: Volume2,
      badge: 'Direkomendasikan Gereja',
      type: 'audio',
    },
    {
      id: 'mp3-320',
      title: 'High Quality MP3 (320 kbps CBR)',
      desc: 'Audio jernih terbaik dengan ukuran compact. Sangat pas dibagikan ke grup musik / worship leader.',
      icon: Music,
      badge: 'Favorit',
      type: 'audio',
    },
    {
      id: 'mp4-1080',
      title: 'Video Full HD (1080p MP4)',
      desc: 'Video resolusi tinggi untuk layar proyektor ibadah atau arsip visual.',
      icon: Video,
      type: 'video',
    },
    {
      id: 'mp4-720',
      title: 'Video HD (720p MP4)',
      desc: 'Ukuran file lebih hemat, cepat diunduh, cocok untuk video referensi cepat.',
      icon: Video,
      type: 'video',
    },
  ];

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.includes('youtube.com') || text.includes('youtu.be'))) {
        setUrl(text.trim());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    if (!url.trim()) return;
    onStartDownload(url.trim(), selectedFormat);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title & Banner */}
      <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-900/30 p-6 rounded-2xl relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
            <YouTubeIcon className="w-6 h-6 text-red-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">YouTube & Church Media Downloader</h2>
              <span className="text-[11px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-semibold">
                Preset MIDI / Worship
              </span>
            </div>
            <p className="text-sm text-slate-300">
              Download audio backing track, musik pengiring, dan video ibadah langsung dari link YouTube dengan kualitas maksimal tanpa batasan.
            </p>
          </div>
        </div>
      </div>

      {/* URL Input Box */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
          <Link className="w-4 h-4 text-blue-400" /> Masukkan Link YouTube
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
          <button
            onClick={handlePaste}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/60 transition flex items-center gap-1.5"
          >
            Paste Link
          </button>
        </div>

        {/* Format Presets */}
        <div className="pt-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-3">
            Pilih Format Output
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {presets.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedFormat === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedFormat(preset.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-white">{preset.title}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pl-8">{preset.desc}</p>
                  {preset.badge && (
                    <div className="pl-8 mt-2">
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                        {preset.badge}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Download Action Button */}
        <div className="pt-3 flex items-center justify-between border-t border-slate-800/80">
          <div className="text-xs text-slate-400">
            Tersimpan di: <span className="font-mono text-slate-300">{outputDir}</span>
          </div>
          <button
            onClick={handleDownload}
            disabled={!url.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" /> Mulai Download
          </button>
        </div>
      </div>
    </div>
  );
};
