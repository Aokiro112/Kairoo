'use client';

import React from 'react';
import { X, Search, ExternalLink, Terminal, Globe, ShieldAlert, Cpu, Image as ImageIcon } from 'lucide-react';
import { ToolCall } from '@/types/chat';

interface ToolDetailModalProps {
  tool: ToolCall | null;
  onClose: () => void;
}

export const ToolDetailModal: React.FC<ToolDetailModalProps> = ({ tool, onClose }) => {
  if (!tool) return null;

  const getHeaderIcon = () => {
    switch (tool.type) {
      case 'browser':
        return <Globe className="w-4 h-4 text-cyan-400" />;
      case 'search':
        return <Search className="w-4 h-4 text-blue-400" />;
      case 'terminal':
        return <Terminal className="w-4 h-4 text-emerald-400" />;
      case 'exploit':
      case 'scan':
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      default:
        return <ExternalLink className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-[#181818] border border-[#2E2E2E] rounded-[20px] shadow-2xl p-6 relative max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#757575] hover:text-white hover:bg-[#282828] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#282828]">
          <div className="p-2.5 rounded-xl bg-[#222222] border border-[#333333] text-white shrink-0">
            {getHeaderIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-white truncate">
                {tool.label}
              </h3>
              {tool.resultDetails?.engine && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10.5px] text-emerald-400 font-mono">
                  <Cpu className="w-3 h-3" />
                  {tool.resultDetails.engine}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#757575] font-mono">
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${tool.status === 'completed' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'}`}>
                {tool.status.toUpperCase()}
              </span>
              {tool.resultDetails?.responseTime && (
                <span>• {tool.resultDetails.responseTime}</span>
              )}
              {tool.resultDetails?.statusCode && (
                <span>• HTTP {tool.resultDetails.statusCode}</span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
          {/* Live Page Screenshot preview if captured */}
          {tool.resultDetails?.screenshotDataUrl && (
            <div>
              <div className="flex items-center gap-1.5 text-[#9E9E9E] font-medium mb-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Browser Snapshot:</span>
              </div>
              <div className="rounded-[12px] border border-[#2E2E2E] overflow-hidden bg-[#111111] shadow-inner group relative">
                {/* Browser top bar mockup */}
                <div className="bg-[#202020] px-3 py-1.5 flex items-center gap-2 border-b border-[#2E2E2E]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                  </div>
                  <div className="flex-1 text-center font-mono text-[10px] text-[#888888] truncate px-4">
                    {tool.url || 'Headless Chromium Viewport'}
                  </div>
                </div>
                {/* Rendered screenshot */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tool.resultDetails.screenshotDataUrl}
                  alt="Rendered page snapshot"
                  className="w-full h-auto max-h-72 object-contain bg-black"
                />
              </div>
            </div>
          )}

          {tool.query && (
            <div>
              <div className="text-[#757575] font-medium mb-1">Search Query:</div>
              <div className="p-2.5 rounded-[8px] bg-[#121212] border border-[#262626] font-mono text-[#E0E0E0] break-all">
                {tool.query}
              </div>
            </div>
          )}

          {tool.url && (
            <div>
              <div className="text-[#757575] font-medium mb-1">Target Endpoint / URL:</div>
              <div className="p-2.5 rounded-[8px] bg-[#121212] border border-[#262626] font-mono text-cyan-300 break-all">
                {tool.url}
              </div>
            </div>
          )}

          {tool.resultDetails?.matchedResults && tool.resultDetails.matchedResults.length > 0 && (
            <div>
              <div className="text-[#757575] font-medium mb-1">Security Signals & DOM Findings:</div>
              <ul className="space-y-1.5 p-3 rounded-[10px] bg-[#121212] border border-[#262626]">
                {tool.resultDetails.matchedResults.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[#CCCCCC] leading-relaxed">
                    <span className="text-cyan-400 font-bold shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tool.resultDetails?.rawOutput && (
            <div>
              <div className="text-[#757575] font-medium mb-1">Raw Output Dump / DOM Extraction:</div>
              <pre className="p-3 rounded-[10px] bg-[#0D0D0D] border border-[#222222] font-mono text-[11px] text-[#A0A0A0] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 select-text">
                {tool.resultDetails.rawOutput}
              </pre>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 mt-3 border-t border-[#282828]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-[8px] bg-white text-black hover:bg-neutral-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
