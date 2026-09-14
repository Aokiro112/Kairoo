'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  ChevronDown,
  Paperclip,
  FileCode,
  Globe,
  Monitor,
  Plus,
  X,
  AlertCircle,
  FileText,
  Code2,
  Check,
  Sparkles,
  Cpu
} from 'lucide-react';
import { AttachedFile } from '@/types/chat';

const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function detectLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  const ext = lower.split('.').pop() || '';

  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) return 'dockerfile';
  if (lower === 'nginx.conf' || lower.endsWith('.nginx') || lower.endsWith('.conf')) return 'nginx';
  if (lower.startsWith('.env')) return 'env';

  const extMap: Record<string, string> = {
    py: 'python',
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    go: 'go',
    rs: 'rust',
    php: 'php',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    rb: 'ruby',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    sql: 'sql',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    sol: 'solidity',
    html: 'html',
    css: 'css',
    xml: 'xml',
    md: 'markdown',
    txt: 'text',
    csv: 'csv',
    log: 'log',
    nmap: 'text',
  };

  return extMap[ext] || 'text';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ModelOption {
  id: string;
  name: string;
  shortName: string;
  badge?: string;
  badgeColor?: string;
  description: string;
  provider: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    shortName: 'Llama 3.3 70B',
    badge: 'Recommended',
    badgeColor: 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30',
    description: 'Ultra-fast security auditor & payload synthesis',
    provider: 'Groq',
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B',
    shortName: 'GPT-OSS 120B',
    badge: 'High Precision',
    badgeColor: 'bg-blue-950/70 text-blue-400 border-blue-500/30',
    description: 'Comprehensive vulnerability assessment & attack surface mapping',
    provider: 'Groq',
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    shortName: 'DeepSeek',
    badge: 'Paid Provider',
    badgeColor: 'bg-cyan-950/70 text-cyan-400 border-cyan-500/30',
    description: 'Deep cybersecurity reasoning & attack surface analysis',
    provider: 'DeepSeek',
  },
];

