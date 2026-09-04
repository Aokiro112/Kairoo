'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Project } from '@/types/chat';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Partial<Project>) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateProject({
      name: name.trim(),
    });

    setName('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[440px] bg-[#141414] border border-[#282828] rounded-[18px] shadow-2xl p-6 relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#888888] hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5 stroke-[1.75]" />
        </button>

        {/* Title & Subtitle */}
        <div className="mb-6">
          <h2 className="text-[19px] font-bold text-white tracking-tight leading-snug">
            Create project
          </h2>
          <p className="text-[13.5px] text-[#8E8E8E] mt-1">
            Group related tasks in one place.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white text-[13.5px] font-medium mb-2">
              Project name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New project"
              className="w-full px-3.5 py-2.5 rounded-[10px] bg-[#141414] border border-[#333333] hover:border-[#444444] text-white placeholder-[#757575] focus:outline-none focus:border-[#666666] text-[14px] transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[10px] bg-[#1E1E1E] hover:bg-[#282828] text-white text-[13.5px] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={`px-4 py-2 rounded-[10px] text-[13.5px] font-medium transition-all ${
                name.trim()
                  ? 'bg-white text-black hover:bg-[#E5E5E5] cursor-pointer'
                  : 'bg-[#828282] text-[#141414] opacity-90 cursor-not-allowed'
              }`}
            >
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
