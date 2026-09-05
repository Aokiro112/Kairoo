'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Database, 
  Cpu, 
  EyeOff, 
  FileCheck2, 
  AlertOctagon 
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function SecurityPage() {
  const principles = [
    {
      title: 'Zero LLM Training on User Code',
      desc: 'Your queries, source code files, proprietary APIs, and security findings are never cached, stored, or used for model training by any LLM providers.',
      icon: EyeOff,
      badge: 'POLICY : ZERO_RETENTION'
    },
    {
      title: 'Local First SQLite Architecture',
      desc: 'All vulnerability scan reports, target mappings, and tool logs stay strictly inside your local private database instance.',
      icon: Database,
      badge: 'STORAGE : LOCAL_FIRST'
    },
    {
      title: 'Non-Destructive Scanning Guards',
      desc: 'Our engine applies strict safety constraints to prevent denial of service (DoS), catastrophic database alteration, or production downtime during audits.',
      icon: AlertOctagon,
      badge: 'SAFETY : NON_DESTRUCTIVE'
    },
    {
      title: 'End to End Cryptographic Security',
      desc: 'All communications between workstation clients and Groq inference endpoints are secured via TLS 1.3 with forward secrecy.',
      icon: Lock,
      badge: 'CRYPTO : TLS_1_3'
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
              TRUST / SECURITY CENTER
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F4F4F0] leading-tight mb-4">
              Security and privacy built in from day zero.
            </h1>
            <p className="text-base sm:text-lg text-[#A3A3A0] leading-relaxed mb-8">
              We know security tools handle critical data. Kairo is built with uncompromising architecture to protect your perimeter and your privacy.
            </p>

            <Link
              href="/chat"
              prefetch={true}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-sm hover:bg-white active:scale-95 transition-all shadow-lg select-none"
            >
              <span>Launch Secure Session</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Security Commitments Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-px bg-[#2A2A28] border border-[#2A2A28] rounded-xl overflow-hidden mb-24">
          {principles.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div key={idx} className="bg-[#0D0D0D] p-6 sm:p-8 flex flex-col justify-between hover:bg-[#111111] transition-colors">
                <div>
                  <div className="w-9 h-9 rounded bg-[#161616] border border-[#2A2A28] flex items-center justify-center mb-4 text-[#F4F4F0]">
                    <Icon className="w-4 h-4 text-[#B8FF3D]" />
                  </div>
                  <h2 className="text-lg font-bold text-[#F4F4F0] mb-2">{p.title}</h2>
                  <p className="text-sm text-[#A3A3A0] leading-relaxed">
                    {p.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#1D1D1B] font-mono text-[11px] text-[#686865]">
                  {p.badge}
                </div>
              </div>
            );
          })}
        </div>

        {/* Responsible Disclosure & Ethical Guidelines */}
        <div className="w-full border border-[#2A2A28] bg-[#0E0E0E] rounded-xl p-6 sm:p-8 mb-24">
          <div className="font-mono text-xs text-[#686865] uppercase mb-2">COMPLIANCE & ETHICS</div>
          <h2 className="text-xl font-bold text-[#F4F4F0] mb-4">Responsible Disclosure Policy</h2>
          <div className="space-y-3 text-sm text-[#A3A3A0] leading-relaxed">
            <p>
              1. <strong>Authorization</strong>: Always ensure you possess explicit authorization to conduct penetration testing on the target infrastructure.
            </p>
            <p>
              2. <strong>Safe Verification</strong>: Kairo prioritizes defensive diagnostics and safe proof of concept tests over destructive exploitation.
            </p>
            <p>
              3. <strong>Vulnerability Reporting</strong>: If you discover a security vulnerability in the Kairo platform itself, report it responsibly to security@kairo.bond for prompt triage and bug bounty rewards.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="w-full border border-[#2A2A28] bg-[#111111] rounded-xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F0] mb-3">
            Questions about our security architecture?
          </h2>
          <p className="text-sm text-[#A3A3A0] max-w-xl mx-auto mb-6">
            Review our technical documentation or launch a private audit session now.
          </p>
          <Link
            href="/chat"
            prefetch={true}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-sm hover:bg-white active:scale-95 transition-all shadow-md select-none"
          >
            <span>Start Private Session</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>

      </main>

      <Footer />
    </div>
  );
}
