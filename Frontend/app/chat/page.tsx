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
import { FolderOpen, MessageSquare, Globe, Code2, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

function ChatWorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskSession[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [userName, setUserName] = useState('Operator');
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialPromptHandled = useRef(false);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('kairo_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.name) {
          setUserName(parsed.name.split(' ')[0] || parsed.name);
        }
      }
    } catch {}
  }, []);

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
        const saved = localStorage.getItem('kairo_tasks') || localStorage.getItem('reindeer_tasks') || localStorage.getItem('hackerai_tasks');
        if (saved) setTasks(JSON.parse(saved));
        const savedProj = localStorage.getItem('kairo_projects') || localStorage.getItem('reindeer_projects') || localStorage.getItem('hackerai_projects');
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

  const handlePresetClick = (presetType: 'scan' | 'audit' | 'explain') => {
    let presetPrompt = '';
    if (presetType === 'scan') {
      presetPrompt = 'Scan a website for vulnerabilities and open ports';
    } else if (presetType === 'audit') {
      presetPrompt = 'Audit my codebase for OWASP Top 10 vulnerabilities and hardcoded secrets';
    } else if (presetType === 'explain') {
      presetPrompt = 'Explain a vulnerability and provide non-destructive proof of concept steps';
    }
    handleSendMessage(presetPrompt, {
      mode: 'Ask',
      target: 'Kairo Desktop',
      model: 'openai/gpt-4o',
    });
  };

  return (
    <main className="flex h-screen w-screen bg-[#090909] overflow-hidden text-[#F4F4F0] font-sans antialiased">
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
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#090909]">
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
          <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto pb-12 pt-4">
            {activeProject ? (
              // Active Project Workspace Dashboard
              <div className="w-full max-w-[760px] flex flex-col items-center animate-in fade-in duration-150 mb-6">
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
              // Default Clean Editorial Greeting matching screenshot with revealing animation
              <div className="flex flex-col items-center text-center mb-7 select-none">
                {/* Eyebrow badge with fade-in */}
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-3 text-[11px] font-mono tracking-widest text-[#757575] uppercase mb-6"
                >
                  <span className="w-6 h-[1px] bg-[#2A2A28]" />
                  <span>YOUR AI SECURITY ASSISTANT</span>
                  <span className="w-6 h-[1px] bg-[#2A2A28]" />
                </motion.div>

                {/* Staggered Mask Revealing Headline */}
                <motion.h1 
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.18,
                        delayChildren: 0.05,
                      },
                    },
                  }}
                  className="text-3xl sm:text-4xl md:text-[44px] font-bold text-[#F4F4F0] tracking-tight leading-[1.15] mb-3"
                >
                  <div className="overflow-hidden inline-block pb-1">
                    <motion.span
                      variants={{
                        hidden: { y: '100%', opacity: 0, filter: 'blur(10px)' },
                        visible: { 
                          y: 0, 
                          opacity: 1, 
                          filter: 'blur(0px)',
                          transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } 
                        },
                      }}
                      className="inline-block text-[#F4F4F0]"
                    >
                      What are we testing today,
                    </motion.span>
                  </div>
                  <br />
                  <div className="overflow-hidden inline-block pb-1">
                    <motion.span
                      variants={{
                        hidden: { y: '100%', opacity: 0, filter: 'blur(10px)' },
                        visible: { 
                          y: 0, 
                          opacity: 1, 
                          filter: 'blur(0px)',
                          transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } 
                        },
                      }}
                      className="inline-block text-[#888888]"
                    >
                      {userName}?
                    </motion.span>
                  </div>
                </motion.h1>

                {/* Subtitle */}
                <motion.p 
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  className="text-sm text-[#757575] max-w-lg"
                >
                  Ask, scan, analyze, or get help with anything security related.
                </motion.p>
              </div>
            )}

            {/* Prompt Input with Smooth Reveal */}
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[760px]"
            >
              <PromptInput
                onSendMessage={handleSendMessage}
                isLoading={isStreaming}
                onStop={handleStopStreaming}
                placeholder={activeProject ? `Ask, learn, brainstorm in ${activeProject.name}...` : "Ask, learn, brainstorm..."}
              />
            </motion.div>

            {/* 3 Action Suggestion Cards matching screenshot with Staggered Reveal */}
            {!activeProject && (
              <motion.div 
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-[760px] mt-6"
              >
                <button
                  type="button"
                  onClick={() => handlePresetClick('scan')}
                  className="p-4 sm:p-5 rounded-2xl border border-[#222222] bg-[#111111] hover:bg-[#161616] hover:border-[#383838] transition-all text-left group flex items-start justify-between cursor-pointer shadow-sm"
                >
                  <div className="space-y-1.5 pr-2">
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-[#A0A0A0] group-hover:text-white transition-colors" />
                      <span className="text-xs font-semibold text-[#F4F4F0] group-hover:text-white">Scan a website</span>
                    </div>
                    <p className="text-[11.5px] text-[#757575] leading-snug">
                      Check for vulnerabilities in a target.
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#555555] group-hover:text-white group-hover:translate-x-0.5 transition-all mt-0.5 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetClick('audit')}
                  className="p-4 sm:p-5 rounded-2xl border border-[#222222] bg-[#111111] hover:bg-[#161616] hover:border-[#383838] transition-all text-left group flex items-start justify-between cursor-pointer shadow-sm"
                >
                  <div className="space-y-1.5 pr-2">
                    <div className="flex items-center gap-2.5">
                      <Code2 className="w-4 h-4 text-[#A0A0A0] group-hover:text-white transition-colors" />
                      <span className="text-xs font-semibold text-[#F4F4F0] group-hover:text-white">Audit my code</span>
                    </div>
                    <p className="text-[11.5px] text-[#757575] leading-snug">
                      Find security issues in your code.
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#555555] group-hover:text-white group-hover:translate-x-0.5 transition-all mt-0.5 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetClick('explain')}
                  className="p-4 sm:p-5 rounded-2xl border border-[#222222] bg-[#111111] hover:bg-[#161616] hover:border-[#383838] transition-all text-left group flex items-start justify-between cursor-pointer shadow-sm"
                >
                  <div className="space-y-1.5 pr-2">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#A0A0A0] group-hover:text-white transition-colors" />
                      <span className="text-xs font-semibold text-[#F4F4F0] group-hover:text-white">Explain a vulnerability</span>
                    </div>
                    <p className="text-[11.5px] text-[#757575] leading-snug">
                      Get clear, simple explanations.
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#555555] group-hover:text-white group-hover:translate-x-0.5 transition-all mt-0.5 shrink-0" />
                </button>
              </motion.div>
            )}

            {/* Bottom Footer Accent */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.8 }}
              className="mt-14 flex items-center gap-3 text-[10px] font-mono tracking-widest text-[#555555] uppercase select-none"
            >
              <span className="w-8 h-[1px] bg-[#222222]" />
              <span>A SAFER INTERNET STARTS HERE.</span>
              <span className="w-8 h-[1px] bg-[#222222]" />
            </motion.div>
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
