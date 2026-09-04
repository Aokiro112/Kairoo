'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ChatHeader } from '@/components/ChatHeader';
import { MessageList } from '@/components/MessageList';
import { PromptInput } from '@/components/PromptInput';
import { SearchModal } from '@/components/modals/SearchModal';
import { ShareModal } from '@/components/modals/ShareModal';
import { NewProjectModal } from '@/components/modals/NewProjectModal';
import { ToolDetailModal } from '@/components/modals/ToolDetailModal';
import { TaskSession, ChatMessage, ToolCall, Project, AssistantStep } from '@/types/chat';
import { FolderOpen, MessageSquare } from 'lucide-react';

function ChatWorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskSession[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialPromptHandled = useRef(false);

  // Load projects and tasks from DB via backend APIs
  const fetchInitialData = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/tasks'),
      ]);

      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
      }
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }
    } catch (e) {
      console.warn('API fetch fallback to localStorage', e);
      try {
        const saved = localStorage.getItem('hackerai_tasks');
        if (saved) setTasks(JSON.parse(saved));
        const savedProj = localStorage.getItem('hackerai_projects');
        if (savedProj) setProjects(JSON.parse(savedProj));
      } catch {}
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Handle auto-submit if navigated from Landing Page with ?prompt=...
  useEffect(() => {
    const queryPrompt = searchParams.get('prompt');
    if (queryPrompt && !initialPromptHandled.current) {
      initialPromptHandled.current = true;
      handleSendMessage(queryPrompt, {
        mode: 'deep',
        target: '',
        model: 'openai/gpt-oss-120b',
      });
      router.replace('/chat');
    }
  }, [searchParams]);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolCall | null>(null);

  // Active Task and Active Project
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;
  const activeProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) : null;
  const taskProject = activeTask?.projectId ? projects.find((p) => p.id === activeTask.projectId) : activeProject;

  const isNewSession = !activeTask || activeTask.messages.length === 0;
  const projectTasks = activeProject ? tasks.filter((t) => t.projectId === activeProject.id) : [];

  // Shortcut for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectTask = (id: string) => {
    setActiveTaskId(id);
    const selectedTask = tasks.find((t) => t.id === id);
    if (selectedTask?.projectId) {
      setActiveProjectId(selectedTask.projectId);
    }
  };

  const handleSelectProject = (id: string | null) => {
    setActiveProjectId(id);
    setActiveTaskId(null);
  };

  const handleNewTask = () => {
    setActiveTaskId(null);
    setActiveProjectId(null);
  };

  const handleNewTaskInProject = (projId: string) => {
    setActiveProjectId(projId);
    setActiveTaskId(null);
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (activeTaskId === id) {
      setActiveTaskId(null);
    }
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete task', e);
    }
  };

  const handleClearAllTasks = async () => {
    setTasks((prev) => prev.filter((t) => t.projectId));
    if (activeTask && !activeTask.projectId) {
      setActiveTaskId(null);
    }
    try {
      await fetch('/api/tasks', { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to clear tasks', e);
    }
  };

  const handleDeleteProject = async (projId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projId));
    setTasks((prev) => prev.map((t) => (t.projectId === projId ? { ...t, projectId: undefined } : t)));
    if (activeProjectId === projId) {
      setActiveProjectId(null);
    }
    try {
      await fetch(`/api/projects/${projId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete project', e);
    }
  };

  const handleCreateProject = async (projectData: Partial<Project>) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (res.ok) {
        const newProj = await res.json();
        setProjects((prev) => [newProj, ...prev]);
        setActiveProjectId(newProj.id);
        setActiveTaskId(null);
      }
    } catch (e) {
      console.error('Failed to create project', e);
    }
  };

  // Real-time Streaming Security Agent Handler
  const handleSendMessage = async (
    userText: string,
    options: { mode: string; target: string; model: string }
  ) => {
    const currentTaskId = activeTaskId || `task-${Date.now()}`;
    const userMsgId = `msg-user-${Date.now()}`;
    const assistantMsgId = `msg-ai-${Date.now()}`;

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      steps: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const firstLine = userText.split('\n')[0].replace(/^https?:\/\//, '').slice(0, 36);
    const sessionTitle = firstLine ? firstLine.charAt(0).toUpperCase() + firstLine.slice(1) : 'Security Audit';

    // Optimistically update state with User Message and Assistant placeholder
    if (!activeTaskId || !tasks.find((t) => t.id === activeTaskId)) {
      const newSession: TaskSession = {
        id: currentTaskId,
        title: sessionTitle,
        projectId: activeProjectId || undefined,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: [userMsg, initialAssistantMsg],
      };
      setTasks((prev) => [newSession, ...prev]);
      setActiveTaskId(currentTaskId);
    } else {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeTaskId
            ? {
                ...t,
                messages: [...t.messages, userMsg, initialAssistantMsg],
              }
            : t
        )
      );
    }

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: currentTaskId,
          projectId: activeProjectId,
          userMessageText: userText,
          model: options.model || 'openai/gpt-oss-120b',
          messages: [
            ...(activeTask?.messages || []).map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userText },
          ],
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to start chat stream');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'reasoning') {
                const step: AssistantStep = event.data;
                setTasks((prev) =>
                  prev.map((t) => {
                    if (t.id !== currentTaskId) return t;
                    const msgs = [...t.messages];
                    const last = { ...msgs[msgs.length - 1] };
                    if (last.role === 'assistant') {
                      last.steps = [...(last.steps || []), step];
                      msgs[msgs.length - 1] = last;
                    }
                    return { ...t, messages: msgs };
                  })
                );
              } else if (event.type === 'tool_group') {
                const step: AssistantStep = event.data;
                setTasks((prev) =>
                  prev.map((t) => {
                    if (t.id !== currentTaskId) return t;
                    const msgs = [...t.messages];
                    const last = { ...msgs[msgs.length - 1] };
                    if (last.role === 'assistant') {
                      last.steps = [...(last.steps || []), step];
                      msgs[msgs.length - 1] = last;
                    }
                    return { ...t, messages: msgs };
                  })
                );
              } else if (event.type === 'content_chunk') {
                setTasks((prev) =>
                  prev.map((t) => {
                    if (t.id !== currentTaskId) return t;
                    const msgs = [...t.messages];
                    const last = { ...msgs[msgs.length - 1] };
                    if (last.role === 'assistant') {
                      last.content = (last.content || '') + event.data;
                      msgs[msgs.length - 1] = last;
                    }
                    return { ...t, messages: msgs };
                  })
                );
              } else if (event.type === 'error') {
                setTasks((prev) =>
                  prev.map((t) => {
                    if (t.id !== currentTaskId) return t;
                    const msgs = [...t.messages];
                    const last = { ...msgs[msgs.length - 1] };
                    if (last.role === 'assistant') {
                      last.content = (last.content || '') + `\n\n> ⚠️ **Error**: ${event.data}`;
                      msgs[msgs.length - 1] = last;
                    }
                    return { ...t, messages: msgs };
                  })
                );
                setIsStreaming(false);
              } else if (event.type === 'done') {
                setIsStreaming(false);
              }
            } catch (err) {
              console.error('SSE JSON parse error', err);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Stream error', err);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  };

  return (
    <main className="flex h-screen w-screen bg-[#141414] overflow-hidden text-white font-sans antialiased">
      {/* Sidebar */}
      <Sidebar
        tasks={tasks}
        projects={projects}
        activeTaskId={activeTaskId}
        activeProjectId={activeProjectId}
        onSelectTask={handleSelectTask}
        onSelectProject={handleSelectProject}
        onNewTask={handleNewTask}
        onNewTaskInProject={handleNewTaskInProject}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        onDeleteTask={handleDeleteTask}
        onDeleteProject={handleDeleteProject}
        onClearAllTasks={handleClearAllTasks}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <ChatHeader
          title={activeTask?.title}
          projectName={taskProject?.name}
          isNewSession={isNewSession}
          onShare={() => setIsShareOpen(true)}
          isStreaming={isStreaming}
        />

        {/* Dynamic Center/Feed Content */}
        {isNewSession ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-10 overflow-y-auto">
            {activeProject ? (
              // Active Project Workspace Dashboard
              <div className="w-full max-w-[680px] flex flex-col items-center animate-in fade-in duration-150 mb-6">
                <div className="flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-[#1C1C1C] border border-[#2E2E2E] text-xs text-[#CCCCCC]">
                  <FolderOpen className="w-3.5 h-3.5 text-[#A0A0A0]" />
                  <span>Project Workspace</span>
                  <button
                    onClick={() => setActiveProjectId(null)}
                    className="ml-1 text-[#757575] hover:text-white transition-colors"
                    title="Exit project"
                  >
                    ×
                  </button>
                </div>

                <h1 className="text-2xl sm:text-[30px] font-semibold text-white tracking-tight text-center mb-1">
                  {activeProject.name}
                </h1>
                <p className="text-xs text-[#757575] mb-6">
                  {activeProject.description || `Group and track pentest tasks in ${activeProject.name}`}
                </p>

                {/* List of existing chats in this project if any */}
                {projectTasks.length > 0 && (
                  <div className="w-full mb-6 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#757575] px-1 font-medium">
                      <span>Chats in {activeProject.name}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                      {projectTasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleSelectTask(t.id)}
                          className="flex items-center gap-2 p-2.5 rounded-[12px] bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] text-left transition-all group"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#A0A0A0] shrink-0" />
                          <span className="text-xs text-[#E0E0E0] group-hover:text-white truncate font-medium">
                            {t.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Default Clean Greeting
              <h1 className="text-2xl sm:text-[30px] font-semibold text-white tracking-tight text-center mb-7 animate-in fade-in">
                What are we testing today, Mayank?
              </h1>
            )}

            {/* Prompt Input */}
            <div className="w-full max-w-[680px]">
              <PromptInput
                onSendMessage={handleSendMessage}
                isLoading={isStreaming}
                onStop={handleStopStreaming}
                placeholder={activeProject ? `Ask, learn, brainstorm in ${activeProject.name}` : "Ask, learn, brainstorm"}
              />
            </div>
          </div>
        ) : (
          // Active Chat Feed View
          <>
            <MessageList
              messages={activeTask?.messages || []}
              onToolClick={(tool) => setSelectedTool(tool)}
              isStreaming={isStreaming}
            />
            <div className="w-full">
              <PromptInput
                onSendMessage={handleSendMessage}
                isLoading={isStreaming}
                onStop={handleStopStreaming}
                placeholder={taskProject ? `Reply in ${taskProject.name}...` : "Ask, learn, brainstorm"}
              />
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        tasks={tasks}
        onSelectTask={handleSelectTask}
        onNewTask={handleNewTask}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        taskTitle={activeTask?.title || 'Security Session'}
        taskId={activeTaskId || 'new'}
      />

      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreateProject={handleCreateProject}
      />

      <ToolDetailModal
        tool={selectedTool}
        onClose={() => setSelectedTool(null)}
      />
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#141414]" />}>
      <ChatWorkspaceContent />
    </Suspense>
  );
}
