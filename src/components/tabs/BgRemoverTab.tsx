import React, { useState } from 'react';
import {
  Wand2,
  UploadCloud,
  Play,
  FileImage,
  X,
  Sparkles,
  Zap,
  Check,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface BgRemoverTabProps {
  outputDir: string;
  onStartRemoveBg: (filePath: string, method: string, bgColor: string) => void;
}

export const BgRemoverTab: React.FC<BgRemoverTabProps> = ({
  outputDir,
  onStartRemoveBg,
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [method, setMethod] = useState<'ai' | 'color'>('ai');
  const [bgColor, setBgColor] = useState<string>('transparent');

  const handleSelectImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: 'Pilih Foto untuk Dihapus Background-nya',
        filters: [{ name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }],
      });
      if (selected && typeof selected === 'string') {
        setSelectedFile(selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const colorPresets = [
    { id: 'transparent', label: 'Transparan (PNG)', color: 'transparent', desc: 'Latar bolong untuk Canva / Slide Poster' },
    { id: '#DC2626', label: 'Merah Pas Foto', color: '#DC2626', desc: 'Standar resmi ijazah, KTP, & berkas dinas' },
    { id: '#2563EB', label: 'Biru Pas Foto', color: '#2563EB', desc: 'Standar resmi buku nikah & dokumen instansi' },
    { id: '#FFFFFF', label: 'Putih Bersih', color: '#FFFFFF', desc: 'Standar foto katalog produk & profil formal' },
    { id: '#000000', label: 'Hitam Studio', color: '#000000', desc: 'Elegan dan kontras untuk potret artistik' },
  ];

  const handleProcess = () => {
    if (!selectedFile) return;
    onStartRemoveBg(selectedFile, method, bgColor);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-8">
      {/* Hero Header */}
      <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-6 md:p-7 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
            <Wand2 className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200/60 dark:border-rose-800/40 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> AI Cutout Studio
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              Hapus Background Foto & Pas Foto
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Potong otomatis latar belakang foto orang/produk dengan AI, buat latar transparan, atau ganti warna latar pas foto merah/biru.
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: File Dropzone / Picker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
              Pilih Foto
            </h2>
          </div>
          {selectedFile && (
            <button
              onClick={() => setSelectedFile(null)}
              className="text-xs text-rose-500 hover:underline cursor-pointer"
            >
              Ganti Foto Lain
            </button>
          )}
        </div>

        {!selectedFile ? (
          <div
            onClick={handleSelectImage}
            className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-rose-500 dark:hover:border-rose-400 bg-white/60 dark:bg-neutral-800/40 p-8 rounded-3xl text-center cursor-pointer transition space-y-2 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 group-hover:scale-110 transition mx-auto flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-neutral-200">
              Pilih atau Seret Foto ke Sini
            </p>
            <p className="text-xs text-slate-400 dark:text-neutral-500">
              Foto portrait wajah, foto produk, logo, atau stempel (JPG, PNG, WebP)
            </p>
          </div>
        ) : (
          <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-4 rounded-2xl flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3 truncate mr-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shrink-0">
                <FileImage className="w-5 h-5" />
              </div>
              <div className="truncate">
                <span className="text-xs font-semibold text-slate-800 dark:text-neutral-100 block truncate" title={selectedFile}>
                  {selectedFile.split('\\').pop() || selectedFile}
                </span>
                <span className="text-[11px] text-slate-400 block truncate font-mono">
                  {selectedFile}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-slate-400 hover:text-rose-500 transition p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Choose Method & Background Replacement */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
            2
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
            Pilih Metode & Warna Latar Baru
          </h2>
        </div>

        {/* Method Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => setMethod('ai')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              method === 'ai'
                ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 dark:border-rose-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-rose-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  AI Deep Learning (Rekomendasi)
                </span>
                <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.2 rounded-md font-semibold">
                  Presisi
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Memotong otomatis subjek foto manusia, helaian rambut, pakaian, dan objek rumit dengan tepian rapi.
              </p>
            </div>
          </div>

          <div
            onClick={() => setMethod('color')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              method === 'color'
                ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 dark:border-rose-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-rose-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Pembersih Warna Cepat (Logo / Polos)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Sangat kilat (0ms). Cocok untuk menghapus background putih/hijau studio pada logo, stempel, atau pas foto berlatar polos.
              </p>
            </div>
          </div>
        </div>

        {/* Background Color Swatches */}
        <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-5 rounded-3xl space-y-3 shadow-xs">
          <label className="text-xs font-semibold text-slate-700 dark:text-neutral-200 block">
            Ganti Warna Background Menjadi:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {colorPresets.map((preset) => {
              const isSelected = bgColor === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setBgColor(preset.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition flex items-center gap-3 ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 shadow-xs ring-1 ring-rose-500'
                      : 'border-black/[0.06] dark:border-white/[0.08] hover:border-rose-300 bg-white/60 dark:bg-neutral-800/60'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl border border-black/10 flex items-center justify-center shrink-0 ${
                      preset.id === 'transparent'
                        ? 'bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] bg-[size:8px_8px] bg-[position:0_0,0_4px,4px_-4px,-4px_0]'
                        : ''
                    }`}
                    style={preset.id !== 'transparent' ? { backgroundColor: preset.color } : {}}
                  >
                    {isSelected && (
                      <Check className={`w-4 h-4 ${preset.id === '#FFFFFF' ? 'text-slate-800' : 'text-white'}`} />
                    )}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block truncate">
                      {preset.label}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {preset.desc}
                    </span>
                  </div>
                </div>
              );
            })}
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
          disabled={!selectedFile}
          className="w-full sm:w-auto px-7 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs rounded-xl shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-white" /> Hapus Background Sekarang
        </button>
      </div>
    </div>
  );
};