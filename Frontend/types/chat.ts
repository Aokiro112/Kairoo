export type ToolType = 'search' | 'link' | 'terminal' | 'scan' | 'exploit' | 'browser';

export interface ToolCall {
  id: string;
  type: ToolType;
  label: string;
  query?: string;
  url?: string;
  status: 'completed' | 'running' | 'failed';
  resultDetails?: {
    statusCode?: number;
    matchedResults?: string[];
    responseTime?: string;
    rawOutput?: string;
    screenshotDataUrl?: string;
    engine?: string;
  };
}

export type StepType = 'reasoning' | 'tool_group' | 'collapsed_reasoning' | 'finding_header';

export interface AssistantStep {
  id: string;
  type: StepType;
  text?: string;
  tools?: ToolCall[];
  duration?: string;
  isExpanded?: boolean;
}

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  language: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  urlPreview?: string;
  attachments?: AttachedFile[];
  steps?: AssistantStep[];
  timestamp: string;
}

export interface TaskSession {
  id: string;
  title: string;
  category?: string;
  projectId?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  targetDomain?: string;
  createdAt: string;
}