interface PromptInputProps {
  onSendMessage: (
    text: string,
    options: { mode: string; target: string; model: string },
    attachments?: AttachedFile[]
  ) => void;
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
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.3-70b-versatile');
  const [openDropdown, setOpenDropdown] = useState<'plus' | 'mode' | 'target' | 'model' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selectedModel from localStorage on mount & listen to storage events
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('kairo_app_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.selectedModel) {
          setSelectedModel(parsed.selectedModel);
        }
      }
    } catch {}

    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('kairo_app_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.selectedModel) {
            setSelectedModel(parsed.selectedModel);
          }
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleSelectModel = (mId: string) => {
    setSelectedModel(mId);
    try {
      const savedSettings = localStorage.getItem('kairo_app_settings');
      const existing = savedSettings ? JSON.parse(savedSettings) : {};
      localStorage.setItem(
        'kairo_app_settings',
        JSON.stringify({ ...existing, selectedModel: mId })
      );
    } catch {}
    setOpenDropdown(null);
  };

  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialValue]);

  // Auto-dismiss error message after 4s
  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

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

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;

    if (attachments.length + fileArray.length > MAX_ATTACHMENTS) {
      setErrorMessage(`Maximum ${MAX_ATTACHMENTS} files allowed per message.`);
      return;
    }

    const newAttachments: AttachedFile[] = [];

    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(`File "${file.name}" exceeds the 5MB size limit.`);
        continue;
      }

      try {
        const text = await file.text();
        const lang = detectLanguage(file.name);
        newAttachments.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content: text,
          language: lang,
        });
      } catch (err) {
        console.error('Failed to read file', err);
        setErrorMessage(`Could not read "${file.name}". Please attach text or code files.`);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments].slice(0, MAX_ATTACHMENTS));
      setErrorMessage(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedInput = input.trim();
    if ((!trimmedInput && attachments.length === 0) || isLoading) return;

    const messageText = trimmedInput || (attachments.length > 0 ? 'Audit attached artifacts and source files for security vulnerabilities.' : '');

    onSendMessage(messageText, { mode, target, model: selectedModel }, attachments);
    setInput('');
    setAttachments([]);
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

  const canSubmit = (input.trim().length > 0 || attachments.length > 0) && !isLoading;

  return (
    <div className="w-full flex justify-center pb-2 px-2 bg-transparent" ref={containerRef}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept=".py,.ts,.tsx,.js,.jsx,.go,.rs,.php,.java,.c,.cpp,.h,.hpp,.cs,.rb,.sh,.bash,.zsh,.sql,.json,.yml,.yaml,.sol,.html,.css,.xml,.md,.txt,.csv,.log,.env,.env.example,Dockerfile,nginx.conf,docker-compose.yml"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-[760px] bg-[#121212] rounded-2xl border transition-all shadow-2xl relative ${
          isDragging
            ? 'border-[#444444] bg-[#161616] ring-1 ring-white/10'
            : 'border-[#242424] focus-within:border-[#3A3A3A]'
        }`}
      >
        {/* Error Notification Pill */}
        {errorMessage && (
          <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center justify-between font-mono animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Attachment Pills Tray */}
        {attachments.length > 0 && (
          <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2 items-center">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-lg bg-[#1B1B1B] border border-[#2E2E2E] text-xs font-mono text-[#E4E4E0] shadow-sm animate-in fade-in zoom-in-95 duration-100"
              >
                <FileCode className="w-3.5 h-3.5 text-[#A3A3A0] shrink-0" />
                <span className="font-medium max-w-[140px] truncate" title={file.name}>
                  {file.name}
                </span>
                <span className="text-[10px] text-[#70706C]">
                  {formatFileSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(file.id)}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[#70706C] hover:text-white hover:bg-[#282828] transition-colors ml-0.5"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <span className="text-[11px] text-[#70706C] font-mono ml-1 select-none">
              ({attachments.length}/{MAX_ATTACHMENTS})
            </span>
          </div>
        )}

        {/* Main Textarea */}
        <div className="px-4 pt-3 pb-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isDragging
                ? 'Drop up to 3 code or artifact files here...'
                : placeholder
            }
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
                className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                  attachments.length > 0
                    ? 'bg-[#252525] border-[#3C3C3C] text-[#F4F4F0]'
                    : 'bg-[#1C1C1C] border-[#2A2A2A] text-[#888888] hover:text-white hover:bg-[#252525]'
                }`}
                title="Attach Files or Tools"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {openDropdown === 'plus' && (
                <div className="absolute bottom-9 left-0 w-64 bg-[#141414] border border-[#2A2A2A] rounded-xl shadow-2xl p-2.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between mb-2 px-1 pb-1.5 border-b border-[#222222]">
                    <div className="flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-[#A3A3A0]" />
                      <span className="font-bold text-[#F4F4F0]">Attachments & Scope</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#1C1C1C] text-[#888888] font-mono text-[10px]">
                      Max {MAX_ATTACHMENTS}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      if (attachments.length >= MAX_ATTACHMENTS) {
                        setErrorMessage(`Maximum ${MAX_ATTACHMENTS} files allowed per message.`);
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#1B1B1B] hover:bg-[#252525] text-left text-[#F4F4F0] font-mono text-xs transition-colors border border-[#282828] mb-1.5 group"
                  >
                    <FileCode className="w-4 h-4 text-[#A3A3A0] group-hover:text-white group-hover:scale-110 transition-all" />
                    <div>
                      <div className="font-semibold text-[11.5px]">Upload Source & Configs</div>
                      <div className="text-[10px] text-[#70706C]">.py, .ts, .go, .php, Dockerfile...</div>
                    </div>
                  </button>

                  <div className="px-1 py-1 text-[10.5px] text-[#70706C] font-mono leading-relaxed">
                    Tip: You can also drag and drop up to {MAX_ATTACHMENTS} code or artifact files directly into this box.
                  </div>
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
            {/* Interactive Model Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'model' ? null : 'model')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-[#E4E4E0] bg-[#171717] hover:bg-[#222222] border border-[#2B2B2B] hover:border-[#3E3E3E] transition-all shadow-sm group cursor-pointer"
                title="Switch AI Inference Model"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    selectedModel === 'deepseek-chat' ? 'bg-cyan-400' : 'bg-[#B8FF3D]'
                  } animate-pulse`}
                />
                <span className="font-medium group-hover:text-white transition-colors">
                  {AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.shortName || 'Llama 3.3 70B'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#777777] group-hover:text-white transition-colors" />
              </button>

              {openDropdown === 'model' && (
                <div className="absolute bottom-9 right-0 w-72 sm:w-80 bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1.5 mb-1 border-b border-[#222222] flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">
                      Inference Engine
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Live Switch</span>
                  </div>
                  <div className="space-y-1">
                    {AVAILABLE_MODELS.map((m) => {
                      const isSelected = selectedModel === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectModel(m.id)}
                          className={`w-full flex items-start justify-between p-2 rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-[#222222] border border-[#383838] text-white shadow-sm'
                              : 'text-[#AAAAAA] hover:bg-[#1C1C1C] hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="space-y-0.5 pr-2 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-white truncate">{m.name}</span>
                              {m.badge && (
                                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono border ${m.badgeColor}`}>
                                  {m.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#777777] leading-snug line-clamp-2">
                              {m.description}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
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
                disabled={!canSubmit}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  canSubmit
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

