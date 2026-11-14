import React from 'react';
import { Folder, FolderOpen, Layers, Sun, Moon } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

interface HeaderProps {
  outputDir: string;
  setOutputDir: (dir: string) => void;
  activeTasksCount: number;
  toggleQueueDrawer: () => void;
  isQueueOpen: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const Header: React.FC<HeaderProps> = ({
  outputDir,
  setOutputDir,
  activeTasksCount,
  toggleQueueDrawer,
  isQueueOpen,
  theme,
  setTheme,
}) => {
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
    <header className="h-16 border-b border-[#E0E2EC] dark:border-[#444746]/60 bg-white/80 dark:bg-[#1E1F20]/80 backdrop-blur-md px-6 flex items-center justify-between transition-colors duration-200">
      {/* Output Directory Display (Google Drive Style Chip) */}
      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 max-w-xl">
        <div className="flex items-center gap-2 bg-[#F0F4F9] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-full px-3 py-1.5 shadow-xs">
          <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Folder:</span>
          <span
            title={outputDir}
            className="truncate font-mono text-xs max-w-xs text-slate-800 dark:text-slate-200 font-medium"
          >
            {outputDir || 'Penyimpanan Lokal'}
          </span>
          <button
            onClick={handleSelectFolder}
            className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline px-1"
          >
            Ubah
          </button>
          <button
            onClick={handleOpenFolder}
            title="Buka Folder di File Explorer"
            className="text-slate-500 hover:text-amber-500 transition p-0.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Action Buttons: Theme Toggle & Task Queue */}
      <div className="flex items-center gap-2.5">
        {/* Theme Toggle (Google Style Circular Button) */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={theme === 'light' ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-[#F0F4F9] dark:hover:bg-[#28292A] border border-transparent hover:border-[#E0E2EC] dark:hover:border-[#444746]/60 transition"
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-700" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* Task Queue Drawer Toggle (Google Material Pill) */}
        <button
          onClick={toggleQueueDrawer}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
            isQueueOpen
              ? 'bg-[#0B57D0] text-white shadow-sm'
              : 'bg-[#F0F4F9] dark:bg-[#28292A] hover:bg-[#E3E8EF] dark:hover:bg-[#333538] text-slate-700 dark:text-slate-200 border border-[#E0E2EC] dark:border-[#444746]/60'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Antrean Tugas</span>
          {activeTasksCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center animate-pulse">
              {activeTasksCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
