'use client';

import React from 'react';
import { X, Search, ExternalLink, Terminal, CheckCircle, AlertTriangle } from 'lucide-react';
import { ToolCall } from '@/types/chat';

interface ToolDetailModalProps {
  tool: ToolCall | null;
  onClose: () => void;
}

export const ToolDetailModal: React.FC<ToolDetailModalProps> = ({ tool, onClose }) => {
  if (!tool) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-[#1A1A1A] border border-[#333333] rounded-[20px] shadow-2xl p-5 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-[#757575] hover:text-white hover:bg-[#282828] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-lg bg-[#242424] border border-[#333333] text-white">
            {tool.type === 'search' ? (
              <Search className="w-4 h-4 text-blue-400" />
            ) : (
              <ExternalLink className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {tool.label}
            </h3>
            <span className="text-[11px] text-[#757575] font-mono">
              Status: {tool.status.toUpperCase()} {tool.resultDetails?.responseTime && `(${tool.resultDetails.responseTime})`}
            </span>
          </div>
        </div>

        {/* Target details */}
        <div className="space-y-3 text-xs">
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
              <div className="text-[#757575] font-medium mb-1">Target Endpoint:</div>
              <div className="p-2.5 rounded-[8px] bg-[#121212] border border-[#262626] font-mono text-emerald-300 break-all">
                {tool.url}
              </div>
            </div>
          )}

          {tool.resultDetails?.matchedResults && tool.resultDetails.matchedResults.length > 0 && (
            <div>
              <div className="text-[#757575] font-medium mb-1">Matched Indicators & Signals:</div>
              <ul className="space-y-1.5 p-2.5 rounded-[8px] bg-[#121212] border border-[#262626]">
                {tool.resultDetails.matchedResults.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[#CCCCCC]">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tool.resultDetails?.rawOutput && (
            <div>
              <div className="text-[#757575] font-medium mb-1">Raw Output Dump:</div>
              <pre className="p-3 rounded-[8px] bg-[#0D0D0D] border border-[#222222] font-mono text-[11.5px] text-[#A0A0A0] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48">
                {tool.resultDetails.rawOutput}
              </pre>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t border-[#262626]">
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
