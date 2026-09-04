'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Check, 
  HelpCircle, 
  ShieldCheck, 
  Zap, 
  Sparkles 
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function PricingPage() {
  const router = useRouter();

  const plans = [
    {
      name: 'Community',
      price: '$0',
      period: 'forever',
      desc: 'Essential passive reconnaissance and security header audits for individual researchers.',
      highlight: false,
      ctaText: 'Current Plan',
      features: [
        'Passive DNS & TLS Reconnaissance',
        'Security Headers & CORS Audit',
        'Standard ReAct Copilot Engine',
        'Local SQLite Session Storage',
        'Community Support & Discord'
      ]
    },
    {
      name: 'Security Pro',
      price: '$20',
      period: 'per month',
      desc: 'Autonomous penetration testing and one-click code remediation for security engineers.',
      highlight: true,
      ctaText: 'Upgrade to Pro',
      features: [
        'Groq LPU Sub-Second Latency',
        'Full AST Source Code Auditing',
        'Autonomous Exploit Proof Sandbox',
        'One Click Remediation Pull Requests',
        'Unlimited Scans & Workspaces',
        'Real Time CVE Signatures Feed'
      ]
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'tailored',
      desc: 'Dedicated security automation, custom CVE signatures, and air-gapped deployments.',
      highlight: false,
      ctaText: 'Contact Sales',
      features: [
        'Air Gapped / On-Premise Deployment',
        'Custom Vulnerability Heuristics',
        'SAML SSO & Role Based Access',
        '99.99% SLA & Dedicated Support',
        'Custom CI/CD Integration Webhooks'
      ]
    }
  ];

  const faqs = [
    {
      q: 'Do you train AI models on our scanned code?',
      a: 'No. Kairo enforces a strict zero retention policy. Your source code, API keys, and vulnerability findings are never stored or used to train public or private models.'
    },
    {
      q: 'Can I cancel my Pro subscription at any time?',
      a: 'Yes. You can cancel with a single click at any time from your account settings with zero cancellation fees.'
    },
    {
      q: 'Are the penetration tests safe for production?',
      a: 'Yes. Kairo enforces non-destructive vulnerability probing guardrails by default to prevent denial of service and data alteration.'
    },
    {
      q: 'Where is our scan history stored?',
      a: 'Scan sessions and audit records reside in your local SQLite database instance on your machine, giving you absolute ownership of all findings.'
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
              PRICING / TIERS
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F4F4F0] leading-tight mb-4">
              Transparent pricing for security teams of all sizes.
            </h1>
            <p className="text-base sm:text-lg text-[#A3A3A0] leading-relaxed mb-8">
              Start with free passive scanning or unlock full autonomous penetration testing with Security Pro.
            </p>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 relative ${
                plan.highlight
                  ? 'bg-[#141414] border-2 border-[#F4F4F0] shadow-2xl scale-[1.02]'
                  : 'bg-[#0E0E0E] border border-[#2A2A28] hover:border-[#3A3A38]'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-[#F4F4F0] text-[#090909] font-mono font-bold text-[10px] tracking-wider uppercase">
                  POPULAR
                </span>
              )}

              <div>
                <div className="font-mono text-xs text-[#686865] uppercase mb-1">{plan.name}</div>
                <div className="flex items-baseline gap-1 my-3">
                  <span className="text-4xl font-bold font-mono text-[#F4F4F0]">{plan.price}</span>
                  <span className="text-xs text-[#686865]">/ {plan.period}</span>
                </div>
                <p className="text-xs text-[#A3A3A0] leading-relaxed mb-6 min-h-[36px]">
                  {plan.desc}
                </p>

                <div className="space-y-3 pt-6 border-t border-[#1D1D1B] font-sans text-xs mb-8">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-[#F4F4F0]">
                      <Check className="w-4 h-4 text-[#B8FF3D] shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => router.push('/chat')}
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all active:scale-98 ${
                  plan.highlight
                    ? 'bg-[#F4F4F0] text-[#090909] hover:bg-white shadow-md'
                    : 'bg-[#161616] border border-[#2A2A28] text-[#F4F4F0] hover:bg-[#202020]'
                }`}
              >
                {plan.ctaText}
              </button>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div className="w-full max-w-3xl mx-auto mb-24">
          <div className="border-b border-[#2A2A28] pb-4 mb-8">
            <div className="font-mono text-xs text-[#686865] uppercase mb-1">QUESTIONS & ANSWERS</div>
            <h2 className="text-2xl font-bold text-[#F4F4F0]">Frequently asked questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-5 rounded-lg border border-[#2A2A28] bg-[#0E0E0E]">
                <h3 className="text-sm font-bold text-[#F4F4F0] mb-2">{faq.q}</h3>
                <p className="text-xs text-[#A3A3A0] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="w-full border border-[#2A2A28] bg-[#111111] rounded-xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F0] mb-3">
            Ready to deploy Kairo?
          </h2>
          <p className="text-sm text-[#A3A3A0] max-w-xl mx-auto mb-6">
            Get started right now in seconds with zero setup requirements.
          </p>
          <button
            onClick={() => router.push('/chat')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#F4F4F0] text-[#090909] font-bold text-sm hover:bg-white active:scale-95 transition-all shadow-md select-none"
          >
            <span>Launch Free Workstation</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

      </main>

      <Footer />
    </div>
  );
}
