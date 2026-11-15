import React from 'react';
import { Settings, Folder, Music, FolderOpen } from 'lucide-react';
import { EngineStatus } from '../../types';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

interface SettingsTabProps {
  engineStatus?: EngineStatus | null;
  outputDir: string;
  setOutputDir: (dir: string) => void;
  onRefreshEngines?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  outputDir,
  setOutputDir,
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
      console.error(err);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await invoke('open_output_folder', { path: outputDir });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-8">
      {/* Hero Header */}
      <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-6 md:p-7 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-500/10 dark:bg-slate-500/20 text-slate-600 dark:text-slate-300 border border-slate-500/20 flex items-center justify-center shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              Pengaturan Aplikasi
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Konfigurasi folder penyimpanan default dan panduan praktis penggunaan studio multimedia.
            </p>
          </div>
        </div>
      </div>

      {/* Output Folder Settings */}
      <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-5 md:p-6 rounded-3xl space-y-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Folder className="w-4 h-4 text-blue-500" /> Folder Penyimpanan Hasil
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Semua hasil unduhan YouTube, konversi video/audio, dan dokumen PDF akan otomatis disimpan di sini.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            readOnly
            value={outputDir}
            className="flex-1 bg-slate-50 dark:bg-neutral-800/80 border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-mono text-slate-700 dark:text-neutral-200"
          />
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleSelectFolder}
              className="px-4 py-2 bg-white dark:bg-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-600 text-slate-700 dark:text-neutral-200 text-xs font-medium rounded-xl border border-black/[0.08] dark:border-white/[0.1] transition cursor-pointer"
            >
              Ubah Folder
            </button>
            <button
              onClick={handleOpenFolder}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" /> Buka di Explorer
            </button>
          </div>
        </div>
      </div>

      {/* Practical Guide for Church Teams */}
      <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-200/60 dark:border-blue-900/40 p-6 rounded-3xl space-y-3">
        <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2 uppercase tracking-wide">
          <Music className="w-4 h-4 text-blue-500" /> Tips Praktis Tim Multimedia & Musik Gereja
        </h3>
        <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
          <li>
            <strong>Backing Track Keyboard / Sound System:</strong> Selalu pilih format <strong>WAV (48kHz)</strong> di tab YouTube atau Audio Converter agar dinamika instrumen dan vokal jernih di mixer.
          </li>
          <li>
            <strong>Grup WhatsApp Singers / Pemusik:</strong> Gunakan preset <strong>MP3 (320kbps)</strong> agar file ringan (~8MB) dan langsung bisa diputar di HP Android & iPhone tanpa aplikasi tambahan.
          </li>
          <li>
            <strong>Dokumen Warta Jemaat:</strong> Gunakan tab PDF Suite untuk mengubah PDF menjadi dokumen Word (.docx) agar mudah diedit kembali saat ada perubahan lirik atau pengumuman.
          </li>
          <li>
            <strong>Rekaman Khotbah & Video Ibadah:</strong> Gunakan preset <strong>Kompres untuk WhatsApp</strong> di tab Video untuk memperkecil ukuran di bawah 64MB secara otomatis.
          </li>
        </ul>
      </div>
    </div>
  );
};