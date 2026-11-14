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
    <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#28292A] border border-[#E0E2EC] dark:border-[#444746] shadow-xl rounded-3xl z-50 flex flex-col max-h-[500px] overflow-hidden transition-colors">
      {/* Header */}
      <div className="p-4 px-5 border-b border-[#E0E2EC] dark:border-[#444746]/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Antrean Pemrosesan</h3>
          <span className="text-[11px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {tasks.some((t) => t.status === 'completed' || t.status === 'failed') && (
            <button
              onClick={onClearCompleted}
              title="Hapus yang selesai"
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
        {tasks.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">
            Tidak ada antrean tugas saat ini
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="p-3 bg-[#F8FAFD] dark:bg-[#1E1F20] border border-[#E0E2EC] dark:border-[#444746]/60 rounded-2xl space-y-2"
            >
              <div className="flex items-center gap-2.5">
                {task.thumbnail && (
                  <img
                    src={task.thumbnail}
                    alt=""
                    className="w-10 h-7 object-cover rounded-md bg-slate-200 dark:bg-slate-800 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate" title={task.name}>
                      {task.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
                      {task.targetFormat}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveTask(task.id)}
                  className="text-slate-400 hover:text-rose-500 p-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    task.status === 'completed'
                      ? 'bg-emerald-500'
                      : task.status === 'failed'
                      ? 'bg-rose-500'
                      : 'bg-blue-600 dark:bg-blue-400'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>

              {/* Status details */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  {task.status === 'processing' && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {task.progress}% {task.speed && `• ${task.speed}`} {task.eta && `• ETA ${task.eta}`}
                    </span>
                  )}
                  {task.status === 'completed' && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Selesai
                    </span>
                  )}
                  {task.status === 'pending' && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3" /> Menunggu
                    </span>
                  )}
                  {task.status === 'failed' && (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium" title={task.error}>
                      <AlertTriangle className="w-3 h-3" /> Gagal
                    </span>
                  )}
                </div>

                {task.status === 'completed' && task.outputPath && (
                  <button
                    onClick={() => handleOpenFolder(task.outputPath)}
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <FolderOpen className="w-3 h-3" /> Buka
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
