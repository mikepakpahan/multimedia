import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TaskQueue } from './components/TaskQueue';
import { YouTubeTab } from './components/tabs/YouTubeTab';
import { VideoTab } from './components/tabs/VideoTab';
import { AudioTab } from './components/tabs/AudioTab';
import { ImageTab } from './components/tabs/ImageTab';
import { PdfTab } from './components/tabs/PdfTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { TabType, EngineStatus, MediaTask, YouTubeMetadata, ProgressPayload } from './types';
import './App.css';

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('mm_theme') as 'light' | 'dark') || 'light';
  });
  const [activeTab, setActiveTab] = useState<TabType>('youtube');
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [outputDir, setOutputDir] = useState<string>('');
  const [tasks, setTasks] = useState<MediaTask[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);

  // Sync theme with DOM and localStorage
  useEffect(() => {
    localStorage.setItem('mm_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const fetchEngines = async () => {
    try {
      const status = await invoke<EngineStatus>('check_system_engines');
      setEngineStatus(status);
      if (!outputDir) {
        setOutputDir(status.default_output_dir);
      }
    } catch (err) {
      console.error('Failed to check system engines:', err);
    }
  };

  useEffect(() => {
    fetchEngines();

    // Listen for real-time task progress events from Rust
    const unlistenPromise = listen<ProgressPayload>('task-progress', (event) => {
      const payload = event.payload;
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id === payload.task_id) {
            return {
              ...task,
              progress: Math.round(payload.progress),
              speed: payload.speed || task.speed,
              eta: payload.eta || task.eta,
              status: payload.status,
              outputPath: payload.output_path || task.outputPath,
              error: payload.status === 'failed' ? payload.message : undefined,
            };
          }
          return task;
        })
      );
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const handleStartDownload = async (
    url: string,
    format: string,
    metadata?: YouTubeMetadata
  ) => {
    const taskId = `yt-${Date.now()}`;
    const newTask: MediaTask = {
      id: taskId,
      name: metadata?.title || `YouTube: ${url.length > 35 ? url.substring(0, 35) + '...' : url}`,
      type: 'youtube',
      status: 'processing',
      progress: 0,
      targetFormat: format.toUpperCase(),
      thumbnail: metadata?.thumbnail,
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsQueueOpen(true);

    try {
      await invoke('start_youtube_download', {
        taskId,
        url,
        formatPreset: format,
        outputDir: outputDir || (engineStatus?.default_output_dir ?? ''),
      });
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: 'failed', error: String(err) }
            : t
        )
      );
    }
  };

  const handleStartVideoConversion = async (
    filePath: string,
    targetFormat: string,
    preset: string
  ) => {
    const filename = filePath.split('\\').pop()?.split('/').pop() || filePath;
    const taskId = `vid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTask: MediaTask = {
      id: taskId,
      name: `Video: ${filename}`,
      type: 'video',
      status: 'processing',
      progress: 0,
      targetFormat: `${targetFormat.toUpperCase()} (${preset})`,
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsQueueOpen(true);

    try {
      await invoke('start_video_conversion', {
        taskId,
        inputPath: filePath,
        targetFormat,
        preset,
        outputDir: outputDir || (engineStatus?.default_output_dir ?? ''),
      });
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: 'failed', error: String(err) } : t
        )
      );
    }
  };

  const handleStartAudioConversion = async (
    filePath: string,
    targetFormat: string,
    bitrate: string
  ) => {
    const filename = filePath.split('\\').pop()?.split('/').pop() || filePath;
    const taskId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTask: MediaTask = {
      id: taskId,
      name: `Audio: ${filename}`,
      type: 'audio',
      status: 'processing',
      progress: 0,
      targetFormat: `${targetFormat.toUpperCase()} (${bitrate}k)`,
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsQueueOpen(true);

    try {
      await invoke('start_audio_conversion', {
        taskId,
        inputPath: filePath,
        targetFormat,
        bitrate,
        outputDir: outputDir || (engineStatus?.default_output_dir ?? ''),
      });
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: 'failed', error: String(err) } : t
        )
      );
    }
  };

  const handleStartImageConversion = async (
    filePath: string,
    targetFormat: string,
    quality: number,
    scalePercent: number
  ) => {
    const filename = filePath.split('\\').pop()?.split('/').pop() || filePath;
    const taskId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTask: MediaTask = {
      id: taskId,
      name: `Image: ${filename}`,
      type: 'image',
      status: 'processing',
      progress: 0,
      targetFormat: `${targetFormat.toUpperCase()} (${quality}%)`,
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsQueueOpen(true);

    try {
      await invoke('process_image', {
        taskId,
        inputPath: filePath,
        targetFormat,
        quality,
        scalePercent: scalePercent < 100 ? scalePercent : null,
        outputDir: outputDir || (engineStatus?.default_output_dir ?? ''),
      });
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: 'failed', error: String(err) } : t
        )
      );
    }
  };

  const handleStartPdfToDocx = async (filePath: string) => {
    const filename = filePath.split('\\').pop()?.split('/').pop() || filePath;
    const taskId = `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTask: MediaTask = {
      id: taskId,
      name: `PDF -> Word: ${filename}`,
      type: 'pdf',
      status: 'processing',
      progress: 0,
      targetFormat: 'DOCX',
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsQueueOpen(true);

    try {
      await invoke('start_pdf_to_docx', {
        taskId,
        inputPath: filePath,
        outputDir: outputDir || (engineStatus?.default_output_dir ?? ''),
      });
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: 'failed', error: String(err) } : t
        )
      );
    }
  };

  const handleStartPdfCompress = async (filePath: string, quality: string) => {
    const filename = filePath.split('\\').pop()?.split('/').pop() || filePath;
    const taskId = `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTask: MediaTask = {
      id: taskId,
      name: `PDF Compress: ${filename}`,
      type: 'pdf',
      status: 'processing',
      progress: 0,
      targetFormat: `PDF (${quality.toUpperCase()})`,
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsQueueOpen(true);

    try {
      await invoke('start_pdf_compress', {
        taskId,
        inputPath: filePath,
        qualityLevel: quality,
        outputDir: outputDir || (engineStatus?.default_output_dir ?? ''),
      });
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: 'failed', error: String(err) } : t
        )
      );
    }
  };

  const handleStartPdfMerge = async (filePaths: string[], outputFilename: string) => {
    const taskId = `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTask: MediaTask = {
      id: taskId,
      name: `PDF Merge (${filePaths.length} file): ${outputFilename}`,
      type: 'pdf',
      status: 'processing',
      progress: 0,
      targetFormat: 'PDF (MERGE)',
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsQueueOpen(true);

    try {
      await invoke('start_pdf_merge', {
        taskId,
        inputPaths: filePaths,
        outputFilename,
        outputDir: outputDir || (engineStatus?.default_output_dir ?? ''),
      });
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: 'failed', error: String(err) } : t
        )
      );
    }
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((t) => t.status !== 'completed' && t.status !== 'failed'));
  };

  const handleRemoveTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const activeTasksCount = tasks.filter((t) => t.status === 'processing' || t.status === 'pending').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFD] dark:bg-[#131314] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        engineStatus={engineStatus}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          outputDir={outputDir}
          setOutputDir={setOutputDir}
          activeTasksCount={activeTasksCount}
          toggleQueueDrawer={() => setIsQueueOpen(!isQueueOpen)}
          isQueueOpen={isQueueOpen}
          theme={theme}
          setTheme={setTheme}
        />

        {/* Dynamic Tab Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'youtube' && (
            <YouTubeTab
              engineStatus={engineStatus}
              outputDir={outputDir}
              onStartDownload={handleStartDownload}
            />
          )}

          {activeTab === 'video' && (
            <VideoTab
              outputDir={outputDir}
              engineStatus={engineStatus}
              onStartConversion={handleStartVideoConversion}
            />
          )}

          {activeTab === 'audio' && (
            <AudioTab
              outputDir={outputDir}
              engineStatus={engineStatus}
              onStartConversion={handleStartAudioConversion}
            />
          )}

          {activeTab === 'image' && (
            <ImageTab
              outputDir={outputDir}
              onStartConversion={handleStartImageConversion}
            />
          )}

          {activeTab === 'pdf' && (
            <PdfTab
              outputDir={outputDir}
              onStartToDocx={handleStartPdfToDocx}
              onStartCompress={handleStartPdfCompress}
              onStartMerge={handleStartPdfMerge}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              engineStatus={engineStatus}
              outputDir={outputDir}
              setOutputDir={setOutputDir}
              onRefreshEngines={fetchEngines}
            />
          )}
        </main>

        {/* Global Task Queue Drawer */}
        <TaskQueue
          tasks={tasks}
          onClearCompleted={handleClearCompleted}
          onRemoveTask={handleRemoveTask}
          isOpen={isQueueOpen}
          onClose={() => setIsQueueOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;
