import React, { useState } from 'react';
import { Image as ImageIcon, UploadCloud, Play, FileImage } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface ImageTabProps {
  outputDir: string;
}

export const ImageTab: React.FC<ImageTabProps> = ({ outputDir }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState('webp');
  const [quality, setQuality] = useState(85);

  const handleSelectImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'avif', 'tiff', 'ico'] }],
      });
      if (selected && typeof selected === 'string') {
        setSelectedFile(selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-900/30 p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ImageIcon className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Image Studio & Optimizer</h2>
            <p className="text-sm text-slate-300">
              Konversi gambar ke format modern (WebP, AVIF), kompresi tanpa pecah, serta pembuatan icon (.ico).
            </p>
          </div>
        </div>
      </div>

      <div
        onClick={handleSelectImage}
        className="border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-900/50 hover:bg-slate-900/80 p-8 rounded-2xl text-center cursor-pointer transition space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-slate-800 text-emerald-400 mx-auto flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        {selectedFile ? (
          <div>
            <p className="text-sm font-semibold text-white flex items-center justify-center gap-2">
              <FileImage className="w-4 h-4 text-emerald-400" /> {selectedFile}
            </p>
            <p className="text-xs text-slate-400 mt-1">Klik untuk memilih file gambar lain</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-white">Klik untuk memilih Gambar</p>
            <p className="text-xs text-slate-400 mt-1">Mendukung PNG, JPG, WebP, AVIF, BMP, ICO</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Format Tujuan
            </label>
            <select
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="webp">WebP (Ukuran paling hemat untuk web/display)</option>
              <option value="jpg">JPG (Kompatibilitas universal)</option>
              <option value="png">PNG (Transparansi / Lossless)</option>
              <option value="ico">ICO (Favicon / Windows Icon Multi-resolution)</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Kualitas Kompresi
              </label>
              <span className="text-xs font-mono text-emerald-400 font-bold">{quality}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer mt-2"
            />
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Tersimpan di: <span className="font-mono text-slate-300">{outputDir}</span>
          </div>
          <button
            disabled={!selectedFile}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4" /> Optimasi Gambar
          </button>
        </div>
      </div>
    </div>
  );
};
