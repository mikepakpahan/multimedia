import React from 'react';
import { Folder, FolderOpen, Layers } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

interface HeaderProps {
  outputDir: string;
  setOutputDir: (dir: string) => void;
  activeTasksCount: number;
  toggleQueueDrawer: () => void;
  isQueueOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  outputDir,
  setOutputDir,
  activeTasksCount,
  toggleQueueDrawer,
  isQueueOpen,
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
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 flex items-center justify-between">
      {/* Output Directory Display */}
      <div className="flex items-center gap-2 text-sm text-slate-300 max-w-xl">
        <span className="text-slate-400 flex items-center gap-1.5 shrink-0 text-xs font-medium">
          <Folder className="w-4 h-4 text-blue-400" />
          Output:
        </span>
        <div
          title={outputDir}
          className="truncate font-mono text-xs bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60 max-w-md text-slate-200"
        >
          {outputDir || 'C:\\Downloads\\MultiMedia'}
        </div>
        <button
          onClick={handleSelectFolder}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-700/60 flex items-center gap-1"
        >
          Ubah
        </button>
        <button
          onClick={handleOpenFolder}
          title="Buka Folder di File Explorer"
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded-lg transition-colors border border-slate-700/60"
        >
          <FolderOpen className="w-4 h-4 text-amber-400" />
        </button>
      </div>

      {/* Task Queue Drawer Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleQueueDrawer}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            isQueueOpen
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Antrean Tugas</span>
          {activeTasksCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center animate-pulse">
              {activeTasksCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
