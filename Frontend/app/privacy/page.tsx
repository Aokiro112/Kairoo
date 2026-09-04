'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Database, 
  EyeOff, 
  Server, 
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  const sections = [
    {
      id: '01',
      title: 'Zero LLM Training on Customer Data',
      content: 'We uphold a strict and non-negotiable zero-training policy. Source code, API endpoints, application logic, and security findings transmitted during your audit sessions are never retained, logged, or used by Kairo or third-party inference providers to train or fine-tune AI foundation models.'
    },
    {
      id: '02',
      title: 'Local-First SQLite Session Storage',
      content: 'All scan histories, vulnerability telemetry, attack trees, and diagnostic logs are stored directly within your local SQLite database instance. Your vulnerability data remains in your custody, not on our central servers.'
    },
    {
      id: '03',
      title: 'Data in Transit & Cryptographic Standards',
      content: 'All communications between your browser, the Kairo workstation, and our Groq LPU inference endpoints are encrypted end-to-end using TLS 1.3 with Perfect Forward Secrecy. API keys and authentication tokens are handled strictly in memory and are never written to disk unencrypted.'
    },
    {
      id: '04',
      title: 'Minimal Account Telemetry',
      content: 'We collect only the bare minimum data required to manage authentication and subscription billing (such as your email address and cryptographic session identifiers). We do not employ third-party advertising cookies, cross-site trackers, or behavioral analytics SDKs.'
    },
    {
      id: '05',
      title: 'Data Deletion & Purge Rights',
      content: 'You possess full autonomy over your data. You can clear your local database with a single command or request full account termination at any time. When you trigger a purge, all associated session metadata is permanently eradicated.'
    },
    {
      id: '06',
      title: 'Subprocessors & Infrastructure Partners',
      content: 'We partner exclusively with enterprise infrastructure providers that guarantee zero data retention and strict SOC 2 Type II compliance (including Groq for LPU inference processing and Vercel for static asset edge delivery).'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#090909] text-[#F4F4F0] flex flex-col justify-between font-sans antialiased selection:bg-[#F4F4F0] selection:text-[#090909] relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none brutalist-grid opacity-30 z-0" />
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-start w-full relative z-10 px-4 sm:px-6 pt-16 sm:pt-20 pb-24 max-w-4xl mx-auto">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="font-mono text-xs text-[#686865] uppercase tracking-widest mb-3">
              PRIVACY / ZERO_DATA_RETENTION
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#F4F4F0] leading-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-base sm:text-lg text-[#A3A3A0] leading-relaxed">
              Our technical guarantees and commitments to source code isolation, local data ownership, and zero model training.
            </p>
            <div className="font-mono text-xs text-[#686865] mt-4">
              EFFECTIVE DATE : JANUARY 2026 • REVISION 2.4
            </div>
          </motion.div>
        </div>

        {/* Guarantees Box */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 font-mono text-xs">
          <div className="p-4 rounded-xl border border-[#2A2A28] bg-[#111111] flex flex-col justify-between">
            <EyeOff className="w-5 h-5 text-[#B8FF3D] mb-3" />
            <div>
              <div className="font-bold text-[#F4F4F0] mb-1">ZERO TRAINING</div>
              <p className="text-[11px] text-[#A3A3A0] font-sans">No user code or scan results ever train models.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#2A2A28] bg-[#111111] flex flex-col justify-between">
            <Database className="w-5 h-5 text-[#B8FF3D] mb-3" />
            <div>
              <div className="font-bold text-[#F4F4F0] mb-1">LOCAL SQLITE</div>
              <p className="text-[11px] text-[#A3A3A0] font-sans">Full scan history resides on your local machine.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#2A2A28] bg-[#111111] flex flex-col justify-between">
            <Lock className="w-5 h-5 text-[#B8FF3D] mb-3" />
            <div>
              <div className="font-bold text-[#F4F4F0] mb-1">TLS 1.3 FORWARD</div>
              <p className="text-[11px] text-[#A3A3A0] font-sans">End-to-end forward secure encrypted transit.</p>
            </div>
          </div>
        </div>

        {/* Policy Sections */}
        <div className="w-full space-y-8 mb-24">
          {sections.map((sec) => (
            <div key={sec.id} className="border-b border-[#1D1D1B] pb-8">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-mono text-xs text-[#686865]">{sec.id}</span>
                <h2 className="text-lg font-bold text-[#F4F4F0]">{sec.title}</h2>
              </div>
              <p className="text-sm text-[#A3A3A0] leading-relaxed pl-7">
                {sec.content}
              </p>
            </div>
          ))}
        </div>

        {/* Data Officer Inquiry Box */}
        <div className="w-full border border-[#2A2A28] bg-[#0E0E0E] rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-base font-bold text-[#F4F4F0] mb-1">Privacy Officer Contact</h3>
            <p className="text-xs text-[#A3A3A0]">
              To request full data erasure or inquire about subprocessor compliance.
            </p>
          </div>
          <a
            href="mailto:privacy@kairo.bond"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#161616] border border-[#2A2A28] hover:border-[#F4F4F0] text-[#F4F4F0] font-mono text-xs transition-colors shrink-0"
          >
            <span>privacy@kairo.bond</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

      </main>

      <Footer />
    </div>
  );
}
