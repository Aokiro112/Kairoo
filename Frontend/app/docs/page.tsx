'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Terminal, 
  Copy, 
  Check, 
  BookOpen, 
  Code2, 
  Cpu, 
  ShieldCheck, 
  GitBranch 
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function DocsPage() {
  const router = useRouter();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const cliCommands = [
    {
      title: 'Target Reconnaissance Scan',
      cmd: 'kairo scan https://example.com --profile recon',
      desc: 'Executes passive DNS discovery, open port enumeration, and TLS handshake inspection.'
    },
    {
      title: 'Static Codebase Security Audit',
      cmd: 'kairo audit ./src --rules owasp-top10 --auto-diff',
      desc: 'Parses Abstract Syntax Tree to identify injection points and generates code diffs.'
    },
    {
      title: 'CVE Vulnerability Lookup & Proof',
      cmd: 'kairo cve lookup CVE-2024-3094 --test-sandbox',
      desc: 'Inspects local dependencies against live CVE signatures feed and runs non-destructive tests.'
    },
    {
      title: 'Export Remediation Pull Request',
      cmd: 'kairo report --format git-diff > patch.diff',
      desc: 'Exports hardened code patches ready to merge into your GitHub or GitLab repository.'
    }
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const githubActionsYaml = `name: Kairo Security Audit

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Run Kairo Security Audit
        uses: kairo-security/action@v2
        with:
          profile: 'owasp-full'
          fail_on_critical: true`;

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
              DOCUMENTATION / REFERENCE
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F4F4F0] leading-tight mb-4">
              Kairo developer and operator documentation.
            </h1>
            <p className="text-base sm:text-lg text-[#A3A3A0] leading-relaxed mb-8">
              Quickstart guides, CLI command cheat sheets, agent architecture, and CI/CD workflow integrations.
            </p>

            <button
              onClick={() => router.push('/chat')}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-sm hover:bg-white active:scale-95 transition-all shadow-lg select-none"
            >
              <span>Try Live in Workspace</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* 3 Step Quickstart */}
        <div className="w-full mb-20">
          <div className="border-b border-[#2A2A28] pb-4 mb-8">
            <div className="font-mono text-xs text-[#686865] uppercase mb-1">GETTING STARTED</div>
            <h2 className="text-2xl font-bold text-[#F4F4F0]">Quickstart in three steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            <div className="p-6 rounded-xl border border-[#2A2A28] bg-[#0E0E0E]">
              <span className="font-mono text-xs text-[#686865] block mb-2">01 / TARGET</span>
              <h3 className="text-base font-bold text-[#F4F4F0] mb-2">Define Your Scope</h3>
              <p className="text-xs text-[#A3A3A0] leading-relaxed">
                Enter your target domain, API route, or upload your local codebase into the workspace interface.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#2A2A28] bg-[#0E0E0E]">
              <span className="font-mono text-xs text-[#686865] block mb-2">02 / AUDIT</span>
              <h3 className="text-base font-bold text-[#F4F4F0] mb-2">Autonomous Analysis</h3>
              <p className="text-xs text-[#A3A3A0] leading-relaxed">
                Kairo executes multi-step diagnostic probes, verifies vulnerabilities, and filters out false positives.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#2A2A28] bg-[#0E0E0E]">
              <span className="font-mono text-xs text-[#686865] block mb-2">03 / REMEDIATE</span>
              <h3 className="text-base font-bold text-[#F4F4F0] mb-2">Review & Merge Patch</h3>
              <p className="text-xs text-[#A3A3A0] leading-relaxed">
                Inspect verified vulnerability proofs and merge ready-to-use code patches directly into your project.
              </p>
            </div>
          </div>
        </div>

        {/* CLI Reference */}
        <div className="w-full mb-20">
          <div className="border-b border-[#2A2A28] pb-4 mb-8">
            <div className="font-mono text-xs text-[#686865] uppercase mb-1">CLI COMMANDS</div>
            <h2 className="text-2xl font-bold text-[#F4F4F0]">Command line cheat sheet</h2>
          </div>

          <div className="space-y-4">
            {cliCommands.map((item, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-[#2A2A28] bg-[#0C0C0C] font-mono text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#A3A3A0] font-sans font-semibold">{item.title}</span>
                  <button
                    onClick={() => handleCopy(item.cmd, idx)}
                    className="flex items-center gap-1 text-[11px] text-[#686865] hover:text-[#F4F4F0] px-2 py-1 rounded border border-[#222222] transition-colors"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#B8FF3D]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 rounded bg-[#141414] border border-[#1D1D1B] text-[#F4F4F0] mb-2 select-text">
                  $ {item.cmd}
                </div>
                <p className="text-[11px] text-[#686865] font-sans">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CI/CD Integration Snippet */}
        <div className="w-full mb-24">
          <div className="border-b border-[#2A2A28] pb-4 mb-8">
            <div className="font-mono text-xs text-[#686865] uppercase mb-1">AUTOMATION PIPELINE</div>
            <h2 className="text-2xl font-bold text-[#F4F4F0]">GitHub Actions integration</h2>
          </div>

          <div className="border border-[#2A2A28] bg-[#0C0C0C] rounded-xl overflow-hidden font-mono text-xs shadow-lg">
            <div className="border-b border-[#1D1D1B] bg-[#141414] px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#A3A3A0]" />
                <span className="text-[#F4F4F0]">.github/workflows/kairo-security.yml</span>
              </div>
              <button
                onClick={() => handleCopy(githubActionsYaml, 99)}
                className="flex items-center gap-1 text-[11px] text-[#686865] hover:text-[#F4F4F0] px-2 py-0.5 rounded border border-[#222222] transition-colors"
              >
                {copiedIndex === 99 ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#B8FF3D]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy YAML</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-5 sm:p-6 overflow-x-auto text-[12px] text-[#A3A3A0] leading-relaxed select-text">
              {githubActionsYaml}
            </pre>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="w-full border border-[#2A2A28] bg-[#111111] rounded-xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F0] mb-3">
            Ready to audit your systems?
          </h2>
          <p className="text-sm text-[#A3A3A0] max-w-xl mx-auto mb-6">
            Launch the interactive workspace and run your first autonomous scan in seconds.
          </p>
          <button
            onClick={() => router.push('/chat')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-sm hover:bg-white active:scale-95 transition-all shadow-md select-none"
          >
            <span>Launch Live Workspace</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

      </main>

      <Footer />
    </div>
  );
}
