'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  Paperclip, 
  Terminal, 
  Shield, 
  ShieldAlert, 
  Search, 
  FileText, 
  Sparkles, 
  Cpu, 
  Layers, 
  Code2, 
  Check, 
  X, 
  Copy, 
  MoreVertical, 
  RotateCw
} from 'lucide-react';
import { HackerAILogo } from '@/components/HackerAILogo';

const PLACEHOLDER_PROMPTS = [
  'Scan my API for vulnerabilities',
  'Audit my smart contract for reentrancy issues',
  'Find open ports and exposed subdomains on target.com',
  'Explain CVE-2024-3094 and test my dependencies',
  'Generate an autonomous penetration test report for /api/v1',
];

const SCAN_STAGES = [
  { progress: 42, stage: 'Enumerating endpoints...', target: 'https://example.com' },
  { progress: 68, stage: 'Fuzzing SQLi & API parameters...', target: 'https://example.com' },
  { progress: 85, stage: 'Verifying exploit proofs...', target: 'https://example.com' },
  { progress: 100, stage: 'Audit finalized — 4 findings', target: 'https://example.com' },
];

const TERMINAL_LOGS = [
  { type: 'INFO', text: 'Starting reconnaissance on target...' },
  { type: 'INFO', text: 'Found 12 subdomains (api, auth, staging, dev...)' },
  { type: 'INFO', text: 'Scanning for open ports...' },
  { type: 'INFO', text: 'Port 443 open (HTTPS - TLS 1.3 / OpenSSL)' },
  { type: 'INFO', text: 'Port 22 closed (Firewall filtered)' },
  { type: 'INFO', text: 'Running vulnerability checks across 48 routes...' },
  { type: 'WARN', text: 'Potential SQL injection detected at /api/user?id=' },
  { type: 'INFO', text: 'Checking for misconfigurations in CORS & CSP...' },
  { type: 'INFO', text: 'Enumerating technologies: Next.js, Node, PostgreSQL' },
  { type: 'INFO', text: 'Scan in progress — 42% completed' },
];

