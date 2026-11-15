import React, { useState } from 'react';
import {
  Subtitles,
  UploadCloud,
  Play,
  FileAudio,
  X,
  Sparkles,
  Search,
  Copy,
  Check,
  FolderOpen,
  Clock,
  Languages,
  RefreshCw,
  FileText,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { YouTubeIcon } from '../icons/YouTubeIcon';
import { TranscriptionResult, EngineStatus } from '../../types';

interface TranscribeTabProps {
  outputDir: string;
  engineStatus: EngineStatus | null;
  onStartTranscription: (
    input: string,
    model: string,
    language: string,
    titleHint?: string
  ) => Promise<void>;
  activeResult: TranscriptionResult | null;
  isProcessing: boolean;
  currentProgress: number;
  currentMessage: string;
  errorMessage?: string | null;
}

export const TranscribeTab: React.FC<TranscribeTabProps> = ({
  outputDir,
  onStartTranscription,
  activeResult,
  isProcessing,
  currentProgress,
  currentMessage,
  errorMessage,
}) => {
  const [sourceType, setSourceType] = useState<'local' | 'youtube'>('local');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [language, setLanguage] = useState<string>('auto');
  const [modelSize, setModelSize] = useState<string>('base');
  const [viewMode, setViewMode] = useState<'full' | 'segments'>('full');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const handlePickLocalFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: 'Pilih File Video atau Audio untuk Ditranskrip',
        filters: [
          {
            name: 'Media Files',
            extensions: ['mp4', 'mkv', 'mov', 'avi', 'webm', 'mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac'],
          },
        ],
      });
      if (selected && typeof selected === 'string') {
        setSelectedFile(selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStart = () => {
    if (sourceType === 'local' && selectedFile) {
      const name = selectedFile.split('\\').pop()?.split('/').pop() || 'Video';
      onStartTranscription(selectedFile, modelSize, language, name);
    } else if (sourceType === 'youtube' && youtubeUrl.trim()) {
      onStartTranscription(youtubeUrl.trim(), modelSize, language, 'YouTube Video');
    }
  };

  const handleCopyText = async () => {
    if (!activeResult) return;
    try {
      await navigator.clipboard.writeText(activeResult.full_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenFolder = async (path?: string) => {
    const target = path || outputDir;
    if (!target) return;
    try {
      await invoke('open_output_folder', { path: target });
    } catch (err) {
      console.error(err);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredSegments = activeResult?.segments.filter((seg) =>
    seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Hero Header */}
      <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-6 md:p-7 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
            <Subtitles className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-semibold border border-teal-200/60 dark:border-teal-800/40 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Whisper AI Speech-to-Text
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              Transkrip Video & YouTube ke Teks
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ubah rekaman video/audio khotbah gereja, wawancara, materi kuliah, atau link YouTube menjadi teks rapi dan subtitle SRT.
            </p>
          </div>
        </div>
      </div>

      {/* Input Source Selector & Configuration */}
      <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-6 rounded-3xl shadow-sm space-y-5">
        {/* Step 1: Mode Switcher */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
                Pilih Sumber Video / Audio
              </h2>
            </div>

            <div className="flex items-center gap-1 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
              <button
                onClick={() => setSourceType('local')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  sourceType === 'local'
                    ? 'bg-teal-500 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-neutral-300 hover:text-teal-500'
                }`}
              >
                <FileAudio className="w-3.5 h-3.5" />
                <span>File Lokal</span>
              </button>

              <button
                onClick={() => setSourceType('youtube')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  sourceType === 'youtube'
                    ? 'bg-red-500 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-neutral-300 hover:text-red-500'
                }`}
              >
                <YouTubeIcon className="w-3.5 h-3.5 fill-current" />
                <span>Link YouTube</span>
              </button>
            </div>
          </div>

          {/* Local File Dropzone */}
          {sourceType === 'local' && (
            <div>
              {!selectedFile ? (
                <div
                  onClick={handlePickLocalFile}
                  className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-teal-500 dark:hover:border-teal-400 bg-white/60 dark:bg-neutral-800/40 p-8 rounded-3xl text-center cursor-pointer transition space-y-2 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition mx-auto flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-neutral-200">
                    Pilih File Video atau Audio
                  </p>
                  <p className="text-xs text-slate-400 dark:text-neutral-500">
                    Format didukung: MP4, MKV, MOV, MP3, WAV, M4A, FLAC, WEBM
                  </p>
                </div>
              ) : (
                <div className="bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/60 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3 truncate mr-2">
                    <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate" title={selectedFile}>
                        {selectedFile.split('\\').pop() || selectedFile}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate font-mono">
                        {selectedFile}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-slate-400 hover:text-red-500 transition p-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* YouTube Link Input */}
          {sourceType === 'youtube' && (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="Tempel link video YouTube di sini (misal: https://www.youtube.com/watch?v=...)"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 font-mono shadow-2xs"
                />
                <YouTubeIcon className="w-5 h-5 fill-red-500 absolute left-3.5 top-3" />
              </div>
              <p className="text-[11px] text-slate-400 pl-1">
                ⚡ Video dengan subtitle/keterangan resmi akan diproses secara instan (1-3 detik) tanpa perlu unduh video utuh.
              </p>
            </div>
          )}
        </div>

        {/* Step 2: Language & AI Model Options */}
        <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[11px] font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
              Pengaturan Bahasa & Model AI
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-200 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-teal-600" /> Bahasa Percakapan:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'auto', label: 'Otomatis' },
                  { id: 'id', label: 'Indonesia' },
                  { id: 'en', label: 'English' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setLanguage(opt.id)}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer text-center ${
                      language === opt.id
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold ring-1 ring-teal-500'
                        : 'border-black/[0.08] dark:border-white/[0.1] bg-white/60 dark:bg-neutral-800/60 text-slate-700 dark:text-neutral-300 hover:border-teal-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Model Size Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-600" /> Kecepatan & Akurasi:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'tiny', label: 'Tiny (Cepat)', desc: '39MB' },
                  { id: 'base', label: 'Base (Seimbang)', desc: '74MB' },
                  { id: 'small', label: 'Small (Presisi)', desc: '244MB' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setModelSize(opt.id)}
                    className={`p-2 rounded-xl border text-xs transition cursor-pointer text-center ${
                      modelSize === opt.id
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold ring-1 ring-teal-500'
                        : 'border-black/[0.08] dark:border-white/[0.1] bg-white/60 dark:bg-neutral-800/60 text-slate-700 dark:text-neutral-300 hover:border-teal-300'
                    }`}
                  >
                    <span className="block font-medium truncate">{opt.label}</span>
                    <span className="text-[10px] text-slate-400 block">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Trigger & Progress */}
        <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-neutral-400">
            Tersimpan di:{' '}
            <span className="font-mono text-slate-700 dark:text-neutral-200 font-medium">
              {outputDir ? outputDir.split('\\').pop() || outputDir : 'Downloads/MultiMedia'}
            </span>
          </div>

          <button
            onClick={handleStart}
            disabled={isProcessing || (sourceType === 'local' ? !selectedFile : !youtubeUrl.trim())}
            className="w-full sm:w-auto px-7 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sedang Mentranskripsikan...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Mulai Transkripsi Video</span>
              </>
            )}
          </button>
        </div>

        {/* Live Progress Bar when running */}
        {isProcessing && (
          <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-teal-800 dark:text-teal-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                {currentMessage || 'Memproses suara ke teks...'}
              </span>
              <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                {Math.round(currentProgress)}%
              </span>
            </div>
            <div className="w-full bg-teal-200 dark:bg-teal-900/50 rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, currentProgress)}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && !isProcessing && (
          <div className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                Transkripsi Belum Berhasil
              </h4>
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {errorMessage}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Transcription Result Viewer */}
      {activeResult && (
        <div className="bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] p-6 rounded-3xl shadow-sm space-y-5 animate-fadeIn">
          {/* Result Header & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-semibold border border-teal-200/60 dark:border-teal-800/40 uppercase">
                  {activeResult.language}
                </span>
                {activeResult.duration > 0 && (
                  <span className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {formatSeconds(activeResult.duration)}
                  </span>
                )}
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 font-mono">
                  {activeResult.segments.length} kalimat
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug">
                {activeResult.title}
              </h2>
            </div>

            {/* Quick Export & Copy Buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={handleCopyText}
                className="px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 border border-teal-200 dark:border-teal-800/60 text-teal-700 dark:text-teal-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Semua Teks'}</span>
              </button>

              <button
                onClick={() => handleOpenFolder(activeResult.exported_files?.txt)}
                className="px-3.5 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition flex items-center gap-1.5 cursor-pointer"
                title="Buka file hasil di Windows Explorer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Buka Folder</span>
              </button>
            </div>
          </div>

          {/* View Mode & Search Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* View Mode Buttons */}
            <div className="flex items-center gap-1 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl border border-black/[0.04] dark:border-white/[0.06] self-start">
              <button
                onClick={() => setViewMode('full')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'full'
                    ? 'bg-white dark:bg-neutral-800 text-slate-800 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Teks Lengkap (Paragraf)</span>
              </button>

              <button
                onClick={() => setViewMode('segments')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'segments'
                    ? 'bg-white dark:bg-neutral-800 text-slate-800 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Waktu & Subtitle (SRT)</span>
              </button>
            </div>

            {/* Keyword Search Input */}
            <div className="relative max-w-xs w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kata dalam transkrip..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Transcript Content Box */}
          <div className="bg-[#F8F9FA] dark:bg-[#151515] p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] max-h-[460px] overflow-y-auto space-y-3 font-sans text-xs md:text-sm leading-relaxed text-slate-800 dark:text-neutral-200">
            {viewMode === 'full' ? (
              searchQuery ? (
                <div className="space-y-2">
                  {filteredSegments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Tidak ditemukan kata &quot;{searchQuery}&quot; dalam transkrip
                    </div>
                  ) : (
                    filteredSegments.map((seg, idx) => (
                      <p key={idx} className="p-2 rounded-xl bg-white/60 dark:bg-neutral-800/60 border border-black/[0.04]">
                        <span className="font-mono text-[10px] text-teal-600 font-bold mr-2">
                          [{formatSeconds(seg.start)}]
                        </span>
                        {seg.text}
                      </p>
                    ))
                  )}
                </div>
              ) : (
                <div className="whitespace-pre-line leading-loose text-slate-700 dark:text-neutral-200">
                  {activeResult.full_text}
                </div>
              )
            ) : (
              <div className="space-y-2">
                {filteredSegments.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Tidak ditemukan kalimat yang sesuai
                  </div>
                ) : (
                  filteredSegments.map((seg, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-neutral-800/80 rounded-xl border border-black/[0.04] dark:border-white/[0.06] flex items-start gap-3 shadow-2xs hover:border-teal-300 transition"
                    >
                      <span className="font-mono text-[11px] text-teal-600 dark:text-teal-400 font-semibold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200/50 dark:border-teal-800/50 shrink-0">
                        {formatSeconds(seg.start)} - {formatSeconds(seg.end)}
                      </span>
                      <p className="text-xs text-slate-800 dark:text-slate-100 flex-1 leading-relaxed">
                        {seg.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Export Formats Badge Bar */}
          {activeResult.exported_files && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500">
              <span className="text-[11px]">Format file otomatis tersimpan di folder:</span>
              <div className="flex items-center gap-2">
                {['TXT', 'SRT', 'VTT', 'JSON'].map((fmt) => (
                  <span
                    key={fmt}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 font-mono text-[10px] font-bold text-slate-700 dark:text-neutral-300 border border-black/[0.06] dark:border-white/[0.08]"
                  >
                    .{fmt.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TranscribeTab;
