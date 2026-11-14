import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TaskQueue } from './components/TaskQueue';
import { YouTubeTab } from './components/tabs/YouTubeTab';
import { VideoTab } from './components/tabs/VideoTab';
import { AudioTab } from './components/tabs/AudioTab';
import { ImageTab } from './components/tabs/ImageTab';
import { PdfTab } from './components/tabs/PdfTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { TabType, EngineStatus, MediaTask } from './types';
import './App.css';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('youtube');
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [outputDir, setOutputDir] = useState<string>('');
  const [tasks, setTasks] = useState<MediaTask[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);

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
  }, []);

  const handleStartDownload = (url: string, format: string) => {
    const newTask: MediaTask = {
      id: Math.random().toString(36).substring(2, 9),
      name: `YouTube: ${url.length > 35 ? url.substring(0, 35) + '...' : url}`,
      type: 'youtube',
      status: 'pending',
      progress: 0,
      targetFormat: format.toUpperCase(),
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsQueueOpen(true);
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((t) => t.status !== 'completed' && t.status !== 'failed'));
  };

  const handleRemoveTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const activeTasksCount = tasks.filter((t) => t.status === 'processing' || t.status === 'pending').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
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
        />

        {/* Dynamic Tab Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'youtube' && (
            <YouTubeTab
              engineStatus={engineStatus}
              outputDir={outputDir}
              onStartDownload={handleStartDownload}
            />
          )}

          {activeTab === 'video' && <VideoTab outputDir={outputDir} />}

          {activeTab === 'audio' && <AudioTab outputDir={outputDir} />}

          {activeTab === 'image' && <ImageTab outputDir={outputDir} />}

          {activeTab === 'pdf' && <PdfTab outputDir={outputDir} />}

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
