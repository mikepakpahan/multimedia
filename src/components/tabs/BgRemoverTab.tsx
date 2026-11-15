import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Wand2,
  UploadCloud,
  FileImage,
  X,
  Sparkles,
  Zap,
  Eraser,
  Paintbrush,
  Undo2,
  Redo2,
  RotateCcw,
  Eye,
  Download,
  FolderOpen,
  Sliders,
  CheckCircle2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

interface BgRemoverTabProps {
  outputDir: string;
  onStartRemoveBg?: (filePath: string, method: string, bgColor: string) => void;
}

type BrushMode = 'erase' | 'restore';

export const BgRemoverTab: React.FC<BgRemoverTabProps> = ({ outputDir }) => {
  // Step 1: Input selection & original preview
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [originalBase64, setOriginalBase64] = useState<string | null>(null);
  const [method, setMethod] = useState<'ai' | 'color'>('ai');
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [processingMsg, setProcessingMsg] = useState<string>('');

  // Step 2: Interactive Studio State
  const [hasCutout, setHasCutout] = useState<boolean>(false);
  const [brushMode, setBrushMode] = useState<BrushMode>('erase');
  const [brushSize, setBrushSize] = useState<number>(35);
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [customColor, setCustomColor] = useState<string>('#FFFFFF');
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = fit, 1.5, 2
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Brush Cursor indicator state
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [displayScale, setDisplayScale] = useState<number>(1);
  const [isHoveringCanvas, setIsHoveringCanvas] = useState<boolean>(false);

  // Step 3: Saving state
  const [filenameInput, setFilenameInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccessPath, setSavedSuccessPath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Undo / Redo history
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const colorPresets = [
    { id: 'transparent', label: 'Transparan (PNG)', color: 'transparent', desc: 'Latar bolong untuk Canva / Poster' },
    { id: '#DC2626', label: 'Merah Pas Foto', color: '#DC2626', desc: 'Standar resmi ijazah, KTP & dinas' },
    { id: '#2563EB', label: 'Biru Pas Foto', color: '#2563EB', desc: 'Standar resmi nikah & instansi' },
    { id: '#FFFFFF', label: 'Putih Bersih', color: '#FFFFFF', desc: 'Foto katalog produk & formal' },
    { id: '#000000', label: 'Hitam Studio', color: '#000000', desc: 'Potret elegan & kontras artistik' },
  ];

  // Pick file via Tauri dialog
  const handleSelectImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: 'Pilih Foto untuk Dihapus Background-nya',
        filters: [{ name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }],
      });
      if (selected && typeof selected === 'string') {
        setSelectedFile(selected);
        setHasCutout(false);
        setSavedSuccessPath(null);
        setErrorMessage(null);

        // Auto default filename
        const stem = selected.split('\\').pop()?.split('/').pop()?.replace(/\.[^/.]+$/, "") || "foto";
        setFilenameInput(`${stem}_nobg.png`);

        // Load original preview base64 from Rust
        try {
          const b64 = await invoke<string>('load_image_base64', { path: selected });
          setOriginalBase64(b64);
        } catch (err) {
          console.error('Failed to load image preview:', err);
          setErrorMessage('Gagal membaca pratinjau gambar: ' + String(err));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run AI / Color background removal preview
  const handleExecuteAI = async () => {
    if (!selectedFile) return;
    setIsProcessingAI(true);
    setProcessingMsg('Memproses segmentasi AI...');
    setErrorMessage(null);

    try {
      // Get AI transparent cutout as base64 from Rust
      const cutoutBase64 = await invoke<string>('remove_background_preview', {
        inputPath: selectedFile,
        method,
      });

      // Load both images into memory and initialize mask canvas
      await initEditorCanvases(originalBase64 || cutoutBase64, cutoutBase64);
      setHasCutout(true);
    } catch (err) {
      console.error('AI Removal error:', err);
      setErrorMessage('Gagal memproses pemotongan AI: ' + String(err));
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Initialize Canvas & Offscreen Mask
  const initEditorCanvases = async (origB64: string, cutoutB64: string) => {
    return new Promise<void>((resolve, reject) => {
      const origImg = new Image();
      const cutoutImg = new Image();

      let loadedCount = 0;
      const onImageLoaded = () => {
        loadedCount++;
        if (loadedCount === 2) {
          const w = origImg.naturalWidth;
          const h = origImg.naturalHeight;

          originalImgRef.current = origImg;

          // Display canvas setup
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = w;
            canvas.height = h;
          }

          // Offscreen mask canvas setup
          if (!maskCanvasRef.current) {
            maskCanvasRef.current = document.createElement('canvas');
          }
          const maskCanvas = maskCanvasRef.current;
          maskCanvas.width = w;
          maskCanvas.height = h;

          const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
          if (!maskCtx) {
            reject(new Error('Cannot get 2D context'));
            return;
          }

          // Initial mask: draw cutout image into mask canvas
          maskCtx.clearRect(0, 0, w, h);
          maskCtx.drawImage(cutoutImg, 0, 0);

          // Temp composite canvas
          if (!tempCanvasRef.current) {
            tempCanvasRef.current = document.createElement('canvas');
          }
          tempCanvasRef.current.width = w;
          tempCanvasRef.current.height = h;

          // Initial snapshot in history
          const initialSnapshot = maskCtx.getImageData(0, 0, w, h);
          historyRef.current = [initialSnapshot];
          historyIndexRef.current = 0;
          setCanUndo(false);
          setCanRedo(false);

          // Render first composite frame
          renderComposite();
          resolve();
        }
      };

      origImg.onload = onImageLoaded;
      origImg.onerror = () => reject(new Error('Failed to load original image'));
      cutoutImg.onload = onImageLoaded;
      cutoutImg.onerror = () => reject(new Error('Failed to load cutout image'));

      origImg.src = origB64;
      cutoutImg.src = cutoutB64;
    });
  };

  // Render composite display canvas
  const renderComposite = useCallback(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const origImg = originalImgRef.current;
    const tempCanvas = tempCanvasRef.current;

    if (!canvas || !maskCanvas || !origImg || !tempCanvas) return;

    const ctx = canvas.getContext('2d');
    const tempCtx = tempCanvas.getContext('2d');
    if (!ctx || !tempCtx) return;

    const w = canvas.width;
    const h = canvas.height;

    // If user is holding "Compare" (Lihat Asli), render original image directly
    if (isComparing) {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(origImg, 0, 0);
      return;
    }

    // 1. Draw original masked by maskCanvas onto tempCanvas
    tempCtx.clearRect(0, 0, w, h);
    tempCtx.drawImage(origImg, 0, 0);
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(maskCanvas, 0, 0);
    tempCtx.globalCompositeOperation = 'source-over'; // reset

    // 2. Draw background color (if not transparent) on main canvas
    ctx.clearRect(0, 0, w, h);
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    }

    // 3. Draw cut-out subject on top
    ctx.drawImage(tempCanvas, 0, 0);

    // Update display scale for brush circle
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0) {
      setDisplayScale(rect.width / canvas.width);
    }
  }, [bgColor, isComparing]);

  useEffect(() => {
    if (hasCutout) {
      renderComposite();
    }
  }, [bgColor, isComparing, hasCutout, renderComposite]);

  // Translate mouse coordinate to natural canvas coordinate
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Execute brush stroke on maskCanvas
  const drawStroke = (x1: number, y1: number, x2: number, y2: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;

    maskCtx.save();
    maskCtx.lineWidth = brushSize;
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';

    if (brushMode === 'erase') {
      // Destination-out erases opacity from the mask
      maskCtx.globalCompositeOperation = 'destination-out';
      maskCtx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      // Source-over restores solid opacity (reveals original photo)
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.strokeStyle = 'rgba(255,255,255,1)';
    }

    maskCtx.beginPath();
    maskCtx.moveTo(x1, y1);
    maskCtx.lineTo(x2, y2);
    maskCtx.stroke();
    maskCtx.restore();

    renderComposite();
  };

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isComparing || !hasCutout) return;
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;
    drawStroke(coords.x, coords.y, coords.x, coords.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Update visual circle cursor
    const rect = canvas.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDisplayScale(rect.width / canvas.width);

    if (!isDrawingRef.current || !lastPointRef.current) return;
    const coords = getCanvasCoords(e);
    drawStroke(lastPointRef.current.x, lastPointRef.current.y, coords.x, coords.y);
    lastPointRef.current = coords;
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    pushHistorySnapshot();
  };

  const handleMouseLeave = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      pushHistorySnapshot();
    }
    setIsHoveringCanvas(false);
    setCursorPos(null);
  };

  // Push snapshot to history stack
  const pushHistorySnapshot = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;

    const snapshot = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);

    // Limit to 20 undo steps to preserve memory
    if (newHistory.length >= 20) {
      newHistory.shift();
    }
    newHistory.push(snapshot);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  };

  // Undo action
  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    restoreHistory(historyIndexRef.current);
  };

  // Redo action
  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    restoreHistory(historyIndexRef.current);
  };

  const restoreHistory = (index: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;

    const snapshot = historyRef.current[index];
    if (snapshot) {
      maskCtx.putImageData(snapshot, 0, 0);
      renderComposite();
    }
    setCanUndo(index > 0);
    setCanRedo(index < historyRef.current.length - 1);
  };

  // Reset to initial AI cutout
  const handleResetToAI = () => {
    if (historyRef.current.length > 0) {
      historyIndexRef.current = 0;
      restoreHistory(0);
    }
  };

  // Save the result to storage
  const handleSaveToStorage = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedFile) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSavedSuccessPath(null);

    try {
      const isTransparent = bgColor === 'transparent';
      const format = isTransparent ? 'image/png' : 'image/jpeg';
      const defaultExt = isTransparent ? 'png' : 'jpg';

      // Full export canvas
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const exportCtx = exportCanvas.getContext('2d')!;

      // Background color
      if (!isTransparent) {
        exportCtx.fillStyle = bgColor;
        exportCtx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw subject
      exportCtx.drawImage(canvas, 0, 0);

      const base64Data = exportCanvas.toDataURL(format, 0.95);

      // Clean filename
      let filename = filenameInput.trim();
      if (!filename) {
        const stem = selectedFile.split('\\').pop()?.split('/').pop()?.replace(/\.[^/.]+$/, "") || "foto";
        filename = `${stem}_${isTransparent ? 'nobg.png' : 'pasfoto.jpg'}`;
      } else if (!filename.toLowerCase().endsWith('.' + defaultExt)) {
        filename = `${filename.replace(/\.[^/.]+$/, "")}.${defaultExt}`;
      }

      const savedPath = await invoke<string>('save_image_from_base64', {
        dataBase64: base64Data,
        outputDir: outputDir || 'C:\\',
        filename,
      });

      setSavedSuccessPath(savedPath);
    } catch (err) {
      console.error('Failed to save:', err);
      setErrorMessage('Gagal menyimpan file ke penyimpanan: ' + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenFolder = async (path: string) => {
    try {
      await invoke('open_output_folder', { path });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAs = async () => {
    const isTransparent = bgColor === 'transparent';
    const defaultExt = isTransparent ? 'png' : 'jpg';
    const stem = selectedFile?.split('\\').pop()?.split('/').pop()?.replace(/\.[^/.]+$/, "") || "foto";
    const defaultFilename = `${stem}_${isTransparent ? 'nobg.png' : 'pasfoto.jpg'}`;

    try {
      const customPath = await save({
        defaultPath: defaultFilename,
        filters: [{ name: 'Image', extensions: [defaultExt] }],
      });
      if (customPath) {
        const dir = customPath.substring(0, customPath.lastIndexOf('\\')) || customPath.substring(0, customPath.lastIndexOf('/'));
        const name = customPath.split('\\').pop()?.split('/').pop() || defaultFilename;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const format = isTransparent ? 'image/png' : 'image/jpeg';
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const exportCtx = exportCanvas.getContext('2d')!;

        if (!isTransparent) {
          exportCtx.fillStyle = bgColor;
          exportCtx.fillRect(0, 0, canvas.width, canvas.height);
        }
        exportCtx.drawImage(canvas, 0, 0);
        const base64Data = exportCanvas.toDataURL(format, 0.95);

        setIsSaving(true);
        const saved = await invoke<string>('save_image_from_base64', {
          dataBase64: base64Data,
          outputDir: dir,
          filename: name,
        });
        setSavedSuccessPath(saved);
        setIsSaving(false);
      }
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-5 md:p-6 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Wand2 className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200/60 dark:border-rose-800/40 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Cutout & Studio Editor
              </div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                Hapus Background Foto & Pas Foto
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Potong otomatis dengan AI, perbaiki manual dengan brush hapus/pulihkan, lalu simpan ke komputer.
              </p>
            </div>
          </div>

          {selectedFile && hasCutout && (
            <button
              onClick={() => {
                setSelectedFile(null);
                setHasCutout(false);
                setOriginalBase64(null);
                setSavedSuccessPath(null);
              }}
              className="px-3.5 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-xs font-medium text-slate-600 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Ganti Foto Baru
            </button>
          )}
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-xs hover:underline cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      {/* STEP 1: Upload and Trigger AI if not yet cutout */}
      {!hasCutout && (
        <div className="space-y-5 animate-fadeIn">
          {/* File Picker */}
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
                  onClick={() => {
                    setSelectedFile(null);
                    setOriginalBase64(null);
                  }}
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
                  Portrait wajah, foto produk, logo, atau stempel (JPG, PNG, WebP)
                </p>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-4 rounded-2xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3 truncate mr-2">
                  {originalBase64 ? (
                    <img
                      src={originalBase64}
                      alt="Thumbnail"
                      className="w-12 h-12 rounded-xl object-cover border border-black/10 shrink-0 bg-slate-100"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shrink-0">
                      <FileImage className="w-6 h-6" />
                    </div>
                  )}
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
                  onClick={() => {
                    setSelectedFile(null);
                    setOriginalBase64(null);
                  }}
                  className="text-slate-400 hover:text-rose-500 transition p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* AI Mode Options & Trigger */}
          {selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
                  Pilih Mesin Pemotong
                </h2>
              </div>

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
                      Memotong otomatis subjek foto manusia, helaian rambut, pakaian, dan objek rumit secara rapi.
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
                      Instan (0ms). Cocok untuk menghapus background putih/hijau pada logo, stempel, atau pas foto polos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Start AI Button */}
              <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-5 rounded-3xl flex items-center justify-between gap-4 shadow-sm">
                <span className="text-xs text-slate-500 dark:text-neutral-400">
                  Hasil pemotongan akan dibuka di editor interaktif untuk dipratinjau & disempurnakan.
                </span>

                <button
                  onClick={handleExecuteAI}
                  disabled={isProcessingAI}
                  className="px-7 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs rounded-xl shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {isProcessingAI ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{processingMsg || 'Sedang Memotong AI...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 fill-white" />
                      <span>Mulai Hapus Background (AI)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Interactive Studio (Preview, Manual Erase/Restore, Color Changer, & Save) */}
      {hasCutout && (
        <div className="space-y-4 animate-fadeIn">
          {/* Studio Top Control Toolbar */}
          <div className="bg-white/85 dark:bg-[#1E1E1E]/85 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] p-4 rounded-3xl shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Brush Tools: Erase vs Restore */}
              <div className="flex items-center gap-1.5 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
                <button
                  onClick={() => setBrushMode('erase')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    brushMode === 'erase'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-neutral-300 hover:text-rose-500'
                  }`}
                  title="Hapus sisa background yang belum bersih"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Hapus (Erase)</span>
                </button>

                <button
                  onClick={() => setBrushMode('restore')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    brushMode === 'restore'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-neutral-300 hover:text-emerald-500'
                  }`}
                  title="Kembalikan bagian foto asli yang terpotong (rambut/baju)"
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>Pulihkan (Restore)</span>
                </button>
              </div>

              {/* Brush Size / Diameter Slider */}
              <div className="flex items-center gap-3 bg-black/[0.02] dark:bg-white/[0.04] px-3.5 py-1.5 rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-300">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">Ukuran Brush:</span>
                  <span className="font-mono text-rose-500 dark:text-rose-400 font-bold w-10 text-right">
                    {brushSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="1"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                  className="w-24 md:w-36 accent-rose-500 cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  {[10, 30, 60].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setBrushSize(sz)}
                      className={`px-1.5 py-0.5 text-[10px] rounded-md border font-mono transition cursor-pointer ${
                        brushSize === sz
                          ? 'border-rose-500 text-rose-500 bg-rose-50 dark:bg-rose-950/40'
                          : 'border-black/[0.08] dark:border-white/[0.1] text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Undo / Redo & Compare Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  title="Undo coretan (Batal)"
                  className="p-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-slate-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  title="Redo coretan"
                  className="p-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-slate-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetToAI}
                  title="Kembalikan ke potongan AI awal"
                  className="p-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-slate-600 dark:text-neutral-300 hover:text-rose-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Compare Button (Hold to preview original) */}
                <button
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onMouseLeave={() => setIsComparing(false)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition select-none cursor-pointer ${
                    isComparing
                      ? 'bg-blue-500 text-white border-blue-500 shadow-xs'
                      : 'border-black/[0.08] dark:border-white/[0.1] text-slate-700 dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                  title="Tahan klik untuk melihat foto asli sebelum dipotong"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isComparing ? 'Melihat Foto Asli...' : 'Tahan: Lihat Asli'}</span>
                </button>
              </div>
            </div>

            {/* Background Color Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-black/[0.05] dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Pratinjau Latar:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {colorPresets.map((preset) => {
                    const isSelected = bgColor === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setBgColor(preset.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 shadow-2xs font-semibold ring-1 ring-rose-500'
                            : 'border-black/[0.06] dark:border-white/[0.08] hover:border-slate-300 text-slate-600 dark:text-neutral-300 bg-white/60 dark:bg-neutral-800/60'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border border-black/15 inline-block shrink-0 ${
                            preset.id === 'transparent'
                              ? 'bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] bg-[size:4px_4px] bg-[position:0_0,0_2px,2px_-2px,-2px_0]'
                              : ''
                          }`}
                          style={preset.id !== 'transparent' ? { backgroundColor: preset.color } : {}}
                        />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}

                  {/* Custom color picker */}
                  <label className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border border-black/[0.06] dark:border-white/[0.08] bg-white/60 dark:bg-neutral-800/60 cursor-pointer hover:border-slate-300">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        setBgColor(e.target.value);
                      }}
                      className="w-4 h-4 p-0 border-0 rounded-full cursor-pointer"
                    />
                    <span className="text-slate-600 dark:text-neutral-300">Kustom</span>
                  </label>
                </div>
              </div>

              {/* Zoom Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
                  className="p-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] text-slate-500 hover:text-slate-800 dark:hover:text-neutral-100 transition cursor-pointer"
                  title="Perkecil Tampilan"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-500 px-1 min-w-[40px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                  className="p-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] text-slate-500 hover:text-slate-800 dark:hover:text-neutral-100 transition cursor-pointer"
                  title="Perbesar Tampilan (Detail Halus)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] text-slate-500 hover:text-slate-800 dark:hover:text-neutral-100 transition cursor-pointer"
                  title="Reset Fit to Screen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Canvas Workspace */}
          <div className="relative bg-[#E5E5EA] dark:bg-[#141414] rounded-3xl p-4 md:p-6 overflow-hidden border border-black/[0.08] dark:border-white/[0.08] shadow-inner flex items-center justify-center min-h-[420px] max-h-[580px]">
            {/* Checkerboard Pattern for transparent areas */}
            <div
              className="relative max-w-full max-h-[520px] overflow-auto rounded-2xl shadow-xl flex items-center justify-center"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
            >
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  backgroundImage:
                    bgColor === 'transparent'
                      ? 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)'
                      : 'none',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                  backgroundColor: bgColor === 'transparent' ? '#ffffff' : bgColor,
                }}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseEnter={() => setIsHoveringCanvas(true)}
                  onMouseLeave={handleMouseLeave}
                  className="block max-w-full max-h-[500px] w-auto h-auto object-contain cursor-crosshair select-none"
                />

                {/* Live Brush Circle Cursor Overlay */}
                {isHoveringCanvas && cursorPos && (
                  <div
                    className={`pointer-events-none absolute rounded-full border-2 transition-transform duration-75 ${
                      brushMode === 'erase'
                        ? 'border-rose-500 bg-rose-500/20'
                        : 'border-emerald-500 bg-emerald-500/20'
                    }`}
                    style={{
                      width: `${Math.max(6, brushSize * displayScale)}px`,
                      height: `${Math.max(6, brushSize * displayScale)}px`,
                      left: `${cursorPos.x}px`,
                      top: `${cursorPos.y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Mode & Action Pill Floating Tag */}
            <div className="absolute top-4 left-5 pointer-events-none">
              <span
                className={`text-[11px] font-semibold px-3 py-1 rounded-full shadow-md backdrop-blur-md flex items-center gap-1.5 ${
                  brushMode === 'erase'
                    ? 'bg-rose-500/90 text-white'
                    : 'bg-emerald-500/90 text-white'
                }`}
              >
                {brushMode === 'erase' ? (
                  <>
                    <Eraser className="w-3 h-3" /> Mode Hapus Latar Belakang
                  </>
                ) : (
                  <>
                    <Paintbrush className="w-3 h-3" /> Mode Pulihkan Foto Asli
                  </>
                )}
              </span>
            </div>
          </div>

          {/* STEP 3: Save to Storage Bar */}
          <div className="bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] p-5 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Filename & Format Settings */}
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-200 block">
                  Nama File Hasil:
                </label>
                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    value={filenameInput}
                    onChange={(e) => setFilenameInput(e.target.value)}
                    placeholder="nama_file.png"
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                  <span className="text-[11px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-800 border border-black/[0.06] dark:border-white/[0.08] font-bold text-slate-600 dark:text-neutral-300 shrink-0">
                    {bgColor === 'transparent' ? 'PNG (Transparan)' : 'JPG (Pas Foto)'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Folder Tujuan:{' '}
                  <span className="font-mono text-slate-600 dark:text-neutral-300">
                    {outputDir || 'C:\\Downloads\\MultiMedia'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={handleSaveAs}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition cursor-pointer"
                >
                  Pilih Folder Lain...
                </button>

                <button
                  onClick={handleSaveToStorage}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-semibold shadow-sm hover:shadow transition flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Simpan ke Storage</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Saved File Confirmation Card */}
            {savedSuccessPath && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                      Foto Berhasil Disimpan ke Komputer!
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 block truncate max-w-xl">
                      {savedSuccessPath}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenFolder(savedSuccessPath)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Buka File di Folder</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BgRemoverTab;
