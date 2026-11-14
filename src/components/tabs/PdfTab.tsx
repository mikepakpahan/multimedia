import React, { useState } from 'react';
import { FileText, UploadCloud, FileCode2, Play, X, Layers } from 'lucide-react';
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
  const [mergeFilename, setMergeFilename] = useState('merged_document.pdf');

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero Banner (Google Style Simple & Elegant) */}
      <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-6 md:p-8 rounded-3xl shadow-xs transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-normal text-slate-800 dark:text-slate-100 tracking-tight">
              PDF & Document Suite
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Konversi PDF ke Microsoft Word (.docx) dengan tata letak presisi, kompresi ukuran PDF, dan penggabungan dokumen.
            </p>
          </div>
        </div>
      </div>

      {/* File Dropzone / Picker */}
      <div
        onClick={handleSelectPdf}
        className="border-2 border-dashed border-[#C4C7C5] dark:border-[#444746] hover:border-amber-600 dark:hover:border-amber-400 bg-[#F8FAFD] dark:bg-[#28292A] p-8 rounded-3xl text-center cursor-pointer transition space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Klik untuk memilih file PDF</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mendukung satu atau beberapa dokumen PDF sekaligus</p>
        </div>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="bg-white dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 p-5 rounded-3xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
            <span>Daftar Dokumen PDF ({selectedFiles.length})</span>
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
                  <FileCode2 className="w-4 h-4 text-amber-600 shrink-0" />
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
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
            Pilih Aksi Dokumen
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div
              onClick={() => setAction('docx')}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                action === 'docx'
                  ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 shadow-xs'
                  : 'border-[#E0E2EC] dark:border-[#444746]/60 bg-[#F8FAFD] dark:bg-[#28292A] hover:bg-white dark:hover:bg-[#333538]'
              }`}
            >
              <span className="text-xs font-bold block text-slate-900 dark:text-slate-100 mb-1">Convert to Word</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                Pertahankan tata letak, tabel, dan gambar agar mudah diedit di Word (.docx).
              </span>
            </div>

            <div
              onClick={() => setAction('compress-screen')}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                action === 'compress-screen'
                  ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 shadow-xs'
                  : 'border-[#E0E2EC] dark:border-[#444746]/60 bg-[#F8FAFD] dark:bg-[#28292A] hover:bg-white dark:hover:bg-[#333538]'
              }`}
            >
              <span className="text-xs font-bold block text-slate-900 dark:text-slate-100 mb-1">Kompresi Hemat</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                Ukuran file sekecil mungkin, ideal untuk kirim via WhatsApp atau Email.
              </span>
            </div>

            <div
              onClick={() => setAction('compress-print')}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                action === 'compress-print'
                  ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 shadow-xs'
                  : 'border-[#E0E2EC] dark:border-[#444746]/60 bg-[#F8FAFD] dark:bg-[#28292A] hover:bg-white dark:hover:bg-[#333538]'
              }`}
            >
              <span className="text-xs font-bold block text-slate-900 dark:text-slate-100 mb-1">Kompresi Cetak</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                Kualitas seimbang tanpa mengurangi ketajaman teks saat dicetak.
              </span>
            </div>

            <div
              onClick={() => setAction('merge')}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                action === 'merge'
                  ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 shadow-xs'
                  : 'border-[#E0E2EC] dark:border-[#444746]/60 bg-[#F8FAFD] dark:bg-[#28292A] hover:bg-white dark:hover:bg-[#333538]'
              }`}
            >
              <span className="text-xs font-bold block text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-600" /> Gabungkan PDF
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                Satukan beberapa dokumen PDF menjadi 1 file utuh.
              </span>
            </div>
          </div>
        </div>

        {action === 'merge' && (
          <div className="space-y-1.5 pt-2">
            <label className="text-xs text-slate-600 dark:text-slate-300 font-medium">Nama File PDF Gabungan:</label>
            <input
              type="text"
              value={mergeFilename}
              onChange={(e) => setMergeFilename(e.target.value)}
              className="w-full bg-[#F0F4F9] dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        <div className="pt-4 flex items-center justify-between border-t border-[#E0E2EC] dark:border-[#444746]/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Tersimpan di: <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{outputDir}</span>
          </div>
          <button
            onClick={handleProcess}
            disabled={selectedFiles.length === 0 || (action === 'merge' && selectedFiles.length < 2)}
            className="px-7 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-full shadow-xs hover:shadow-md transition flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Proses Dokumen {selectedFiles.length > 0 ? `(${selectedFiles.length} File)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
