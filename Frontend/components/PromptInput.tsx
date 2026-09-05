'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  ChevronDown,
  Paperclip,
  FolderOpen,
  Layers,
  Search,
  Zap,
  Terminal,
  Shield,
  FileCode,
  Globe,
  Monitor,
  Cpu,
  Plus
} from 'lucide-react';

interface PromptInputProps {
  onSendMessage: (text: string, options: { mode: string; target: string; model: string }) => void;
  isLoading?: boolean;
  onStop?: () => void;
  placeholder?: string;
  initialValue?: string;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  onSendMessage,
  isLoading = false,
  onStop,
  placeholder = "Ask, learn, brainstorm...",
  initialValue = "",
}) => {
  const [input, setInput] = useState(initialValue);
  const [mode, setMode] = useState('Ask');
  const [target, setTarget] = useState('Kairo Desktop');
  const modelId = 'llama-3.3-70b-versatile';

  const [openDropdown, setOpenDropdown] = useState<'plus' | 'mode' | 'target' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialValue]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    onSendMessage(input.trim(), { mode, target, model: modelId });
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setOpenDropdown(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full flex justify-center pb-2 px-2 bg-transparent" ref={containerRef}>
      <div className="w-full max-w-[760px] bg-[#121212] rounded-2xl border border-[#242424] shadow-2xl transition-all focus-within:border-[#3A3A3A] relative">
        {/* Main Textarea */}
        <div className="px-4 pt-3.5 pb-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            className="w-full bg-transparent text-[#F4F4F0] text-[14.5px] placeholder-[#666666] focus:outline-none resize-none max-h-[200px] leading-relaxed font-sans"
          />
        </div>

        {/* Toolbar & Pills */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t border-transparent">
          {/* Left Actions */}
          <div className="flex items-center gap-2">
            {/* Plus Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'plus' ? null : 'plus')}
                className="w-7 h-7 rounded-full bg-[#1C1C1C] border border-[#2A2A2A] flex items-center justify-center text-[#888888] hover:text-white hover:bg-[#252525] transition-colors"
                title="Attach or Tools"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {openDropdown === 'plus' && (
                <div className="absolute bottom-9 left-0 w-48 bg-[#181818] border border-[#2C2C2C] rounded-xl shadow-2xl p-1 z-50 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => setOpenDropdown(null)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[#C0C0C0] hover:bg-[#242424] hover:text-white transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-[#888888]" />
                    <span>Attach Files</span>
                  </button>
                  <button
                    onClick={() => setOpenDropdown(null)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[#C0C0C0] hover:bg-[#242424] hover:text-white transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#888888]" />
                    <span>Target URL Audit</span>
                  </button>
                  <button
                    onClick={() => setOpenDropdown(null)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[#C0C0C0] hover:bg-[#242424] hover:text-white transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[#888888]" />
                    <span>SAST Code Scan</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mode Pill (Ask) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'mode' ? null : 'mode')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] text-xs font-medium bg-[#1C1C1C] text-[#D0D0D0] hover:bg-[#242424] border border-[#2A2A2A] transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-[#888888]" />
                <span>{mode}</span>
                <ChevronDown className="w-3 h-3 text-[#666666]" />
              </button>

              {openDropdown === 'mode' && (
                <div className="absolute bottom-9 left-0 w-44 bg-[#181818] border border-[#2C2C2C] rounded-xl shadow-2xl p-1 z-50 text-xs space-y-0.5">
                  {['Ask', 'Vulnerability Audit', 'Passive Recon', 'Code Review'].map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        mode === m ? 'bg-[#262626] text-white font-medium' : 'text-[#A0A0A0] hover:bg-[#222222] hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Target Pill (Kairo Desktop) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'target' ? null : 'target')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] text-xs font-medium bg-[#1C1C1C] text-[#D0D0D0] hover:bg-[#242424] border border-[#2A2A2A] transition-colors"
              >
                <Monitor className="w-3.5 h-3.5 text-[#888888]" />
                <span>{target}</span>
                <ChevronDown className="w-3 h-3 text-[#666666]" />
              </button>

              {openDropdown === 'target' && (
                <div className="absolute bottom-9 left-0 w-52 bg-[#181818] border border-[#2C2C2C] rounded-xl shadow-2xl p-1 z-50 text-xs space-y-0.5">
                  {['Kairo Desktop', 'Custom URL Target', 'Local Workspace'].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTarget(t);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        target === t ? 'bg-[#262626] text-white font-medium' : 'text-[#A0A0A0] hover:bg-[#222222] hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Dedicated Model Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono text-[#A3A3A0] select-none bg-[#141414] border border-[#222222]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B8FF3D] animate-pulse" />
              <span>Llama 3.3 70B</span>
            </div>

            {/* Send Button */}
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="w-8 h-8 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white flex items-center justify-center transition-all shadow-md"
                title="Stop generating"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!input.trim()}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  input.trim()
                    ? 'bg-white text-black hover:bg-neutral-200 cursor-pointer shadow-md active:scale-95'
                    : 'bg-[#242424] text-[#555555] cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
