'use client';

import React from 'react';
import { Search, ExternalLink, Terminal, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ToolCall } from '@/types/chat';

interface ToolPillProps {
  tool: ToolCall;
  onClick?: (tool: ToolCall) => void;
}

export const ToolPill: React.FC<ToolPillProps> = ({ tool, onClick }) => {
  const getIcon = () => {
    switch (tool.type) {
      case 'search':
        return <Search className="w-3.5 h-3.5 text-[#A0A0A0] shrink-0" />;
      case 'link':
        return <ExternalLink className="w-3.5 h-3.5 text-[#A0A0A0] shrink-0" />;
      case 'terminal':
        return <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'exploit':
      case 'scan':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      default:
        return <Search className="w-3.5 h-3.5 text-[#A0A0A0] shrink-0" />;
    }
  };

  return (
    <button
      onClick={() => onClick && onClick(tool)}
      className="group flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#1A1A1A] hover:bg-[#242424] border border-[#2E2E2E] hover:border-[#444444] text-left transition-all max-w-full text-[13px] text-[#A0A0A0] hover:text-white"
    >
      {getIcon()}
      <div className="flex items-center gap-1.5 truncate">
        {tool.label && (
          <span className="text-[#A0A0A0] group-hover:text-white shrink-0 font-normal">
            {tool.label}
          </span>
        )}
        {tool.query && (
          <span className="text-[#888888] font-mono text-[12px] truncate group-hover:text-[#B0B0B0]">
            {tool.query}
          </span>
        )}
        {tool.url && !tool.query && (
          <span className="text-[#888888] text-[12px] truncate group-hover:text-[#B0B0B0]">
            {tool.url}
          </span>
        )}
      </div>
    </button>
  );
};
