'use client';

import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Code2 } from 'lucide-react';
import { AttachedFile } from '@/types/chat';

interface FileViewerModalProps {
  file: AttachedFile | null;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const lines = file.content.split('\n');

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] bg-[#121212] border border-[#2B2B2B] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222] bg-[#161616]">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-8 h-8 rounded-lg bg-[#202020] border border-[#2F2F2F] flex items-center justify-center text-[#F4F4F0] shrink-0">
              <FileCode className="w-4 h-4 text-[#CCCCCC]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#F4F4F0] truncate font-mono">
                  {file.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#1F1F1F] border border-[#303030] text-[10px] font-mono font-medium text-[#A0A0A0] shrink-0 uppercase">
                  {file.language || 'text'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#70706C] font-mono mt-0.5">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{lines.length} {lines.length === 1 ? 'line' : 'lines'}</span>
                <span>•</span>
                <span>{file.content.length} chars</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#2A2A2A] border border-[#303030] text-xs font-mono text-[#D5D5D0] transition-colors"
              title="Copy code to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#888888]" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#757575] hover:text-white hover:bg-[#252525] transition-colors"
              title="Close viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code Content Container */}
        <div className="flex-1 overflow-auto bg-[#0A0A0A] p-4 text-xs font-mono leading-relaxed">
          <div className="table w-full">
            {lines.map((line, idx) => (
              <div key={idx} className="table-row hover:bg-[#151515] transition-colors group">
                <span className="table-cell text-right pr-4 text-[#4A4A48] select-none group-hover:text-[#70706C] w-10 shrink-0 font-mono text-[11px]">
                  {idx + 1}
                </span>
                <span className="table-cell text-[#D6D6D0] whitespace-pre break-all pl-2 font-mono">
                  {line || ' '}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#222222] bg-[#141414] flex items-center justify-between text-xs text-[#70706C]">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Code2 className="w-3.5 h-3.5 text-[#A0A0A0]" />
            <span>Artifact parsed for Kairo SAST Code Inspection Matrix</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#F4F4F0] text-[#090909] hover:bg-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
