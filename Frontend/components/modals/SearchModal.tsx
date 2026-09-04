'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, SquarePen, Folder, Terminal, ExternalLink, X } from 'lucide-react';
import { TaskSession } from '@/types/chat';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskSession[];
  onSelectTask: (taskId: string) => void;
  onNewTask: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onSelectTask,
  onNewTask,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(query.toLowerCase()) ||
    t.messages.some((m) => m.content?.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-[#1A1A1A] border border-[#333333] rounded-[20px] shadow-2xl overflow-hidden text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-[#2A2A2A] gap-3">
          <Search className="w-4 h-4 text-[#757575]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, findings, and tools..."
            className="w-full bg-transparent text-white placeholder-[#757575] focus:outline-none text-[14px]"
          />
          <button
            onClick={onClose}
            className="p-1 text-[#757575] hover:text-white rounded-md hover:bg-[#262626] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {/* Quick Action: New Task */}
          <button
            onClick={() => {
              onNewTask();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[#A0A0A0] hover:text-white hover:bg-[#242424] transition-colors text-left"
          >
            <SquarePen className="w-4 h-4 text-emerald-400" />
            <span className="font-medium text-[13.5px]">Start a new task</span>
          </button>

          <div className="text-[11px] font-semibold text-[#757575] uppercase tracking-wider px-3 pt-2 pb-1">
            Matching Tasks
          </div>

          {filteredTasks.length === 0 ? (
            <div className="px-4 py-6 text-center text-[#757575] text-[13px]">
              No tasks found matching &quot;{query}&quot;
            </div>
          ) : (
            filteredTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onSelectTask(t.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-white hover:bg-[#242424] transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Terminal className="w-4 h-4 text-[#A0A0A0] group-hover:text-white shrink-0" />
                  <span className="truncate text-[13.5px]">{t.title}</span>
                </div>
                <span className="text-[11px] text-[#757575] shrink-0 font-mono">
                  {t.messages.length} msgs
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#141414] border-t border-[#262626] flex items-center justify-between text-[11px] text-[#757575]">
          <span>Navigate with arrows</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
