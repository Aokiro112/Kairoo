'use client';

import React from 'react';
import { ChatMessage } from '@/types/chat';

interface UserMessageProps {
  message: ChatMessage;
}

export const UserMessage: React.FC<UserMessageProps> = ({ message }) => {
  return (
    <div className="flex justify-end w-full my-4">
      <div className="max-w-[85%] md:max-w-[70%] bg-[#1A1A1A] border border-[#2E2E2E] rounded-[18px] px-4 py-3 text-white text-[14px] leading-relaxed shadow-sm">
        <div className="whitespace-pre-wrap font-sans">
          {message.content}
        </div>
      </div>
    </div>
  );
};
