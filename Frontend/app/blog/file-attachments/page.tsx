'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Sparkles, 
  Paperclip, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Code2
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function FileAttachmentsBlogPost() {
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
            <span className="px-2.5 py-0.5 rounded-full bg-[#181818] border border-[#282828] text-[#D0D0CC] font-mono text-[11px] font-medium">
              Releasing Tomorrow
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F4F4F0] mb-4 leading-tight font-sans">
            Upcoming Feature: Direct File & Artifact Attachments in Kairo Workstation
          </h1>

          <div className="flex items-center gap-4 text-xs text-[#70706C] font-mono">
            <span>By <strong className="text-[#F4F4F0]">Kairo Core Team</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> September 9, 2026</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 2 min read</span>
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
            One of the most requested capabilities from security researchers and developers testing Kairo has been direct file uploads. Today, we are sharing a quick preview of our upcoming <strong>File & Artifact Attachments Engine</strong>, which is scheduled to roll out to all operators tomorrow.
          </p>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F4F4F0] mb-3">
              The Problem: Copy-Pasting Code Bloats Context
            </h2>
            <p className="mb-4">
              When auditing large source code repositories or analyzing complex application logic, copy-pasting hundreds of lines into a chat box is tedious and disrupts formatting.
            </p>
            <p>
              Furthermore, standard LLM chat interfaces struggle with multi-file architectures where vulnerabilities span across multiple modules, backend controllers, and database models.
            </p>
          </div>

          <div className="border border-[#222220] bg-[#111111] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs text-[#B8FF3D] font-bold uppercase">
              <Paperclip className="w-4 h-4" />
              <span>What You Can Upload</span>
            </div>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#CCCCCC]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B8FF3D] shrink-0 mt-0.5" />
                <span><strong>Multi-Language Source Code:</strong> Attach <code>.py</code>, <code>.ts</code>, <code>.js</code>, <code>.go</code>, <code>.php</code>, <code>.rs</code>, and <code>.java</code> files for automated Static AST code auditing.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B8FF3D] shrink-0 mt-0.5" />
                <span><strong>Configuration & Environment Files:</strong> Upload <code>Dockerfile</code>, <code>nginx.conf</code>, <code>docker-compose.yml</code>, and <code>.env.example</code> to spot misconfigurations and secret exposure.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B8FF3D] shrink-0 mt-0.5" />
                <span><strong>Network & Scope Assets:</strong> Provide subdomain lists (<code>.txt</code> / <code>.csv</code>) or raw terminal scan outputs for instant AI-assisted correlation.</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F4F4F0] mb-3">
              How the Agent Processes Attachments
            </h2>
            <p className="mb-4">
              Instead of simply dumping raw file text into the prompt context, Kairo’s backend parses the files into isolated AST structures. The agent scans the code for OWASP Top 10 vulnerabilities (SQL Injection, XSS, SSRF, IDOR, and Cryptographic weaknesses) and generates concrete, hardened patch diffs ready to merge into your repository.
            </p>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F4F4F0] mb-3">
              Release Timeline
            </h2>
            <p className="mb-4">
              The feature is currently in final staging and security validation. The <strong>Plus (+) attachment button</strong> in the chat workstation is already configured and will become fully active tomorrow once the production deployment completes.
            </p>
          </div>

          {/* Bottom Card */}
          <div className="w-full border border-[#2A2A28] bg-[#111111] rounded-2xl p-6 sm:p-8 mt-12 text-center">
            <h3 className="text-xl font-bold text-[#F4F4F0] mb-2">
              Ready to test Kairo?
            </h3>
            <p className="text-xs sm:text-sm text-[#A3A3A0] max-w-md mx-auto mb-6">
              Launch the autonomous workstation to start scanning targets and auditing code today.
            </p>
            <Link
              href="/chat"
              prefetch={true}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-xs hover:bg-white active:scale-95 transition-all shadow-md select-none"
            >
              <span>Open Workstation</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>

        </motion.article>

      </main>

      <Footer />
    </div>
  );
}
