import React from 'react';
import {
  Video,
  Music,
  Image as ImageIcon,
  FileText,
  Settings,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { YouTubeIcon } from './icons/YouTubeIcon';
import { GoogleBrandIcon } from './icons/GoogleBrandIcon';
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
      badge: 'Gereja / MIDI',
      badgeClass: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/40',
    },
    {
      id: 'video' as TabType,
      label: 'Video Suite',
      icon: Video,
    },
    {
      id: 'audio' as TabType,
      label: 'Audio Suite',
      icon: Music,
    },
    {
      id: 'image' as TabType,
      label: 'Image Studio',
      icon: ImageIcon,
    },
    {
      id: 'pdf' as TabType,
      label: 'PDF & Dokumen',
      icon: FileText,
    },
    {
      id: 'settings' as TabType,
      label: 'Pengaturan',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-[#F0F4F9] dark:bg-[#1E1F20] border-r border-[#E0E2EC] dark:border-[#444746]/60 flex flex-col justify-between h-screen shrink-0 select-none transition-colors duration-200">
      {/* Brand Header */}
      <div>
        <div className="px-6 py-5 flex items-center gap-3">
          <GoogleBrandIcon className="w-7 h-7 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-medium tracking-tight text-slate-800 dark:text-slate-100">MultiMedia</span>
              <span className="text-xs font-semibold px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">Studio</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">All-in-One Desktop Tools</p>
          </div>
        </div>

        {/* Navigation Items (Google Material 3 Pill Style) */}
        <nav className="px-3 py-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-left transition-all duration-150 ${
                  isActive
                    ? 'bg-[#C2E7FF] text-[#001D35] font-semibold dark:bg-[#004A77] dark:text-[#C2E7FF] shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-[#E3E8EF] dark:hover:bg-[#2D2E30] font-normal'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive
                        ? 'text-[#001D35] dark:text-[#C2E7FF]'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  <span className="text-sm">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isActive
                        ? 'bg-white/80 text-blue-900 dark:bg-black/40 dark:text-blue-200'
                        : item.badgeClass
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

      {/* Engine Status at Bottom (Google Material Card style) */}
      <div className="p-4 m-3 rounded-2xl bg-white dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 shadow-xs">
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2 flex items-center justify-between">
          <span>Engine Status</span>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between py-0.5">
            <span className="text-slate-600 dark:text-slate-300">FFmpeg</span>
            {engineStatus?.ffmpeg_installed ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" /> Standby
              </span>
            )}
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-slate-600 dark:text-slate-300">yt-dlp</span>
            {engineStatus?.ytdlp_installed ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" /> Standby
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
