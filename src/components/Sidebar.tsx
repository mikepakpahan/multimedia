import React from 'react';
import {
  Video,
  Music,
  Image as ImageIcon,
  FileText,
  Settings,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { YouTubeIcon } from './icons/YouTubeIcon';
import { TabType, EngineStatus } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  engineStatus: EngineStatus | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  engineStatus,
}) => {
  const menuItems = [
    {
      id: 'youtube' as TabType,
      label: 'YouTube & Audio',
      icon: YouTubeIcon,
      badge: 'Church/MIDI',
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
      description: 'Download audio & video presets',
    },
    {
      id: 'video' as TabType,
      label: 'Video Suite',
      icon: Video,
      description: 'Convert & compress MP4, MKV',
    },
    {
      id: 'audio' as TabType,
      label: 'Audio Suite',
      icon: Music,
      description: 'Convert & extract MP3, WAV',
    },
    {
      id: 'image' as TabType,
      label: 'Image Studio',
      icon: ImageIcon,
      description: 'Batch convert & compress',
    },
    {
      id: 'pdf' as TabType,
      label: 'PDF & Documents',
      icon: FileText,
      description: 'PDF to Word & compress',
    },
    {
      id: 'settings' as TabType,
      label: 'Pengaturan',
      icon: Settings,
      description: 'Output folder & engines',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">MultiMedia Studio</h1>
            <p className="text-xs text-slate-400">All-in-One Desktop Suite</p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-medium'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                    }`}
                  />
                  <div>
                    <span className="text-sm block">{item.label}</span>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Engine Status at Bottom */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Engine Status</span>
          <span className="text-[10px] text-slate-500">Local Core</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/80 border border-slate-800/60">
            <span className="text-slate-300 flex items-center gap-1.5">
              FFmpeg:
            </span>
            {engineStatus?.ffmpeg_installed ? (
              <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 text-[11px] font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Standby
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/80 border border-slate-800/60">
            <span className="text-slate-300 flex items-center gap-1.5">
              yt-dlp:
            </span>
            {engineStatus?.ytdlp_installed ? (
              <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 text-[11px] font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Standby
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
