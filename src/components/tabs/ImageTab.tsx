import React, { useState } from 'react';
import {
  Image as ImageIcon,
  UploadCloud,
  Play,
  FileImage,
  X,
  Globe,
  Camera,
  Layers,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface ImageTabProps {
  outputDir: string;
  onStartConversion: (filePath: string, targetFormat: string, quality: number, scalePercent: number) => void;
}

export const ImageTab: React.FC<ImageTabProps> = ({ outputDir, onStartConversion }) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [activeFormat, setActiveFormat] = useState<'webp' | 'jpg' | 'png' | 'ico'>('webp');
  const [quality, setQuality] = useState(85);
  const [scalePercent, setScalePercent] = useState(100);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      onStartConversion(file, activeFormat, quality, scalePercent);
    }
    setSelectedFiles([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-8">
      {/* Hero Header */}
      <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-6 md:p-7 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              Image Studio & Batch Optimizer
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Kompres banyak foto kegiatan sekaligus tanpa pecah, ubah format ke WebP hemat kuota, atau buat file icon (.ico).
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: File Dropzone / Picker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
              Pilih Foto / Gambar
            </h2>
          </div>
          {selectedFiles.length > 0 && (
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-rose-500 hover:underline cursor-pointer"
            >
              Hapus Semua ({selectedFiles.length})
            </button>
          )}
        </div>

        <div
          onClick={handleSelectImage}
          className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-400 bg-white/60 dark:bg-neutral-800/40 p-7 rounded-3xl text-center cursor-pointer transition space-y-2 group"
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 group-hover:scale-110 transition mx-auto flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-neutral-200">
            Klik untuk Memilih Gambar
          </p>
          <p className="text-xs text-slate-400 dark:text-neutral-500">
            Mendukung JPG, PNG, WebP, BMP (Bisa pilih banyak gambar sekaligus untuk batch compress)
          </p>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-4 rounded-2xl space-y-2 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400 block px-1">
              {selectedFiles.length} gambar siap diproses:
            </span>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-neutral-800/70 border border-black/[0.04] dark:border-white/[0.06] rounded-xl text-xs text-slate-700 dark:text-neutral-200"
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <FileImage className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate font-mono text-[11px]" title={file}>
                      {file.split('\\').pop() || file}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    className="text-slate-400 hover:text-rose-500 transition p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Choose Output Format */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">
            2
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
            Pilih Format & Kebutuhan
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* WebP */}
          <div
            onClick={() => setActiveFormat('webp')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              activeFormat === 'webp'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-emerald-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  WebP (Paling Hemat Ukuran)
                </span>
                <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-md font-semibold">
                  Hemat 80%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Ukuran file berkurang drastis tanpa pecah. Sangat bagus untuk website gereja, display, dan arsip.
              </p>
            </div>
          </div>

          {/* JPG */}
          <div
            onClick={() => setActiveFormat('jpg')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              activeFormat === 'jpg'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-emerald-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                JPG Standar (Foto & Cetak)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Kompatibel dengan semua HP dan laptop lama, cocok untuk cetak album atau pigura.
              </p>
            </div>
          </div>

          {/* PNG */}
          <div
            onClick={() => setActiveFormat('png')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              activeFormat === 'png'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-emerald-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                PNG Transparan (Logo / Grafis)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Menjaga ketajaman garis dan latar transparan untuk logo gereja atau slide presentasi.
              </p>
            </div>
          </div>

          {/* ICO */}
          <div
            onClick={() => setActiveFormat('ico')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              activeFormat === 'ico'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-emerald-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                ICO Icon (Icon Windows & Web)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Ubah gambar persegi menjadi file icon (.ico) multi-layer untuk aplikasi atau favicon.
              </p>
            </div>
          </div>
        </div>

        {/* Quality & Scale Controls */}
        <div className="bg-white/70 dark:bg-neutral-800/60 border border-black/[0.06] dark:border-white/[0.08] p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200">
              Kualitas Kompresi:{' '}
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{quality}%</span>
              <span className="text-[11px] text-slate-400 font-normal ml-2">
                (Rekomendasi: 80% - 85%)
              </span>
            </span>
          </div>

          <input
            type="range"
            min={10}
            max={100}
            value={quality}
            disabled={activeFormat === 'png' || activeFormat === 'ico'}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer disabled:opacity-30"
          />

          {/* Optional Scale Accordion */}
          <div className="pt-1">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400 hover:text-emerald-500 cursor-pointer font-medium"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Ubah Skala Dimensi (Resize)</span>
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showAdvanced && (
              <div className="mt-2.5 p-3 bg-white dark:bg-neutral-700/60 rounded-xl space-y-1.5 animate-fadeIn">
                <label className="text-[11px] font-medium text-slate-600 dark:text-neutral-300 block">
                  Pilih Persentase Resolusi:
                </label>
                <div className="flex gap-2 text-xs">
                  {[100, 75, 50, 25].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setScalePercent(pct)}
                      className={`px-3 py-1 rounded-lg border font-medium transition cursor-pointer ${
                        scalePercent === pct
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-slate-50 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-black/[0.06] dark:border-white/[0.08]'
                      }`}
                    >
                      {pct}% {pct === 100 ? '(Asli)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step 3: Run Action */}
      <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="text-xs text-slate-500 dark:text-neutral-400">
          Tersimpan di:{' '}
          <span className="font-mono text-slate-700 dark:text-neutral-200 font-medium">
            {outputDir ? outputDir.split('\\').pop() || outputDir : 'Folder Default'}
          </span>
        </div>

        <button
          onClick={handleProcess}
          disabled={selectedFiles.length === 0}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs rounded-xl shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-white" /> Optimasi Sekarang{' '}
          {selectedFiles.length > 0 ? `(${selectedFiles.length} Gambar)` : ''}
        </button>
      </div>
    </div>
  );
};