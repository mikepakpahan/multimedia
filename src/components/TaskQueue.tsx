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
    <div className="fixed bottom-0 right-0 w-96 max-w-full bg-slate-900/95 border-l border-t border-slate-800 shadow-2xl rounded-tl-2xl z-50 flex flex-col max-h-[480px] backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Antrean Pemrosesan</h3>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {tasks.some((t) => t.status === 'completed' || t.status === 'failed') && (
            <button
              onClick={onClearCompleted}
              title="Hapus yang selesai"
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="p-4 overflow-y-auto space-y-3 flex-1">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Belum ada antrean tugas aktif
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2"
            >
              <div className="flex items-center gap-2.5">
                {task.thumbnail && (
                  <img
                    src={task.thumbnail}
                    alt=""
                    className="w-10 h-7 object-cover rounded bg-slate-900 border border-slate-800 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-200 truncate" title={task.name}>
                      {task.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold bg-blue-900/40 text-blue-300 border border-blue-800/40 shrink-0">
                      {task.targetFormat}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveTask(task.id)}
                  className="text-slate-500 hover:text-red-400 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
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
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  {task.status === 'processing' && (
                    <span className="flex items-center gap-1 text-blue-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {task.progress}% {task.speed && `• ${task.speed}`} {task.eta && `• ETA ${task.eta}`}
                    </span>
                  )}
                  {task.status === 'completed' && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      Selesai
                    </span>
                  )}
                  {task.status === 'pending' && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      Menunggu
                    </span>
                  )}
                  {task.status === 'failed' && (
                    <span className="flex items-center gap-1 text-rose-400" title={task.error}>
                      <AlertTriangle className="w-3 h-3" />
                      Gagal
                    </span>
                  )}
                </div>

                {task.status === 'completed' && task.outputPath && (
                  <button
                    onClick={() => handleOpenFolder(task.outputPath)}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
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
