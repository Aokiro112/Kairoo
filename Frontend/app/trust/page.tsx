'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Database, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  FileCheck2,
  Server
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function TrustCenterPage() {

  const trustItems = [
    {
      title: 'Zero Training Policy',
      desc: 'All user queries, AST code scans, and vulnerability reports are strictly excluded from AI training datasets.',
      status: 'VERIFIED ACTIVE',
      icon: EyeOff
    },
    {
      title: 'Local-First SQLite Storage',
      desc: 'Audit telemetry and scan sessions reside strictly in your private local SQLite database instance.',
      status: 'VERIFIED ACTIVE',
      icon: Database
    },
    {
      title: 'End-to-End Cryptography',
      desc: 'TLS 1.3 with Perfect Forward Secrecy across all workstation client and Groq LPU inference connections.',
      status: 'VERIFIED ACTIVE',
      icon: Lock
    },
    {
      title: 'Non-Destructive Guardrails',
      desc: 'Autonomous probes enforce safety boundaries to prevent production downtime or data alteration.',
      status: 'VERIFIED ACTIVE',
      icon: ShieldCheck
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="font-mono text-xs text-[#686865] uppercase tracking-widest mb-3">
              SECURITY / TRUST_CENTER
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#F4F4F0] leading-tight mb-4">
              Kairo Trust & Compliance Center
            </h1>
            <p className="text-base sm:text-lg text-[#A3A3A0] leading-relaxed mb-6">
              Real-time verification of security commitments, privacy guardrails, and compliance architecture.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111111] border border-[#2A2A28] font-mono text-xs text-[#B8FF3D]">
              <span className="w-2 h-2 rounded-full bg-[#B8FF3D] animate-ping" />
              <span>ALL SECURITY CONTROLS OPERATIONAL</span>
            </div>
          </motion.div>
        </div>

        {/* Security Controls Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-px bg-[#2A2A28] border border-[#2A2A28] rounded-xl overflow-hidden mb-16">
          {trustItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-[#0D0D0D] p-6 sm:p-8 flex flex-col justify-between hover:bg-[#111111] transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-9 h-9 rounded bg-[#161616] border border-[#2A2A28] flex items-center justify-center text-[#B8FF3D]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] text-[#B8FF3D] px-2 py-0.5 rounded bg-[#B8FF3D]/10 border border-[#B8FF3D]/30">
                      {item.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[#F4F4F0] mb-2">{item.title}</h2>
                  <p className="text-sm text-[#A3A3A0] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Nav to Policies */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 mb-24">
          <Link
            href="/privacy"
            prefetch={true}
            className="p-6 rounded-xl border border-[#2A2A28] bg-[#0E0E0E] hover:border-[#F4F4F0] text-left transition-colors group block"
          >
            <div className="font-mono text-xs text-[#686865] mb-2">POLICY / 01</div>
            <h3 className="text-base font-bold text-[#F4F4F0] mb-1 group-hover:text-white flex items-center justify-between">
              <span>Privacy Policy</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-[#A3A3A0]">Zero model training and local data isolation commitments.</p>
          </Link>

          <Link
            href="/terms"
            prefetch={true}
            className="p-6 rounded-xl border border-[#2A2A28] bg-[#0E0E0E] hover:border-[#F4F4F0] text-left transition-colors group block"
          >
            <div className="font-mono text-xs text-[#686865] mb-2">POLICY / 02</div>
            <h3 className="text-base font-bold text-[#F4F4F0] mb-1 group-hover:text-white flex items-center justify-between">
              <span>Terms of Service</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-[#A3A3A0]">Authorization requirements and responsible usage rules.</p>
          </Link>

          <Link
            href="/disclosure"
            prefetch={true}
            className="p-6 rounded-xl border border-[#2A2A28] bg-[#0E0E0E] hover:border-[#F4F4F0] text-left transition-colors group block"
          >
            <div className="font-mono text-xs text-[#686865] mb-2">POLICY / 03</div>
            <h3 className="text-base font-bold text-[#F4F4F0] mb-1 group-hover:text-white flex items-center justify-between">
              <span>Bug Bounty Program</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-[#A3A3A0]">Safe harbor guidelines and bounty compensation matrix.</p>
          </Link>
        </div>

        {/* Bottom CTA */}
        <div className="w-full border border-[#2A2A28] bg-[#111111] rounded-xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F0] mb-3">
            Deploy with complete security confidence.
          </h2>
          <p className="text-sm text-[#A3A3A0] max-w-xl mx-auto mb-6">
            Audit your systems autonomously with end-to-end data isolation.
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
