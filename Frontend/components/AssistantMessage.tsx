'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { ChatMessage, ToolCall } from '@/types/chat';
import { ReasoningBlock } from './ReasoningBlock';
import { ToolPill } from './ToolPill';

interface AssistantMessageProps {
  message: ChatMessage;
  onToolClick?: (tool: ToolCall) => void;
  onRegenerate?: () => void;
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  onToolClick,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full my-2 space-y-3 max-w-4xl animate-in fade-in duration-200">
      {/* Sequence of Assistant Steps (Reasoning & Tools) */}
      {message.steps && message.steps.length > 0 && (
        <div className="space-y-2.5">
          {message.steps.map((step) => {
            if (step.type === 'tool_group' && step.tools && step.tools.length > 0) {
              return (
                <div key={step.id} className="flex flex-col gap-1.5 my-2 pl-0">
                  {step.tools.map((tool) => (
                    <ToolPill
                      key={tool.id}
                      tool={tool}
                      onClick={onToolClick}
                    />
                  ))}
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* Main synthesized content with ReactMarkdown */}
      {message.content && (
        <div className="mt-3 pt-1 text-[#E0E0E0] text-[14.5px] leading-relaxed select-text font-sans">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-white mt-6 mb-3 pb-1 border-b border-[#2A2A2A]">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-white mt-5 mb-2.5 flex items-center gap-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-[15px] font-semibold text-[#F0F0F0] mt-4 mb-2">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="my-2.5 leading-relaxed text-[#D8D8D8]">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside my-2.5 space-y-1 text-[#D4D4D4] pl-2">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside my-2.5 space-y-1 text-[#D4D4D4] pl-2">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="my-0.5 leading-relaxed">
                  {children}
                </li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-3 border-l-2 border-[#555555] bg-[#1A1A1A] p-3 rounded-r-[8px] text-[#C0C0C0] text-[13.5px]">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="my-4 overflow-x-auto rounded-[12px] border border-[#2B2B2B] bg-[#161616]">
                  <table className="w-full border-collapse text-[13.5px]">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-[#1F1F1F] border-b border-[#303030] text-left text-xs font-semibold text-white">
                  {children}
                </thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-y divide-[#242424]">
                  {children}
                </tbody>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-[#1A1A1A]/80 transition-colors">
                  {children}
                </tr>
              ),
              th: ({ children }) => (
                <th className="px-3.5 py-2.5 text-left font-semibold text-xs text-white">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3.5 py-2.5 text-[#CCCCCC] text-[13px] align-top">
                  {children}
                </td>
              ),
              code: ({ className, children, ...props }) => {
                const isInline = !className && !String(children).includes('\n');
                if (isInline) {
                  return (
                    <code className="bg-[#242424] text-[#E8E8E8] font-mono text-[12.5px] px-1.5 py-0.5 rounded border border-[#333333]">
                      {children}
                    </code>
                  );
                }

                const langMatch = /language-(\w+)/.exec(className || '');
                const lang = langMatch ? langMatch[1] : 'code';
                const codeString = String(children).replace(/\n$/, '');

                return (
                  <div className="my-3 rounded-[12px] bg-[#0E0E0E] border border-[#282828] overflow-hidden text-sm">
                    <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#171717] border-b border-[#262626] text-xs text-[#888888] font-mono">
                      <span>{lang}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(codeString)}
                        className="hover:text-white transition-colors text-xs"
                        title="Copy code"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="p-3.5 font-mono text-[13px] text-[#E0E0E0] overflow-x-auto leading-relaxed">
                      <code>{codeString}</code>
                    </pre>
                  </div>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      )}

      {/* Action footer */}
      {message.content && (
        <div className="flex items-center gap-2 pt-2 text-[#757575] text-xs">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#202020] hover:text-white transition-colors"
            title="Copy answer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#202020] hover:text-white transition-colors"
              title="Regenerate response"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
