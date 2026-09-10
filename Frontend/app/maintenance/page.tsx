'use client';

import { useEffect, useState } from 'react';

export default function MaintenancePage() {
  const [glitch, setGlitch] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Random glitch effect
    const glitchInterval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#090909] flex flex-col items-center justify-center overflow-hidden selection:bg-[#F4F4F0] selection:text-[#090909]">
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-40" />

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#F4F4F0]/[0.03] to-transparent animate-scanline" />
      </div>

      {/* Subtle noise grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center px-6 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        {/* Kairo Logo */}
        <div className="mb-16 flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="opacity-80">
            <path d="M6 4L16 16L6 28H12L22 16L12 4H6Z" fill="#F4F4F0"/>
            <path d="M16 4L26 16L16 28H22L32 16L22 4H16Z" fill="#F4F4F0" opacity="0.4"/>
          </svg>
          <span className="text-[#F4F4F0]/80 text-lg font-medium tracking-[0.2em] uppercase font-sans">
            Kairo
          </span>
        </div>

        {/* Main terminal box */}
        <div className="relative border border-[#2A2A28] bg-[#0D0D0D]/80 backdrop-blur-sm px-8 sm:px-16 py-10 sm:py-14 max-w-2xl w-full">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#F4F4F0]/20" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#F4F4F0]/20" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#F4F4F0]/20" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#F4F4F0]/20" />

          {/* Status indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-2 h-2 bg-amber-400/80 rounded-full animate-pulse-subtle" />
            <span className="text-[#F4F4F0]/40 text-xs font-mono uppercase tracking-[0.15em]">
              System Status: Maintenance
            </span>
          </div>

          {/* Main heading with glitch */}
          <h1
            className={`text-[#F4F4F0] text-2xl sm:text-3xl md:text-4xl font-mono font-semibold tracking-tight leading-tight transition-all duration-100 ${
              glitch ? 'translate-x-[2px] skew-x-1 text-red-400/80' : ''
            }`}
          >
            SYSTEM UNDER
            <br />
            MAINTENANCE
            <span className="animate-cursor-blink text-[#F4F4F0]/60">_</span>
          </h1>

          {/* Divider */}
          <div className="my-6 h-px bg-gradient-to-r from-[#2A2A28] via-[#3A3A38] to-[#2A2A28]" />

          {/* Description */}
          <p className="text-[#F4F4F0]/50 text-sm font-mono leading-relaxed max-w-md">
            We&apos;re performing scheduled upgrades to enhance system performance and security protocols.
          </p>

          {/* Status details */}
          <div className="mt-8 space-y-3 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="text-[#F4F4F0]/25 w-24 shrink-0">STATUS</span>
              <span className="text-amber-400/70">IN PROGRESS</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#F4F4F0]/25 w-24 shrink-0">ETA</span>
              <span className="text-[#F4F4F0]/60">COMING SOON</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#F4F4F0]/25 w-24 shrink-0">PRIORITY</span>
              <span className="text-[#F4F4F0]/60">HIGH</span>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <div className="mt-10 text-center">
          <p className="text-[#F4F4F0]/25 text-xs font-mono tracking-wider">
            KAIRO SECURITY • SYSTEMS UPGRADE IN PROGRESS
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-6 w-48 h-[2px] bg-[#1A1A18] rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-[#F4F4F0]/20 to-[#F4F4F0]/40 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
