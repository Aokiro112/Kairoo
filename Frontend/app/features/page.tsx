'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Search, 
  ShieldAlert, 
  Code2, 
  GitPullRequest, 
  Terminal, 
  Layers, 
  Globe, 
  Cpu, 
  Lock, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function FeaturesPage() {
  const router = useRouter();

  const featureList = [
    {
      number: '01',
      title: 'Target Reconnaissance & OSINT',
      tag: 'MODULE : RECON',
      description: 'Passive DNS enumeration, certificate transparency logging, open port fingerprinting, and technology stack mapping to identify full perimeter attack surfaces.',
      bullets: [
        'Passive Subdomain Enumeration',
        'TLS 1.3 Handshake & Cipher Suite Audit',
        'Open Port Fingerprinting',
        'CDN & Cloud WAF Detection'
      ]
    },
    {
      number: '02',
      title: 'Static AST & Source Code Auditing',
      tag: 'MODULE : STATIC_AST',
      description: 'Semantic Abstract Syntax Tree analysis targeting critical flaws including SQL injection, cross-site scripting (XSS), insecure deserialization, and IDOR patterns.',
      bullets: [
        'OWASP Top 10 Static Rule Checks',
        'Taint Analysis & User Input Tracing',
        'Hardcoded Secrets & API Key Hunting',
        'Support for TypeScript, Python, Go, Rust'
      ]
    },
    {
      number: '03',
      title: 'Safe Proof of Concept Verification',
      tag: 'MODULE : POC_ENGINE',
      description: 'Autonomous execution of isolated, non-destructive proofs of concept to distinguish genuine exploitable vulnerabilities from false alarms.',
      bullets: [
        'Zero Production Service Degradation',
        'Deterministic Vulnerability Proofs',
        'Sandbox Payload Execution',
        'Detailed Attack Vector Breakdown'
      ]
    },
    {
      number: '04',
      title: 'One Click Remediation Pull Requests',
      tag: 'MODULE : AUTO_DIFF',
      description: 'Instant generation of hardened code diffs, parameterized queries, and defensive security headers ready to merge into your GitHub repository.',
      bullets: [
        'Parameterized SQL Code Diffs',
        'Content Security Policy (CSP) Directives',
        'HSTS & CORS Policy Fixes',
        'Direct Git Pull Request Format'
      ]
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
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="font-mono text-xs text-[#686865] uppercase tracking-widest mb-3">
              SYSTEM / 01 : FEATURES
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F4F4F0] leading-tight mb-4">
              Every tool you need for modern offensive defense.
            </h1>
            <p className="text-base sm:text-lg text-[#A3A3A0] leading-relaxed mb-8">
              Full-spectrum cybersecurity diagnostics packaged into an ultra-fast, autonomous developer experience.
            </p>

            <button
              onClick={() => router.push('/chat')}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-sm hover:bg-white active:scale-95 transition-all shadow-lg select-none"
            >
              <span>Explore Features in Chat</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* Features List */}
        <div className="w-full space-y-6 mb-24">
          {featureList.map((feat) => (
            <div 
              key={feat.number}
              className="border border-[#2A2A28] bg-[#0E0E0E] rounded-xl p-6 sm:p-8 hover:border-[#3A3A38] transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#1D1D1B]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[#F4F4F0]">{feat.number}</span>
                  <h2 className="text-xl font-bold text-[#F4F4F0]">{feat.title}</h2>
                </div>
                <span className="font-mono text-xs text-[#686865]">{feat.tag}</span>
              </div>

              <p className="text-sm text-[#A3A3A0] leading-relaxed mb-6">
                {feat.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                {feat.bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded bg-[#141414] border border-[#222222]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B8FF3D]" />
                    <span className="text-[#F4F4F0]">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="w-full border border-[#2A2A28] bg-[#111111] rounded-xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F0] mb-3">
            Start scanning with Kairo today.
          </h2>
          <p className="text-sm text-[#A3A3A0] max-w-xl mx-auto mb-6">
            Find and fix vulnerabilities before adversaries can exploit them.
          </p>
          <button
            onClick={() => router.push('/chat')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-sm hover:bg-white active:scale-95 transition-all shadow-md select-none"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

      </main>

      <Footer />
    </div>
  );
}
