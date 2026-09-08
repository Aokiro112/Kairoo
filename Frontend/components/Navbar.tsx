'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { HackerAILogo } from '@/components/HackerAILogo';
import { getUserSession, UserSession } from '@/lib/session';

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const session = getUserSession();
    setUser(session);
  }, [pathname]);

  const navLinks = [
    { label: 'Product', href: '/product' },
    { label: 'Features', href: '/features' },
    { label: 'Security', href: '/security' },
    { label: 'Docs', href: '/docs' },
    { label: 'Blog', href: '/blog' },
  ];

  return (
    <header className="w-full border-b border-[#1D1D1B] bg-[#090909]/90 backdrop-blur-md sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        {/* Logo & Links */}
        <div className="flex items-center gap-8">
          <Link 
            href={user ? "/chat" : "/"}
            prefetch={true}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <HackerAILogo className="w-6 h-6 text-[#F4F4F0] group-hover:scale-105 transition-transform duration-200" />
            <span className="text-xl font-bold tracking-tight text-[#F4F4F0] font-sans">
              Kairo
            </span>
            <span className="hidden sm:inline-block text-[#2A2A28] font-light">|</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  className={`transition-colors py-1 relative ${
                    isActive ? 'text-[#F4F4F0] font-semibold' : 'text-[#A3A3A0] hover:text-[#F4F4F0]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F4F4F0] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right CTA buttons */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/chat"
                prefetch={true}
                className="text-sm font-medium text-[#A3A3A0] hover:text-[#F4F4F0] transition-colors px-2 py-1 flex items-center gap-2"
              >
                <div className="w-5 h-5 rounded-full bg-[#1A1A1A] border border-[#2A2A28] flex items-center justify-center text-[10px] font-mono text-[#F4F4F0]">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'O'}
                </div>
                <span>{user.name ? user.name.split(' ')[0] : 'Workstation'}</span>
              </Link>

              <Link
                href="/chat"
                prefetch={true}
                className="group inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-[#F4F4F0] text-[#090909] font-semibold text-sm hover:bg-white active:scale-95 transition-all shadow-xs"
              >
                <span>Workstation</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                prefetch={true}
                className={`text-sm font-medium transition-colors px-2 py-1 ${
                  pathname === '/login' ? 'text-[#F4F4F0] font-semibold' : 'text-[#A3A3A0] hover:text-[#F4F4F0]'
                }`}
              >
                Sign in
              </Link>

              <Link
                href="/register"
                prefetch={true}
                className="group inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-[#F4F4F0] text-[#090909] font-semibold text-sm hover:bg-white active:scale-95 transition-all shadow-xs"
              >
                <span>Get started</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
