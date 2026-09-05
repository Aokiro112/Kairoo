'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Terminal, 
  Shield, 
  Cpu, 
  Layers, 
  Lock, 
  Zap, 
  Check, 
  Database, 
  GitPullRequest,
  Search,
  CheckCircle2
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function ProductPage() {
  const capabilities = [
    {
      id: '01',
      title: 'Autonomous ReAct Security Engine',
      desc: 'Combines multi-step reasoning with specialized security diagnostic tools. Kairo formulates testing hypotheses, executes non-destructive probes, and verifies vulnerability status in real time.',
      badge: 'ENGINE : REACT_CORE'
    },
    {
      id: '02',
      title: 'Multi-Key Groq LPU Acceleration',
      desc: 'Sub-second inference speeds powered by Groq LPU clusters with automatic multi-key failover pools, guaranteeing zero downtime and uninterrupted security scanning.',
      badge: 'PERFORMANCE : SUB_SECOND'
    },
    {
      id: '03',
      title: 'Local-First SQLite Architecture',
      desc: 'Your audit sessions, scan targets, and vulnerability findings remain strictly on your local database instance. Zero telemetry or code telemetry sent to external vendors.',
      badge: 'PRIVACY : LOCAL_SQLITE'
    },
    {
      id: '04',
      title: 'Automated Code Remediation PRs',
      desc: 'Generates ready-to-merge pull request patches with fixed source code, parameterized SQL queries, sanitized input pipelines, and hardened security headers.',
      badge: 'DEFENSE : ONE_CLICK_PR'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#090909] text-[#F4F4F0] flex flex-col justify-between font-sans antialiased selection:bg-[#F4F4F0] selection:text-[#090909] relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none brutalist-grid opacity-30 z-0" />
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-start w-full relative z-10 px-4 sm:px-6 pt-16 sm:pt-20 pb-24 max-w-5xl mx-auto">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="font-mono text-xs text-[#686865] uppercase tracking-widest mb-3">
              PRODUCT / ARCHITECTURE
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F4F4F0] leading-tight mb-4">
              The offensive security workstation built for modern teams.
            </h1>
            <p className="text-base sm:text-lg text-[#A3A3A0] leading-relaxed mb-8">
              Kairo orchestrates autonomous reconnaissance, static code inspection, and verified exploit proofs in a single high-performance terminal workspace.
            </p>

            <Link
              href="/chat"
              prefetch={true}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-sm hover:bg-white active:scale-95 transition-all shadow-lg select-none"
            >
              <span>Launch Kairo Workstation</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Interactive CLI Terminal Showcase */}
        <div className="w-full border border-[#2A2A28] bg-[#0C0C0C] rounded-xl overflow-hidden shadow-2xl mb-24 font-mono text-xs">
          <div className="border-b border-[#1D1D1B] bg-[#141414] px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#A3A3A0]" />
              <span className="text-[#F4F4F0]">kairo-terminal / v2.4.0</span>
            </div>
            <span className="text-[10px] text-[#B8FF3D] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B8FF3D] animate-pulse" />
              SESSION : ACTIVE
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-2 text-[12px] leading-relaxed select-text">
            <div className="text-[#686865]">$ kairo scan --target https://api.prod.company.com --profile owasp-full</div>
            <div className="text-[#A3A3A0]">[0.02s] Initializing autonomous security agent with Groq LPU engine...</div>
            <div className="text-[#A3A3A0]">[0.41s] DNS & Subdomain mapping: 18 active services discovered</div>
            <div className="text-[#A3A3A0]">[1.12s] Port scan: 443 (HTTPS/TLS 1.3), 80 (HTTP 301 Redirect)</div>
            <div className="text-[#FF9F43]">[2.08s] [WARN] CORS misconfiguration detected on /api/v2/auth</div>
            <div className="text-[#FF5C5C]">[3.45s] [CRITICAL] SQL Injection proof verified on /api/v2/users?id=</div>
            <div className="text-[#6EE7A0]">[4.10s] [REMEDIATION] Parameterized SQL patch generated and verified</div>
            <div className="text-[#F4F4F0] pt-2 flex items-center gap-1.5">
              <span className="text-[#B8FF3D]">&gt;</span>
              <span>Audit complete: 2 findings identified, 1 pull request patch generated.</span>
              <span className="w-2 h-4 bg-[#B8FF3D] inline-block animate-cursor-blink" />
            </div>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="w-full mb-24">
          <div className="border-b border-[#2A2A28] pb-4 mb-8">
            <div className="text-xs font-mono tracking-widest text-[#686865] uppercase mb-1">
              SYSTEM / 01 : CORE ENGINES
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F0]">
              Built ground-up for extreme security standards.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#2A2A28] border border-[#2A2A28] rounded-lg overflow-hidden">
            {capabilities.map((item) => (
              <div key={item.id} className="bg-[#0D0D0D] p-6 sm:p-8 flex flex-col justify-between hover:bg-[#111111] transition-colors group">
                <div>
                  <div className="font-mono text-xs text-[#686865] mb-2">{item.id} / ENGINE</div>
                  <h3 className="text-lg font-bold text-[#F4F4F0] mb-2 group-hover:text-white transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#A3A3A0] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#1D1D1B] font-mono text-[11px] text-[#686865]">
                  {item.badge}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="w-full border border-[#2A2A28] bg-[#111111] rounded-xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F0] mb-3">
            Ready to experience autonomous offensive defense?
          </h2>
          <p className="text-sm text-[#A3A3A0] max-w-xl mx-auto mb-6">
            Run your first audit right now in the Kairo workspace.
          </p>
          <Link
            href="/chat"
            prefetch={true}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-sm hover:bg-white active:scale-95 transition-all shadow-md select-none"
          >
            <span>Launch Workstation</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>

      </main>

      <Footer />
    </div>
  );
}
