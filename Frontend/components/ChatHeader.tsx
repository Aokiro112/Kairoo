'use client';

import React from 'react';

interface ChatHeaderProps {
  title?: string;
  projectName?: string;
  isNewSession: boolean;
  onShare: () => void;
  isStreaming?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  isNewSession,
  onShare,
  isStreaming = false,
}) => {
  if (isNewSession) {
    return (
      <header className="h-14 px-6 flex items-center justify-between border-b border-transparent shrink-0" />
    );
  }

  return (
    <header className="h-14 px-6 flex items-center justify-between border-b border-transparent shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-white text-[15px] font-medium tracking-tight truncate">
          {title || 'Session'}
        </h1>
        {isStreaming && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active Recon
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onShare}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[13px] font-medium text-white hover:bg-[#1E1E1E] transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span>Share</span>
        </button>
      </div>
    </header>
  );
};
