'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  Award, 
  CheckCircle2, 
  Terminal, 
  Clock, 
  DollarSign, 
  Lock 
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function ResponsibleDisclosurePage() {
  const router = useRouter();

  const bountyTiers = [
    {
      severity: 'CRITICAL',
      reward: '$1,500 : $3,000',
      color: 'text-[#FF5C5C]',
      border: 'border-[#FF5C5C]/30',
      examples: 'Remote Code Execution (RCE), Authentication Bypass, Blind SQLi, Direct Database Exfiltration'
    },
    {
      severity: 'HIGH',
      reward: '$750 : $1,500',
      color: 'text-[#FF9F43]',
      border: 'border-[#FF9F43]/30',
      examples: 'Privilege Escalation, Server-Side Request Forgery (SSRF), IDOR with High Impact, Key Extraction'
    },
    {
      severity: 'MEDIUM',
      reward: '$250 : $750',
      color: 'text-[#F4F4F0]',
      border: 'border-[#2A2A28]',
      examples: 'Stored Cross-Site Scripting (XSS), CSRF on Sensitive Actions, Permissive CORS Wildcard'
    },
    {
      severity: 'LOW',
      reward: 'Swag + Hall of Fame',
      color: 'text-[#A3A3A0]',
      border: 'border-[#2A2A28]',
      examples: 'Sensitive Header Leaks, Open Redirects, Subdomain Takeover Dangling Records'
    }
  ];

  const guidelines = [
    {
      step: '01',
      title: 'Safe Harbor Protection',
      desc: 'We consider security research conducted in accordance with this policy to be authorized. We will not initiate legal action or request law enforcement investigation against researchers acting in good faith.'
    },
    {
      step: '02',
      title: 'Testing Rules & Scope',
      desc: 'Only test against infrastructure under *.kairo.bond domains and public API endpoints. Do not execute destructive attacks (DoS/DDoS), physical attacks, social engineering against employees, or third-party cloud infrastructure.'
    },
    {
      step: '03',
      title: 'Coordinated Remediation (90 Days)',
      desc: 'Provide detailed reproduction steps and proofs of concept. Allow our engineering team a reasonable 90-day coordinated disclosure window to patch vulnerabilities before making details public.'
    },
    {
      step: '04',
      title: 'Response Timelines',
      desc: 'We commit to acknowledging all submissions within 24 hours, providing initial severity triage within 72 hours, and notifying you as soon as the patch is verified.'
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
              SECURITY / BUG_BOUNTY_PROGRAM
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#F4F4F0] leading-tight mb-4">
              Responsible Disclosure Policy
            </h1>
            <p className="text-base sm:text-lg text-[#A3A3A0] leading-relaxed mb-6">
              We value the contributions of ethical hackers and security researchers in keeping Kairo resilient.
            </p>
            <a
              href="mailto:security@kairo.bond"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#F4F4F0] text-[#090909] font-mono text-xs font-bold hover:bg-white active:scale-95 transition-all shadow-md select-none"
            >
              <span>Submit Report: security@kairo.bond</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </motion.div>
        </div>

        {/* Bug Bounty Rewards Matrix */}
        <div className="w-full mb-16">
          <div className="border-b border-[#2A2A28] pb-4 mb-6">
            <div className="font-mono text-xs text-[#686865] uppercase mb-1">REWARDS MATRIX</div>
            <h2 className="text-2xl font-bold text-[#F4F4F0]">Bounty Tiers & Compensation</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bountyTiers.map((tier) => (
              <div 
                key={tier.severity}
                className={`p-5 rounded-xl border bg-[#0E0E0E] flex flex-col justify-between ${tier.border}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-mono text-xs font-bold tracking-wider ${tier.color}`}>
                      {tier.severity}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#B8FF3D]">
                      {tier.reward}
                    </span>
                  </div>
                  <p className="text-xs text-[#A3A3A0] leading-relaxed font-sans mt-3">
                    {tier.examples}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rules of Engagement */}
        <div className="w-full mb-16">
          <div className="border-b border-[#2A2A28] pb-4 mb-6">
            <div className="font-mono text-xs text-[#686865] uppercase mb-1">COORDINATION</div>
            <h2 className="text-2xl font-bold text-[#F4F4F0]">Guidelines for Ethical Research</h2>
          </div>

          <div className="space-y-6">
            {guidelines.map((g) => (
              <div key={g.step} className="border border-[#2A2A28] bg-[#0E0E0E] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs text-[#686865]">{g.step}</span>
                  <h3 className="text-base font-bold text-[#F4F4F0]">{g.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-[#A3A3A0] leading-relaxed pl-7">
                  {g.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* PGP Submission Box */}
        <div className="w-full border border-[#2A2A28] bg-[#111111] rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2 font-mono text-xs text-[#B8FF3D]">
            <Lock className="w-4 h-4" />
            <span>PGP ENCRYPTED SUBMISSIONS</span>
          </div>
          <h3 className="text-lg font-bold text-[#F4F4F0] mb-2">How to Submit a Report</h3>
          <p className="text-xs text-[#A3A3A0] leading-relaxed mb-4">
            Send your vulnerability proof of concept, impact analysis, and reproduction steps directly to our security operations team. For sensitive findings, encrypt your email using our public PGP key.
          </p>
          <div className="p-3 rounded bg-[#090909] border border-[#222222] font-mono text-xs text-[#F4F4F0] select-all">
            Email: security@kairo.bond | Fingerprint: 4F92 B183 9A72 31C9 0081 FE29
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
