'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Scale, 
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function TermsPage() {
  const router = useRouter();

  const sections = [
    {
      id: '01',
      title: 'Acceptance of Terms',
      content: 'By accessing or using the Kairo platform, APIs, command-line interfaces, or autonomous security tools, you agree to be bound by these Terms of Service. If you do not agree with any portion of these terms, you must discontinue use immediately.'
    },
    {
      id: '02',
      title: 'Mandatory Authorization & Permissible Use',
      content: 'You explicitly agree and warrant that you will only perform security audits, reconnaissance scans, and vulnerability probes against systems, networks, applications, and codebases that you own or for which you possess explicit, documented written authorization from the legitimate owner. Any unauthorized scanning, denial-of-service attempts, or malicious exploitation is strictly prohibited and constitutes a material breach of these terms.'
    },
    {
      id: '03',
      title: 'Autonomous Diagnostic Engine & Disclaimers',
      content: 'Kairo operates as an autonomous diagnostic assistant to aid professional security teams. While our engines employ state-of-the-art AST analysis and non-destructive proof-of-concept validation, security audits are provided on an "as is" and "as available" basis without warranty that all vulnerabilities will be discovered or that suggested remediation patches are error-free.'
    },
    {
      id: '04',
      title: 'Intellectual Property & Customer Data Ownership',
      content: 'You retain sole and exclusive ownership of all source code, proprietary targets, scan parameters, audit logs, and generated remediation patches. Kairo claims no intellectual property rights or ownership over your audited assets.'
    },
    {
      id: '05',
      title: 'Service Availability & Fair Use',
      content: 'We strive for 99.99% platform availability. To ensure reliability across our Groq LPU inference clusters, excessive or automated abusive requests exceeding standard plan quotas may be throttled or rate-limited.'
    },
    {
      id: '06',
      title: 'Limitation of Liability',
      content: 'To the maximum extent permitted by applicable law, Kairo Security Inc. shall not be liable for any indirect, incidental, consequential, or punitive damages resulting from the use or inability to use the platform, including uncoordinated security testing or third-party service downtime.'
    },
    {
      id: '07',
      title: 'Modifications & Governing Law',
      content: 'We reserve the right to revise these terms to reflect changes in cybersecurity regulations or platform capabilities. Continued usage following notice of updates constitutes agreement to the amended terms.'
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
              LEGAL / TERMS_OF_SERVICE
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#F4F4F0] leading-tight mb-4">
              Terms of Service
            </h1>
            <p className="text-base sm:text-lg text-[#A3A3A0] leading-relaxed">
              Rules and legal conditions governing the use of Kairo security diagnostic workstations and autonomous scanning engines.
            </p>
            <div className="font-mono text-xs text-[#686865] mt-4">
              EFFECTIVE DATE : JANUARY 2026 • REVISION 2.4
            </div>
          </motion.div>
        </div>

        {/* Highlight Card */}
        <div className="w-full border border-[#2A2A28] bg-[#111111] rounded-xl p-6 sm:p-8 mb-12 flex items-start gap-4">
          <Scale className="w-6 h-6 text-[#B8FF3D] shrink-0 mt-1" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#F4F4F0]">Authorized Testing Only</h2>
            <p className="text-xs text-[#A3A3A0] leading-relaxed">
              Kairo is engineered strictly for authorized security assessments, defensive engineering, and approved penetration testing. Always verify written permission before targeting third-party assets.
            </p>
          </div>
        </div>

        {/* Terms Sections */}
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

        {/* Contact & Inquiry Box */}
        <div className="w-full border border-[#2A2A28] bg-[#0E0E0E] rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-base font-bold text-[#F4F4F0] mb-1">Legal or Compliance Questions?</h3>
            <p className="text-xs text-[#A3A3A0]">
              Reach out to our legal department for enterprise agreements and terms clarifications.
            </p>
          </div>
          <a
            href="mailto:legal@kairo.bond"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#161616] border border-[#2A2A28] hover:border-[#F4F4F0] text-[#F4F4F0] font-mono text-xs transition-colors shrink-0"
          >
            <span>legal@kairo.bond</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

      </main>

      <Footer />
    </div>
  );
}
