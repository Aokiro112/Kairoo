'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Scale, 
  ShieldAlert, 
  FileCheck2, 
  Lock, 
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('01');
  const [copiedLink, setCopiedLink] = useState(false);

  const sections = [
    {
      id: '01',
      title: 'Acceptance of Terms & Eligibility',
      content: [
        'By creating an account, accessing the Kairo web application, or executing Kairo command-line utilities, you enter into a legally binding agreement with Kairo Security Inc.',
        'You represent and warrant that you are at least 18 years of age and possess the legal authority to bind yourself or the legal entity you represent to these Terms of Service.'
      ]
    },
    {
      id: '02',
      title: 'Mandatory Testing Authorization & Scope',
      content: [
        'You explicitly agree and warrant that you will only perform security audits, reconnaissance scans, AST code inspections, and vulnerability probes against systems, networks, applications, and repositories that you own or for which you hold explicit, documented written authorization from the legitimate owner.',
        'Any unauthorized scanning, port flooding, distributed denial-of-service (DDoS), credential stuffing, or unauthorized exploitation of third-party infrastructure is strictly prohibited and constitutes an immediate violation of these terms and applicable cybercrime laws.'
      ]
    },
    {
      id: '03',
      title: 'Autonomous Diagnostic Engine & Non-Destructive Guardrails',
      content: [
        'Kairo functions as an autonomous diagnostic assistant to aid professional security teams. While our engines employ semantic AST analysis and non-destructive proof-of-concept validation, security audits are provided on an "as is" basis.',
        'Kairo does not guarantee that every potential vulnerability or zero-day flaw will be identified, nor that generated remediation patches are completely error-free. Security operators are responsible for verifying code diffs before production deployment.'
      ]
    },
    {
      id: '04',
      title: 'Customer Data Ownership & Intellectual Property',
      content: [
        'You retain 100% sole and exclusive ownership of all source code, proprietary targets, scan parameters, audit logs, and generated remediation patches. Kairo claims no intellectual property rights over your audited assets.',
        'Kairo Security Inc. retains all intellectual property rights in and to the Kairo platform, proprietary algorithms, ReAct autonomous agents, logos, and documentation.'
      ]
    },
    {
      id: '05',
      title: 'Subscriptions, Billing & Cancellation',
      content: [
        'Paid subscriptions (such as Security Pro) are billed in advance on a monthly recurring basis. You may cancel your subscription at any time directly from your account settings with zero cancellation fees.',
        'Upon cancellation, your Pro features remain active until the conclusion of your current billing period, after which your account automatically reverts to the Community tier.'
      ]
    },
    {
      id: '06',
      title: 'Service Availability & Infrastructure',
      content: [
        'We strive to maintain high platform availability across our global edge networks and inference services.',
        'Scheduled maintenance windows are communicated in advance. Kairo shall not be liable for transient third-party infrastructure interruptions or network latency.'
      ]
    },
    {
      id: '07',
      title: 'Limitation of Liability & Indemnification',
      content: [
        'To the maximum extent permitted by applicable law, Kairo Security Inc. shall not be liable for any indirect, incidental, consequential, or punitive damages resulting from the use or inability to use the platform, including uncoordinated security testing or third-party service downtime.',
        'You agree to indemnify and hold harmless Kairo Security Inc. against any third-party claims arising from unauthorized scanning or testing conducted through your account credentials.'
      ]
    },
    {
      id: '08',
      title: 'Governing Law & Dispute Resolution',
      content: [
        'These Terms of Service are governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles.',
        'Any disputes arising under these terms shall be resolved exclusively through binding individual arbitration.'
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
              LEGAL / TERMS_OF_SERVICE
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F4F4F0] leading-tight mb-4">
              Terms of Service
            </h1>
            <p className="text-base sm:text-lg text-[#A3A3A0] leading-relaxed mb-6">
              Legal agreement governing platform access, authorization standards, and customer rights.
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

        {/* Highlight Card */}
        <div className="w-full border border-[#2A2A28] bg-[#111111] rounded-xl p-6 sm:p-8 mb-16 flex items-start gap-4">
          <Scale className="w-6 h-6 text-[#B8FF3D] shrink-0 mt-1" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#F4F4F0]">Authorized Testing Mandate</h2>
            <p className="text-xs text-[#A3A3A0] leading-relaxed">
              Kairo is engineered strictly for authorized security assessments, defensive engineering, and approved penetration testing. Always verify written permission before targeting third-party assets.
            </p>
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

        {/* Contact Inquiry Box */}
        <div className="w-full border border-[#2A2A28] bg-[#0E0E0E] rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-base font-bold text-[#F4F4F0] mb-1">Legal Department Inquiries</h3>
            <p className="text-xs text-[#A3A3A0]">
              Reach out to our legal department for custom enterprise agreements and master service terms.
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
