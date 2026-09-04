'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { HackerAILogo } from '@/components/HackerAILogo';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const navLinks = [
    { label: 'Product', href: '/product' },
    { label: 'Features', href: '/features' },
    { label: 'Security', href: '/security' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Docs', href: '/docs' },
  ];

  return (
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

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className={`transition-colors py-1 relative ${
                    isActive ? 'text-[#F4F4F0] font-semibold' : 'text-[#A3A3A0] hover:text-[#F4F4F0]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F4F4F0] rounded-full" />
                  )}
                </button>
              );
            })}
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
  );
}
