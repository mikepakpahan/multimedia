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
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-900/30 p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">PDF & Document Suite</h2>
            <p className="text-sm text-slate-300">
              Konversi dokumen/warta PDF menjadi Microsoft Word (.docx) editable dengan layout presisi, kompresi ukuran file, serta penggabungan PDF.
            </p>
          </div>
        </div>
      </div>

      {/* File Dropzone / Picker */}
      <div
        onClick={handleSelectPdf}
        className="border-2 border-dashed border-slate-700 hover:border-amber-500 bg-slate-900/50 hover:bg-slate-900/80 p-8 rounded-2xl text-center cursor-pointer transition space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 mx-auto flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Klik untuk memilih file PDF</p>
          <p className="text-xs text-slate-400 mt-1">Mendukung satu atau beberapa file PDF sekaligus</p>
        </div>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            <span>Daftar Dokumen PDF ({selectedFiles.length})</span>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-slate-400 hover:text-red-400 transition"
            >
              Hapus Semua
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200"
              >
                <div className="flex items-center gap-2 truncate mr-2">
                  <FileCode2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate" title={file}>{file}</span>
                </div>
                <button
                  onClick={() => handleRemoveFile(idx)}
                  className="text-slate-400 hover:text-red-400 transition p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options Card */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Pilih Aksi Pemrosesan
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div
              onClick={() => setAction('docx')}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                action === 'docx'
                  ? 'bg-amber-600/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-bold block text-white mb-1">Convert to Word (.docx)</span>
              <span className="text-[11px] text-slate-400 leading-tight block">
                Pertahankan tata letak, tabel, dan gambar agar mudah diedit di Word.
              </span>
            </div>

            <div
              onClick={() => setAction('compress-screen')}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                action === 'compress-screen'
                  ? 'bg-amber-600/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-bold block text-white mb-1">Kompresi Hemat (Screen)</span>
              <span className="text-[11px] text-slate-400 leading-tight block">
                Ukuran file sekecil mungkin, ideal untuk kirim via WA/Email.
              </span>
            </div>

            <div
              onClick={() => setAction('compress-print')}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                action === 'compress-print'
                  ? 'bg-amber-600/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-bold block text-white mb-1">Kompresi Standar (E-Book)</span>
              <span className="text-[11px] text-slate-400 leading-tight block">
                Kompresi seimbang tanpa mengurangi ketajaman teks saat dicetak.
              </span>
            </div>

            <div
              onClick={() => setAction('merge')}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                action === 'merge'
                  ? 'bg-amber-600/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-bold block text-white mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Gabungkan Dokumen
              </span>
              <span className="text-[11px] text-slate-400 leading-tight block">
                Satukan beberapa file PDF menjadi 1 file utuh.
              </span>
            </div>
          </div>
        </div>

        {action === 'merge' && (
          <div className="space-y-1.5 pt-2">
            <label className="text-xs text-slate-300 font-medium">Nama File PDF Gabungan:</label>
            <input
              type="text"
              value={mergeFilename}
              onChange={(e) => setMergeFilename(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white"
            />
          </div>
        )}

        <div className="pt-3 flex items-center justify-between border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Tersimpan di: <span className="font-mono text-slate-300">{outputDir}</span>
          </div>
          <button
            onClick={handleProcess}
            disabled={selectedFiles.length === 0 || (action === 'merge' && selectedFiles.length < 2)}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-amber-600/30 flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4" /> Proses Dokumen {selectedFiles.length > 0 ? `(${selectedFiles.length} File)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
