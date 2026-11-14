import React from 'react';
import { Settings, Folder, CheckCircle2, AlertCircle, RefreshCw, Music } from 'lucide-react';
import { EngineStatus } from '../../types';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

interface SettingsTabProps {
  engineStatus: EngineStatus | null;
  outputDir: string;
  setOutputDir: (dir: string) => void;
  onRefreshEngines: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  engineStatus,
  outputDir,
  setOutputDir,
  onRefreshEngines,
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero Banner (Google Style Simple & Elegant) */}
      <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-6 md:p-8 rounded-3xl shadow-xs transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-normal text-slate-800 dark:text-slate-100 tracking-tight">
              Pengaturan & Informasi Sistem
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Konfigurasi folder penyimpanan hasil, status engine multimedia lokal, dan panduan tim gereja.
            </p>
          </div>
        </div>
      </div>

      {/* Output Folder Card */}
      <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-6 rounded-3xl space-y-4 shadow-xs">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Folder className="w-4 h-4 text-[#0B57D0]" /> Folder Penyimpanan Default
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Semua hasil unduhan dan konversi akan otomatis disimpan ke direktori ini.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={outputDir}
            className="flex-1 bg-[#F0F4F9] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl px-4 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-200"
          />
          <button
            onClick={handleSelectFolder}
            className="px-5 py-2.5 bg-[#F0F4F9] dark:bg-[#28292A] hover:bg-[#E3E8EF] dark:hover:bg-[#333538] text-slate-700 dark:text-slate-200 text-xs font-medium rounded-full border border-[#E0E2EC] dark:border-[#444746]/60 transition"
          >
            Pilih Folder
          </button>
          <button
            onClick={handleOpenFolder}
            className="px-5 py-2.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium rounded-full shadow-xs transition"
          >
            Buka di Explorer
          </button>
        </div>
      </div>

      {/* Engine Status Card */}
      <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-6 rounded-3xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Status Engine Multimedia Lokal
          </h2>
          <button
            onClick={onRefreshEngines}
            className="text-xs text-[#0B57D0] dark:text-[#A8C7FA] hover:underline flex items-center gap-1.5 transition font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Segarkan Status
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 bg-[#F8FAFD] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">FFmpeg (Video & Audio)</span>
              {engineStatus?.ffmpeg_installed ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Terdeteksi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Belum Terpasang di PATH
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 break-all font-mono">
              {engineStatus?.ffmpeg_path || 'Otomatis digunakan untuk konversi video/audio.'}
            </p>
          </div>

          <div className="p-4 bg-[#F8FAFD] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">yt-dlp (YouTube Grabber)</span>
              {engineStatus?.ytdlp_installed ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Terdeteksi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Belum Terpasang
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 break-all font-mono">
              {engineStatus?.ytdlp_path || 'Mendukung unduhan audio dan video YouTube.'}
            </p>
          </div>
        </div>
      </div>

      {/* Practical Guide for Church Teams */}
      <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 p-6 rounded-3xl space-y-2.5">
        <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2 uppercase tracking-wide">
          <Music className="w-4 h-4 text-[#0B57D0]" /> Tips Praktis Tim Multimedia & Musik Gereja
        </h3>
        <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed">
          <li>
            Gunakan format <strong>WAV (48kHz)</strong> saat mengunduh lagu backing track atau referensi aransemen agar frekuensi tinggi tetap jernih dan tidak terdistorsi di sound system gereja.
          </li>
          <li>
            Gunakan format <strong>MP3 (320kbps)</strong> untuk dibagikan ke grup WhatsApp singers dan pemusik agar ukuran file tetap hemat (~8–10MB) namun kualitas vokal tetap terdengar jelas.
          </li>
          <li>
            Kompres rekaman video ibadah / khotbah dengan preset <strong>WhatsApp (&lt; 64MB)</strong> untuk kemudahan arsip dan distribusi mobile.
          </li>
        </ul>
      </div>
    </div>
  );
};
