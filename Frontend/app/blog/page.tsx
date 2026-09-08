'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Sparkles, 
  Calendar, 
  Clock, 
  FileCode, 
  Paperclip, 
  Terminal, 
  ShieldCheck, 
  Layers,
  Cpu
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function BlogPage() {
  const posts = [
    {
      id: 'file-attachments-announcement',
      badge: 'FEATURE PREVIEW',
      status: 'Releasing Tomorrow',
      title: 'Direct File & Artifact Attachments Coming to Kairo Workstation',
      description: 'Upload source code files, packet captures, target scope lists, and server configurations directly into Kairo’s autonomous ReAct agent loop for instant automated auditing.',
      date: 'Sept 9, 2026',
      readTime: '3 min read',
      author: 'Kairo Core Team',
      highlights: [
        'Multi-file source code uploading (.py, .ts, .go, .rs, .php, .java)',
        'Automated Static AST security audits on attached files',
        'PCAP and raw terminal log analysis with zero token bloat',
        'Direct 1-click hardened code patch generation'
      ],
      isFeatured: true
    },
    {
      id: 'groq-multi-key-rotation',
      badge: 'INFRASTRUCTURE',
      status: 'Live in Production',
      title: 'Zero-Downtime Autonomous AI with Dynamic Multi-Key Failover',
      description: 'How we engineered a self-healing API key discovery and round-robin rotation pool to handle thousands of tokens/second without hitting 429 rate limits.',
      date: 'Sept 7, 2026',
      readTime: '4 min read',
      author: 'Infrastructure Team',
      highlights: [
        'Automatic case-insensitive key discovery from process.env',
        'Smart exponential backoff on HTTP 429 rate limit events',
        'Seamless SSE stream recovery during multi-turn ReAct loops'
      ],
      isFeatured: false
    },
    {
      id: 'sandboxed-kali-tooling',
      badge: 'SECURITY ENGINE',
      status: 'Live in Production',
      title: 'Eliminating AI Hallucinations with Sandboxed Tool Calling',
      description: 'Why standard LLMs fail at offensive security, and how Kairo grounds every finding in deterministic stdout telemetry from Nmap, Subfinder, and Nuclei.',
      date: 'Sept 5, 2026',
      readTime: '5 min read',
      author: 'Security Research',
      highlights: [
        'Regex sanitized parameter execution harness',
        'Non-destructive reconnaissance scopes by default',
        'Real-time Server-Sent Events (SSE) telemetry streaming'
      ],
      isFeatured: false
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#090909] text-[#F4F4F0] flex flex-col justify-between font-sans antialiased selection:bg-[#F4F4F0] selection:text-[#090909] relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none brutalist-grid opacity-30 z-0" />
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-start w-full relative z-10 px-4 sm:px-6 pt-16 sm:pt-20 pb-24 max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="font-mono text-xs text-[#686865] uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B8FF3D] animate-pulse" />
              <span>RADAR / 01 : BLOG & UPDATES</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F4F4F0] leading-tight mb-4">
              Platform news, updates & engineering logs.
            </h1>
            <p className="text-base sm:text-lg text-[#A3A3A0] leading-relaxed">
              Stay updated with the latest security engines, autonomous agent capabilities, and upcoming releases.
            </p>
          </motion.div>
        </div>

        {/* Featured Post: File Attachments */}
        <div className="w-full mb-12">
          {posts.filter(p => p.isFeatured).map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="border border-[#2A2A28] bg-[#0E0E0E] rounded-2xl p-6 sm:p-10 relative overflow-hidden group hover:border-[#3E3E3C] transition-all shadow-2xl"
            >
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full bg-[#B8FF3D]/10 border border-[#B8FF3D]/30 text-[#B8FF3D] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{post.badge}</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#181818] border border-[#282828] text-[#F4F4F0] font-mono text-xs font-semibold">
                  {post.status}
                </span>
                <div className="flex items-center gap-3 text-xs text-[#686865] font-mono ml-auto">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.date}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readTime}</span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F0] mb-4 leading-snug">
                {post.title}
              </h2>

              <p className="text-sm sm:text-base text-[#A3A3A0] leading-relaxed mb-8">
                {post.description}
              </p>

              <div className="border-t border-[#1C1C1A] pt-6 mb-8">
                <div className="font-mono text-xs text-[#686865] uppercase tracking-wider mb-4">
                  WHAT TO EXPECT IN THIS RELEASE
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  {post.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#141414] border border-[#222220]">
                      <Paperclip className="w-4 h-4 text-[#B8FF3D] shrink-0 mt-0.5" />
                      <span className="text-[#E0E0DC]">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#1C1C1A]">
                <div className="text-xs text-[#686865] font-mono">
                  AUTHOR : <span className="text-[#F4F4F0] font-bold">{post.author}</span>
                </div>
                <Link
                  href="/chat"
                  prefetch={true}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-xs hover:bg-white active:scale-95 transition-all shadow-md select-none"
                >
                  <span>Launch Workstation</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Regular Posts Grid */}
        <div className="w-full space-y-6">
          <div className="font-mono text-xs text-[#686865] uppercase tracking-widest mb-2">
            PREVIOUS ENGINEERING LOGS
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.filter(p => !p.isFeatured).map((post) => (
              <div
                key={post.id}
                className="border border-[#222220] bg-[#0D0D0D] rounded-xl p-6 hover:border-[#333330] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-[10px] text-[#686865] px-2 py-0.5 rounded bg-[#161616] border border-[#242424]">
                      {post.badge}
                    </span>
                    <span className="font-mono text-[11px] text-[#686865]">{post.date}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#F4F4F0] mb-2 leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs text-[#A3A3A0] leading-relaxed mb-4">
                    {post.description}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-[#181816] font-mono text-[11px] text-[#888885]">
                  {post.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#686865]" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
