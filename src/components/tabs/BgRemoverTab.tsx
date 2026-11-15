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
  Move,
  Pipette,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

interface BgRemoverTabProps {
  outputDir: string;
  onStartRemoveBg?: (filePath: string, method: string, bgColor: string) => void;
}

type BrushMode = 'erase' | 'restore' | 'chroma';

// Helper: Convert HEX color to RGB object
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

// Helper: Convert RGB numbers to HEX string (#RRGGBB)
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const h = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// High-performance Chroma Key Algorithm with Euclidean distance & Edge Feathering
function executeChromaKeyOnSource(
  targetHex: string,
  tolerance: number, // 1 to 80%
  smoothness: number, // 0 to 30%
  sourceSnapshot: ImageData,
  targetCanvas: HTMLCanvasElement
) {
  const rgb = hexToRgb(targetHex);
  if (!rgb) return;

  const w = targetCanvas.width;
  const h = targetCanvas.height;
  const tCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!tCtx) return;

  const src = sourceSnapshot.data;
  const dstData = tCtx.createImageData(w, h);
  const dst = dstData.data;

  const tr = rgb.r;
  const tg = rgb.g;
  const tb = rgb.b;

  // Max 3D Euclidean distance in RGB color cube is sqrt(255^2 + 255^2 + 255^2) = 441.673
  const maxDist = 441.673;
  const threshDist = (tolerance / 100) * maxDist;
  const smoothDist = (smoothness / 100) * maxDist;

  const totalPixels = w * h;
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = src[idx];
    const g = src[idx + 1];
    const b = src[idx + 2];
    const a = src[idx + 3];

    // If already transparent in source, keep transparent
    if (a === 0) {
      dst[idx] = 0;
      dst[idx + 1] = 0;
      dst[idx + 2] = 0;
      dst[idx + 3] = 0;
      continue;
    }

    // Euclidean distance in RGB space
    const dr = r - tr;
    const dg = g - tg;
    const db = b - tb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    if (dist <= threshDist - smoothDist) {
      // Within chroma threshold: eliminate completely
      dst[idx] = r;
      dst[idx + 1] = g;
      dst[idx + 2] = b;
      dst[idx + 3] = 0;
    } else if (dist >= threshDist) {
      // Outside chroma threshold: retain original alpha
      dst[idx] = r;
      dst[idx + 1] = g;
      dst[idx + 2] = b;
      dst[idx + 3] = a;
    } else {
      // Smooth feathering transition to eliminate white haloes/fringing
      const factor = (dist - (threshDist - smoothDist)) / (smoothDist || 1);
      const newAlpha = Math.round(a * Math.max(0, Math.min(1, factor)));
      dst[idx] = r;
      dst[idx + 1] = g;
      dst[idx + 2] = b;
      dst[idx + 3] = newAlpha;
    }
  }

  tCtx.putImageData(dstData, 0, 0);
}

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
  const [brushSize, setBrushSize] = useState<number>(45);
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [customColor, setCustomColor] = useState<string>('#FFFFFF');
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });

  // Chroma Key Settings
  const [chromaColor, setChromaColor] = useState<string>('#FFFFFF');
  const [chromaTolerance, setChromaTolerance] = useState<number>(25);
  const [chromaSmoothness, setChromaSmoothness] = useState<number>(8);
  const [isPickingColor, setIsPickingColor] = useState<boolean>(false);
  const [hoverPixelColor, setHoverPixelColor] = useState<string | null>(null);

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
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chromaBaseSnapshotRef = useRef<ImageData | null>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const cutoutImgRef = useRef<HTMLImageElement | null>(null);

  // Undo / Redo history
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isDrawingRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const startPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const colorPresets = [
    { id: 'transparent', label: 'Transparan (PNG)', color: 'transparent', desc: 'Latar bolong untuk Canva / Poster' },
    { id: '#DC2626', label: 'Merah Pas Foto', color: '#DC2626', desc: 'Standar resmi ijazah, KTP & dinas' },
    { id: '#2563EB', label: 'Biru Pas Foto', color: '#2563EB', desc: 'Standar resmi nikah & instansi' },
    { id: '#FFFFFF', label: 'Putih Bersih', color: '#FFFFFF', desc: 'Foto katalog produk & formal' },
    { id: '#000000', label: 'Hitam Studio', color: '#000000', desc: 'Potret elegan & kontras artistik' },
  ];

  const chromaPresets = [
    { id: '#FFFFFF', label: 'Putih', color: '#FFFFFF' },
    { id: '#000000', label: 'Hitam', color: '#000000' },
    { id: '#00FF00', label: 'Hijau (Chroma)', color: '#00FF00' },
    { id: '#0000FF', label: 'Biru (Chroma)', color: '#0000FF' },
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
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
        originalCanvasRef.current = null;
        chromaBaseSnapshotRef.current = null;
        cutoutImgRef.current = null;

        // Auto default filename
        const stem = selected.split('\\').pop()?.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'foto';
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

  // Sample pixel color from original pristine image
  const samplePixelAt = (x: number, y: number): string | null => {
    const origCanvas = originalCanvasRef.current;
    if (!origCanvas) return null;
    const ctx = origCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const clampedX = Math.max(0, Math.min(origCanvas.width - 1, Math.floor(x)));
    const clampedY = Math.max(0, Math.min(origCanvas.height - 1, Math.floor(y)));
    const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
    return rgbToHex(pixel[0], pixel[1], pixel[2]);
  };

  // Render display canvas
  const renderDisplay = useCallback(() => {
    const canvas = displayCanvasRef.current;
    const working = workingCanvasRef.current;
    const orig = originalImgRef.current;
    if (!canvas || !working || !orig) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (isComparing) {
      // Hold to view original
      ctx.drawImage(orig, 0, 0, w, h);
      return;
    }

    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    }

    // Draw the active working transparent cut-out image
    ctx.drawImage(working, 0, 0, w, h);

    // Update displayScale for accurate brush circle
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && canvas.width > 0) {
      setDisplayScale(rect.width / canvas.width);
    }
  }, [bgColor, isComparing]);

  // Synchronize display rendering
  useEffect(() => {
    if (hasCutout) {
      renderDisplay();
    }
  }, [hasCutout, bgColor, isComparing, canvasSize, renderDisplay]);

  // Wheel gestures: Ctrl + Scroll = Zoom, Shift + Scroll = Brush Size
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el || !hasCutout) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        // Zoom In / Out (50% to 500%)
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        setZoomLevel((prev) => {
          const next = Math.min(5, Math.max(0.5, prev + delta));
          return Math.round(next * 100) / 100;
        });
      } else if (e.shiftKey) {
        e.preventDefault();
        // Change brush diameter (5px to 200px)
        const delta = e.deltaY < 0 ? 5 : -5;
        setBrushSize((prev) => Math.min(200, Math.max(5, prev + delta)));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [hasCutout]);

  // Keyboard Shortcuts: Space (Pan), Ctrl+Z (Undo), Ctrl+Y (Redo)
  useEffect(() => {
    if (!hasCutout) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        isPanningRef.current = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [hasCutout, canUndo, canRedo]);

  // Push snapshot to history stack
  const pushHistorySnapshot = () => {
    const working = workingCanvasRef.current;
    if (!working) return;
    const wCtx = working.getContext('2d', { willReadFrequently: true });
    if (!wCtx) return;

    const snapshot = wCtx.getImageData(0, 0, working.width, working.height);
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);

    // Limit to 20 undo steps
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
    const working = workingCanvasRef.current;
    if (!working) return;
    const wCtx = working.getContext('2d', { willReadFrequently: true });
    if (!wCtx) return;

    const snapshot = historyRef.current[index];
    if (snapshot) {
      wCtx.putImageData(snapshot, 0, 0);
      chromaBaseSnapshotRef.current = snapshot;
      renderDisplay();
    }
    setCanUndo(index > 0);
    setCanRedo(index < historyRef.current.length - 1);
  };

  // Run AI / Chroma Key background removal
  const handleExecuteAI = async () => {
    if (!selectedFile) return;
    setIsProcessingAI(true);
    setProcessingMsg(method === 'ai' ? 'Memotong latar belakang dengan AI...' : 'Menyiapkan Studio Chroma Key...');
    setErrorMessage(null);

    try {
      if (method === 'color') {
        // High-Speed Client-Side Chroma Key: instantaneous 0ms
        const b64 = originalBase64 || (await invoke<string>('load_image_base64', { path: selectedFile }));
        const origImg = new Image();
        origImg.onload = () => {
          const w = origImg.naturalWidth;
          const h = origImg.naturalHeight;
          originalImgRef.current = origImg;
          cutoutImgRef.current = null;
          setCanvasSize({ width: w, height: h });
          setZoomLevel(1);
          setPan({ x: 0, y: 0 });

          // Setup original pristine canvas
          const origCanvas = document.createElement('canvas');
          origCanvas.width = w;
          origCanvas.height = h;
          const oCtx = origCanvas.getContext('2d', { willReadFrequently: true });
          if (oCtx) {
            oCtx.drawImage(origImg, 0, 0, w, h);
            originalCanvasRef.current = origCanvas;

            // Auto-detect corner pixel color (top-left sample at 4, 4)
            const cornerPixel = oCtx.getImageData(Math.min(4, w - 1), Math.min(4, h - 1), 1, 1).data;
            const detectedHex = rgbToHex(cornerPixel[0], cornerPixel[1], cornerPixel[2]);
            setChromaColor(detectedHex);

            // Setup working canvas
            if (!workingCanvasRef.current) {
              workingCanvasRef.current = document.createElement('canvas');
            }
            const working = workingCanvasRef.current;
            working.width = w;
            working.height = h;

            // Capture raw base snapshot from original
            const baseSnap = oCtx.getImageData(0, 0, w, h);
            chromaBaseSnapshotRef.current = baseSnap;

            // Execute Chroma Key instantly on the detected background color
            executeChromaKeyOnSource(detectedHex, chromaTolerance, chromaSmoothness, baseSnap, working);

            const wCtx = working.getContext('2d', { willReadFrequently: true });
            if (wCtx) {
              const snapshot = wCtx.getImageData(0, 0, w, h);
              historyRef.current = [snapshot];
              historyIndexRef.current = 0;
              setCanUndo(false);
              setCanRedo(false);
            }
          }

          setBrushMode('chroma');
          setHasCutout(true);
          setIsProcessingAI(false);
        };
        origImg.onerror = () => {
          setIsProcessingAI(false);
          setErrorMessage('Gagal membaca gambar asli untuk Chroma Key.');
        };
        origImg.src = b64;
        return;
      }

      // Method === 'ai'
      const cutoutBase64 = await invoke<string>('remove_background_preview', {
        inputPath: selectedFile,
        method,
      });

      const origImg = new Image();
      const cutoutImg = new Image();
      let loadedCount = 0;
      const onBothLoaded = () => {
        loadedCount++;
        if (loadedCount === 2) {
          const w = origImg.naturalWidth;
          const h = origImg.naturalHeight;
          originalImgRef.current = origImg;
          cutoutImgRef.current = cutoutImg;
          setCanvasSize({ width: w, height: h });
          setZoomLevel(1);
          setPan({ x: 0, y: 0 });

          // Setup original canvas
          const origCanvas = document.createElement('canvas');
          origCanvas.width = w;
          origCanvas.height = h;
          const oCtx = origCanvas.getContext('2d', { willReadFrequently: true });
          if (oCtx) {
            oCtx.drawImage(origImg, 0, 0, w, h);
            originalCanvasRef.current = origCanvas;
          }

          // Setup working canvas
          if (!workingCanvasRef.current) {
            workingCanvasRef.current = document.createElement('canvas');
          }
          const working = workingCanvasRef.current;
          working.width = w;
          working.height = h;

          const wCtx = working.getContext('2d', { willReadFrequently: true });
          if (wCtx) {
            wCtx.clearRect(0, 0, w, h);
            wCtx.drawImage(cutoutImg, 0, 0, w, h);
            const initialSnapshot = wCtx.getImageData(0, 0, w, h);
            historyRef.current = [initialSnapshot];
            historyIndexRef.current = 0;
            setCanUndo(false);
            setCanRedo(false);
            chromaBaseSnapshotRef.current = initialSnapshot;
          }

          setBrushMode('erase');
          setHasCutout(true);
          setIsProcessingAI(false);
        }
      };

      origImg.onload = onBothLoaded;
      origImg.onerror = () => {
        setIsProcessingAI(false);
        setErrorMessage('Gagal memuat foto asli ke canvas.');
      };
      cutoutImg.onload = onBothLoaded;
      cutoutImg.onerror = () => {
        setIsProcessingAI(false);
        setErrorMessage('Gagal memuat hasil AI ke canvas.');
      };

      origImg.src = originalBase64 || cutoutBase64;
      cutoutImg.src = cutoutBase64;
    } catch (err) {
      console.error('AI Removal error:', err);
      setIsProcessingAI(false);
      setErrorMessage('Gagal memproses pemotongan AI: ' + String(err));
    }
  };

  // Switch to Chroma Key mode and anchor base snapshot
  const handleSelectChromaMode = () => {
    setBrushMode('chroma');
    const working = workingCanvasRef.current;
    if (working) {
      const wCtx = working.getContext('2d', { willReadFrequently: true });
      if (wCtx) {
        chromaBaseSnapshotRef.current = wCtx.getImageData(0, 0, working.width, working.height);
      }
    }
  };

  // Live adjustments for Chroma Key
  const handleToleranceChange = (newTolerance: number) => {
    setChromaTolerance(newTolerance);
    if (!chromaBaseSnapshotRef.current) {
      const base = originalCanvasRef.current || workingCanvasRef.current;
      if (base) {
        const bCtx = base.getContext('2d', { willReadFrequently: true });
        if (bCtx) chromaBaseSnapshotRef.current = bCtx.getImageData(0, 0, base.width, base.height);
      }
    }
    if (chromaBaseSnapshotRef.current && workingCanvasRef.current) {
      executeChromaKeyOnSource(
        chromaColor,
        newTolerance,
        chromaSmoothness,
        chromaBaseSnapshotRef.current,
        workingCanvasRef.current
      );
      renderDisplay();
    }
  };

  const handleSmoothnessChange = (newSmoothness: number) => {
    setChromaSmoothness(newSmoothness);
    if (!chromaBaseSnapshotRef.current) {
      const base = originalCanvasRef.current || workingCanvasRef.current;
      if (base) {
        const bCtx = base.getContext('2d', { willReadFrequently: true });
        if (bCtx) chromaBaseSnapshotRef.current = bCtx.getImageData(0, 0, base.width, base.height);
      }
    }
    if (chromaBaseSnapshotRef.current && workingCanvasRef.current) {
      executeChromaKeyOnSource(
        chromaColor,
        chromaTolerance,
        newSmoothness,
        chromaBaseSnapshotRef.current,
        workingCanvasRef.current
      );
      renderDisplay();
    }
  };

  const handleColorChange = (newColor: string) => {
    setChromaColor(newColor);
    if (!chromaBaseSnapshotRef.current) {
      const base = originalCanvasRef.current || workingCanvasRef.current;
      if (base) {
        const bCtx = base.getContext('2d', { willReadFrequently: true });
        if (bCtx) chromaBaseSnapshotRef.current = bCtx.getImageData(0, 0, base.width, base.height);
      }
    }
    if (chromaBaseSnapshotRef.current && workingCanvasRef.current) {
      executeChromaKeyOnSource(
        newColor,
        chromaTolerance,
        chromaSmoothness,
        chromaBaseSnapshotRef.current,
        workingCanvasRef.current
      );
      renderDisplay();
      pushHistorySnapshot();
    }
  };

  const handleSliderCommit = () => {
    pushHistorySnapshot();
  };

  // Eyedropper Color Picker (System API or Canvas click fallback)
  const handlePickColor = async () => {
    if ('EyeDropper' in window) {
      try {
        setIsPickingColor(true);
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          const hex = result.sRGBHex.toUpperCase();
          handleColorChange(hex);
        }
      } catch {
        // Cancelled or not allowed: fall back to canvas click
        setIsPickingColor(true);
      } finally {
        setIsPickingColor(false);
      }
    } else {
      setIsPickingColor(true);
    }
  };

  // Canvas coordinate translation
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Execute manual brush stroke
  const drawStroke = (x1: number, y1: number, x2: number, y2: number) => {
    const working = workingCanvasRef.current;
    const orig = originalImgRef.current;
    if (!working || !orig) return;

    const wCtx = working.getContext('2d', { willReadFrequently: true });
    if (!wCtx) return;

    wCtx.save();
    wCtx.lineWidth = brushSize;
    wCtx.lineCap = 'round';
    wCtx.lineJoin = 'round';

    if (brushMode === 'erase') {
      wCtx.globalCompositeOperation = 'destination-out';
      wCtx.strokeStyle = 'rgba(0,0,0,1)';
      wCtx.beginPath();
      wCtx.moveTo(x1, y1);
      wCtx.lineTo(x2, y2);
      wCtx.stroke();
    } else if (brushMode === 'restore') {
      wCtx.globalCompositeOperation = 'source-over';
      const pattern = wCtx.createPattern(orig, 'no-repeat');
      if (pattern) {
        wCtx.strokeStyle = pattern;
        wCtx.beginPath();
        wCtx.moveTo(x1, y1);
        wCtx.lineTo(x2, y2);
        wCtx.stroke();
      }
    }

    wCtx.restore();
    renderDisplay();
  };

  // Canvas Mouse Handlers
  const handleWorkspaceMouseDown = (e: React.MouseEvent) => {
    if (isSpacePressed || e.button === 1 || e.button === 2) {
      e.preventDefault();
      isPanningRef.current = true;
      startPanRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
      return;
    }
  };

  const handleWorkspaceMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      setPan({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      });
      return;
    }
  };

  const handleWorkspaceMouseUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isComparing || !hasCutout) return;
    if (isSpacePressed || e.button === 1 || e.button === 2) {
      return;
    }

    // In Chroma Key mode or when eyedropper is active: pick color and remove immediately!
    if (brushMode === 'chroma' || isPickingColor) {
      const coords = getCanvasCoords(e);
      const hex = samplePixelAt(coords.x, coords.y);
      if (hex) {
        handleColorChange(hex);
        setIsPickingColor(false);
      }
      return;
    }

    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;
    drawStroke(coords.x, coords.y, coords.x, coords.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    if (rect.width > 0 && canvas.width > 0) {
      setDisplayScale(rect.width / canvas.width);
    }

    // In Chroma mode: track hovered pixel color for live loupe preview
    if (brushMode === 'chroma' || isPickingColor) {
      const coords = getCanvasCoords(e);
      const hex = samplePixelAt(coords.x, coords.y);
      setHoverPixelColor(hex);
      return;
    }

    if (!isDrawingRef.current || !lastPointRef.current || isPanningRef.current) return;
    const coords = getCanvasCoords(e);
    drawStroke(lastPointRef.current.x, lastPointRef.current.y, coords.x, coords.y);
    lastPointRef.current = coords;
  };

  const handleMouseUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      pushHistorySnapshot();
    }
  };

  const handleMouseLeave = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      pushHistorySnapshot();
    }
    setIsHoveringCanvas(false);
    setCursorPos(null);
    setHoverPixelColor(null);
  };

  // Reset to initial cutout state
  const handleResetToAI = () => {
    const working = workingCanvasRef.current;
    if (!working) return;
    const wCtx = working.getContext('2d', { willReadFrequently: true });
    if (!wCtx) return;

    wCtx.clearRect(0, 0, working.width, working.height);
    if (cutoutImgRef.current) {
      wCtx.drawImage(cutoutImgRef.current, 0, 0, working.width, working.height);
    } else if (originalCanvasRef.current) {
      wCtx.drawImage(originalCanvasRef.current, 0, 0, working.width, working.height);
    }

    chromaBaseSnapshotRef.current = wCtx.getImageData(0, 0, working.width, working.height);

    const snapshot = wCtx.getImageData(0, 0, working.width, working.height);
    historyRef.current.push(snapshot);
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(true);
    setCanRedo(false);

    renderDisplay();
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  // Save the result to storage
  const handleSaveToStorage = async () => {
    const working = workingCanvasRef.current;
    const display = displayCanvasRef.current;
    if (!working || !display || !selectedFile) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSavedSuccessPath(null);

    try {
      const isTransparent = bgColor === 'transparent';
      const defaultExt = isTransparent ? 'png' : 'jpg';

      let base64Data: string;
      if (isTransparent) {
        // Export transparent cutout as lossless PNG
        base64Data = working.toDataURL('image/png');
      } else {
        // Export colored background as high quality JPEG
        base64Data = display.toDataURL('image/jpeg', 0.95);
      }

      // Clean filename
      let filename = filenameInput.trim();
      if (!filename) {
        const stem = selectedFile.split('\\').pop()?.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'foto';
        filename = `${stem}_${isTransparent ? 'nobg.png' : 'pasfoto.jpg'}`;
      } else if (!filename.toLowerCase().endsWith('.' + defaultExt)) {
        filename = `${filename.replace(/\.[^/.]+$/, '')}.${defaultExt}`;
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
    const stem = selectedFile?.split('\\').pop()?.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'foto';
    const defaultFilename = `${stem}_${isTransparent ? 'nobg.png' : 'pasfoto.jpg'}`;

    try {
      const customPath = await save({
        defaultPath: defaultFilename,
        filters: [{ name: 'Image', extensions: [defaultExt] }],
      });
      if (customPath) {
        const dir =
          customPath.substring(0, customPath.lastIndexOf('\\')) ||
          customPath.substring(0, customPath.lastIndexOf('/'));
        const name = customPath.split('\\').pop()?.split('/').pop() || defaultFilename;

        const working = workingCanvasRef.current;
        const display = displayCanvasRef.current;
        if (!working || !display) return;

        const base64Data = isTransparent
          ? working.toDataURL('image/png')
          : display.toDataURL('image/jpeg', 0.95);

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
                <Sparkles className="w-3.5 h-3.5" /> AI Cutout & Chroma Key Studio
              </div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                Hapus Background Foto & Pas Foto
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Potong otomatis dengan AI, Chroma Key pipet warna logo seketika, dan kuas perbaikan detail.
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
                  Portrait manusia, logo berlatar putih/polos, stempel, atau pas foto (JPG, PNG, WebP)
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
                    <span
                      className="text-xs font-semibold text-slate-800 dark:text-neutral-100 block truncate"
                      title={selectedFile}
                    >
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

          {/* Mode Selection & Trigger */}
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
                        AI Deep Learning (Rekomendasi Manusia)
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
                      ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500 shadow-xs'
                      : 'bg-white/80 dark:bg-neutral-800/70 border-black/[0.06] dark:border-white/[0.08] hover:border-amber-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <Pipette className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Chroma Key / Pembersih Warna Logo
                      </span>
                      <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.2 rounded-md font-semibold">
                        Instan 0ms
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Hapus seketika background putih/polos pada logo, stempel, atau green screen dengan pipet warna presisi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] p-5 rounded-3xl flex items-center justify-between gap-4 shadow-sm">
                <span className="text-xs text-slate-500 dark:text-neutral-400">
                  {method === 'color'
                    ? 'Studio Chroma Key siap dibuka secara instan tanpa perlu menunggu render AI.'
                    : 'Hasil pemotongan AI akan dibuka di editor interaktif untuk disempurnakan.'}
                </span>

                <button
                  onClick={handleExecuteAI}
                  disabled={isProcessingAI}
                  className={`px-7 py-2.5 text-white font-medium text-xs rounded-xl shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                    method === 'color'
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-rose-500 hover:bg-rose-600'
                  }`}
                >
                  {isProcessingAI ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{processingMsg || 'Sedang Memproses...'}</span>
                    </>
                  ) : method === 'color' ? (
                    <>
                      <Pipette className="w-3.5 h-3.5" />
                      <span>🪄 Buka Studio Chroma Key Logo (Instan)</span>
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

      {/* STEP 2: Interactive Studio (Preview, Chroma Key, Manual Erase/Restore, & Save) */}
      {hasCutout && (
        <div className="space-y-4 animate-fadeIn">
          {/* Studio Top Control Toolbar */}
          <div className="bg-white/85 dark:bg-[#1E1E1E]/85 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] p-4 rounded-3xl shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Tool Mode Selector: Chroma Key vs Erase vs Restore */}
              <div className="flex items-center gap-1.5 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
                <button
                  onClick={handleSelectChromaMode}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    brushMode === 'chroma'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-neutral-300 hover:text-amber-500'
                  }`}
                  title="Hapus background warna/logo seketika dengan pipet"
                >
                  <Pipette className="w-3.5 h-3.5" />
                  <span>Chroma Key (Logo)</span>
                </button>

                <button
                  onClick={() => setBrushMode('erase')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    brushMode === 'erase'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-neutral-300 hover:text-rose-500'
                  }`}
                  title="Hapus manual sisa background dengan kuas"
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
                  title="Kembalikan bagian foto asli yang terpotong"
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>Pulihkan (Restore)</span>
                </button>
              </div>

              {/* Undo / Redo & Compare Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  title="Undo coretan / warna (Ctrl + Z)"
                  className="p-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-slate-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  title="Redo coretan / warna (Ctrl + Y)"
                  className="p-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-slate-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetToAI}
                  title="Kembalikan ke gambar potongan awal"
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

            {/* Sub-bar: Specific Controls depending on active mode */}
            {brushMode === 'chroma' ? (
              <div className="flex flex-wrap items-center gap-3 bg-amber-500/[0.05] dark:bg-amber-500/[0.08] p-2.5 rounded-2xl border border-amber-500/20 w-full animate-fadeIn">
                {/* Target Color & Pipette Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200">
                    Warna Target:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-6 h-6 rounded-lg border border-black/20 dark:border-white/20 shadow-xs shrink-0"
                      style={{ backgroundColor: chromaColor }}
                      title={`Warna target aktif: ${chromaColor}`}
                    />
                    <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-neutral-200 uppercase min-w-[58px]">
                      {chromaColor}
                    </span>
                  </div>

                  <button
                    onClick={handlePickColor}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                      isPickingColor
                        ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-400 ring-offset-1 animate-pulse'
                        : 'bg-white dark:bg-neutral-800 border-black/[0.08] dark:border-white/[0.1] text-amber-600 dark:text-amber-400 hover:border-amber-400'
                    }`}
                    title="Klik untuk mengambil warna langsung dari foto"
                  >
                    <Pipette className="w-3.5 h-3.5" />
                    <span>{isPickingColor ? 'Klik pada Foto...' : 'Ambil Pipet'}</span>
                  </button>

                  {/* Preset Swatches */}
                  <div className="flex items-center gap-1 ml-1">
                    {chromaPresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleColorChange(preset.id)}
                        className={`w-6 h-6 rounded-lg border transition cursor-pointer shrink-0 ${
                          chromaColor.toUpperCase() === preset.id.toUpperCase()
                            ? 'ring-2 ring-amber-500 ring-offset-1 border-black/30 scale-105'
                            : 'border-black/15 hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.color }}
                        title={`Pilih ${preset.label} (${preset.color})`}
                      />
                    ))}

                    {/* Custom Color Input */}
                    <label
                      className="w-6 h-6 rounded-lg border border-black/15 overflow-hidden flex items-center justify-center cursor-pointer hover:scale-105 transition shrink-0 bg-gradient-to-br from-red-500 via-green-500 to-blue-500"
                      title="Pilih warna kustom dengan palet"
                    >
                      <input
                        type="color"
                        value={chromaColor}
                        onChange={(e) => handleColorChange(e.target.value.toUpperCase())}
                        className="opacity-0 w-full h-full cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Vertical separator */}
                <div className="h-6 w-px bg-black/[0.08] dark:bg-white/[0.1] hidden md:block" />

                {/* Tolerance Slider */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-neutral-300">
                    <Sliders className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-semibold">Toleransi:</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold w-9 text-right">
                      {chromaTolerance}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="80"
                    step="1"
                    value={chromaTolerance}
                    onChange={(e) => handleToleranceChange(parseInt(e.target.value, 10))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    className="w-20 sm:w-28 accent-amber-500 cursor-pointer"
                    title="Sensitivitas jangkauan warna yang dihapus"
                  />
                  <div className="hidden sm:flex items-center gap-1">
                    {[15, 25, 40, 60].map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          handleToleranceChange(t);
                          handleSliderCommit();
                        }}
                        className={`px-1.5 py-0.5 text-[10px] rounded-md border font-mono transition cursor-pointer ${
                          chromaTolerance === t
                            ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/40 font-bold'
                            : 'border-black/[0.08] dark:border-white/[0.1] text-slate-500 hover:border-slate-400'
                        }`}
                      >
                        {t}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vertical separator */}
                <div className="h-6 w-px bg-black/[0.08] dark:bg-white/[0.1] hidden lg:block" />

                {/* Smoothness / Feathering Slider */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-neutral-300">
                    Kehalusan:
                  </span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold text-xs w-8 text-right">
                    {chromaSmoothness}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={chromaSmoothness}
                    onChange={(e) => handleSmoothnessChange(parseInt(e.target.value, 10))}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    className="w-16 sm:w-24 accent-amber-500 cursor-pointer"
                    title="Kehalusan tepi feathering untuk mencegah garis putih"
                  />
                </div>

                {/* Woosh button */}
                <button
                  onClick={() => handleColorChange(chromaColor)}
                  className="ml-auto px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
                  title="Terapkan pembersihan warna seketika"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>Hapus Seketika (Woosh!)</span>
                </button>
              </div>
            ) : (
              /* Brush Size controls when in Erase / Restore mode */
              <div className="flex flex-wrap items-center gap-3 bg-black/[0.02] dark:bg-white/[0.04] px-3.5 py-1.5 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] animate-fadeIn">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-300">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">Ukuran Kuas:</span>
                  <span
                    className={`font-mono font-bold w-12 text-right ${
                      brushMode === 'erase'
                        ? 'text-rose-500 dark:text-rose-400'
                        : 'text-emerald-500 dark:text-emerald-400'
                    }`}
                  >
                    {brushSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="1"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                  className={`w-24 md:w-36 cursor-pointer ${
                    brushMode === 'erase' ? 'accent-rose-500' : 'accent-emerald-500'
                  }`}
                  title="Shift + Scroll pada foto untuk mengubah cepat"
                />
                <div className="flex items-center gap-1">
                  {[15, 45, 90, 150].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setBrushSize(sz)}
                      className={`px-1.5 py-0.5 text-[10px] rounded-md border font-mono transition cursor-pointer ${
                        brushSize === sz
                          ? brushMode === 'erase'
                            ? 'border-rose-500 text-rose-500 bg-rose-50 dark:bg-rose-950/40'
                            : 'border-emerald-500 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'border-black/[0.08] dark:border-white/[0.1] text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Background Color Bar & Zoom Controls */}
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

                  {/* Custom preview background color */}
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

              {/* Zoom Buttons with Reset */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.04] p-0.5 rounded-xl border border-black/[0.05] dark:border-white/[0.06]">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-neutral-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer"
                    title="Perkecil (Ctrl + Scroll Down)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-600 dark:text-neutral-300 px-1.5 min-w-[46px] text-center font-bold">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(5, Math.round((z + 0.25) * 100) / 100))}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-neutral-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer"
                    title="Perbesar (Ctrl + Scroll Up)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleResetView}
                  className="px-2.5 py-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-slate-600 dark:text-neutral-300 hover:text-slate-800 dark:hover:text-neutral-100 text-xs font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer flex items-center gap-1"
                  title="Kembalikan Tampilan Penuh (Fit)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Fit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Canvas Workspace */}
          <div
            ref={workspaceRef}
            onMouseDown={handleWorkspaceMouseDown}
            onMouseMove={handleWorkspaceMouseMove}
            onMouseUp={handleWorkspaceMouseUp}
            className={`relative bg-[#E5E5EA] dark:bg-[#141414] rounded-3xl p-4 md:p-6 overflow-hidden border border-black/[0.08] dark:border-white/[0.08] shadow-inner flex items-center justify-center min-h-[440px] max-h-[640px] select-none ${
              isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          >
            {/* Checkerboard Pattern for transparent areas */}
            <div
              className="relative rounded-2xl shadow-xl flex items-center justify-center"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isPanningRef.current ? 'none' : 'transform 0.08s ease-out',
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
                  ref={displayCanvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseEnter={() => setIsHoveringCanvas(true)}
                  onMouseLeave={handleMouseLeave}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`block max-w-full max-h-[500px] w-auto h-auto object-contain select-none ${
                    isSpacePressed
                      ? 'cursor-grab active:cursor-grabbing'
                      : brushMode === 'chroma' || isPickingColor
                      ? 'cursor-crosshair'
                      : 'cursor-crosshair'
                  }`}
                />

                {/* Live Brush Circle Cursor Overlay (Erase / Restore) */}
                {isHoveringCanvas &&
                  cursorPos &&
                  (brushMode === 'erase' || brushMode === 'restore') &&
                  !isSpacePressed &&
                  !isPanningRef.current && (
                    <div
                      className={`pointer-events-none absolute rounded-full border-2 transition-transform duration-75 ${
                        brushMode === 'erase'
                          ? 'border-rose-500 bg-rose-500/20'
                          : 'border-emerald-500 bg-emerald-500/20'
                      }`}
                      style={{
                        width: `${Math.max(6, (brushSize * displayScale) / zoomLevel)}px`,
                        height: `${Math.max(6, (brushSize * displayScale) / zoomLevel)}px`,
                        left: `${cursorPos.x}px`,
                        top: `${cursorPos.y}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}

                {/* Live Loupe / Color Swatch Hover Pill (Chroma Key) */}
                {isHoveringCanvas &&
                  cursorPos &&
                  brushMode === 'chroma' &&
                  !isSpacePressed &&
                  !isPanningRef.current && (
                    <div
                      className="pointer-events-none absolute flex items-center gap-1.5 -translate-x-1/2 -translate-y-full pb-3 filter drop-shadow-md z-30 transition-all duration-75"
                      style={{
                        left: `${cursorPos.x}px`,
                        top: `${cursorPos.y}px`,
                      }}
                    >
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/90 text-white text-[10px] font-mono border border-white/20 shadow-lg">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-inner"
                          style={{ backgroundColor: hoverPixelColor || '#FFFFFF' }}
                        />
                        <span>{hoverPixelColor || '#FFFFFF'}</span>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Mode & Action Pill Floating Tag */}
            <div className="absolute top-4 left-5 pointer-events-none flex items-center gap-2">
              <span
                className={`text-[11px] font-semibold px-3 py-1 rounded-full shadow-md backdrop-blur-md flex items-center gap-1.5 ${
                  brushMode === 'chroma'
                    ? 'bg-amber-500/90 text-white'
                    : brushMode === 'erase'
                    ? 'bg-rose-500/90 text-white'
                    : 'bg-emerald-500/90 text-white'
                }`}
              >
                {brushMode === 'chroma' ? (
                  <>
                    <Pipette className="w-3 h-3" /> Mode Chroma Key: Klik di foto untuk memilih warna yang ingin dihilangkan
                  </>
                ) : brushMode === 'erase' ? (
                  <>
                    <Eraser className="w-3 h-3" /> Mode Hapus Latar Belakang (Kuas)
                  </>
                ) : (
                  <>
                    <Paintbrush className="w-3 h-3" /> Mode Pulihkan Foto Asli (Kuas)
                  </>
                )}
              </span>

              {zoomLevel !== 1 && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white shadow-md flex items-center gap-1">
                  <Move className="w-3 h-3" /> Zoom: {Math.round(zoomLevel * 100)}%
                </span>
              )}
            </div>
          </div>

          {/* Quick Shortcuts Guide Banner */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-4 text-[11px] text-slate-500 dark:text-neutral-400 bg-white/70 dark:bg-[#1E1E1E]/70 backdrop-blur-md p-2.5 px-4 rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
            <span className="flex items-center gap-1.5 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.08] font-mono text-[10px] text-slate-700 dark:text-neutral-200 border border-black/[0.05]">
                Klik Foto
              </kbd>{' '}
              Ambil Warna Chroma
            </span>
            <span className="text-slate-300 dark:text-neutral-600 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.08] font-mono text-[10px] text-slate-700 dark:text-neutral-200 border border-black/[0.05]">
                Ctrl + Scroll
              </kbd>{' '}
              Zoom In/Out
            </span>
            <span className="text-slate-300 dark:text-neutral-600 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.08] font-mono text-[10px] text-slate-700 dark:text-neutral-200 border border-black/[0.05]">
                Shift + Scroll
              </kbd>{' '}
              Ubah Ukuran Kuas
            </span>
            <span className="text-slate-300 dark:text-neutral-600 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.08] font-mono text-[10px] text-slate-700 dark:text-neutral-200 border border-black/[0.05]">
                Spasi + Drag
              </kbd>{' '}
              atau{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.08] font-mono text-[10px] text-slate-700 dark:text-neutral-200 border border-black/[0.05]">
                Klik Kanan
              </kbd>{' '}
              Geser Kanvas
            </span>
            <span className="text-slate-300 dark:text-neutral-600 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.08] font-mono text-[10px] text-slate-700 dark:text-neutral-200 border border-black/[0.05]">
                Ctrl + Z
              </kbd>{' '}
              Batal
            </span>
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
