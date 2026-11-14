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
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <Settings className="w-6 h-6 text-slate-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Pengaturan & Informasi Sistem</h2>
            <p className="text-sm text-slate-300">
              Konfigurasi folder output, status engine konversi lokal, dan panduan multimedia gereja.
            </p>
          </div>
        </div>
      </div>

      {/* Output Folder Setting */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Folder className="w-4 h-4 text-blue-400" /> Folder Penyimpanan Default
        </h3>
        <p className="text-xs text-slate-400">
          Seluruh hasil unduhan dan konversi akan otomatis disimpan ke direktori ini.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={outputDir}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-300"
          />
          <button
            onClick={handleSelectFolder}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
          >
            Pilih Folder
          </button>
          <button
            onClick={handleOpenFolder}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition"
          >
            Buka di Explorer
          </button>
        </div>
      </div>

      {/* Engine Status Card */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Status Engine Multimedia Lokal
          </h3>
          <button
            onClick={onRefreshEngines}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Segarkan Status
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">FFmpeg (Video & Audio)</span>
              {engineStatus?.ffmpeg_installed ? (
                <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Terdeteksi
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Belum Terpasang di PATH
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 break-all font-mono">
              {engineStatus?.ffmpeg_path || 'Akan dibundel secara otomatis di release installer.'}
            </p>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">yt-dlp (YouTube Grabber)</span>
              {engineStatus?.ytdlp_installed ? (
                <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Terdeteksi
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Belum Terpasang
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 break-all font-mono">
              {engineStatus?.ytdlp_path || 'Mendukung auto-update streaming protocol.'}
            </p>
          </div>
        </div>
      </div>

      {/* Church & MIDI Multimedia Guide */}
      <div className="bg-blue-950/20 border border-blue-900/30 p-5 rounded-2xl space-y-2">
        <h4 className="text-xs font-semibold text-blue-300 flex items-center gap-1.5 uppercase tracking-wide">
          <Music className="w-4 h-4 text-blue-400" /> Tips Praktis Tim Multimedia & Musik Gereja
        </h4>
        <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed">
          <li>
            Gunakan format <strong>WAV (48kHz)</strong> saat mengunduh lagu backing track atau referensi aransemen agar tidak ada kompresi frekuensi tinggi yang hilang saat diputar di sound system gereja.
          </li>
          <li>
            Gunakan format <strong>MP3 (320kbps)</strong> untuk dibagikan ke grup WhatsApp singers dan pemusik agar ukuran tetap hemat namun kualitas vokal tetap terdengar jelas.
          </li>
          <li>
            Kompres rekaman video ibadah / khotbah dengan preset <strong>WhatsApp (&lt; 64MB)</strong> untuk kemudahan arsip dan distribusi mobile.
          </li>
        </ul>
      </div>
    </div>
  );
};
