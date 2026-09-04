'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HackerAILogo } from '@/components/HackerAILogo';

export function Footer() {
  const router = useRouter();

  return (
    <footer className="w-full border-t border-[#1D1D1B] bg-[#090909] py-12 px-4 sm:px-8 text-xs text-[#686865] relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        
        {/* Brand & System Status */}
        <div className="space-y-2">
          <div 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-[#F4F4F0] font-bold text-sm cursor-pointer select-none"
          >
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
              <li><button onClick={() => router.push('/features')} className="hover:text-[#F4F4F0] transition-colors">Features</button></li>
              <li><button onClick={() => router.push('/pricing')} className="hover:text-[#F4F4F0] transition-colors">Pricing</button></li>
            </ul>
          </div>

          <div>
            <div className="font-mono text-[#F4F4F0] mb-2 font-semibold">SECURITY</div>
            <ul className="space-y-1.5">
              <li><button onClick={() => router.push('/security')} className="hover:text-[#F4F4F0] transition-colors">Trust Center</button></li>
              <li><button onClick={() => router.push('/docs')} className="hover:text-[#F4F4F0] transition-colors">Documentation</button></li>
              <li><button onClick={() => router.push('/security')} className="hover:text-[#F4F4F0] transition-colors">Privacy Policy</button></li>
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
          <button onClick={() => router.push('/security')} className="hover:text-[#F4F4F0] transition-colors">TERMS</button>
          <button onClick={() => router.push('/security')} className="hover:text-[#F4F4F0] transition-colors">PRIVACY</button>
          <button onClick={() => router.push('/security')} className="hover:text-[#F4F4F0] transition-colors">RESPONSIBLE DISCLOSURE</button>
        </div>
      </div>
    </footer>
  );
}
