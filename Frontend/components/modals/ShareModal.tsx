'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2, Download, Link2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  taskId: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  taskId,
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://kairo.bond/c/${taskId || '140b7335-3039-4014-ad6f-76c64c6e966b'}`;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[#1A1A1A] border border-[#333333] rounded-[20px] shadow-2xl p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-[#757575] hover:text-white hover:bg-[#282828] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <Share2 className="w-5 h-5 text-white" />
          <h3 className="text-base font-semibold text-white">Share Session</h3>
        </div>
        <p className="text-xs text-[#A0A0A0] mb-4">
          Anyone with this link will be able to view this security recon session and findings.
        </p>

        {/* URL Box */}
        <div className="flex items-center gap-2 p-2 rounded-[10px] bg-[#141414] border border-[#2E2E2E] mb-4">
          <Link2 className="w-4 h-4 text-[#757575] shrink-0" />
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="w-full bg-transparent text-xs text-[#CCCCCC] font-mono focus:outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-[8px] bg-white text-black hover:bg-neutral-200 text-xs font-medium shrink-0 transition-colors flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#262626]">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[8px] text-xs text-[#A0A0A0] hover:text-white hover:bg-[#242424] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
