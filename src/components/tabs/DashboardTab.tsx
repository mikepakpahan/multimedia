import React, { useState } from 'react';
import {
  UploadCloud,
  ArrowRight,
  Sparkles,
  Zap,
  FileCode,
  FileText,
  Image as ImageIcon,
  Music,
  Wand2,
  Subtitles,
} from 'lucide-react';
import { YouTubeIcon } from '../icons/YouTubeIcon';
import { TabType } from '../../types';
import { open } from '@tauri-apps/plugin-dialog';

interface DashboardTabProps {
  onNavigate: (tab: TabType) => void;
  onQuickProcessVideo: (file: string, format: string, preset: string) => void;
  onQuickProcessAudio: (file: string, format: string, bitrate: string) => void;
  onQuickProcessPdf: (file: string, action: 'docx' | 'compress') => void;
  onQuickProcessImage: (file: string, format: string, quality: number) => void;
  onQuickRemoveBg: (file: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  onNavigate,
  onQuickProcessVideo,
  onQuickProcessAudio,
  onQuickProcessPdf,
  onQuickProcessImage,
  onQuickRemoveBg,
}) => {
  const [droppedFile, setDroppedFile] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<'video' | 'audio' | 'pdf' | 'image' | null>(null);

  const handlePickAnyFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: 'Pilih File Apa Saja untuk Diproses Cepat',
      });
      if (selected && typeof selected === 'string') {
        setDroppedFile(selected);
        const ext = selected.split('.').pop()?.toLowerCase();
        if (['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv'].includes(ext || '')) {
          setDetectedType('video');
        } else if (['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac'].includes(ext || '')) {
          setDetectedType('audio');
        } else if (['pdf'].includes(ext || '')) {
          setDetectedType('pdf');
        } else if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext || '')) {
          setDetectedType('image');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearDroppedFile = () => {
    setDroppedFile(null);
    setDetectedType(null);
  };

  const quickActions = [
    {
      title: 'Download Lagu YouTube',
      desc: 'Ambil audio murni (WAV/MP3) untuk backing track keyboard gereja atau video.',
      tab: 'youtube' as TabType,
      icon: YouTubeIcon,
      accent: 'from-red-500/10 to-red-500/5 text-red-500 border-red-500/20',
      tag: 'Paling Populer',
      tagColor: 'bg-red-500 text-white',
    },
    {
      title: 'Kompres Video untuk WA',
      desc: 'Kecilkan rekaman video agar langsung muat dikirim di WhatsApp (< 64MB).',
      tab: 'video' as TabType,
      icon: Zap,
      accent: 'from-blue-500/10 to-blue-500/5 text-blue-500 border-blue-500/20',
      tag: '1-Klik Selesai',
      tagColor: 'bg-blue-500 text-white',
    },
    {
      title: 'Ubah PDF ke Word (.docx)',
      desc: 'Buka dan edit kembali dokumen warta atau laporan PDF di Microsoft Word.',
      tab: 'pdf' as TabType,
      icon: FileText,
      accent: 'from-amber-500/10 to-amber-500/5 text-amber-500 border-amber-500/20',
      tag: 'Format Rapi',
      tagColor: 'bg-amber-500 text-white',
    },
    {
      title: 'Transkrip Video & YouTube',
      desc: 'Ubah percakapan video/audio atau link YouTube jadi teks rapi & subtitle SRT dengan AI.',
      tab: 'transcribe' as TabType,
      icon: Subtitles,
      accent: 'from-teal-500/10 to-teal-500/5 text-teal-500 border-teal-500/20',
      tag: 'AI Speech-to-Text',
      tagColor: 'bg-teal-500 text-white',
    },
    {
      title: 'Hapus Background & Pas Foto',
      desc: 'Potong otomatis subjek dengan AI transparan atau buat pas foto merah/biru.',
      tab: 'bgremover' as TabType,
      icon: Wand2,
      accent: 'from-rose-500/10 to-rose-500/5 text-rose-500 border-rose-500/20',
      tag: 'AI Terbaru',
      tagColor: 'bg-rose-500 text-white',
    },
    {
      title: 'Kecilkan Ukuran Foto',
      desc: 'Kompres banyak foto kegiatan sekaligus tanpa pecah untuk arsip & web.',
      tab: 'image' as TabType,
      icon: ImageIcon,
      accent: 'from-emerald-500/10 to-emerald-500/5 text-emerald-500 border-emerald-500/20',
      tag: 'Batch Cepat',
      tagColor: 'bg-emerald-500 text-white',
    },
    {
      title: 'Ekstrak Audio dari Video',
      desc: 'Ambil suara lagu atau vokal dari file rekaman video MP4 menjadi MP3/WAV.',
      tab: 'video' as TabType,
      icon: Music,
      accent: 'from-purple-500/10 to-purple-500/5 text-purple-500 border-purple-500/20',
      tag: 'Untuk Sound',
      tagColor: 'bg-purple-500 text-white',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-7 pb-8 animate-fadeIn">
      {/* Friendly Welcome Banner */}
      <div className="bg-gradient-to-br from-white to-[#F0F4F8] dark:from-[#232325] dark:to-[#1B1B1D] border border-black/[0.06] dark:border-white/[0.08] p-6 md:p-8 rounded-3xl shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-200/60 dark:border-blue-800/40">
              <Sparkles className="w-3.5 h-3.5" /> Panduan Pemula
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              Halo! Mau proses apa hari ini?
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Aplikasi ini mempermudah konversi media, unduh musik gereja, kompres video, dan ubah PDF tanpa pengaturan rumit.
            </p>
          </div>

          <button
            onClick={() => onNavigate('youtube')}
            className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs shadow-sm hover:shadow transition flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <YouTubeIcon className="w-4 h-4 fill-white" /> Buka YouTube Hub
          </button>
        </div>
      </div>

      {/* Universal Quick Dropzone / Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
            Pemroses Cepat File (Universal Dropzone)
          </h2>
          {droppedFile && (
            <button
              onClick={clearDroppedFile}
              className="text-xs text-blue-500 hover:underline"
            >
              Ganti File Lain
            </button>
          )}
        </div>

        {!droppedFile ? (
          <div
            onClick={handlePickAnyFile}
            className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 bg-white/60 dark:bg-neutral-800/40 p-8 rounded-3xl text-center cursor-pointer transition space-y-2 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 group-hover:scale-110 transition mx-auto flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-neutral-200">
              Pilih atau Seret File Apapun ke Sini
            </p>
            <p className="text-xs text-slate-400 dark:text-neutral-500">
              Video (MP4/MKV), Audio (MP3/WAV), Dokumen PDF, atau Foto (JPG/PNG/WebP)
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-800 border border-black/[0.08] dark:border-white/[0.08] p-5 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                  <FileCode className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block truncate" title={droppedFile}>
                    {droppedFile.split('\\').pop() || droppedFile}
                  </span>
                  <span className="text-[11px] text-slate-400 capitalize">
                    Terdeteksi: {detectedType ? `${detectedType} file` : 'Dokumen'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contextual Quick Action Buttons depending on file type */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-600 dark:text-neutral-300 block">
                Pilih aksi yang ingin langsung dijalankan:
              </span>

              {detectedType === 'video' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => {
                      onQuickProcessVideo(droppedFile, 'mp4', 'whatsapp');
                      clearDroppedFile();
                    }}
                    className="p-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-200 dark:border-blue-900 rounded-2xl text-left text-xs transition space-y-1"
                  >
                    <span className="font-semibold text-blue-700 dark:text-blue-300 block">⚡ Kompres untuk WA</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Ukuran pas &lt; 64MB tanpa mikir bitrate.</span>
                  </button>

                  <button
                    onClick={() => {
                      onQuickProcessVideo(droppedFile, 'mp3', 'high');
                      clearDroppedFile();
                    }}
                    className="p-3 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 border border-purple-200 dark:border-purple-900 rounded-2xl text-left text-xs transition space-y-1"
                  >
                    <span className="font-semibold text-purple-700 dark:text-purple-300 block">🎵 Ekstrak Audio (MP3)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Ambil suaranya saja untuk latihan lagu.</span>
                  </button>

                  <button
                    onClick={() => {
                      onQuickProcessVideo(droppedFile, 'mp4', 'medium');
                      clearDroppedFile();
                    }}
                    className="p-3 bg-slate-50 dark:bg-neutral-700 hover:bg-slate-100 border border-slate-200 dark:border-neutral-600 rounded-2xl text-left text-xs transition space-y-1"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200 block">🎬 Ubah ke MP4</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Format universal untuk TV & proyektor.</span>
                  </button>
                </div>
              )}

              {detectedType === 'pdf' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      onQuickProcessPdf(droppedFile, 'docx');
                      clearDroppedFile();
                    }}
                    className="p-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200 dark:border-amber-900 rounded-2xl text-left text-xs transition space-y-1"
                  >
                    <span className="font-semibold text-amber-700 dark:text-amber-300 block">📝 Ubah ke Word (.docx)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Buka dan edit tabel & teks di Microsoft Word.</span>
                  </button>

                  <button
                    onClick={() => {
                      onQuickProcessPdf(droppedFile, 'compress');
                      clearDroppedFile();
                    }}
                    className="p-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-200 dark:border-blue-900 rounded-2xl text-left text-xs transition space-y-1"
                  >
                    <span className="font-semibold text-blue-700 dark:text-blue-300 block">🗜️ Kompres Ukuran PDF</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Kecilkan ukuran file agar mudah dikirim email.</span>
                  </button>
                </div>
              )}

              {detectedType === 'image' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => {
                      onQuickRemoveBg(droppedFile);
                      clearDroppedFile();
                    }}
                    className="p-3 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 rounded-2xl text-left text-xs transition space-y-1"
                  >
                    <span className="font-semibold text-rose-700 dark:text-rose-300 block">✨ Hapus Background (AI)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Potong latar transparan atau ganti pas foto.</span>
                  </button>

                  <button
                    onClick={() => {
                      onQuickProcessImage(droppedFile, 'webp', 80);
                      clearDroppedFile();
                    }}
                    className="p-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-left text-xs transition space-y-1"
                  >
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 block">🖼️ Kompres ke WebP</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Hemat ukuran 80% untuk web.</span>
                  </button>

                  <button
                    onClick={() => {
                      onQuickProcessImage(droppedFile, 'jpg', 85);
                      clearDroppedFile();
                    }}
                    className="p-3 bg-slate-50 dark:bg-neutral-700 hover:bg-slate-100 border border-slate-200 dark:border-neutral-600 rounded-2xl text-left text-xs transition space-y-1"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200 block">📷 Simpan JPEG</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Format standar untuk semua HP.</span>
                  </button>
                </div>
              )}

              {detectedType === 'audio' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      onQuickProcessAudio(droppedFile, 'wav', '320');
                      clearDroppedFile();
                    }}
                    className="p-3 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-900 rounded-2xl text-left text-xs transition space-y-1"
                  >
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300 block">🎹 Ubah ke WAV (Gereja / DAW)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Kualitas murni tanpa kompresi untuk sound system.</span>
                  </button>

                  <button
                    onClick={() => {
                      onQuickProcessAudio(droppedFile, 'mp3', '320');
                      clearDroppedFile();
                    }}
                    className="p-3 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 border border-red-200 dark:border-red-900 rounded-2xl text-left text-xs transition space-y-1"
                  >
                    <span className="font-semibold text-red-700 dark:text-red-300 block">🎧 Kompres ke MP3 320k</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Kualitas jernih untuk dibagikan via WhatsApp.</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5 Big macOS Bento Action Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
          Menu Pilihan Cepat
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {quickActions.map((act, idx) => {
            const Icon = act.icon;
            return (
              <div
                key={idx}
                onClick={() => onNavigate(act.tab)}
                className="p-5 bg-white dark:bg-neutral-800/90 border border-black/[0.06] dark:border-white/[0.08] hover:border-blue-500/50 dark:hover:border-blue-400/50 rounded-3xl cursor-pointer transition shadow-xs hover:shadow-md group flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${act.accent} border flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {act.tag && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${act.tagColor}`}>
                      {act.tag}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-500 transition">
                    {act.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {act.desc}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium text-blue-500 group-hover:translate-x-1 transition-transform">
                  <span>Mulai Sekarang</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
