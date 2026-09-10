'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  Sparkles,
  Paperclip
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function BlogListingPage() {
  const posts = [
    {
      slug: 'browser-automation-visual-recon',
      badge: 'Core Engine Update',
      status: 'Feature Live',
      title: 'Autonomous Browser Exploration & Visual Security Reconnaissance in Kairo',
      excerpt: 'Kairo can now boot headless Chromium instances, inspect live single-page app DOM trees, extract interactive forms, audit anti-CSRF protections & cookie security flags, and capture real-time viewport screenshot proof of state with sub-3-second route-blocking execution.',
      date: 'September 10, 2026',
      readTime: '4 min read',
      author: 'Kairo Core Team',
    },
    {
      slug: 'file-attachments',
      badge: 'Product Update',
      status: 'Feature Live',
      title: 'Feature Released: Direct File & Artifact Attachments in Kairo Workstation',
      excerpt: 'Direct multi-file attachments are now live in Kairo. Upload source code, configuration files, and target scope lists (up to 3 files per prompt) directly into the autonomous ReAct agent loop for instant Static AST vulnerability auditing.',
      date: 'September 9, 2026',
      readTime: '2 min read',
      author: 'Kairo Core Team',
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#090909] text-[#F4F4F0] flex flex-col justify-between font-sans antialiased selection:bg-[#F4F4F0] selection:text-[#090909] relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none brutalist-grid opacity-25 z-0" />
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-start w-full relative z-10 px-4 sm:px-6 pt-16 sm:pt-20 pb-24 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="w-full mb-12 text-left">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F4F4F0] mb-3 font-sans">
              Kairo Blog
            </h1>
            <p className="text-sm sm:text-base text-[#A3A3A0] leading-relaxed max-w-2xl">
              Official release notes, feature updates, and engineering deep-dives from the Kairo development team.
            </p>
          </motion.div>
        </div>

        {/* Blog Post Stream */}
        <div className="w-full space-y-6">
          {posts.map((post) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="border border-[#222220] bg-[#0E0E0E] rounded-2xl p-6 sm:p-8 hover:border-[#383835] transition-all group shadow-xl"
            >
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <span className="px-2.5 py-0.5 rounded-full bg-[#181818] border border-[#282828] text-[#D0D0CC] font-mono text-[11px] font-medium">
                  {post.status}
                </span>
                <div className="flex items-center gap-2 text-xs text-[#70706C] font-mono sm:ml-auto">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {post.date}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {post.readTime}</span>
                </div>
              </div>

              <Link href={`/blog/${post.slug}`} className="block group">
                <h2 className="text-xl sm:text-2xl font-bold text-[#F4F4F0] mb-3 group-hover:text-white transition-colors leading-snug font-sans">
                  {post.title}
                </h2>
                <p className="text-sm text-[#A3A3A0] leading-relaxed mb-6 font-sans">
                  {post.excerpt}
                </p>
              </Link>

              <div className="flex items-center justify-between pt-4 border-t border-[#1C1C1A]">
                <div className="text-xs text-[#70706C] font-mono">
                  By <span className="text-[#F4F4F0] font-semibold">{post.author}</span>
                </div>
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#F4F4F0] hover:text-[#B8FF3D] transition-colors"
                >
                  <span>Read full post</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>

      </main>

      <Footer />
    </div>
  );
}
