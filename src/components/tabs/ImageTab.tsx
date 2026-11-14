import React, { useState } from 'react';
import { Image as ImageIcon, UploadCloud, Play, FileImage, X } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface ImageTabProps {
  outputDir: string;
  onStartConversion: (filePath: string, targetFormat: string, quality: number, scalePercent: number) => void;
}

export const ImageTab: React.FC<ImageTabProps> = ({ outputDir, onStartConversion }) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [targetFormat, setTargetFormat] = useState('webp');
  const [quality, setQuality] = useState(85);
  const [scalePercent, setScalePercent] = useState(100);

  const handleSelectImage = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'ico'] }],
      });
      if (selected) {
        if (Array.isArray(selected)) {
          setSelectedFiles((prev) => Array.from(new Set([...prev, ...selected])));
        } else if (typeof selected === 'string') {
          setSelectedFiles((prev) => Array.from(new Set([...prev, selected])));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = () => {
    if (selectedFiles.length === 0) return;
    for (const file of selectedFiles) {
      onStartConversion(file, targetFormat, quality, scalePercent);
    }
    setSelectedFiles([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero Banner (Google Style Simple & Elegant) */}
      <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-6 md:p-8 rounded-3xl shadow-xs transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-normal text-slate-800 dark:text-slate-100 tracking-tight">
              Image Studio & Optimizer
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Konversi gambar kilat native, kompresi ukuran file tanpa pecah (WebP/JPG), dan pembuatan file icon (.ico).
            </p>
          </div>
        </div>
      </div>

      {/* File Dropzone / Picker */}
      <div
        onClick={handleSelectImage}
        className="border-2 border-dashed border-[#C4C7C5] dark:border-[#444746] hover:border-emerald-600 dark:hover:border-emerald-400 bg-[#F8FAFD] dark:bg-[#28292A] p-8 rounded-3xl text-center cursor-pointer transition space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Klik untuk memilih Gambar</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mendukung batch banyak gambar sekaligus (PNG, JPG, WebP, BMP, ICO)</p>
        </div>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-5 rounded-3xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
            <span>Daftar Gambar yang Dipilih ({selectedFiles.length})</span>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-rose-600 hover:underline transition"
            >
              Hapus Semua
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-[#F8FAFD] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-xl text-xs text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2 truncate mr-2">
                  <FileImage className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate" title={file}>{file}</span>
                </div>
                <button
                  onClick={() => handleRemoveFile(idx)}
                  className="text-slate-400 hover:text-rose-500 transition p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options Card */}
      <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-6 rounded-3xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Format Tujuan
            </label>
            <select
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
              className="w-full bg-[#F0F4F9] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            >
              <option value="webp">WebP (Ukuran paling hemat / Web)</option>
              <option value="jpg">JPG (Kompatibilitas universal)</option>
              <option value="png">PNG (Transparansi / Lossless)</option>
              <option value="ico">ICO (Windows App / Favicon Icon)</option>
              <option value="bmp">BMP (Bitmap Standard)</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Kualitas Kompresi
              </label>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">{quality}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              disabled={targetFormat === 'png' || targetFormat === 'ico' || targetFormat === 'bmp'}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer mt-2 disabled:opacity-30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Resize Skala
            </label>
            <select
              value={scalePercent}
              onChange={(e) => setScalePercent(Number(e.target.value))}
              className="w-full bg-[#F0F4F9] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            >
              <option value={100}>100% (Ukuran Asli)</option>
              <option value={75}>75% dari resolusi asli</option>
              <option value={50}>50% (Hemat 4x pixel)</option>
              <option value={25}>25% (Thumbnail kecil)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-[#E0E2EC] dark:border-[#444746]/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Tersimpan di: <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{outputDir}</span>
          </div>
          <button
            onClick={handleProcess}
            disabled={selectedFiles.length === 0}
            className="px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-full shadow-xs hover:shadow-md transition flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Optimasi {selectedFiles.length > 0 ? `(${selectedFiles.length} Gambar)` : 'Gambar'}
          </button>
        </div>
      </div>
    </div>
  );
};