export default function RootLandingPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [activeModal, setActiveModal] = useState<'signin' | 'pricing' | 'trust' | 'docs' | null>(null);
  const [copiedTerminal, setCopiedTerminal] = useState(false);
  const [activeTab, setActiveTab] = useState<'vuln' | 'patch'>('vuln');

  // Dynamic typewriter placeholder effect
  const [placeholderText, setPlaceholderText] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Live dynamic scanning simulation
  const [scanStep, setScanStep] = useState(0);
  const currentScan = SCAN_STAGES[scanStep % SCAN_STAGES.length];

  useEffect(() => {
    const scanInterval = setInterval(() => {
      setScanStep((prev) => (prev + 1) % SCAN_STAGES.length);
    }, 4000);
    return () => clearInterval(scanInterval);
  }, []);

  useEffect(() => {
    const currentFullText = PLACEHOLDER_PROMPTS[promptIndex % PLACEHOLDER_PROMPTS.length];
    
    let timer: NodeJS.Timeout;
    if (!isDeleting) {
      if (placeholderText.length < currentFullText.length) {
        timer = setTimeout(() => {
          setPlaceholderText(currentFullText.slice(0, placeholderText.length + 1));
        }, 50);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2400);
      }
    } else {
      if (placeholderText.length > 0) {
        timer = setTimeout(() => {
          setPlaceholderText(currentFullText.slice(0, placeholderText.length - 1));
        }, 25);
      } else {
        setIsDeleting(false);
        setPromptIndex((prev) => prev + 1);
      }
    }

    return () => clearTimeout(timer);
  }, [placeholderText, isDeleting, promptIndex]);

  const handleSubmit = (customPrompt?: string) => {
    const query = (customPrompt !== undefined ? customPrompt : prompt).trim();
    if (!query) {
      router.push('/chat');
      return;
    }
    router.push(`/chat?prompt=${encodeURIComponent(query)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopyLogs = () => {
    const text = TERMINAL_LOGS.map(l => `[${l.type}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedTerminal(true);
    setTimeout(() => setCopiedTerminal(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-[#090909] text-[#F4F4F0] flex flex-col justify-between font-sans antialiased selection:bg-[#F4F4F0] selection:text-[#090909] relative overflow-x-hidden">
      
      {/* Background Subtle Technical Grid with Scanline */}
      <div className="fixed inset-0 pointer-events-none brutalist-grid opacity-30 z-0" />

      {/* Editorial Desktop Margin Labels */}
      <div className="hidden xl:flex fixed left-6 top-32 flex-col gap-1 text-[10px] font-mono tracking-widest text-[#686865] select-none z-10">
        <span>AI FOR A</span>
        <span>SAFER</span>
        <span>INTERNET.</span>
      </div>

      <div className="hidden xl:flex fixed left-6 bottom-16 flex-col gap-1 text-[10px] font-mono tracking-widest text-[#686865] select-none z-10">
        <span>OFFENSIVE</span>
        <span>IDEAS</span>
        <span>DEFENSIVE</span>
        <span>IMPACT.</span>
        <span className="w-4 h-[1px] bg-[#2A2A28] mt-1" />
      </div>

      <div className="hidden xl:flex fixed right-6 top-32 flex-col items-end gap-1 text-[10px] font-mono tracking-widest text-[#686865] select-none z-10 text-right">
        <span>MORE</span>
        <span>SECURE.</span>
        <span>BUILD A SAFER</span>
        <span>TOMORROW.</span>
        <span className="w-4 h-[1px] bg-[#2A2A28] mt-1" />
      </div>

      <div className="hidden xl:flex fixed right-6 bottom-16 flex-col items-end gap-1 text-[10px] font-mono tracking-widest text-[#686865] select-none z-10 text-right">
        <span>SECURITY</span>
        <span>IS A</span>
        <span>FORCE</span>
        <span>FOR GOOD.</span>
        <span className="w-4 h-[1px] bg-[#2A2A28] mt-1" />
      </div>

      {/* Top Navigation Bar */}
      <header className="w-full border-b border-[#1D1D1B] bg-[#090909]/90 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          {/* Logo & Links */}
          <div className="flex items-center gap-8">
            <div 
              onClick={() => router.push('/')}
              className="flex items-center gap-3 cursor-pointer group select-none"
            >
              <HackerAILogo className="w-6 h-6 text-[#F4F4F0] group-hover:scale-105 transition-transform duration-200" />
              <span className="text-xl font-bold tracking-tight text-[#F4F4F0] font-sans">
                Kairo
              </span>
              <span className="hidden sm:inline-block text-[#2A2A28] font-light">|</span>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#A3A3A0]">
              <button onClick={() => router.push('/chat')} className="hover:text-[#F4F4F0] transition-colors">
                Product
              </button>
              <a href="#features" className="hover:text-[#F4F4F0] transition-colors">
                Features
              </a>
              <button onClick={() => setActiveModal('trust')} className="hover:text-[#F4F4F0] transition-colors">
                Security
              </button>
              <button onClick={() => setActiveModal('pricing')} className="hover:text-[#F4F4F0] transition-colors">
                Pricing
              </button>
              <a href="#capabilities" className="hover:text-[#F4F4F0] transition-colors">
                Docs
              </a>
            </nav>
          </div>

          {/* Right CTA buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/chat')}
              className="text-sm font-medium text-[#A3A3A0] hover:text-[#F4F4F0] transition-colors px-2 py-1"
            >
              Sign in
            </button>

            <button
              onClick={() => router.push('/chat')}
              className="group inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-[#F4F4F0] text-[#090909] font-semibold text-sm hover:bg-white active:scale-95 transition-all shadow-xs"
            >
              <span>Get started</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col items-center justify-start w-full relative z-10 px-4 sm:px-6 pt-12 sm:pt-16 pb-24">
        
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#2A2A28] bg-[#111111] text-xs font-mono text-[#A3A3A0] mb-8 shadow-xs hover:border-[#383838] transition-colors">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B8FF3D] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B8FF3D]"></span>
          </span>
          <span>AI-powered offensive security for modern teams</span>
        </div>

        {/* Hero Headlines */}
        <div className="text-center max-w-4xl mx-auto mb-6">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#F4F4F0] leading-[1.08] mb-4">
            Find vulnerabilities.<br />
            Fix them faster.
          </h1>
          <p className="text-base sm:text-lg text-[#A3A3A0] max-w-2xl mx-auto leading-relaxed">
            Autonomous AI copilot for penetration testing, vulnerability research and secure development — built for individuals and teams who take security seriously.
          </p>
        </div>

        {/* Interactive Prompt Input Bar with Glow Ring */}
        <div className="w-full max-w-2xl mx-auto mb-5">
          <div className="relative flex items-center border border-[#2A2A28] bg-[#111111] rounded-full p-1.5 sm:p-2 shadow-2xl focus-within:border-[#4A4A48] focus-within:ring-1 focus-within:ring-[#F4F4F0]/20 transition-all duration-200">
            <div className="pl-4 pr-2 text-[#686865] font-mono text-sm select-none">
              &gt;_
            </div>
            
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask anything... e.g. "${placeholderText}"`}
              className="flex-1 bg-transparent text-[#F4F4F0] text-sm sm:text-base placeholder-[#5A5A58] focus:outline-none font-sans min-w-0"
            />

            <div className="flex items-center gap-2 pr-1">
              <button
                type="button"
                onClick={() => router.push('/chat')}
                className="p-2 text-[#686865] hover:text-[#F4F4F0] hover:bg-[#1C1C1C] transition-colors rounded-full"
                title="Attach target or file"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleSubmit()}
                className="group inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#F4F4F0] text-[#090909] font-medium text-xs sm:text-sm hover:bg-white active:scale-95 transition-all shadow-xs select-none"
              >
                <span>Get started</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Try an example Chips with Micro Hover */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#686865] mb-16">
          <span className="font-mono mr-1 select-none">Try an example:</span>
          
          {[
            { label: 'Scan a website', query: 'Scan https://example.com for vulnerabilities' },
            { label: 'Audit my code', query: 'Audit my backend API code for security flaws' },
            { label: 'Explain a CVE', query: 'Explain CVE-2024-3094 and provide detection rules' },
            { label: 'Create a pentest plan', query: 'Create a penetration testing plan for a cloud application' },
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSubmit(chip.query)}
              className="px-3.5 py-1.5 rounded-full border border-[#2A2A28] bg-[#111111] hover:border-[#444444] hover:text-[#F4F4F0] hover:bg-[#161616] active:scale-95 text-[#A3A3A0] transition-all duration-150 font-sans cursor-pointer select-none"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Security Workstation Dashboard Preview */}
        <div className="w-full max-w-5xl mx-auto border border-[#2A2A28] bg-[#0D0D0D] rounded-xl overflow-hidden shadow-2xl relative group/workstation">
          
          {/* Workstation Top Bar */}
          <div className="border-b border-[#1D1D1B] bg-[#111111] px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <HackerAILogo className="w-5 h-5 text-[#F4F4F0]" />
                <span className="font-bold text-sm tracking-tight text-white">Kairo</span>
              </div>
            </div>

            {/* Middle: Active scan indicator with smooth transition */}
            <div className="flex items-center gap-3 bg-[#090909] border border-[#222222] px-3 py-1.5 rounded-md transition-all">
              <RotateCw className="w-3.5 h-3.5 text-[#B8FF3D] animate-spin" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-xs font-semibold text-[#F4F4F0]">Scan in progress</span>
                <span className="text-[11px] font-mono text-[#686865]">Scanning target: {currentScan.target}</span>
              </div>
            </div>

            {/* Right: Progress & User */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-mono font-bold text-[#F4F4F0] transition-all">
                  {currentScan.progress}%
                </span>
                <span className="text-[10px] text-[#686865] transition-all">
                  {currentScan.stage}
                </span>
              </div>

              <div className="flex items-center gap-2 border-l border-[#222222] pl-3">
                <div className="w-7 h-7 rounded-full bg-[#1F1F1F] border border-[#2A2A28] flex items-center justify-center text-xs font-mono text-[#F4F4F0]">
                  M
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-xs font-medium text-[#F4F4F0] leading-none">Mayank</span>
                  <span className="text-[10px] text-[#686865] leading-none mt-0.5">Pro Plan</span>
                </div>
                <MoreVertical className="w-3.5 h-3.5 text-[#686865] cursor-pointer hover:text-white ml-1 transition-colors" />
              </div>
            </div>
          </div>

          {/* Workstation Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px]">
            
            {/* Left Sidebar (2.5 cols) */}
            <div className="md:col-span-3 border-r border-[#1D1D1B] bg-[#0E0E0E] p-3 flex flex-col justify-between">
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/chat')}
                  className="w-full py-2 px-3 rounded border border-[#2A2A28] bg-[#161616] hover:bg-[#202020] hover:border-[#383838] active:scale-98 text-xs font-medium text-[#F4F4F0] flex items-center justify-center gap-2 transition-all duration-150"
                >
                  <span className="text-sm leading-none">+</span>
                  <span>New Scan</span>
                </button>

                <nav className="space-y-0.5 text-xs">
                  <div className="px-2.5 py-1.5 rounded bg-[#1A1A18] border border-[#2A2A28] text-[#F4F4F0] font-medium flex items-center gap-2.5 transition-colors">
                    <Layers className="w-3.5 h-3.5 text-[#B8FF3D]" />
                    <span>Dashboard</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded text-[#A3A3A0] hover:text-white hover:bg-[#141414] transition-colors flex items-center gap-2.5 cursor-pointer">
                    <Search className="w-3.5 h-3.5" />
                    <span>Scans</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded text-[#A3A3A0] hover:text-white hover:bg-[#141414] transition-colors flex items-center gap-2.5 cursor-pointer">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Findings</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded text-[#A3A3A0] hover:text-white hover:bg-[#141414] transition-colors flex items-center gap-2.5 cursor-pointer">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Assistant</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded text-[#A3A3A0] hover:text-white hover:bg-[#141414] transition-colors flex items-center gap-2.5 cursor-pointer">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Reports</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded text-[#A3A3A0] hover:text-white hover:bg-[#141414] transition-colors flex items-center gap-2.5 cursor-pointer">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Integrations</span>
                  </div>
                </nav>
              </div>

              <div className="pt-4 border-t border-[#1D1D1B] text-[10px] font-mono text-[#686865] flex items-center justify-between">
                <span>ENGINE: KAIRO-V2</span>
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B8FF3D] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#B8FF3D]"></span>
                  </span>
                  ONLINE
                </span>
              </div>
            </div>

            {/* Center Left: Live Terminal (4.5 cols) */}
            <div className="md:col-span-5 border-r border-[#1D1D1B] bg-[#0A0A0A] p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1D1D1B]">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-[#A3A3A0]" />
                    <span className="text-xs font-semibold text-[#F4F4F0]">Live Output</span>
                  </div>
                  <button
                    onClick={handleCopyLogs}
                    className="flex items-center gap-1 text-[11px] font-mono text-[#686865] hover:text-[#F4F4F0] hover:border-[#383838] transition-all px-1.5 py-0.5 rounded border border-[#222222]"
                  >
                    {copiedTerminal ? (
                      <>
                        <Check className="w-3 h-3 text-[#B8FF3D]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="font-mono text-[11px] leading-relaxed space-y-1 select-text">
                  {TERMINAL_LOGS.map((log, i) => (
                    <div key={i} className="flex items-start gap-1.5 hover:bg-white/[0.02] px-1 py-0.5 rounded transition-colors">
                      <span className={
                        log.type === 'WARN' 
                          ? 'text-[#FF9F43] font-semibold' 
                          : 'text-[#686865]'
                      }>
                        [{log.type}]
                      </span>
                      <span className={log.type === 'WARN' ? 'text-[#F4F4F0]' : 'text-[#A3A3A0]'}>
                        {log.text}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1 text-[#B8FF3D] pt-1 pl-1 font-mono">
                    <span>:...:</span>
                    <span className="inline-block w-1.5 h-3 bg-[#B8FF3D] animate-cursor-blink" />
                  </div>
                </div>
              </div>
            </div>

            {/* Center Right & Right Column: Findings & Active Status (4 cols) */}
            <div className="md:col-span-4 bg-[#0D0D0D] p-3.5 flex flex-col justify-between">
              
              {/* Findings Section */}
              <div>
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#1D1D1B]">
                  <span className="text-xs font-semibold text-[#F4F4F0]">Findings</span>
                  <button 
                    onClick={() => router.push('/chat')}
                    className="group text-[11px] text-[#A3A3A0] hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <span>View all</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="p-2 rounded border border-[#222222] bg-[#111111] hover:border-[#383838] hover:translate-x-0.5 transition-all duration-150 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5C5C] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5C5C]"></span>
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-[#F4F4F0]">Possible SQL Injection</span>
                        <span className="text-[10px] font-mono text-[#686865]">/api/user</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#686865]">2m ago</span>
                  </div>

                  <div className="p-2 rounded border border-[#222222] bg-[#111111] hover:border-[#383838] hover:translate-x-0.5 transition-all duration-150 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#FF9F43]" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-[#F4F4F0]">Exposed Admin Panel</span>
                        <span className="text-[10px] font-mono text-[#686865]">/admin</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#686865]">5m ago</span>
                  </div>

                  <div className="p-2 rounded border border-[#222222] bg-[#111111] hover:border-[#383838] hover:translate-x-0.5 transition-all duration-150 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#FFD166]" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-[#F4F4F0]">Missing Security Headers</span>
                        <span className="text-[10px] font-mono text-[#686865]">CSP & HSTS missing</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#686865]">8m ago</span>
                  </div>

                  <div className="p-2 rounded border border-[#222222] bg-[#111111] hover:border-[#383838] hover:translate-x-0.5 transition-all duration-150 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#6EE7A0]" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-[#F4F4F0]">Outdated Dependency</span>
                        <span className="text-[10px] font-mono text-[#686865]">jQuery 1.12.4</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#686865]">12m ago</span>
                  </div>
                </div>
              </div>

              {/* Active Scan Status Breakdown */}
              <div className="pt-3 mt-3 border-t border-[#1D1D1B]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-mono text-[#686865]">TARGET: example.com</span>
                  <span className="font-mono text-[#F4F4F0] font-semibold transition-all">
                    {currentScan.progress}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-[#1C1C1C] rounded-full overflow-hidden mb-3 relative">
                  <div 
                    className="h-full bg-[#F4F4F0] rounded-full transition-all duration-700 ease-out relative"
                    style={{ width: `${currentScan.progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/40 animate-shimmer" />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px] mb-3">
                  <div className="p-1 rounded bg-[#141414] border border-[#222222] hover:border-[#383838] transition-colors">
                    <span className="text-[#FF5C5C] font-bold block">1</span>
                    <span className="text-[#686865]">Critical</span>
                  </div>
                  <div className="p-1 rounded bg-[#141414] border border-[#222222] hover:border-[#383838] transition-colors">
                    <span className="text-[#FF9F43] font-bold block">1</span>
                    <span className="text-[#686865]">High</span>
                  </div>
                  <div className="p-1 rounded bg-[#141414] border border-[#222222] hover:border-[#383838] transition-colors">
                    <span className="text-[#FFD166] font-bold block">1</span>
                    <span className="text-[#686865]">Medium</span>
                  </div>
                  <div className="p-1 rounded bg-[#141414] border border-[#222222] hover:border-[#383838] transition-colors">
                    <span className="text-[#6EE7A0] font-bold block">1</span>
                    <span className="text-[#686865]">Low</span>
                  </div>
                </div>

                <button 
                  onClick={() => router.push('/chat')}
                  className="w-full py-1.5 rounded border border-[#2A2A28] bg-[#161616] hover:bg-[#202020] hover:border-[#383838] active:scale-98 text-xs font-medium text-[#F4F4F0] flex items-center justify-center gap-1.5 transition-all duration-150"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate Report</span>
                </button>
              </div>

            </div>

          </div>

          {/* Bottom 3 Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-[#1D1D1B] bg-[#0A0A0A]">
            
            <div 
              onClick={() => router.push('/chat')}
              className="p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-[#1D1D1B] hover:bg-[#111111] transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded border border-[#2A2A28] bg-[#141414] group-hover:border-[#444] flex items-center justify-center transition-colors">
                  <Sparkles className="w-4 h-4 text-[#F4F4F0]" />
                </div>
                <ArrowRight className="w-4 h-4 text-[#686865] group-hover:text-white group-hover:translate-x-1 transition-all duration-200" />
              </div>
              <h3 className="text-sm font-semibold text-[#F4F4F0] mb-1">AI Recommendations</h3>
              <p className="text-xs text-[#A3A3A0] leading-relaxed">
                Get clear, actionable fixes and remediation patches for every finding.
              </p>
            </div>

            <div 
              onClick={() => router.push('/chat')}
              className="p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-[#1D1D1B] hover:bg-[#111111] transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded border border-[#2A2A28] bg-[#141414] group-hover:border-[#444] flex items-center justify-center transition-colors">
                  <Terminal className="w-4 h-4 text-[#F4F4F0]" />
                </div>
                <ArrowRight className="w-4 h-4 text-[#686865] group-hover:text-white group-hover:translate-x-1 transition-all duration-200" />
              </div>
              <h3 className="text-sm font-semibold text-[#F4F4F0] mb-1">Automate Your Workflow</h3>
              <p className="text-xs text-[#A3A3A0] leading-relaxed">
                Run scans, generate reports and track remediation progress — all in one place.
              </p>
            </div>

            <div 
              onClick={() => router.push('/chat')}
              className="p-4 sm:p-5 hover:bg-[#111111] transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded border border-[#2A2A28] bg-[#141414] group-hover:border-[#444] flex items-center justify-center transition-colors">
                  <Shield className="w-4 h-4 text-[#F4F4F0]" />
                </div>
                <ArrowRight className="w-4 h-4 text-[#686865] group-hover:text-white group-hover:translate-x-1 transition-all duration-200" />
              </div>
              <h3 className="text-sm font-semibold text-[#F4F4F0] mb-1">Built for Teams</h3>
              <p className="text-xs text-[#A3A3A0] leading-relaxed">
                Collaborate, assign, and remediate faster with unified security team logs.
              </p>
            </div>

          </div>

        </div>

        {/* Section: Swiss Editorial Capabilities Grid */}
        <section id="features" className="w-full max-w-5xl mx-auto mt-28">
          <div className="border-b border-[#2A2A28] pb-4 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="text-xs font-mono tracking-widest text-[#686865] uppercase mb-1">
                SYSTEM / 01 — CAPABILITIES
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F0]">
                Engineered for deep offensive security & rapid defense.
              </h2>
            </div>
            <span className="text-xs font-mono text-[#A3A3A0]">
              4 CORE MODULES
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#2A2A28] border border-[#2A2A28] rounded-lg overflow-hidden">
            
            <div className="bg-[#0D0D0D] p-6 sm:p-8 flex flex-col justify-between hover:bg-[#111111] transition-colors group">
              <div>
                <div className="font-mono text-xs text-[#686865] mb-3">01 / RECONNAISSANCE & OSINT</div>
                <h3 className="text-lg font-bold text-[#F4F4F0] mb-2 group-hover:text-white transition-colors">Passive & Active Target Discovery</h3>
                <p className="text-sm text-[#A3A3A0] leading-relaxed">
                  Real-time subdomain mapping, passive DNS intelligence, TLS handshake inspection, open port fingerprinting, and technology stack profiling without triggering alarms.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#1D1D1B] font-mono text-[11px] text-[#686865] flex items-center justify-between">
                <span>MODULE: RECON_PRO</span>
                <span className="text-[#F4F4F0]">SUBDOMAINS, PORTS, DNS</span>
              </div>
            </div>

            <div className="bg-[#0D0D0D] p-6 sm:p-8 flex flex-col justify-between hover:bg-[#111111] transition-colors group">
              <div>
                <div className="font-mono text-xs text-[#686865] mb-3">02 / CODE & API AUDITING</div>
                <h3 className="text-lg font-bold text-[#F4F4F0] mb-2 group-hover:text-white transition-colors">Static AST & Dynamic API Fuzzing</h3>
                <p className="text-sm text-[#A3A3A0] leading-relaxed">
                  Deep AST semantic analysis to spot SQL injection, Cross-Site Scripting (XSS), IDOR vulnerabilities, and OpenAPI contract fuzzing with zero false positives.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#1D1D1B] font-mono text-[11px] text-[#686865] flex items-center justify-between">
                <span>MODULE: AST_SCANNER</span>
                <span className="text-[#F4F4F0]">OWASP TOP 10, CWE</span>
              </div>
            </div>

            <div className="bg-[#0D0D0D] p-6 sm:p-8 flex flex-col justify-between hover:bg-[#111111] transition-colors group">
              <div>
                <div className="font-mono text-xs text-[#686865] mb-3">03 / EXPLOIT PROOF & VERIFICATION</div>
                <h3 className="text-lg font-bold text-[#F4F4F0] mb-2 group-hover:text-white transition-colors">Safe Proof-of-Concept Engine</h3>
                <p className="text-sm text-[#A3A3A0] leading-relaxed">
                  Autonomous sandbox verification engine that crafts non-destructive exploit proofs to validate whether a vulnerability is genuinely exploitable in production.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#1D1D1B] font-mono text-[11px] text-[#686865] flex items-center justify-between">
                <span>MODULE: POC_VERIFY</span>
                <span className="text-[#F4F4F0]">NON-DESTRUCTIVE</span>
              </div>
            </div>

            <div className="bg-[#0D0D0D] p-6 sm:p-8 flex flex-col justify-between hover:bg-[#111111] transition-colors group">
              <div>
                <div className="font-mono text-xs text-[#686865] mb-3">04 / AUTOMATED REMEDIATION PRS</div>
                <h3 className="text-lg font-bold text-[#F4F4F0] mb-2 group-hover:text-white transition-colors">One-Click Patch & Code Diff</h3>
                <p className="text-sm text-[#A3A3A0] leading-relaxed">
                  Generates ready-to-merge pull requests with fixed source code, hardened security headers (CSP, HSTS, CORS), and Dockerfile security hardening instantly.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#1D1D1B] font-mono text-[11px] text-[#686865] flex items-center justify-between">
                <span>MODULE: PR_GEN</span>
                <span className="text-[#F4F4F0]">READY-TO-MERGE DIFFS</span>
              </div>
            </div>

          </div>
        </section>

        {/* Section: Real-Time Performance & Metrics */}
        <section id="capabilities" className="w-full max-w-5xl mx-auto mt-28">
          <div className="border-b border-[#2A2A28] pb-4 mb-8">
            <div className="text-xs font-mono tracking-widest text-[#686865] uppercase mb-1">
              BENCHMARKS / 02
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F0]">
              Built for extreme speed and precision.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#2A2A28] border border-[#2A2A28] rounded-lg overflow-hidden text-center">
            
            <div className="bg-[#0D0D0D] p-6 hover:bg-[#111111] transition-colors">
              <div className="text-3xl sm:text-4xl font-bold font-mono text-[#F4F4F0] mb-1">12,000+</div>
              <div className="text-xs text-[#A3A3A0]">CVE Signatures & Patterns</div>
            </div>

            <div className="bg-[#0D0D0D] p-6 hover:bg-[#111111] transition-colors">
              <div className="text-3xl sm:text-4xl font-bold font-mono text-[#F4F4F0] mb-1">&lt; 45s</div>
              <div className="text-xs text-[#A3A3A0]">Average Scan Triage Latency</div>
            </div>

            <div className="bg-[#0D0D0D] p-6 hover:bg-[#111111] transition-colors">
              <div className="text-3xl sm:text-4xl font-bold font-mono text-[#F4F4F0] mb-1">99.4%</div>
              <div className="text-xs text-[#A3A3A0]">True-Positive Verification</div>
            </div>

            <div className="bg-[#0D0D0D] p-6 hover:bg-[#111111] transition-colors">
              <div className="text-3xl sm:text-4xl font-bold font-mono text-[#F4F4F0] mb-1">0</div>
              <div className="text-xs text-[#A3A3A0]">Data Retention / No LLM Training</div>
            </div>

          </div>
        </section>

        {/* Section: Interactive Vulnerability & Patch Showcase */}
        <section className="w-full max-w-5xl mx-auto mt-28">
          <div className="border-b border-[#2A2A28] pb-4 mb-8 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono tracking-widest text-[#686865] uppercase mb-1">
                INSPECTION / 03
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F0]">
                From vulnerability discovery to code patch.
              </h2>
            </div>

            {/* Toggle Tabs */}
            <div className="flex rounded border border-[#2A2A28] bg-[#111111] p-0.5">
              <button
                onClick={() => setActiveTab('vuln')}
                className={`px-3 py-1 text-xs font-mono rounded transition-all duration-150 ${
                  activeTab === 'vuln' ? 'bg-[#1F1F1F] text-white shadow-xs' : 'text-[#686865] hover:text-white'
                }`}
              >
                01 Vulnerability
              </button>
              <button
                onClick={() => setActiveTab('patch')}
                className={`px-3 py-1 text-xs font-mono rounded transition-all duration-150 ${
                  activeTab === 'patch' ? 'bg-[#1F1F1F] text-white shadow-xs' : 'text-[#686865] hover:text-white'
                }`}
              >
                02 Hardened Patch
              </button>
            </div>
          </div>

          <div className="border border-[#2A2A28] bg-[#0C0C0C] rounded-lg overflow-hidden font-mono text-xs shadow-lg">
            <div className="border-b border-[#1D1D1B] bg-[#141414] px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#A3A3A0]" />
                <span className="text-[#F4F4F0]">src/routes/api/users.ts</span>
              </div>
              <span className="text-[10px] text-[#686865]">
                {activeTab === 'vuln' ? 'STATUS: CRITICAL FLAW DETECTED' : 'STATUS: REMEDIATION DIFF GENERATED'}
              </span>
            </div>

            <div className="p-4 sm:p-6 overflow-x-auto text-[12px] leading-relaxed transition-all">
              {activeTab === 'vuln' ? (
                <div className="space-y-1 animate-fade-in-up">
                  <div className="text-[#686865]">// [VULNERABILITY] Raw SQL Concatenation leads to direct SQL injection</div>
                  <div className="text-[#A3A3A0]">export async function getUser(req: Request) &#123;</div>
                  <div className="text-[#A3A3A0] pl-4">const &#123; id &#125; = req.query;</div>
                  <div className="text-[#FF5C5C] bg-[#FF5C5C]/10 px-2 py-0.5 rounded border border-[#FF5C5C]/30 my-1 font-semibold">
                    - const query = `SELECT * FROM users WHERE id = &#39;$&#123;id&#125;&#39;`; // INJECTION POINT
                  </div>
                  <div className="text-[#A3A3A0] pl-4">const user = await db.query(query);</div>
                  <div className="text-[#A3A3A0] pl-4">return Response.json(user);</div>
                  <div className="text-[#A3A3A0]">&#125;</div>
                </div>
              ) : (
                <div className="space-y-1 animate-fade-in-up">
                  <div className="text-[#6EE7A0]">// [REMEDIATION] Parameterized Prepared Statements & Type Validation</div>
                  <div className="text-[#A3A3A0]">export async function getUser(req: Request) &#123;</div>
                  <div className="text-[#A3A3A0] pl-4">const parsedId = z.string().uuid().parse(req.query.id);</div>
                  <div className="text-[#6EE7A0] bg-[#6EE7A0]/10 px-2 py-0.5 rounded border border-[#6EE7A0]/30 my-1 font-semibold">
                    + const query = `SELECT id, name, email FROM users WHERE id = $1`;
                  </div>
                  <div className="text-[#6EE7A0] bg-[#6EE7A0]/10 px-2 py-0.5 rounded border border-[#6EE7A0]/30 my-1">
                    + const user = await db.query(query, [parsedId]);
                  </div>
                  <div className="text-[#A3A3A0] pl-4">return Response.json(user);</div>
                  <div className="text-[#A3A3A0]">&#125;</div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Final Brutalist Call to Action */}
        <section className="w-full max-w-5xl mx-auto mt-28 border border-[#2A2A28] bg-[#111111] rounded-xl p-8 sm:p-12 text-center relative overflow-hidden group hover:border-[#383838] transition-colors">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#F4F4F0] mb-3 tracking-tight">
              Ready to secure your perimeter?
            </h2>
            <p className="text-sm sm:text-base text-[#A3A3A0] mb-8 leading-relaxed">
              Launch Kairo in under 10 seconds. Run your first autonomous security audit and fix vulnerabilities before adversaries find them.
            </p>

            <button
              onClick={() => router.push('/chat')}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-sm hover:bg-white active:scale-95 transition-all shadow-lg select-none"
            >
              <span>Launch Kairo Workspace</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>

      </main>

      {/* Brutalist Footer */}
      <footer className="w-full border-t border-[#1D1D1B] bg-[#090909] py-12 px-4 sm:px-8 text-xs text-[#686865] relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          
          {/* Brand & System Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#F4F4F0] font-bold text-sm">
              <HackerAILogo className="w-4 h-4 text-[#F4F4F0]" />
              <span>Kairo</span>
            </div>
            <p className="text-[#A3A3A0] text-xs max-w-xs">
              Autonomous cybersecurity AI copilot for modern defense teams.
            </p>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#A3A3A0] pt-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B8FF3D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B8FF3D]"></span>
              </span>
              <span>SYSTEM OPERATIONAL (99.99%)</span>
              <span>•</span>
              <span>v2.4.0-prod</span>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-3 gap-8 text-xs">
            <div>
              <div className="font-mono text-[#F4F4F0] mb-2 font-semibold">PRODUCT</div>
              <ul className="space-y-1.5">
                <li><button onClick={() => router.push('/chat')} className="hover:text-[#F4F4F0] transition-colors">Workstation</button></li>
                <li><a href="#features" className="hover:text-[#F4F4F0] transition-colors">Features</a></li>
                <li><button onClick={() => setActiveModal('pricing')} className="hover:text-[#F4F4F0] transition-colors">Pricing</button></li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[#F4F4F0] mb-2 font-semibold">SECURITY</div>
              <ul className="space-y-1.5">
                <li><button onClick={() => setActiveModal('trust')} className="hover:text-[#F4F4F0] transition-colors">Trust Center</button></li>
                <li><a href="#capabilities" className="hover:text-[#F4F4F0] transition-colors">CVE Database</a></li>
                <li><button onClick={() => setActiveModal('trust')} className="hover:text-[#F4F4F0] transition-colors">Privacy Policy</button></li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[#F4F4F0] mb-2 font-semibold">SYSTEM</div>
              <ul className="space-y-1.5 font-mono text-[11px]">
                <li>NODE / 001</li>
                <li>26.9124° N</li>
                <li>75.7873° E</li>
              </ul>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-[#1D1D1B] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
          <div>© {new Date().getFullYear()} Kairo Security Inc. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveModal('trust')} className="hover:text-[#F4F4F0] transition-colors">TERMS</button>
            <button onClick={() => setActiveModal('trust')} className="hover:text-[#F4F4F0] transition-colors">PRIVACY</button>
            <button onClick={() => setActiveModal('trust')} className="hover:text-[#F4F4F0] transition-colors">RESPONSIBLE DISCLOSURE</button>
          </div>
        </div>
      </footer>

      {/* Pricing Modal */}
      {activeModal === 'pricing' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-[#111111] border border-[#2A2A28] rounded-xl max-w-xl w-full p-6 text-[#F4F4F0] shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-[#686865] hover:text-[#F4F4F0] p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="font-mono text-xs text-[#686865] mb-1">PLANS & LICENSING</div>
            <h2 className="text-xl font-bold mb-1">Kairo Security Plans</h2>
            <p className="text-xs text-[#A3A3A0] mb-6">Autonomous vulnerability analysis tailored for security engineers.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[#090909] border border-[#2A2A28] hover:border-[#383838] transition-colors">
                <h3 className="font-bold text-sm">Community</h3>
                <p className="text-2xl font-bold my-2 font-mono">$0</p>
                <ul className="text-xs text-[#A3A3A0] space-y-2 mb-4 font-sans">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#B8FF3D]" /> Passive DNS & TLS Recon</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#B8FF3D]" /> Security Headers Audit</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#B8FF3D]" /> Standard ReAct Engine</li>
                </ul>
                <button
                  onClick={() => router.push('/chat')}
                  className="w-full py-2 rounded bg-[#161616] border border-[#2A2A28] text-[#F4F4F0] text-xs font-semibold hover:bg-[#202020] active:scale-98 transition-all"
                >
                  Current Plan
                </button>
              </div>

              <div className="p-4 rounded-lg bg-[#141414] border border-[#F4F4F0]/30 hover:border-[#F4F4F0]/60 transition-colors relative">
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-[10px]">
                  PRO
                </span>
                <h3 className="font-bold text-sm">Security Pro</h3>
                <p className="text-2xl font-bold my-2 font-mono">$20<span className="text-xs text-[#686865]">/mo</span></p>
                <ul className="text-xs text-[#A3A3A0] space-y-2 mb-4 font-sans">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#B8FF3D]" /> Groq LPU Ultra-Low Latency</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#B8FF3D]" /> Full AST Code & Exploit Audits</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#B8FF3D]" /> Automated Remediation PRs</li>
                </ul>
                <button
                  onClick={() => router.push('/chat')}
                  className="w-full py-2 rounded bg-[#F4F4F0] text-[#090909] text-xs font-bold hover:bg-white active:scale-98 transition-all"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trust & Security Modal */}
      {activeModal === 'trust' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-[#111111] border border-[#2A2A28] rounded-xl max-w-md w-full p-6 text-[#F4F4F0] shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-[#686865] hover:text-[#F4F4F0] p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="font-mono text-xs text-[#686865] mb-1">PRIVACY & TRUST</div>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span>Kairo Security Commitments</span>
            </h2>
            <p className="text-xs text-[#A3A3A0] mb-4">Our non-negotiable security principles.</p>
            <div className="space-y-3 text-xs text-[#C0C0C0] leading-relaxed">
              <p>• <strong>Zero Training on User Data</strong>: Scanned source code, API keys, and audit findings are never used to train or fine-tune public models.</p>
              <p>• <strong>Local-First Architecture</strong>: Audit logs and scan sessions reside strictly in your private local SQLite database instance.</p>
              <p>• <strong>Non-Destructive Reconnaissance</strong>: All active penetration tests adhere strictly to safe non-destructive probing guardrails.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
