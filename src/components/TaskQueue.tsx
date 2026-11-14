import React from 'react';
import { MediaTask } from '../types';
import {
  X,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface TaskQueueProps {
  tasks: MediaTask[];
  onClearCompleted: () => void;
  onRemoveTask: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskQueue: React.FC<TaskQueueProps> = ({
  tasks,
  onClearCompleted,
  onRemoveTask,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleOpenFolder = async (path?: string) => {
    if (!path) return;
    try {
      await invoke('open_output_folder', { path });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 w-96 max-w-[calc(100vw-2.5rem)] bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-2xl rounded-3xl z-50 flex flex-col max-h-[500px] overflow-hidden transition-all animate-fadeIn">
      {/* Header */}
      <div className="p-3.5 px-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-neutral-100">
            Daftar Proses Antrean
          </h3>
          <span className="text-[10px] bg-blue-500 text-white font-bold px-1.5 py-0.2 rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {tasks.some((t) => t.status === 'completed' || t.status === 'failed') && (
            <button
              onClick={onClearCompleted}
              title="Bersihkan yang selesai"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="p-3 overflow-y-auto space-y-2 flex-1">
        {tasks.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-neutral-500 text-xs">
            Belum ada proses yang berjalan
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="p-3 bg-white/70 dark:bg-neutral-800/60 border border-black/[0.04] dark:border-white/[0.06] rounded-2xl space-y-2 shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                {task.thumbnail && (
                  <img
                    src={task.thumbnail}
                    alt=""
                    className="w-10 h-7 object-cover rounded-lg bg-slate-200 dark:bg-neutral-800 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-medium text-slate-800 dark:text-neutral-200 truncate" title={task.name}>
                      {task.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 border border-blue-200/50 dark:border-blue-800/50">
                      {task.targetFormat}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveTask(task.id)}
                  className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-neutral-700/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    task.status === 'completed'
                      ? 'bg-emerald-500'
                      : task.status === 'failed'
                      ? 'bg-rose-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>

              {/* Status details */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-neutral-400">
                <div className="flex items-center gap-1.5">
                  {task.status === 'processing' && (
                    <span className="flex items-center gap-1 text-blue-500 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {task.progress}% {task.speed && `• ${task.speed}`} {task.eta && `• ETA ${task.eta}`}
                    </span>
                  )}
                  {task.status === 'completed' && (
                    <span className="flex items-center gap-1 text-emerald-500 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Selesai
                    </span>
                  )}
                  {task.status === 'pending' && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" /> Menunggu
                    </span>
                  )}
                  {task.status === 'failed' && (
                    <span className="flex items-center gap-1 text-rose-500 font-medium" title={task.error}>
                      <AlertTriangle className="w-3 h-3" /> Gagal: {task.error ? task.error.substring(0, 30) + '...' : ''}
                    </span>
                  )}
                </div>

                {task.status === 'completed' && task.outputPath && (
                  <button
                    onClick={() => handleOpenFolder(task.outputPath)}
                    className="text-blue-500 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <FolderOpen className="w-3 h-3" /> Buka File
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};