'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal, 
  ShieldCheck, 
  Code2, 
  GitBranch, 
  Cpu, 
  Star 
} from 'lucide-react';

export default function MaintenancePage() {
  const [glitch, setGlitch] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  const REPO_URL = 'https://github.com/Aokiro112/Kairoo';
  const CLONE_CMD = 'git clone https://github.com/Aokiro112/Kairoo.git';

  useEffect(() => {
    setMounted(true);
    // Subtle periodic glitch effect
    const glitchInterval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 140);
    }, 4500 + Math.random() * 3000);

    return () => clearInterval(glitchInterval);
  }, []);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(CLONE_CMD);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = CLONE_CMD;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#090909] text-[#F4F4F0] flex flex-col items-center justify-between py-12 px-4 sm:px-6 overflow-hidden selection:bg-[#F4F4F0] selection:text-[#090909]">
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-35 pointer-events-none" />

      {/* Scanline sweep */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#F4F4F0]/[0.05] to-transparent animate-scanline" />
      </div>

      {/* Subtle grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      {/* Top Header / Branding */}
      <header className={`relative z-10 w-full max-w-3xl flex items-center justify-between transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-3">
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" className="opacity-90">
            <path d="M6 4L16 16L6 28H12L22 16L12 4H6Z" fill="#F4F4F0" />
            <path d="M16 4L26 16L16 28H22L32 16L22 4H16Z" fill="#F4F4F0" opacity="0.4" />
          </svg>
          <span className="text-[#F4F4F0]/90 text-lg font-medium tracking-[0.25em] uppercase font-sans">
            Kairo
          </span>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded border border-emerald-500/20 bg-emerald-500/5 font-mono text-[11px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>v1.0 • OPEN SOURCE</span>
        </div>
      </header>

      {/* Main Container */}
      <main className={`relative z-10 my-auto py-10 w-full max-w-3xl flex flex-col items-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Terminal Box */}
        <div className="relative border border-[#2A2A28] bg-[#0D0D0D]/90 backdrop-blur-md px-6 sm:px-12 py-8 sm:py-12 w-full shadow-2xl">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#F4F4F0]/30" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#F4F4F0]/30" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#F4F4F0]/30" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#F4F4F0]/30" />

          {/* Status Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-6 border-b border-[#2A2A28]/80 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-emerald-400 tracking-[0.12em] uppercase font-medium">
                System Status: Migrated to Open Source
              </span>
            </div>
            <span className="text-[#F4F4F0]/30">PROJECT // PUBLIC_RELEASE</span>
          </div>

          {/* Heading with Glitch Effect */}
          <div className="mt-8">
            <h1
              className={`text-[#F4F4F0] text-2xl sm:text-4xl md:text-[42px] font-mono font-bold tracking-tight leading-tight transition-all duration-100 ${
                glitch ? 'translate-x-[2px] skew-x-1 text-emerald-400/90' : ''
              }`}
            >
              KAIRO IS NOW
              <br />
              OPEN SOURCE
              <span className="animate-cursor-blink text-emerald-400">_</span>
            </h1>

            {/* Subtitle / Explanation */}
            <p className="mt-5 text-[#F4F4F0]/70 text-sm sm:text-base font-sans leading-relaxed max-w-xl">
              The hosted cloud service has reached end of private deployment and has officially transitioned into a fully public, open-source project. You can now access the full codebase, self-host the autonomous security copilot, and contribute directly on GitHub.
            </p>
          </div>

          {/* Primary Call-to-Actions */}
          <div className="mt-8 pt-6 border-t border-[#2A2A28] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* GitHub Primary Button */}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#F4F4F0] text-[#090909] hover:bg-white text-sm font-mono font-semibold tracking-wide transition-all shadow-[0_0_20px_rgba(244,244,240,0.15)] hover:shadow-[0_0_30px_rgba(244,244,240,0.25)] hover:scale-[1.01] active:scale-[0.99] group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>ACCESS GITHUB REPOSITORY</span>
              <ExternalLink className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            {/* Secondary Link to Readme or Issues */}
            <a
              href={`${REPO_URL}#readme`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-3.5 border border-[#2A2A28] hover:border-[#3A3A38] bg-[#141414] hover:bg-[#1A1A18] text-[#F4F4F0]/80 hover:text-[#F4F4F0] text-sm font-mono transition-colors"
            >
              <Terminal className="w-4 h-4 text-[#F4F4F0]/60" />
              <span>Read Documentation</span>
            </a>
          </div>

          {/* Quick Clone Bar */}
          <div className="mt-5 p-3 sm:p-4 bg-[#050505] border border-[#222220] flex items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2 overflow-x-auto select-all text-[#F4F4F0]/80 scrollbar-none">
              <span className="text-emerald-400 select-none">$</span>
              <span className="whitespace-nowrap">{CLONE_CMD}</span>
            </div>
            <button
              onClick={handleCopy}
              type="button"
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all border ${
                copied
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-[#181816] hover:bg-[#222220] border-[#2A2A28] text-[#F4F4F0]/70 hover:text-[#F4F4F0]'
              }`}
              title="Copy clone command"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-8 pt-6 border-t border-[#2A2A28]/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 bg-[#121210]/60 border border-[#222220] flex items-start gap-3">
              <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#F4F4F0]">Autonomous Recon Agent</p>
                <p className="text-[#F4F4F0]/50 text-[11px] mt-0.5">High-speed AI reasoning with 500+ tok/s vulnerability planning.</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#121210]/60 border border-[#222220] flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#F4F4F0]">Sandboxed Kali Linux Tools</p>
                <p className="text-[#F4F4F0]/50 text-[11px] mt-0.5">Integrated Nmap, Subfinder, Wafw00f & Nuclei execution.</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#121210]/60 border border-[#222220] flex items-start gap-3">
              <Code2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#F4F4F0]">Self-Hostable Architecture</p>
                <p className="text-[#F4F4F0]/50 text-[11px] mt-0.5">Fullstack Next.js app, Express runner, and Docker support.</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#121210]/60 border border-[#222220] flex items-start gap-3">
              <GitBranch className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#F4F4F0]">Open for Contributions</p>
                <p className="text-[#F4F4F0]/50 text-[11px] mt-0.5">Submit pull requests, new security plugins, and feedback.</p>
              </div>
            </div>
          </div>

          {/* Quick Details Table */}
          <div className="mt-6 pt-5 border-t border-[#1F1F1D] grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
            <div>
              <span className="text-[#F4F4F0]/30 block">REPOSITORY</span>
              <span className="text-[#F4F4F0]/80 font-medium">Aokiro112/Kairoo</span>
            </div>
            <div>
              <span className="text-[#F4F4F0]/30 block">LICENSE</span>
              <span className="text-[#F4F4F0]/80 font-medium">Open Source</span>
            </div>
            <div>
              <span className="text-[#F4F4F0]/30 block">HOSTING</span>
              <span className="text-[#F4F4F0]/80 font-medium">Self-Hosted</span>
            </div>
            <div>
              <span className="text-[#F4F4F0]/30 block">MAINTAINER</span>
              <a 
                href="https://github.com/Aokiro112" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-emerald-400 hover:underline font-medium"
              >
                @Aokiro112
              </a>
            </div>
          </div>
        </div>

        {/* Shimmer line */}
        <div className="mt-8 w-48 h-[2px] bg-[#1A1A18] rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-emerald-500/20 via-emerald-400/60 to-emerald-500/20 animate-shimmer" />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#F4F4F0]/30 text-center sm:text-left pt-4">
        <p>KAIRO CYBERSECURITY • PROJECT CODEBASE MOVED TO GITHUB</p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#F4F4F0]/50 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
        >
          <span>github.com/Aokiro112/Kairoo</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </footer>
    </div>
  );
}
