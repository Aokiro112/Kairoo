'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, Download, Check, X } from 'lucide-react';
import { HackerAILogo } from '@/components/HackerAILogo';

const PLACEHOLDER_PROMPTS = [
  'Ask HackerAI to audit the security of...',
  'Ask HackerAI to scan open ports on...',
  'Ask HackerAI to find subdomains of...',
  'Ask HackerAI to test the defenses of...',
  'Ask HackerAI to analyze web application vulnerabilities on...',
];

export default function RootLandingPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [activeModal, setActiveModal] = useState<'signin' | 'pricing' | 'trust' | null>(null);

  // Dynamic typewriter placeholder reveal effect
  const [placeholderText, setPlaceholderText] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentFullText = PLACEHOLDER_PROMPTS[promptIndex % PLACEHOLDER_PROMPTS.length];
    
    let timer: NodeJS.Timeout;
    if (!isDeleting) {
      if (placeholderText.length < currentFullText.length) {
        timer = setTimeout(() => {
          setPlaceholderText(currentFullText.slice(0, placeholderText.length + 1));
        }, 55);
      } else {
        // Pause when text is fully typed
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2200);
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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) {
      router.push('/chat');
      return;
    }
    router.push(`/chat?prompt=${encodeURIComponent(prompt.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#131313] text-white flex flex-col justify-between font-sans antialiased selection:bg-[#333333] selection:text-white">
      {/* Top Navigation Bar */}
      <header className="w-full px-6 sm:px-10 pt-2.5 pb-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: Authentic HackerAI Logo & Nav Links */}
          <div className="flex items-center gap-6 sm:gap-8">
            <div 
              onClick={() => router.push('/')}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
              aria-label="HackerAI Home"
            >
              <HackerAILogo className="w-7 h-7 text-white group-hover:opacity-90 transition-opacity" />
              <span className="text-xl font-semibold tracking-tight text-white font-sans">
                HackerAI
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
              <button 
                onClick={() => router.push('/chat')} 
                className="h-8 px-3 rounded-md text-sm font-medium text-[#A0A0A0] hover:text-white hover:bg-white/5 transition-colors"
              >
                Product
              </button>
              <button 
                onClick={() => setActiveModal('pricing')} 
                className="h-8 px-3 rounded-md text-sm font-medium text-[#A0A0A0] hover:text-white hover:bg-white/5 transition-colors"
              >
                Pricing
              </button>
              <button 
                onClick={() => setActiveModal('trust')} 
                className="h-8 px-3 rounded-md text-sm font-medium text-[#A0A0A0] hover:text-white hover:bg-white/5 transition-colors"
              >
                Trust
              </button>
            </nav>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => alert('HackerAI Desktop app available for macOS & Linux.')}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 py-2 rounded-[10px] text-sm font-medium text-[#A0A0A0] hover:text-white hover:bg-white/5 transition-colors"
            >
              <Download className="w-4 h-4 mr-0.5" />
              <span>Download</span>
            </button>

            <button
              onClick={() => router.push('/chat')}
              className="inline-flex items-center justify-center h-9 px-4 py-2 min-w-[74px] rounded-[10px] bg-white text-black font-semibold text-sm hover:bg-neutral-200 shadow-xs transition-colors"
            >
              Sign in
            </button>

            <button
              onClick={() => router.push('/chat')}
              className="inline-flex items-center justify-center h-9 px-4 py-2 min-w-[80px] rounded-[10px] border border-[#333333] bg-[#1F1F1F]/40 hover:bg-[#2A2A2A] text-white font-medium text-sm transition-colors"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* Center Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 min-h-0 w-full max-w-4xl mx-auto -mt-4">
        {/* Main Headline & Subtitle */}
        <div className="mb-4 sm:mb-5 flex flex-col items-center px-4 text-center">
          <h1 className="text-[38px] sm:text-[44px] md:text-[48px] font-bold text-white mb-2 leading-tight tracking-[-0.015em] font-sans">
            What will you hack today?
          </h1>
          <p className="text-[#9E9E9E] text-[17px] sm:text-[18px] font-normal leading-normal font-sans">
            Find and fix vulnerabilities by working with AI.
          </p>
        </div>

        {/* Center Prompt Box */}
        <div className="w-full max-w-[760px] px-2 sm:px-0">
          <div className="relative z-10 flex flex-col gap-1.5 border border-[#282828] bg-[#181818] pt-3 pb-2.5 px-4 sm:px-5 shadow-[0px_10px_30px_rgba(0,0,0,0.45)] rounded-[22px] transition-all focus-within:border-[#383838]">
            <div className="overflow-y-auto">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholderText || 'Ask HackerAI to audit the security of...'}
                rows={2}
                className="w-full bg-transparent text-white text-[15px] placeholder-[#787878] focus:outline-none resize-none min-h-[44px] leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => router.push('/chat')}
                className="w-7 h-7 flex items-center justify-center text-[#686868] hover:text-white transition-colors cursor-pointer select-none"
                title="Attach target or file"
              >
                <span className="text-2xl font-light leading-none">+</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit()}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  prompt.trim()
                    ? 'bg-white text-black hover:bg-neutral-200 cursor-pointer shadow-sm'
                    : 'bg-[#383838] text-[#9A9A9A] hover:bg-[#444444] hover:text-white'
                }`}
                title="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 text-[#666666] relative flex min-h-8 w-full items-center justify-center p-4 text-center text-xs md:px-[60px]">
        <span className="text-xs sm:text-sm leading-none">
          By messaging HackerAI, you agree to our{' '}
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setActiveModal('trust'); }} 
            className="text-white underline decoration-white hover:text-neutral-300 transition-colors"
          >
            Terms
          </a>{' '}
          and have read our{' '}
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setActiveModal('trust'); }} 
            className="text-white underline decoration-white hover:text-neutral-300 transition-colors"
          >
            Privacy Policy
          </a>
          . <span className="text-[#444444]">·</span>{' '}
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setActiveModal('trust'); }} 
            className="text-white underline decoration-white hover:text-neutral-300 transition-colors"
          >
            Security & Trust
          </a>
        </span>
      </footer>

      {/* Pricing Modal */}
      {activeModal === 'pricing' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-[22px] max-w-lg w-full p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-[#757575] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-1 font-sans">HackerAI Plans</h2>
            <p className="text-xs text-[#A0A0A0] mb-6 font-sans">Choose the plan tailored for your security operations.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-[14px] bg-[#141414] border border-[#333333]">
                <h3 className="font-semibold text-sm">Community</h3>
                <p className="text-2xl font-bold my-2">$0</p>
                <ul className="text-xs text-[#A0A0A0] space-y-1.5 mb-4 font-sans">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-white" /> Passive DNS & TLS Recon</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-white" /> Security Headers Audit</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-white" /> Standard ReAct Engine</li>
                </ul>
                <button
                  onClick={() => router.push('/chat')}
                  className="w-full py-2 rounded-[10px] bg-[#242424] border border-[#333333] text-white text-xs font-semibold hover:bg-[#2A2A2A]"
                >
                  Current Plan
                </button>
              </div>

              <div className="p-4 rounded-[14px] bg-[#161616] border border-white/20 relative">
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-white text-black font-bold text-[10px]">
                  PRO
                </span>
                <h3 className="font-semibold text-sm">Security Pro</h3>
                <p className="text-2xl font-bold my-2">$20<span className="text-xs text-[#757575]">/mo</span></p>
                <ul className="text-xs text-[#A0A0A0] space-y-1.5 mb-4 font-sans">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-white" /> GPT OSS 120B Full LPU</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-white" /> Dockerized Nmap & Nuclei</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-white" /> Unlimited Project Workspaces</li>
                </ul>
                <button
                  onClick={() => router.push('/chat')}
                  className="w-full py-2 rounded-[10px] bg-white text-black text-xs font-bold hover:bg-[#E5E5E5]"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-[22px] max-w-md w-full p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-[#757575] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 font-sans">
              <span className="font-bold">HackerAI</span> Security & Trust
            </h2>
            <p className="text-xs text-[#A0A0A0] mb-4 font-sans">Our core privacy and ethical security commitments.</p>
            <div className="space-y-3 text-xs text-[#C0C0C0] leading-relaxed font-sans">
              <p>• <strong>Zero Training on User Data</strong>: Your queries, code snippets, and audit findings are never used to train global public models.</p>
              <p>• <strong>Local-First SQLite Storage</strong>: All audit sessions remain on your local SQLite database instance.</p>
              <p>• <strong>Non-Destructive Reconnaissance</strong>: Built-in safety guards enforce safe diagnostic audits and defensive vulnerability verification.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
