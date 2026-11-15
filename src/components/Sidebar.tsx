import React from 'react';
import {
  Home,
  Video,
  Music,
  Image as ImageIcon,
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Wand2,
  Subtitles,
} from 'lucide-react';
import { YouTubeIcon } from './icons/YouTubeIcon';
import { TabType, EngineStatus } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  engineStatus?: EngineStatus | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  onToggleCollapse,
}) => {
  const sections = [
    {
      title: 'UTAMA',
      items: [
        {
          id: 'dashboard' as TabType,
          label: 'Beranda (Dashboard)',
          icon: Home,
          badge: 'Mulai',
          color: 'text-blue-500',
        },
      ],
    },
    {
      title: 'MEDIA TOOLS',
      items: [
        {
          id: 'youtube' as TabType,
          label: 'YouTube & Musik',
          icon: YouTubeIcon,
          badge: 'Gereja',
          color: 'text-red-500',
        },
        {
          id: 'transcribe' as TabType,
          label: 'Transkrip Video',
          icon: Subtitles,
          badge: 'AI',
          color: 'text-teal-500',
        },
        {
          id: 'video' as TabType,
          label: 'Video Converter',
          icon: Video,
          color: 'text-indigo-500',
        },
        {
          id: 'audio' as TabType,
          label: 'Audio Converter',
          icon: Music,
          color: 'text-purple-500',
        },
      ],
    },
    {
      title: 'DOKUMEN & FOTO',
      items: [
        {
          id: 'bgremover' as TabType,
          label: 'Hapus Background',
          icon: Wand2,
          badge: 'AI',
          color: 'text-rose-500',
        },
        {
          id: 'image' as TabType,
          label: 'Kompres Gambar',
          icon: ImageIcon,
          color: 'text-emerald-500',
        },
        {
          id: 'pdf' as TabType,
          label: 'PDF ke Word & Tools',
          icon: FileText,
          color: 'text-amber-500',
        },
      ],
    },
    {
      title: 'APLIKASI',
      items: [
        {
          id: 'settings' as TabType,
          label: 'Pengaturan',
          icon: Settings,
          color: 'text-slate-500',
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-[#F6F6F6]/90 dark:bg-[#1E1E1E]/90 backdrop-blur-2xl border-r border-black/[0.06] dark:border-white/[0.08] flex flex-col justify-between h-full shrink-0 select-none transition-all duration-200 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Header / Navigation Sections */}
      <div className="p-2.5 space-y-3 overflow-y-auto overflow-x-hidden">
        {/* Sidebar Header with Toggle button */}
        <div className={`flex items-center pb-1 ${isCollapsed ? 'flex-col gap-2' : 'justify-between px-2'}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-100 tracking-tight">
                MultiMedia Studio
              </span>
            </div>
          ) : (
            <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain mx-auto" />
          )}
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Bentangkan Sidebar (Lengkap)' : 'Lipat Sidebar (Ringkas)'}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Navigation Groups */}
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed ? (
              <h4 className="px-2 text-[10px] font-bold text-slate-400 dark:text-neutral-500 tracking-wider">
                {section.title}
              </h4>
            ) : (
              sIdx > 0 && <div className="h-px w-6 mx-auto bg-black/[0.06] dark:bg-white/[0.08] my-1.5" />
            )}

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={isCollapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
                    className={`relative w-full flex items-center transition-all duration-150 cursor-pointer ${
                      isCollapsed
                        ? 'justify-center p-2 rounded-xl'
                        : 'justify-between px-2.5 py-1.5 rounded-lg text-xs'
                    } ${
                      isActive
                        ? 'bg-blue-500 text-white font-medium shadow-xs'
                        : 'text-slate-700 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : 'truncate'}`}>
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : item.color
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-md font-medium shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-black/[0.05] dark:bg-white/[0.08] text-slate-500 dark:text-neutral-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Dot indicator when collapsed if item has badge */}
                    {isCollapsed && item.badge && !isActive && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};