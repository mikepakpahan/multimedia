import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  FileCode2,
  Play,
  X,
  FileCheck,
  Minimize2,
  Layers,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface PdfTabProps {
  outputDir: string;
  onStartToDocx: (filePath: string) => void;
  onStartCompress: (filePath: string, quality: string) => void;
  onStartMerge: (filePaths: string[], outputFilename: string) => void;
}

export const PdfTab: React.FC<PdfTabProps> = ({
  outputDir,
  onStartToDocx,
  onStartCompress,
  onStartMerge,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [action, setAction] = useState<'docx' | 'compress-screen' | 'compress-print' | 'merge'>('docx');
  const [mergeFilename, setMergeFilename] = useState('dokumen_gabungan.pdf');

  const handleSelectPdf = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
      });
      if (selected) {
        if (Array.isArray(selected)) {
          const files = Array.from(new Set([...selectedFiles, ...selected]));
          setSelectedFiles(files);
          if (files.length > 1 && action !== 'merge') {
            setAction('merge');
          }
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

    if (action === 'merge') {
      if (selectedFiles.length < 2) return;
      onStartMerge(selectedFiles, mergeFilename.endsWith('.pdf') ? mergeFilename : `${mergeFilename}.pdf`);
      setSelectedFiles([]);
      return;
    }

    if (action === 'docx') {
      for (const file of selectedFiles) {
        onStartToDocx(file);
      }
    } else if (action === 'compress-screen') {
      for (const file of selectedFiles) {
        onStartCompress(file, 'screen');
      }
    } else if (action === 'compress-print') {
      for (const file of selectedFiles) {
        onStartCompress(file, 'ebook');
      }
    }

    setSelectedFiles([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-8">
      {/* Hero Header */}
      <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-6 md:p-7 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              PDF Suite & Word Converter
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ubah warta jemaat PDF ke Microsoft Word (.docx) dengan layout rapi, kompres ukuran PDF, dan gabungkan lembaran PDF.
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
              Pilih Dokumen PDF
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
          onClick={handleSelectPdf}
          className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-amber-500 dark:hover:border-amber-400 bg-white/60 dark:bg-neutral-800/40 p-7 rounded-3xl text-center cursor-pointer transition space-y-2 group"
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 group-hover:scale-110 transition mx-auto flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-neutral-200">
            Klik untuk Memilih File PDF
          </p>
          <p className="text-xs text-slate-400 dark:text-neutral-500">
            Pilih 1 file untuk Word/Kompres, atau pilih 2+ file untuk digabungkan (Merge)
          </p>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-4 rounded-2xl space-y-2 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400 block px-1">
              {selectedFiles.length} file PDF siap diproses:
            </span>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-neutral-800/70 border border-black/[0.04] dark:border-white/[0.06] rounded-xl text-xs text-slate-700 dark:text-neutral-200"
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <FileCode2 className="w-4 h-4 text-amber-500 shrink-0" />
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

      {/* Step 2: Choose PDF Action */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">
            2
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
            Pilih Aksi Dokumen
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Word Conversion */}
          <div
            onClick={() => setAction('docx')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              action === 'docx'
                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-amber-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Ubah ke Word (.docx)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Tabel, font, dan gambar tetap utuh agar bisa diedit di Microsoft Word.
              </p>
            </div>
          </div>

          {/* Compress */}
          <div
            onClick={() => setAction('compress-screen')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              action === 'compress-screen'
                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-amber-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Minimize2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Kompres Ukuran PDF
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Kecilkan MB dokumen agar mudah dikirim melalui WhatsApp atau email.
              </p>
            </div>
          </div>

          {/* Merge */}
          <div
            onClick={() => setAction('merge')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
              action === 'merge'
                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500 shadow-xs'
                : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-amber-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Gabungkan Beberapa PDF
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Satukan lembaran tata ibadah atau lampiran menjadi 1 file PDF utuh.
              </p>
            </div>
          </div>
        </div>

        {/* Merge filename input */}
        {action === 'merge' && (
          <div className="p-4 bg-white/70 dark:bg-neutral-800/60 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl space-y-2 animate-fadeIn">
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-200 block">
              Nama File PDF Hasil Penggabungan:
            </label>
            <input
              type="text"
              value={mergeFilename}
              onChange={(e) => setMergeFilename(e.target.value)}
              placeholder="dokumen_gabungan.pdf"
              className="w-full bg-white dark:bg-neutral-700 border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-neutral-100"
            />
            {selectedFiles.length < 2 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                ℹ️ Silakan pilih minimal 2 file PDF untuk digabungkan.
              </p>
            )}
          </div>
        )}
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
          disabled={selectedFiles.length === 0 || (action === 'merge' && selectedFiles.length < 2)}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs rounded-xl shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-white" /> Proses Dokumen{' '}
          {selectedFiles.length > 0 ? `(${selectedFiles.length} File)` : ''}
        </button>
      </div>
    </div>
  );
};