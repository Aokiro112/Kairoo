'use client';

import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';

interface ReasoningBlockProps {
  text?: string;
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
  duration?: string;
}

export const ReasoningBlock: React.FC<ReasoningBlockProps> = ({
  text,
  isCollapsible = false,
  defaultExpanded = false,
  duration,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Helper to render bold markdown (**text**)
  const renderFormattedText = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="text-white font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (isCollapsible) {
    return (
      <div className="my-2 select-none">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-[#A0A0A0] hover:text-white transition-colors group"
        >
          <Brain className="w-4 h-4 text-[#A0A0A0] group-hover:text-white" />
          <span className="text-[13px] font-medium">Reasoning</span>
          <div className="w-5 h-5 rounded-full bg-[#1F1F1F] border border-[#2E2E2E] flex items-center justify-center text-[#757575] group-hover:text-white transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </div>
          {duration && (
            <span className="text-xs text-[#666666] font-mono">
              ({duration})
            </span>
          )}
        </button>

        {isExpanded && text && (
          <div className="mt-2.5 p-3 rounded-[10px] bg-[#171717] border border-[#262626] text-[#A0A0A0] text-[13.5px] leading-relaxed animate-in fade-in duration-200">
            {renderFormattedText(text)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 my-3">
      <div className="flex items-center gap-1.5 text-[#A0A0A0]">
        <Brain className="w-4 h-4 text-[#A0A0A0]" />
        <span className="text-[13px] font-medium">Reasoning</span>
      </div>
      {text && (
        <div className="text-[#E0E0E0] text-[14px] leading-relaxed pl-5.5">
          {renderFormattedText(text)}
        </div>
      )}
    </div>
  );
};
