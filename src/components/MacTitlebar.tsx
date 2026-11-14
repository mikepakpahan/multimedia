import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  Layers,
  Sun,
  Moon,
  Minus,
  Plus,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface MacTitlebarProps {
  outputDir: string;
  setOutputDir: (dir: string) => void;
  activeTasksCount: number;
  toggleQueueDrawer: () => void;
  isQueueOpen: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const MacTitlebar: React.FC<MacTitlebarProps> = ({
  outputDir,
  setOutputDir,
  activeTasksCount,
  toggleQueueDrawer,
  isQueueOpen,
  theme,
  setTheme,
  isSidebarCollapsed,
  toggleSidebar,
}) => {
  const [isTrafficHovered, setIsTrafficHovered] = useState(false);

  const handleClose = async () => {
    try {
      await invoke('window_close');
    } catch {
      try {
        await getCurrentWindow().close();
      } catch (err) {
        console.error('Failed to close window:', err);
      }
    }
  };

  const handleMinimize = async () => {
    try {
      await invoke('window_minimize');
    } catch {
      try {
        await getCurrentWindow().minimize();
      } catch (err) {
        console.error('Failed to minimize window:', err);
      }
    }
  };

  const handleMaximize = async () => {
    try {
      await invoke('window_toggle_maximize');
    } catch {
      try {
        await getCurrentWindow().toggleMaximize();
      } catch (err) {
        console.error('Failed to toggle maximize window:', err);
      }
    }
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Pilih Folder Penyimpanan Output',
      });
      if (selected && typeof selected === 'string') {
        setOutputDir(selected);
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await invoke('open_output_folder', { path: outputDir });
    } catch (err) {
      console.error('Failed to open directory:', err);
    }
  };

  return (
    <header className="h-12 bg-[#F6F6F6]/90 dark:bg-[#1E1E1E]/90 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/[0.08] px-4 flex items-center justify-between shrink-0 select-none z-40 transition-colors">
      {/* Left: macOS Traffic Lights & Title */}
      <div className="flex items-center gap-3 shrink-0">
        {/* macOS Traffic Lights Container */}
        <div
          className="flex items-center gap-2 group/lights py-1"
          onMouseEnter={() => setIsTrafficHovered(true)}
          onMouseLeave={() => setIsTrafficHovered(false)}
        >
          {/* Close (Red) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Tutup (Close)"
            className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] hover:bg-[#FF3B30] border border-[#E0443E] shadow-2xs flex items-center justify-center text-[#4C0000] transition-transform active:scale-90 cursor-pointer"
          >
            {isTrafficHovered && <X className="w-2.5 h-2.5 stroke-[3]" />}
          </button>

          {/* Minimize (Yellow) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleMinimize();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Kecilkan (Minimize)"
            className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] hover:bg-[#FF9500] border border-[#DEA123] shadow-2xs flex items-center justify-center text-[#5A3800] transition-transform active:scale-90 cursor-pointer"
          >
            {isTrafficHovered && <Minus className="w-2.5 h-2.5 stroke-[3]" />}
          </button>

          {/* Maximize (Green) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleMaximize();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Perbesar / Kembalikan (Maximize)"
            className="w-3.5 h-3.5 rounded-full bg-[#27C93F] hover:bg-[#34C759] border border-[#1AAB29] shadow-2xs flex items-center justify-center text-[#003800] transition-transform active:scale-90 cursor-pointer"
          >
            {isTrafficHovered && <Plus className="w-2.5 h-2.5 stroke-[3]" />}
          </button>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-slate-300 dark:bg-neutral-700 hidden sm:block" />

        {/* macOS-style Sidebar Toggle Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Bentangkan Sidebar (Lengkap)' : 'Lipat Sidebar (Ringkas)'}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            isSidebarCollapsed
              ? 'text-blue-500 bg-blue-50 dark:bg-blue-950/60'
              : 'text-slate-600 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
          }`}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* App Label */}
        <span
          data-tauri-drag-region
          className="text-xs font-semibold text-slate-700 dark:text-neutral-300 hidden sm:inline tracking-tight cursor-default"
        >
          MultiMedia Studio
        </span>
      </div>

      {/* Center: Draggable Area with Output Folder Pill */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleMaximize}
        className="flex-1 flex items-center justify-center h-full px-4 cursor-default"
      >
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 bg-white/70 dark:bg-neutral-800/70 border border-black/[0.06] dark:border-white/[0.08] rounded-lg px-2.5 py-1 text-slate-700 dark:text-neutral-300 shadow-2xs cursor-auto"
        >
          <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="text-[11px] text-slate-400 dark:text-neutral-500 hidden md:inline">Tersimpan:</span>
          <span className="max-w-[180px] truncate font-mono text-[11px] text-slate-700 dark:text-neutral-200">
            {outputDir ? outputDir.split('\\').pop() || outputDir : 'MultiMedia'}
          </span>
          <button
            onClick={handleSelectFolder}
            className="text-[11px] font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 ml-1 hover:underline cursor-pointer"
          >
            Ubah
          </button>
          <button
            onClick={handleOpenFolder}
            title="Buka folder di File Explorer"
            className="text-slate-400 hover:text-amber-500 transition p-0.5 rounded cursor-pointer"
          >
            <FolderOpen className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right: Theme Toggle & Task Queue (macOS Controls) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Theme Switcher Button */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={theme === 'light' ? 'Beralih ke Dark Mode' : 'Beralih ke Light Mode'}
          className="p-1.5 rounded-lg text-slate-600 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Task Queue Button */}
        <button
          onClick={toggleQueueDrawer}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
            isQueueOpen
              ? 'bg-blue-500 text-white shadow-xs'
              : 'bg-white/80 dark:bg-neutral-800/80 hover:bg-white dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 border border-black/[0.06] dark:border-white/[0.08]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Proses</span>
          {activeTasksCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {activeTasksCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};