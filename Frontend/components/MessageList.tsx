'use client';

import React, { useRef, useEffect } from 'react';
import { ChatMessage, ToolCall } from '@/types/chat';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';

interface MessageListProps {
  messages: ChatMessage[];
  onToolClick: (tool: ToolCall) => void;
  isStreaming?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onToolClick,
  isStreaming = false,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 space-y-6 max-w-4xl mx-auto w-full">
      {messages.map((message) => {
        if (message.role === 'user') {
          return <UserMessage key={message.id} message={message} />;
        }
        return (
          <AssistantMessage
            key={message.id}
            message={message}
            onToolClick={onToolClick}
          />
        );
      })}

      {/* Bottom spacer so input doesn't block text */}
      <div ref={bottomRef} className="h-6" />
    </div>
  );
};
