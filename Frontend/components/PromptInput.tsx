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
  Cpu
} from 'lucide-react';

interface PromptInputProps {
  onSendMessage: (text: string, options: { mode: string; target: string; model: string }) => void;
  isLoading?: boolean;
  onStop?: () => void;
  placeholder?: string;
}

const AVAILABLE_MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B', name: 'OpenAI GPT OSS 120B', tag: 'Deep Audit' },
  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B', name: 'Qwen 3.8 27B', tag: 'Ultra Fast' },
  { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B', name: 'OpenAI GPT OSS 20B', tag: 'Fast Recon' },
];

export const PromptInput: React.FC<PromptInputProps> = ({
  onSendMessage,
  isLoading = false,
  onStop,
  placeholder = "Ask, learn, brainstorm",
}) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('Ask');
  const [target, setTarget] = useState('Reindeer Desktop');
  const [modelId, setModelId] = useState('openai/gpt-oss-120b');

  const [openDropdown, setOpenDropdown] = useState<'plus' | 'mode' | 'target' | 'model' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const currentModelLabel = AVAILABLE_MODELS.find((m) => m.id === modelId)?.label || 'GPT OSS 120B';

  return (
    <div className="w-full flex justify-center pb-6 px-4 bg-transparent" ref={containerRef}>
      <div className="w-full max-w-[680px] bg-[#1A1A1A] rounded-[24px] border border-[#2A2A2A] shadow-2xl transition-all focus-within:border-[#383838]">
        {/* Main Textarea */}
        <div className="px-4 pt-3.5 pb-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            className="w-full bg-transparent text-[#ECECEC] text-[14.5px] placeholder-[#757575] focus:outline-none resize-none max-h-[200px] leading-relaxed font-sans"
          />
        </div>

        {/* Toolbar & Pills */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          {/* Left Actions */}
          <div className="flex items-center gap-1.5">
            {/* Plus / Attach Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'plus' ? null : 'plus')}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#888888] hover:text-white hover:bg-[#262626] transition-colors"
                title="Attach or Tools"
              >
                <span className="text-lg leading-none">+</span>
              </button>

              {openDropdown === 'plus' && (
                <div className="absolute bottom-9 left-0 w-48 bg-[#1C1C1C] border border-[#333333] rounded-[12px] shadow-xl p-1 z-40 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => setOpenDropdown(null)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[8px] text-[#C0C0C0] hover:bg-[#262626] hover:text-white transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-[#888888]" />
                    <span>Attach Files</span>
                  </button>
                  <button
                    onClick={() => setOpenDropdown(null)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[8px] text-[#C0C0C0] hover:bg-[#262626] hover:text-white transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#888888]" />
                    <span>Target URL Audit</span>
                  </button>
                  <button
                    onClick={() => setOpenDropdown(null)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[8px] text-[#C0C0C0] hover:bg-[#262626] hover:text-white transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[#888888]" />
                    <span>SAST Code Scan</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mode Pill (Ask / Pentest / Audit) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'mode' ? null : 'mode')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-[10px] text-xs font-medium bg-[#222222] text-[#D0D0D0] hover:bg-[#282828] border border-[#2E2E2E] transition-colors"
              >
                <Shield className="w-3 h-3 text-[#A0A0A0]" />
                <span>{mode}</span>
                <ChevronDown className="w-3 h-3 text-[#757575]" />
              </button>

              {openDropdown === 'mode' && (
                <div className="absolute bottom-9 left-0 w-44 bg-[#1C1C1C] border border-[#333333] rounded-[12px] shadow-xl p-1 z-40 text-xs space-y-0.5">
                  {['Ask', 'Vulnerability Audit', 'Passive Recon', 'Code Review'].map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center px-2.5 py-1.5 rounded-[8px] text-left transition-colors ${
                        mode === m ? 'bg-[#2A2A2A] text-white font-medium' : 'text-[#A0A0A0] hover:bg-[#242424] hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Target Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'target' ? null : 'target')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-[10px] text-xs font-medium bg-[#222222] text-[#D0D0D0] hover:bg-[#282828] border border-[#2E2E2E] transition-colors"
              >
                <Terminal className="w-3 h-3 text-[#A0A0A0]" />
                <span>{target}</span>
                <ChevronDown className="w-3 h-3 text-[#757575]" />
              </button>

              {openDropdown === 'target' && (
                <div className="absolute bottom-9 left-0 w-52 bg-[#1C1C1C] border border-[#333333] rounded-[12px] shadow-xl p-1 z-40 text-xs space-y-0.5">
                  {['Reindeer Desktop', 'Custom URL Target', 'Local Workspace'].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTarget(t);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center px-2.5 py-1.5 rounded-[8px] text-left transition-colors ${
                        target === t ? 'bg-[#2A2A2A] text-white font-medium' : 'text-[#A0A0A0] hover:bg-[#242424] hover:text-white'
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
          <div className="flex items-center gap-2">
            {/* Model Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'model' ? null : 'model')}
                className="flex items-center gap-1 px-2 py-1 rounded-[8px] text-xs font-medium text-[#A0A0A0] hover:text-white hover:bg-[#262626] transition-colors"
              >
                <span>{currentModelLabel}</span>
                <ChevronDown className="w-3 h-3 text-[#757575]" />
              </button>

              {openDropdown === 'model' && (
                <div className="absolute bottom-9 right-0 w-60 bg-[#1C1C1C] border border-[#333333] rounded-[12px] shadow-xl p-1 z-40 text-xs space-y-0.5">
                  {AVAILABLE_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setModelId(m.id);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-[8px] transition-colors ${
                        modelId === m.id ? 'bg-[#2A2A2A] text-white font-medium' : 'text-[#A0A0A0] hover:bg-[#242424] hover:text-white'
                      }`}
                    >
                      <span>{m.name}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">{m.tag}</span>
                    </button>
                  ))}
                </div>
              )}
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
                    ? 'bg-white text-black hover:bg-neutral-200 cursor-pointer shadow-md'
                    : 'bg-[#282828] text-[#555555] cursor-not-allowed'
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
