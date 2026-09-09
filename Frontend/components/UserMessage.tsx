'use client';

import React from 'react';
import { ChatMessage, AttachedFile } from '@/types/chat';
import { FileCode, Eye } from 'lucide-react';

interface UserMessageProps {
  message: ChatMessage;
  onFileClick?: (file: AttachedFile) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const UserMessage: React.FC<UserMessageProps> = ({ message, onFileClick }) => {
  const attachments = message.attachments || [];

  return (
    <div className="flex justify-end w-full my-4">
      <div className="max-w-[85%] md:max-w-[75%] bg-[#1A1A1A] border border-[#2E2E2E] rounded-[18px] px-4 py-3 text-white text-[14px] leading-relaxed shadow-sm space-y-2.5">
        {/* Attachments list if present */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1 border-b border-[#292929]/80">
            {attachments.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => onFileClick && onFileClick(file)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] border border-[#333333] text-xs font-mono text-[#F4F4F0] transition-colors group text-left cursor-pointer"
                title="Click to view file content"
              >
                <FileCode className="w-3.5 h-3.5 text-[#A3A3A0] group-hover:text-white shrink-0 group-hover:scale-105 transition-all" />
                <span className="font-medium truncate max-w-[150px]">{file.name}</span>
                <span className="text-[10px] text-[#80807C] font-mono">{formatFileSize(file.size)}</span>
                <span className="px-1.5 py-0.2 rounded bg-[#161616] text-[9px] text-[#A0A0A0] uppercase">
                  {file.language}
                </span>
                <Eye className="w-3 h-3 text-[#70706C] group-hover:text-white transition-colors ml-0.5" />
              </button>
            ))}
          </div>
        )}

        {message.content && (
          <div className="whitespace-pre-wrap font-sans text-[14px]">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
};

