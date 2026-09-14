'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Cpu,
  Shield,
  Database,
  Info,
  Check,
  Key,
  Download,
  Trash2,
  Sparkles,
  Terminal,
  Lock,
  Eye,
  EyeOff,
  Sliders,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { getUserSession, saveUserSession, UserSession } from '@/lib/session';
import { TaskSession } from '@/types/chat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks?: TaskSession[];
  onClearHistory?: () => void;
  onUserUpdate?: (user: UserSession) => void;
}

type TabType = 'general' | 'ai' | 'security' | 'data' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  tasks = [],
  onClearHistory,
  onUserUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [user, setUser] = useState<UserSession>({
    name: 'Security Operator',
    email: 'operator@kairo.bond',
    tier: 'Community'
  });

  // General Settings State
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState('Senior Penetration Tester');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Inference Settings
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [showReasoning, setShowReasoning] = useState(true);
  const [agentPersona, setAgentPersona] = useState('Comprehensive Security Auditor');
  const [customApiKey, setCustomApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Security Sandbox Settings
  const [sandboxMode, setSandboxMode] = useState('kali-docker');
  const [scopeConfirmation, setScopeConfirmation] = useState(true);
  const [autoRedactSecrets, setAutoRedactSecrets] = useState(true);

  // Data State
  const [clearSuccess, setClearSuccess] = useState(false);

  // Load existing user & settings on mount
  useEffect(() => {
    if (isOpen) {
      const session = getUserSession();
      if (session) {
        setUser(session);
        setNameInput(session.name || 'Security Operator');
        if (session.role) setRoleInput(session.role);
      }

      try {
        const savedSettings = localStorage.getItem('kairo_app_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed.selectedModel) {
            setSelectedModel(parsed.selectedModel === 'openai/gpt-oss-120b' ? 'llama-3.3-70b-versatile' : parsed.selectedModel);
          }
          if (typeof parsed.showReasoning === 'boolean') setShowReasoning(parsed.showReasoning);
          if (parsed.agentPersona) setAgentPersona(parsed.agentPersona);
          if (parsed.sandboxMode) setSandboxMode(parsed.sandboxMode);
          if (typeof parsed.scopeConfirmation === 'boolean') setScopeConfirmation(parsed.scopeConfirmation);
          if (typeof parsed.autoRedactSecrets === 'boolean') setAutoRedactSecrets(parsed.autoRedactSecrets);
        }
        const savedKey = localStorage.getItem('kairo_custom_groq_key');
        if (savedKey) setCustomApiKey(savedKey);
      } catch {}
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const saveGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserSession = {
      ...user,
      name: nameInput.trim() || 'Security Operator',
      role: roleInput.trim() || 'Senior Penetration Tester',
    };
    saveUserSession(updated);
    setUser(updated);
    if (onUserUpdate) onUserUpdate(updated);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const persistSettings = (updates: Record<string, any>) => {
    try {
      const current = localStorage.getItem('kairo_app_settings');
      const parsed = current ? JSON.parse(current) : {};
      const next = { ...parsed, ...updates };
      localStorage.setItem('kairo_app_settings', JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  };

  const handleSaveApiKey = () => {
    try {
      if (customApiKey.trim()) {
        localStorage.setItem('kairo_custom_groq_key', customApiKey.trim());
      } else {
        localStorage.removeItem('kairo_custom_groq_key');
      }
      setApiKeySaved(true);
      setTimeout(() => setApiKeySaved(false), 2000);
    } catch {}
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kairo_audit_history_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearHistoryConfirm = () => {
    if (confirm('Are you sure you want to clear all standalone chat sessions and vulnerability reports?')) {
      if (onClearHistory) {
        onClearHistory();
      }
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-3xl h-[580px] bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row text-sm select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar Navigation */}
        <div className="w-full md:w-56 bg-[#0B0B0B] border-b md:border-b-0 md:border-r border-[#1F1F1F] p-3 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center justify-between px-3 py-2 mb-3">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#888888]">
                Settings
              </span>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'general', label: 'General & Profile', icon: User },
                { id: 'ai', label: 'AI & Inference', icon: Cpu },
                { id: 'security', label: 'Security Sandbox', icon: Shield },
                { id: 'data', label: 'Data & History', icon: Database },
                { id: 'about', label: 'About & Kernel', icon: Info },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-all ${
                      isActive
                        ? 'bg-[#1C1C1C] text-white border border-[#2E2E2E]'
                        : 'text-[#888888] hover:text-[#CCCCCC] hover:bg-[#141414]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#F4F4F0]' : 'text-[#666666]'}`} />
                    <span className="text-[13px]">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="hidden md:block px-3 py-2 border-t border-[#1A1A1A] text-[11px] font-mono text-[#555555]">
            Kairo OS 1.2 • Intelligence Engine
          </div>
        </div>

        {/* Right Tab Content */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-[#0F0F0F] relative">
          {/* Header Close Button */}
          <div className="sticky top-0 right-0 z-10 flex justify-end p-3.5 bg-gradient-to-b from-[#0F0F0F] via-[#0F0F0F] to-transparent">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#777777] hover:text-white hover:bg-[#1E1E1E] transition-colors"
              title="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 pb-6 pt-1 flex-1 overflow-y-auto">
            {/* 1. GENERAL & PROFILE */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">General & Profile</h3>
                  <p className="text-xs text-[#777777] mt-0.5">
                    Manage your operator credentials and workspace preferences.
                  </p>
                </div>

                <form onSubmit={saveGeneralSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-[#999999] mb-1.5 uppercase tracking-wide">
                      Operator Name
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Security Operator"
                      className="w-full bg-[#161616] border border-[#2A2A2A] focus:border-[#444444] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#999999] mb-1.5 uppercase tracking-wide">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full bg-[#121212] border border-[#222222] text-[#777777] rounded-xl px-3.5 py-2 text-sm cursor-not-allowed select-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#999999] mb-1.5 uppercase tracking-wide">
                      Role / Title
                    </label>
                    <input
                      type="text"
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      placeholder="Senior Penetration Tester"
                      className="w-full bg-[#161616] border border-[#2A2A2A] focus:border-[#444444] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F4F4F0] text-[#090909] font-semibold text-xs hover:bg-white active:scale-95 transition-all shadow-sm"
                    >
                      {saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                      <span>{saveSuccess ? 'Saved Profile' : 'Save Changes'}</span>
                    </button>
                    {saveSuccess && (
                      <span className="text-xs text-emerald-400 font-mono">
                        ✓ Profile updated
                      </span>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* 2. AI & INFERENCE */}
            {activeTab === 'ai' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">AI & Inference Engine</h3>
                  <p className="text-xs text-[#777777] mt-0.5">
                    Configure inference engines, reasoning chains, and autonomous agent behavior.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Model Selector */}
                  <div>
                    <label className="block text-xs font-mono text-[#999999] mb-1.5 uppercase tracking-wide">
                      Default Inference Engine
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                        persistSettings({ selectedModel: e.target.value });
                      }}
                      className="w-full bg-[#161616] border border-[#2A2A2A] focus:border-[#444444] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none transition-colors font-mono"
                    >
                      <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Recommended • Fast Reasoning)</option>
                      <option value="deepseek-chat">DeepSeek V3 (Paid • Deep Security Reasoning)</option>
                    </select>
                  </div>

                  {/* Reasoning Stream Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141414] border border-[#222222]">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-xs font-semibold text-white">Stream AI Chain of Thought</div>
                      <div className="text-[11.5px] text-[#777777]">
                        Display live step-by-step reasoning pills and tool execution status during security audits.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !showReasoning;
                        setShowReasoning(next);
                        persistSettings({ showReasoning: next });
                      }}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                        showReasoning ? 'bg-emerald-500' : 'bg-[#2A2A2A]'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          showReasoning ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Agent Persona Tone */}
                  <div>
                    <label className="block text-xs font-mono text-[#999999] mb-1.5 uppercase tracking-wide">
                      Audit Persona & Tone
                    </label>
                    <select
                      value={agentPersona}
                      onChange={(e) => {
                        setAgentPersona(e.target.value);
                        persistSettings({ agentPersona: e.target.value });
                      }}
                      className="w-full bg-[#161616] border border-[#2A2A2A] focus:border-[#444444] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none transition-colors"
                    >
                      <option value="Comprehensive Security Auditor">Comprehensive Security Auditor (Standard)</option>
                      <option value="Executive Summary Focus">Executive Summary Focus (High-level findings)</option>
                      <option value="Offensive Red Team">Offensive Red Team (PoC & Exploit verification)</option>
                      <option value="Code Review & Patching">Code Review & Patching (Remediation focus)</option>
                    </select>
                  </div>

                  {/* Custom API Key (BYOK) */}
                  <div>
                    <label className="block text-xs font-mono text-[#999999] mb-1.5 uppercase tracking-wide">
                      Custom API Key (BYOK)
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        placeholder="gsk_..."
                        className="w-full bg-[#161616] border border-[#2A2A2A] focus:border-[#444444] rounded-xl pl-3.5 pr-20 py-2 text-white text-sm font-mono focus:outline-none transition-colors"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="p-1 text-[#777777] hover:text-white transition-colors"
                          title="Toggle visibility"
                        >
                          {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveApiKey}
                          className="px-2 py-1 rounded-lg bg-[#262626] hover:bg-[#333333] text-[11px] text-white font-medium transition-colors"
                        >
                          {apiKeySaved ? 'Saved' : 'Save'}
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#666666] mt-1">
                      Leave blank to use Kairo managed cluster. Your keys never leave local browser memory.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SECURITY & SANDBOX */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Security Sandbox & Safety</h3>
                  <p className="text-xs text-[#777777] mt-0.5">
                    Sandboxed execution parameters, scope verification, and data masking.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Sandbox Environment */}
                  <div>
                    <label className="block text-xs font-mono text-[#999999] mb-1.5 uppercase tracking-wide">
                      Security Engine Toolkit
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: 'kali-docker', title: 'Kali Linux Sandbox', desc: 'Containerized Nmap, WAF, DNS, SSL tools' },
                        { id: 'safe-sim', title: 'Passive Simulation', desc: 'Strict non-destructive header analysis only' },
                      ].map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSandboxMode(s.id);
                            persistSettings({ sandboxMode: s.id });
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            sandboxMode === s.id
                              ? 'bg-[#1C1C1C] border-[#444444] text-white'
                              : 'bg-[#121212] border-[#222222] text-[#888888] hover:border-[#333333]'
                          }`}
                        >
                          <div className="text-xs font-semibold">{s.title}</div>
                          <div className="text-[11px] text-[#666666] mt-0.5">{s.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scope Confirmation Guard */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141414] border border-[#222222]">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-xs font-semibold text-white">Target Scope Authorization Guard</div>
                      <div className="text-[11.5px] text-[#777777]">
                        Warn before executing active TCP / UDP port probes or API endpoint fuzzing.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !scopeConfirmation;
                        setScopeConfirmation(next);
                        persistSettings({ scopeConfirmation: next });
                      }}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                        scopeConfirmation ? 'bg-emerald-500' : 'bg-[#2A2A2A]'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          scopeConfirmation ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Auto-Redact Secrets */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141414] border border-[#222222]">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-xs font-semibold text-white">Auto-Redact Sensitive Tokens & Keys</div>
                      <div className="text-[11.5px] text-[#777777]">
                        Automatically mask Authorization bearer headers, API secrets, and passwords in output logs.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !autoRedactSecrets;
                        setAutoRedactSecrets(next);
                        persistSettings({ autoRedactSecrets: next });
                      }}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                        autoRedactSecrets ? 'bg-emerald-500' : 'bg-[#2A2A2A]'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          autoRedactSecrets ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. DATA & STORAGE */}
            {activeTab === 'data' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Data Management & History</h3>
                  <p className="text-xs text-[#777777] mt-0.5">
                    Export audit transcripts, manage local storage, and purge session logs.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Export All Data */}
                  <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] flex items-center justify-between">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-xs font-semibold text-white">Export Audit History</div>
                      <div className="text-[11.5px] text-[#777777]">
                        Download complete transcripts and vulnerability findings in structured JSON format.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] text-white text-xs font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>
                  </div>

                  {/* Clear All Chats */}
                  <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] flex items-center justify-between">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-xs font-semibold text-rose-400">Clear All Chat History</div>
                      <div className="text-[11.5px] text-[#777777]">
                        Permanently delete all standalone chat sessions and clear browser task history.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearHistoryConfirm}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 text-xs font-medium transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  </div>

                  {clearSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 text-xs font-mono">
                      ✓ All standalone chat sessions have been permanently cleared.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. ABOUT */}
            {activeTab === 'about' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">About Kairo</h3>
                  <p className="text-xs text-[#777777] mt-0.5">
                    Autonomous Cybersecurity AI Copilot & Vulnerability Scanning Workspace.
                  </p>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222222] flex justify-between items-center">
                    <span className="text-[#888888]">Version</span>
                    <span className="text-white font-semibold">1.2.0 (Security Intelligence Engine)</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222222] flex justify-between items-center">
                    <span className="text-[#888888]">Agent Architecture</span>
                    <span className="text-white">ReAct (Reasoning + Action)</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222222] flex justify-between items-center">
                    <span className="text-[#888888]">Sandbox Kernel</span>
                    <span className="text-emerald-400">Kali Linux 6.6 Sandboxed</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222222] flex justify-between items-center">
                    <span className="text-[#888888]">Design System</span>
                    <span className="text-white">1:1 Authentic Monochrome Dark</span>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition-colors"
                  >
                    <span>View Documentation & Security Whitepaper</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
