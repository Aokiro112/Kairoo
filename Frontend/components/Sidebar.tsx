'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SquarePen, 
  Plus, 
  Search, 
  PanelLeftClose, 
  PanelLeftOpen,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Trash2,
  UserCircle,
  Settings,
  Download,
  LifeBuoy,
  LogOut,
  MessageSquare
} from 'lucide-react';
import { TaskSession, Project } from '@/types/chat';
import { HackerAILogo } from '@/components/HackerAILogo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserSession, clearUserSession } from '@/lib/session';

interface SidebarProps {
  tasks: TaskSession[];
  projects?: Project[];
  activeTaskId: string | null;
  activeProjectId?: string | null;
  onSelectTask: (id: string) => void;
  onSelectProject: (id: string | null) => void;
  onNewTask: () => void;
  onNewTaskInProject?: (projectId: string) => void;
  onOpenSearch: () => void;
  onOpenNewProject: () => void;
  onOpenSettings?: () => void;
  onDeleteTask?: (id: string) => void;
  onClearAllTasks?: () => void;
  onDeleteProject?: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tasks,
  projects = [],
  activeTaskId,
  activeProjectId,
  onSelectTask,
  onSelectProject,
  onNewTask,
  onNewTaskInProject,
  onOpenSearch,
  onOpenNewProject,
  onOpenSettings,
  onDeleteTask,
  onClearAllTasks,
  onDeleteProject,
  isOpen,
  onToggleOpen,
}) => {
  const router = useRouter();
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Record<string, boolean>>({});
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    name: 'Security Operator',
    email: 'operator@kairo.bond',
    tier: 'Community'
  });
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = getUserSession();
    if (session) {
      setCurrentUser({
        name: session.name || 'Security Operator',
        email: session.email || 'operator@kairo.bond',
        tier: session.tier || 'Community'
      });
    }
  }, []);

  // Auto-expand active project
  useEffect(() => {
    if (activeProjectId) {
      setExpandedProjectIds((prev) => ({ ...prev, [activeProjectId]: true }));
    }
  }, [activeProjectId]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleProjectExpand = (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjectIds((prev) => ({
      ...prev,
      [projId]: !prev[projId],
    }));
  };

  const handleProjectClick = (projId: string) => {
    if (activeProjectId === projId) {
      onSelectProject(null);
    } else {
      onSelectProject(projId);
      setExpandedProjectIds((prev) => ({ ...prev, [projId]: true }));
    }
  };

  // Filter valid tasks and strictly deduplicate by id
  const taskMap = new Map<string, TaskSession>();
  for (const t of tasks) {
    if (t && t.id && Array.isArray(t.messages) && t.messages.length > 0) {
      taskMap.set(t.id, t);
    }
  }
  const validTasks = Array.from(taskMap.values());
  const standaloneTasks = validTasks.filter((t) => !t.projectId);

  return (
    <>
      {/* Collapsed Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-3 left-3 z-30"
          >
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: '#242424' }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleOpen}
              className="p-2 rounded-[10px] bg-[#1A1A1A] border border-[#333333] text-[#A0A0A0] hover:text-white shadow-lg transition-colors"
              title="Open sidebar"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Sidebar */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              damping: 24, 
              stiffness: 260,
              opacity: { duration: 0.2 }
            }}
            className="h-screen bg-[#0D0D0D] border-r border-[#1C1C1C] flex flex-col justify-between shrink-0 select-none z-20 text-sm overflow-hidden"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.2 }}
              className="w-[260px] flex flex-col overflow-hidden flex-1"
            >
              {/* Top bar icons */}
              <div className="h-12 px-3 flex items-center justify-between border-b border-transparent">
                <div className="flex items-center gap-2">
                  <Link 
                    href="/"
                    prefetch={true}
                    className="w-7 h-7 rounded-[8px] bg-[#161616] border border-[#282828] flex items-center justify-center cursor-pointer hover:border-[#3E3E3E] active:scale-95 transition-all p-1 block"
                    title="Kairo Home"
                  >
                    <HackerAILogo className="w-4 h-4 text-[#F4F4F0]" />
                  </Link>
                </div>
                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.08, backgroundColor: '#1E1E1E' }}
                    whileTap={{ scale: 0.92 }}
                    onClick={onOpenSearch}
                    className="p-1.5 rounded-md text-[#A0A0A0] hover:text-white transition-colors"
                    title="Search (Ctrl+K)"
                  >
                    <Search className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.08, backgroundColor: '#1E1E1E' }}
                    whileTap={{ scale: 0.92 }}
                    onClick={onToggleOpen}
                    className="p-1.5 rounded-md text-[#A0A0A0] hover:text-white transition-colors"
                    title="Close sidebar"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* New Task Button */}
              <div className="px-3 pt-2 pb-2">
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: '#1E1E1E' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onNewTask}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[10px] text-white transition-all text-[13.5px] font-medium group"
                >
                  <SquarePen className="w-4 h-4 text-white group-hover:rotate-6 transition-transform duration-200" />
                  <span>New task</span>
                </motion.button>
              </div>

              {/* Scrollable Middle Area for Projects & Tasks */}
              <div className="flex-1 overflow-y-auto px-3 space-y-4">
                {/* Projects Section */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[#757575] text-xs font-medium px-2 py-1">
                    <span>Projects</span>
                    <motion.button 
                      whileHover={{ scale: 1.15, color: '#FFFFFF', backgroundColor: '#222222' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onOpenNewProject} 
                      className="p-0.5 rounded transition-colors"
                      title="Create new project"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>

                  {/* List of Projects */}
                  <div className="space-y-1">
                    {projects.map((proj) => {
                      const isExpanded = !!expandedProjectIds[proj.id];
                      const isProjectActive = activeProjectId === proj.id;
                      const projectTasks = validTasks.filter((t) => t.projectId === proj.id);

                      return (
                        <div 
                          key={proj.id} 
                          className="rounded-[10px] overflow-hidden transition-colors"
                          onMouseEnter={() => setHoveredProjectId(proj.id)}
                          onMouseLeave={() => setHoveredProjectId(null)}
                        >
                          {/* Project Header Row */}
                          <div
                            onClick={() => handleProjectClick(proj.id)}
                            className={`group flex items-center justify-between px-2.5 py-1.5 rounded-[10px] cursor-pointer transition-all text-[13px] ${
                              isProjectActive
                                ? 'bg-[#222222] text-white font-medium border border-[#333333]'
                                : 'text-[#CCCCCC] hover:bg-[#1A1A1A] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                onClick={(e) => toggleProjectExpand(proj.id, e)}
                                className="p-0.5 text-[#757575] hover:text-white transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {isExpanded ? (
                                <FolderOpen className="w-3.5 h-3.5 text-[#E0E0E0] shrink-0" />
                              ) : (
                                <Folder className="w-3.5 h-3.5 text-[#A0A0A0] shrink-0" />
                              )}
                              <span className="truncate">{proj.name}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {hoveredProjectId === proj.id && (
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {onNewTaskInProject && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onNewTaskInProject(proj.id);
                                      }}
                                      className="p-1 rounded hover:bg-[#2E2E2E] text-[#757575] hover:text-white"
                                      title="New chat in this project"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  )}
                                  {onDeleteProject && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteProject(proj.id);
                                      }}
                                      className="p-1 rounded hover:bg-[#2E2E2E] text-[#757575] hover:text-rose-400"
                                      title="Delete project"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Nested Tasks inside this Project Folder */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }}
                                className="pl-4 pr-1 py-1 space-y-0.5 border-l border-[#282828] ml-4 my-0.5"
                              >
                                {projectTasks.length === 0 ? (
                                  <div 
                                    onClick={() => onNewTaskInProject ? onNewTaskInProject(proj.id) : onNewTask()}
                                    className="px-2 py-1.5 text-[11.5px] text-[#666666] hover:text-[#999999] cursor-pointer italic"
                                  >
                                    + Start chat in {proj.name}
                                  </div>
                                ) : (
                                  projectTasks.map((task) => {
                                    const isTaskActive = activeTaskId === task.id;
                                    return (
                                      <motion.div
                                        key={task.id}
                                        whileHover={{ x: 2 }}
                                        onClick={() => onSelectTask(task.id)}
                                        onMouseEnter={() => setHoveredTaskId(task.id)}
                                        onMouseLeave={() => setHoveredTaskId(null)}
                                        className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-[8px] cursor-pointer transition-all text-[12.5px] ${
                                          isTaskActive
                                            ? 'bg-[#262626] text-white font-medium'
                                            : 'text-[#9E9E9E] hover:bg-[#1C1C1C] hover:text-white'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <MessageSquare className="w-3 h-3 text-[#666666] shrink-0" />
                                          <span className="truncate">{task.title}</span>
                                        </div>

                                        {hoveredTaskId === task.id && onDeleteTask && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onDeleteTask(task.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#333333] text-[#757575] hover:text-rose-400"
                                            title="Delete task"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </motion.div>
                                    );
                                  })
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}

                    {/* New Project Button */}
                    <motion.button
                      whileHover={{ scale: 1.01, backgroundColor: '#1A1A1A' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onOpenNewProject}
                      className="w-full flex items-center gap-2 px-3 py-1.5 mt-0.5 rounded-[10px] text-[#A0A0A0] hover:text-white transition-all text-[13px]"
                    >
                      <FolderPlus className="w-4 h-4 text-[#757575]" />
                      <span>New project</span>
                    </motion.button>
                  </div>
                </div>

                {/* Standalone Tasks Section */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between px-2 pb-1">
                    <span className="text-[#757575] text-xs font-medium">Tasks</span>
                    {standaloneTasks.length > 0 && onClearAllTasks && (
                      <button
                        onClick={onClearAllTasks}
                        className="text-[11px] text-[#666666] hover:text-rose-400 transition-colors"
                        title="Clear all tasks"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {standaloneTasks.length === 0 ? (
                      <div className="px-2 py-1 text-xs text-[#555555] italic">
                        No standalone chats
                      </div>
                    ) : (
                      standaloneTasks.map((task) => {
                        const isActive = activeTaskId !== null && task.id === activeTaskId;
                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                            transition={{ duration: 0.15 }}
                            onMouseEnter={() => setHoveredTaskId(task.id)}
                            onMouseLeave={() => setHoveredTaskId(null)}
                            whileHover={{ x: 2 }}
                            className={`group relative flex items-center justify-between px-3 py-2 rounded-[10px] cursor-pointer transition-all ${
                              isActive
                                ? 'bg-[#222222] text-white font-medium shadow-sm'
                                : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-white'
                            }`}
                            onClick={() => onSelectTask(task.id)}
                          >
                            <span className="truncate text-[13px] pr-2">
                              {task.title}
                            </span>

                            <AnimatePresence>
                              {hoveredTaskId === task.id && onDeleteTask && (
                                <motion.button
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  whileHover={{ scale: 1.15, color: '#F87171' }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTask(task.id);
                                  }}
                                  className="p-1 rounded hover:bg-[#333333] text-[#757575] transition-all"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Bottom Section - User Profile Row & Popover */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.2 }}
              className="w-[260px] p-3 border-t border-[#222222] shrink-0 relative" 
              ref={profileMenuRef}
            >
              {/* User profile popup menu */}
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.94 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 350 }}
                    className="absolute bottom-[64px] left-3 right-3 bg-[#111111] border border-[#2E2E2E] rounded-[16px] shadow-2xl overflow-hidden z-50 text-[13px]"
                  >
                    {/* Header / Email */}
                    <div className="flex items-center gap-2.5 px-3.5 py-3 text-[#D8D8D8] border-b border-[#222222]">
                      <UserCircle className="w-4 h-4 text-[#A0A0A0] shrink-0" />
                      <span className="truncate text-[12.5px] font-medium">
                        {currentUser.email}
                      </span>
                    </div>

                    {/* Menu Items */}
                    <div className="p-1.5 space-y-0.5">
                      <motion.button
                        whileHover={{ x: 3, backgroundColor: '#1E1E1E' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          if (onOpenSettings) onOpenSettings();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-white transition-all text-left"
                      >
                        <Settings className="w-4 h-4 text-[#CCCCCC]" />
                        <span>Settings</span>
                      </motion.button>

                      <div className="my-1 border-t border-[#222222]" />

                      <motion.button
                        whileHover={{ x: 3, backgroundColor: '#1E1E1E' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          router.push('/docs');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-white transition-all text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <LifeBuoy className="w-4 h-4 text-[#CCCCCC]" />
                          <span>Docs & Help</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#757575]" />
                      </motion.button>

                      <motion.button
                        whileHover={{ x: 3, backgroundColor: '#1E1E1E', color: '#F87171' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          if (confirm('Are you sure you want to log out?')) {
                            clearUserSession();
                            window.location.href = '/login?logout=true';
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-white transition-all text-left"
                      >
                        <LogOut className="w-4 h-4 text-[#CCCCCC]" />
                        <span>Log out</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* User profile row */}
              <motion.div 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`flex items-center gap-3 px-2 py-2 rounded-[10px] transition-all cursor-pointer select-none ${
                  isProfileMenuOpen ? 'bg-[#1E1E1E] shadow-sm' : 'hover:bg-[#1A1A1A]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#242424] border border-[#333333] text-white flex items-center justify-center text-sm font-semibold shadow-inner uppercase">
                  {currentUser.name ? currentUser.name.charAt(0) : 'M'}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-white text-[13px] font-medium leading-tight truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[#757575] text-[11.5px]">
                    {currentUser.tier}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};
