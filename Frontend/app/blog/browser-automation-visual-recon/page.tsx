'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Globe, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Camera,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function BrowserAutomationBlogPost() {
  return (
    <div className="min-h-screen w-full bg-[#090909] text-[#F4F4F0] flex flex-col justify-between font-sans antialiased selection:bg-[#F4F4F0] selection:text-[#090909] relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none brutalist-grid opacity-25 z-0" />
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-start w-full relative z-10 px-4 sm:px-6 pt-12 sm:pt-16 pb-24 max-w-3xl mx-auto">
        
        {/* Back Link */}
        <div className="w-full mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-xs font-mono text-[#A3A3A0] hover:text-[#F4F4F0] transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to all posts</span>
          </Link>
        </div>

        {/* Article Header */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full mb-10 pb-8 border-b border-[#1D1D1B]"
        >
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#181818] border border-[#282828] text-[#D0D0CC] font-mono text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
              Engine Architecture & Release
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F4F4F0] mb-4 leading-tight font-sans">
            Autonomous Browser Exploration & Visual Security Reconnaissance
          </h1>

          <div className="flex items-center gap-4 text-xs text-[#70706C] font-mono">
            <span>By <strong className="text-[#F4F4F0]">Kairo Core Team</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> September 10, 2026</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 4 min read</span>
          </div>
        </motion.header>

        {/* Article Body */}
        <motion.article
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full space-y-8 text-[#D5D5D0] leading-relaxed text-sm sm:text-base font-sans"
        >
          <p className="text-base sm:text-lg text-[#F4F4F0] leading-relaxed">
            We are excited to unveil Kairo’s newest core capability: <strong>Autonomous Headless Browser Automation & Visual Reconnaissance</strong>. Kairo is no longer limited to static API probes or raw curl requests—the agent now boots dedicated Chromium instances, renders modern JavaScript web applications, inspects live DOM trees, detects hidden CSRF vulnerabilities, and captures real-time visual proof of state.
          </p>

          {/* Motivation Section */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F4F4F0] mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#00F0FF]" />
              The Problem: Why Traditional AI Security Scanners Are "Blind"
            </h2>
            <p className="mb-4">
              When building AI security agents, the standard industry approach has been basic HTTP requests: fetching HTML via simple <code>GET</code> calls and feeding text into an LLM. While this works for static HTML documents, it completely fails on the modern web:
            </p>
            <ul className="space-y-3 pl-2 mb-4 text-[#A3A3A0]">
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                <span><strong>Single-Page Applications (SPAs):</strong> React, Next.js, Angular, and Vue apps render their DOM client-side. A raw HTTP request only sees an empty <code>&lt;div id="root"&gt;&lt;/div&gt;</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                <span><strong>Hidden Forms & Dynamic Auth Flows:</strong> Interactive modal forms, dynamic payment gateways, and CSRF tokens injected by JavaScript are completely invisible to static scrapers.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                <span><strong>No Visual Proof:</strong> Security auditors need visual verification to confirm clickjacking vectors, broken auth overlays, and UI defacements. Text logs alone lack operational certainty.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                <span><strong>Third-Party SaaS Lock-in:</strong> Cloud browser APIs (e.g. Browserbase, ScrapingBee) are slow, cost-prohibitive, and require paid API keys for every single query.</span>
              </li>
            </ul>
          </div>

          {/* Architecture Highlights */}
          <div className="border border-[#222220] bg-[#111111] rounded-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-2 font-mono text-xs text-[#00F0FF] font-bold uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>What We Engineered: Zero-Config Local & Cloud Browser Engine</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-[#1E1E1C] bg-[#0C0C0C] p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-[#F4F4F0] font-bold text-sm">
                  <Globe className="w-4 h-4 text-[#00F0FF]" />
                  <span>Sub-3s Route-Blocked Chromium</span>
                </div>
                <p className="text-xs text-[#8E8E88] leading-relaxed">
                  Headless Playwright Chromium with route-level blocking of analytics, trackers, web fonts, and media. Page audit time dropped from <strong>14s to under 4s</strong>.
                </p>
              </div>

              <div className="border border-[#1E1E1C] bg-[#0C0C0C] p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-[#F4F4F0] font-bold text-sm">
                  <Camera className="w-4 h-4 text-[#B8FF3D]" />
                  <span>Live Rendered Viewport Snapshots</span>
                </div>
                <p className="text-xs text-[#8E8E88] leading-relaxed">
                  Captures live 1280x800 high-efficiency JPEG screenshots rendered directly inside an interactive macOS-style <strong>Window Mockup Modal</strong> in chat.
                </p>
              </div>

              <div className="border border-[#1E1E1C] bg-[#0C0C0C] p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-[#F4F4F0] font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-[#00F0FF]" />
                  <span>DOM, Form & CSRF Heuristics</span>
                </div>
                <p className="text-xs text-[#8E8E88] leading-relaxed">
                  Automated extraction of interactive forms, input parameters, missing anti-CSRF tokens, cookie security flags (<code>Secure</code>, <code>HttpOnly</code>, <code>SameSite</code>), and console errors.
                </p>
              </div>

              <div className="border border-[#1E1E1C] bg-[#0C0C0C] p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-[#F4F4F0] font-bold text-sm">
                  <Layers className="w-4 h-4 text-[#B8FF3D]" />
                  <span>Hybrid Sandbox Dual-Engine</span>
                </div>
                <p className="text-xs text-[#8E8E88] leading-relaxed">
                  Seamless execution across E2B Cloud MicroVMs with local Native/Docker fallback. Works <strong>100% out of the box with zero external API key requirements</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* How to use */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F4F4F0] mb-3 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#B8FF3D]" />
              How to Properly Use the Browser Tool in Kairo
            </h2>
            <p className="mb-4">
              Using the new browser engine is completely natural. The agent autonomously decides when to trigger browser exploration, capture screenshots, or audit DOM security headers based on your intent.
            </p>

            <div className="space-y-4">
              <div className="border border-[#242422] bg-[#0E0E0E] rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-[#00F0FF] font-semibold">Prompt 1: Full Visual Recon & CSRF Audit</span>
                  <span className="text-[11px] font-mono text-[#666664]">Recommended</span>
                </div>
                <div className="bg-[#141414] border border-[#202020] rounded-lg p-3 font-mono text-xs text-[#E0E0DC] select-all">
                  Explore https://target.com using your browser, extract its live DOM structure, check for hidden forms, audit cookies & CSRF tokens, and capture a live screenshot.
                </div>
                <p className="text-xs text-[#8E8E88] mt-2">
                  ✨ <strong>What happens:</strong> Launches Chromium, extracts all input parameters, audits cookie security flags, captures a live JPEG viewport snapshot, and streams a structured markdown Vulnerability Matrix report.
                </p>
              </div>

              <div className="border border-[#242422] bg-[#0E0E0E] rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-[#B8FF3D] font-semibold">Prompt 2: Targetted Form & Auth Surface Mapping</span>
                </div>
                <div className="bg-[#141414] border border-[#202020] rounded-lg p-3 font-mono text-xs text-[#E0E0DC] select-all">
                  Perform a comprehensive security audit on https://example.com/login. Identify all input parameters, check for anti-forgery protection, and verify security headers.
                </div>
                <p className="text-xs text-[#8E8E88] mt-2">
                  ✨ <strong>What happens:</strong> Isolates the authentication POST endpoint, verifies whether passwords are submitted over secure transport, and verifies CSP/HSTS/X-Frame-Options headers.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive UI Inspection Guide */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F4F4F0] mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00F0FF]" />
              Interacting With Browser Tool Results in UI
            </h2>
            <p className="mb-4">
              When the agent executes a browser action, you will see a cyan <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#102428] text-[#00F0FF] border border-[#00F0FF]/30">browser</span> tool pill appear in real time:
            </p>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#CCCCCC]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00F0FF] shrink-0 mt-0.5" />
                <span><strong>Click the Tool Pill:</strong> Opens the detailed Tool Inspection Modal.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00F0FF] shrink-0 mt-0.5" />
                <span><strong>Window Mockup Tab:</strong> View the full-resolution rendered screenshot with browser frame controls.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00F0FF] shrink-0 mt-0.5" />
                <span><strong>Extracted DOM & Forms Tab:</strong> Inspect all discovered form actions, input types, and CSRF token statuses.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00F0FF] shrink-0 mt-0.5" />
                <span><strong>Cookies & Console Logs:</strong> Audit session cookies for <code>Secure</code> and <code>HttpOnly</code> flags along with browser runtime console errors.</span>
              </li>
            </ul>
          </div>

          {/* Bottom Card */}
          <div className="w-full border border-[#2A2A28] bg-[#111111] rounded-2xl p-6 sm:p-8 mt-12 text-center">
            <h3 className="text-xl font-bold text-[#F4F4F0] mb-2">
              Experience Visual Reconnaissance Today
            </h3>
            <p className="text-xs sm:text-sm text-[#A3A3A0] max-w-md mx-auto mb-6">
              Launch Kairo Workstation to audit your web applications, examine live DOM trees, and capture visual proof of state.
            </p>
            <Link
              href="/chat"
              prefetch={true}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-xs hover:bg-white active:scale-95 transition-all shadow-md select-none"
            >
              <span>Launch Kairo Workstation</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>

        </motion.article>

      </main>

      <Footer />
    </div>
  );
}
