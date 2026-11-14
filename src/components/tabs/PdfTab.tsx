import React, { useState } from 'react';
import { FileText, UploadCloud, FileCode2, Play } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface PdfTabProps {
  outputDir: string;
}

export const PdfTab: React.FC<PdfTabProps> = ({ outputDir }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [action, setAction] = useState('docx'); // 'docx' | 'compress-screen' | 'compress-print'

  const handleSelectPdf = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
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
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-900/30 p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">PDF & Document Suite</h2>
            <p className="text-sm text-slate-300">
              Konversi PDF dokumen/warta menjadi Microsoft Word (.docx) yang dapat diedit, serta perkecil ukuran file PDF.
            </p>
          </div>
        </div>
      </div>

      <div
        onClick={handleSelectPdf}
        className="border-2 border-dashed border-slate-700 hover:border-amber-500 bg-slate-900/50 hover:bg-slate-900/80 p-8 rounded-2xl text-center cursor-pointer transition space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 mx-auto flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        {selectedFile ? (
          <div>
            <p className="text-sm font-semibold text-white flex items-center justify-center gap-2">
              <FileCode2 className="w-4 h-4 text-amber-400" /> {selectedFile}
            </p>
            <p className="text-xs text-slate-400 mt-1">Klik untuk memilih file PDF lain</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-white">Klik untuk memilih file PDF</p>
            <p className="text-xs text-slate-400 mt-1">Mendukung dokumen PDF teks dan gambar</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Aksi yang Diinginkan
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              onClick={() => setAction('docx')}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                action === 'docx'
                  ? 'bg-amber-600/10 border-amber-500 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-sm font-semibold block text-white mb-1">Convert to Word (.docx)</span>
              <span className="text-xs text-slate-400 leading-tight block">
                Pertahankan tata letak, tabel, dan gambar agar mudah diedit.
              </span>
            </div>

            <div
              onClick={() => setAction('compress-screen')}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                action === 'compress-screen'
                  ? 'bg-amber-600/10 border-amber-500 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-sm font-semibold block text-white mb-1">Kompresi Hemat (Screen)</span>
              <span className="text-xs text-slate-400 leading-tight block">
                Ukuran file sekecil mungkin, ideal untuk kirim via WA/Email.
              </span>
            </div>

            <div
              onClick={() => setAction('compress-print')}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                action === 'compress-print'
                  ? 'bg-amber-600/10 border-amber-500 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-sm font-semibold block text-white mb-1">Kompresi Cetak (E-Book)</span>
              <span className="text-xs text-slate-400 leading-tight block">
                Kompresi seimbang tanpa mengurangi ketajaman teks saat dicetak.
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Tersimpan di: <span className="font-mono text-slate-300">{outputDir}</span>
          </div>
          <button
            disabled={!selectedFile}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-amber-600/30 flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4" /> Proses Dokumen
          </button>
        </div>
      </div>
    </div>
  );
};
