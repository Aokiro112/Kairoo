'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Database, 
  EyeOff, 
  Server, 
  Trash2, 
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState('01');
  const [copiedLink, setCopiedLink] = useState(false);

  const sections = [
    {
      id: '01',
      title: 'Zero LLM Training Guarantee',
      content: [
        'We enforce a strict and non-negotiable zero-training policy. Source code, proprietary APIs, application AST structures, target domain names, and discovered vulnerability details are never retained, logged, or utilized by Kairo or third-party inference providers to train or fine-tune AI foundation models.',
        'Your diagnostic session queries exist ephemerally in RAM during real-time inference execution and are purged immediately upon response streaming.'
      ]
    },
    {
      id: '02',
      title: 'Local-First SQLite Architecture',
      content: [
        'All vulnerability scan reports, target mappings, tool execution logs, and exploit proofs reside exclusively within your private local SQLite database file on your machine.',
        'We operate zero centralized telemetry databases that store your security findings. You possess complete physical and cryptographic custody over your audit artifacts.'
      ]
    },
    {
      id: '03',
      title: 'Data in Transit & Cryptographic Protocols',
      content: [
        'All network traffic between your client workstation and our Groq LPU inference clusters is protected via TLS 1.3 with Perfect Forward Secrecy and strong AEAD cipher suites.',
        'API keys and session tokens are held in volatile browser memory and are never written to unencrypted persistent storage on our servers.'
      ]
    },
    {
      id: '04',
      title: 'Account Telemetry & Zero Third-Party Trackers',
      content: [
        'We collect only the bare minimum data necessary for authentication and account tier management (such as email addresses and cryptographic session tokens).',
        'We do not load third-party advertising scripts, marketing cookies, social media tracking pixels, or behavioral telemetry frameworks.'
      ]
    },
    {
      id: '05',
      title: 'Data Purge Rights & Instant Erasure',
      content: [
        'Under GDPR, CCPA, and global privacy standards, you maintain absolute control over your information.',
        'You can execute a 1-click purge of all local database records at any time, or request complete account eradication by contacting our privacy operations desk.'
      ]
    },
    {
      id: '06',
      title: 'Subprocessors & Infrastructure Compliance',
      content: [
        'We work exclusively with enterprise infrastructure providers bound by strict Data Processing Agreements (DPAs) and SOC 2 Type II certifications.',
        'Our subprocessor roster includes Groq Inc. (for high-speed LPU inference with zero data retention) and Vercel Inc. (for static asset edge delivery).'
      ]
    },
    {
      id: '07',
      title: 'Policy Updates & Notifications',
      content: [
        'Any updates to this Privacy Policy will be published directly to this page with an incremented revision date.',
        'Material updates affecting data handling policies will be accompanied by an in-app notice prior to taking effect.'
      ]
    }
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

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
              PRIVACY / ZERO_DATA_RETENTION
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F4F4F0] leading-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-base sm:text-lg text-[#A3A3A0] leading-relaxed mb-6">
              Our technical guarantees for source code isolation, local-first storage, and zero model training.
            </p>
            
            <div className="flex items-center justify-center gap-4 font-mono text-xs text-[#686865]">
              <span>EFFECTIVE : JAN 2026</span>
              <span>•</span>
              <span>VERSION 2.4.0</span>
              <span>•</span>
              <button
                onClick={handleCopyLink}
                className="hover:text-[#F4F4F0] flex items-center gap-1 transition-colors"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#B8FF3D]" />
                    <span className="text-[#B8FF3D]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>

        {/* 3 Privacy Pillars */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16 font-mono text-xs">
          <div className="p-5 rounded-xl border border-[#2A2A28] bg-[#111111] flex flex-col justify-between">
            <EyeOff className="w-5 h-5 text-[#B8FF3D] mb-3" />
            <div>
              <div className="font-bold text-[#F4F4F0] mb-1">ZERO MODEL TRAINING</div>
              <p className="text-[11px] text-[#A3A3A0] font-sans">Your code is never used to train or fine-tune public models.</p>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-[#2A2A28] bg-[#111111] flex flex-col justify-between">
            <Database className="w-5 h-5 text-[#B8FF3D] mb-3" />
            <div>
              <div className="font-bold text-[#F4F4F0] mb-1">LOCAL SQLITE CUSTODY</div>
              <p className="text-[11px] text-[#A3A3A0] font-sans">Full audit history resides strictly on your local device.</p>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-[#2A2A28] bg-[#111111] flex flex-col justify-between">
            <Lock className="w-5 h-5 text-[#B8FF3D] mb-3" />
            <div>
              <div className="font-bold text-[#F4F4F0] mb-1">TLS 1.3 ENCRYPTION</div>
              <p className="text-[11px] text-[#A3A3A0] font-sans">End-to-end encrypted forward secure transmission.</p>
            </div>
          </div>
        </div>

        {/* Main Content Layout with Sticky Sidebar on Desktop */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 mb-24">
          
          {/* Table of Contents Sticky Sidebar */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 border border-[#2A2A28] bg-[#0C0C0C] rounded-xl p-5">
              <div className="font-mono text-xs text-[#686865] uppercase mb-4 tracking-wider">
                TABLE OF CONTENTS
              </div>
              <nav className="space-y-2 text-xs">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#section-${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`block py-1.5 px-2 rounded transition-colors ${
                      activeSection === sec.id
                        ? 'bg-[#181818] text-[#F4F4F0] font-semibold border-l-2 border-[#B8FF3D]'
                        : 'text-[#A3A3A0] hover:text-[#F4F4F0]'
                    }`}
                  >
                    <span className="font-mono mr-2 text-[#686865]">{sec.id}</span>
                    <span>{sec.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* Section Clauses */}
          <div className="lg:col-span-8 space-y-12">
            {sections.map((sec) => (
              <div 
                key={sec.id} 
                id={`section-${sec.id}`}
                className="border-b border-[#1D1D1B] pb-10 scroll-mt-24"
              >
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="font-mono text-xs font-bold text-[#B8FF3D]">{sec.id}</span>
                  <h2 className="text-xl font-bold text-[#F4F4F0]">{sec.title}</h2>
                </div>
                <div className="space-y-3 text-sm text-[#A3A3A0] leading-relaxed pl-6">
                  {sec.content.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Data Officer Inquiry Box */}
        <div className="w-full border border-[#2A2A28] bg-[#0E0E0E] rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-base font-bold text-[#F4F4F0] mb-1">Privacy Officer Contact</h3>
            <p className="text-xs text-[#A3A3A0]">
              To request full data erasure, submit a DPA, or verify subprocessor compliance.
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
