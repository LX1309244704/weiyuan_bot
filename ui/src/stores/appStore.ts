import { create } from 'zustand'
import {
  Project,
  Bot,
  Message,
  TaskResult,
  FileItem,
  Session,
  Task,
  SubTask,
  AgentGroup,
  ExecutionLog,
  NanobotSubagentTask,
} from '../types'

interface AppState {
  // ==================== 基础状态 ====================
  projects: Project[]
  currentProjectId: string | null
  bots: Bot[]
  currentBotId: string | null
  messages: Message[]
  taskResults: TaskResult[]
  files: FileItem[]
  currentFilePath: string | null
  fileContent: string | null
  isConnected: boolean
  availableSkills: { name: string; description: string }[]

  // QQ风格会话管理
  sessions: Session[]
  currentSessionId: string | null
  activeNavTab: 'message' | 'project' | 'contact' | 'setting'

  // ==================== 任务协同状态 ====================
  tasks: Task[]
  currentTaskId: string | null
  agentGroups: AgentGroup[]
  currentAgentGroupId: string | null
  executionLogs: ExecutionLog[]
  nanobotTasks: NanobotSubagentTask[] // nanobot子代理任务
  isTaskProcessing: boolean

  // ==================== 基础方法 ====================
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  removeProject: (id: string) => void
  setCurrentProjectId: (id: string | null) => void

  setBots: (bots: Bot[]) => void
  addBot: (bot: Bot) => void
  updateBot: (id: string, updates: Partial<Bot>) => void
  removeBot: (id: string) => void
  setCurrentBotId: (id: string | null) => void

  addMessage: (message: Message) => void
  clearMessages: () => void

  addTaskResult: (result: TaskResult) => void
  clearTaskResults: () => void

  setFiles: (files: FileItem[]) => void
  setCurrentFilePath: (path: string | null) => void
  setFileContent: (content: string | null) => void

  setIsConnected: (connected: boolean) => void
  setAvailableSkills: (skills: { name: string; description: string }[]) => void

  // 会话管理
  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  removeSession: (id: string) => void
  setCurrentSessionId: (id: string | null) => void
  updateSessionLastMessage: (sessionId: string, message: string, timestamp: string) => void

  setActiveNavTab: (tab: 'message' | 'project' | 'contact' | 'setting') => void

  // ==================== 任务协同方法 ====================
  // 任务管理
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  setCurrentTaskId: (id: string | null) => void

  // 子任务管理
  addSubTask: (taskId: string, subTask: SubTask) => void
  updateSubTask: (taskId: string, subTaskId: string, updates: Partial<SubTask>) => void
  completeSubTask: (taskId: string, subTaskId: string, result: string) => void
  failSubTask: (taskId: string, subTaskId: string, error: string) => void

  // Agent群聊管理
  setAgentGroups: (groups: AgentGroup[]) => void
  addAgentGroup: (group: AgentGroup) => void
  updateAgentGroup: (id: string, updates: Partial<AgentGroup>) => void
  removeAgentGroup: (id: string) => void
  setCurrentAgentGroupId: (id: string | null) => void
  addBotToGroup: (groupId: string, botId: string) => void
  removeBotFromGroup: (groupId: string, botId: string) => void

  // 执行日志
  addExecutionLog: (log: ExecutionLog) => void
  clearExecutionLogs: (taskId?: string) => void

  // nanobot子代理任务
  addNanobotTask: (task: NanobotSubagentTask) => void
  updateNanobotTask: (id: string, updates: Partial<NanobotSubagentTask>) => void
  completeNanobotTask: (id: string, result: string) => void
  failNanobotTask: (id: string, error: string) => void

  setIsTaskProcessing: (processing: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  // ==================== 基础状态 ====================
  projects: [],
  currentProjectId: null,
  bots: [],
  currentBotId: null,
  messages: [],
  taskResults: [],
  files: [],
  currentFilePath: null,
  fileContent: null,
  isConnected: false,
  availableSkills: [
    { name: '代码编写', description: '编写各类代码' },
    { name: '文件操作', description: '读取写入文件' },
    { name: '天气查询', description: '查询天气信息' },
    { name: '日程管理', description: '管理日程安排' },
    { name: '搜索工具', description: '网络搜索' },
    { name: '邮件处理', description: '发送接收邮件' },
  ],

  // QQ风格会话管理
  sessions: [],
  currentSessionId: null,
  activeNavTab: 'message',

  // ==================== 任务协同状态 ====================
  tasks: [],
  currentTaskId: null,
  agentGroups: [],
  currentAgentGroupId: null,
  executionLogs: [],
  nanobotTasks: [],
  isTaskProcessing: false,

  // ==================== 基础方法 ====================
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  removeProject: (id) => set((state) => ({
    projects: state.projects.filter(p => p.id !== id),
    currentProjectId: state.currentProjectId === id ? null : state.currentProjectId
  })),
  setCurrentProjectId: (id) => set({ currentProjectId: id, bots: [], currentBotId: null, messages: [], files: [] }),

  setBots: (bots) => set({ bots }),
  addBot: (bot) => set((state) => {
    const isFirstBot = !state.bots.some(b => b.projectId === bot.projectId)
    const newBots = [...state.bots, bot]
    
    // 如果是项目的第一个Bot，自动创建群聊会话
    if (isFirstBot && bot.projectId) {
      const project = state.projects.find(p => p.id === bot.projectId)
      const groupSession: Session = {
        id: `group-${bot.projectId}-${Date.now()}`,
        name: `${project?.name || '项目'}群聊`,
        type: 'group',
        botIds: [bot.id],
        projectId: bot.projectId,
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
      }
      
      // 添加系统消息提示群聊创建
      const systemMessage: Message = {
        id: Date.now().toString(),
        role: 'bot',
        content: `🎉 项目群聊已创建！${bot.name} 已加入群聊。继续添加更多数字员工来协作完成任务吧。`,
        timestamp: new Date().toISOString(),
        sessionId: groupSession.id,
        type: 'system',
      }
      
      return {
        bots: newBots,
        sessions: [groupSession, ...state.sessions],
        currentSessionId: groupSession.id,
        messages: [...state.messages, systemMessage],
      }
    }
    
    // 如果已有群聊，将新Bot加入群聊
    if (bot.projectId) {
      const existingGroupSession = state.sessions.find(
        s => s.projectId === bot.projectId && s.type === 'group'
      )
      
      if (existingGroupSession) {
        // 添加系统消息通知新成员加入
        const joinMessage: Message = {
          id: Date.now().toString(),
          role: 'bot',
          content: `👋 ${bot.name} 加入了群聊`,
          timestamp: new Date().toISOString(),
          sessionId: existingGroupSession.id,
          type: 'system',
        }
        
        return {
          bots: newBots,
          sessions: state.sessions.map(s =>
            s.id === existingGroupSession.id
              ? { ...s, botIds: [...s.botIds, bot.id] }
              : s
          ),
          messages: [...state.messages, joinMessage],
        }
      }
    }
    
    return { bots: newBots }
  }),
  updateBot: (id, updates) => set((state) => ({
    bots: state.bots.map(b => b.id === id ? { ...b, ...updates } : b)
  })),
  removeBot: (id) => set((state) => ({
    bots: state.bots.filter(b => b.id !== id),
    currentBotId: state.currentBotId === id ? null : state.currentBotId
  })),
  setCurrentBotId: (id) => set({ currentBotId: id }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
    sessions: message.sessionId
      ? state.sessions.map(s => s.id === message.sessionId
          ? { ...s, lastMessage: message.content, lastMessageTime: message.timestamp }
          : s)
      : state.sessions
  })),
  clearMessages: () => set({ messages: [] }),

  addTaskResult: (result) => set((state) => ({ taskResults: [...state.taskResults, result] })),
  clearTaskResults: () => set({ taskResults: [] }),

  setFiles: (files) => set({ files }),
  setCurrentFilePath: (path) => set({ currentFilePath: path }),
  setFileContent: (content) => set({ fileContent: content }),

  setIsConnected: (connected) => set({ isConnected: connected }),
  setAvailableSkills: (skills) => set({ availableSkills: skills }),

  // 会话管理
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((state) => ({
    sessions: [session, ...state.sessions],
    currentSessionId: session.id
  })),
  removeSession: (id) => set((state) => ({
    sessions: state.sessions.filter(s => s.id !== id),
    currentSessionId: state.currentSessionId === id ? null : state.currentSessionId
  })),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  updateSessionLastMessage: (sessionId, message, timestamp) => set((state) => ({
    sessions: state.sessions.map(s => s.id === sessionId
      ? { ...s, lastMessage: message, lastMessageTime: timestamp }
      : s)
  })),

  setActiveNavTab: (tab) => set({ activeNavTab: tab }),

  // ==================== 任务协同方法 ====================
  // 任务管理
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)
  })),
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter(t => t.id !== id),
    currentTaskId: state.currentTaskId === id ? null : state.currentTaskId
  })),
  setCurrentTaskId: (id) => set({ currentTaskId: id }),

  // 子任务管理
  addSubTask: (taskId, subTask) => set((state) => ({
    tasks: state.tasks.map(t =>
      t.id === taskId
        ? { ...t, subTasks: [...t.subTasks, subTask] }
        : t
    )
  })),
  updateSubTask: (taskId, subTaskId, updates) => set((state) => ({
    tasks: state.tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            subTasks: t.subTasks.map(st =>
              st.id === subTaskId ? { ...st, ...updates } : st
            )
          }
        : t
    )
  })),
  completeSubTask: (taskId, subTaskId, result) => set((state) => {
    const now = new Date().toISOString()
    const updatedTasks = state.tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            subTasks: t.subTasks.map(st =>
              st.id === subTaskId
                ? { ...st, status: 'completed' as const, result, completedAt: now }
                : st
            )
          }
        : t
    )

    // 检查是否所有子任务都完成
    const task = updatedTasks.find(t => t.id === taskId)
    if (task && task.subTasks.every(st => st.status === 'completed')) {
      return {
        tasks: updatedTasks.map(t =>
          t.id === taskId ? { ...t, status: 'completed' as const, updatedAt: now } : t
        )
      }
    }

    return { tasks: updatedTasks }
  }),
  failSubTask: (taskId, subTaskId, error) => set((state) => ({
    tasks: state.tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            status: 'failed',
            updatedAt: new Date().toISOString(),
            subTasks: t.subTasks.map(st =>
              st.id === subTaskId
                ? { ...st, status: 'failed' as const, result: error }
                : st
            )
          }
        : t
    )
  })),

  // Agent群聊管理
  setAgentGroups: (groups) => set({ agentGroups: groups }),
  addAgentGroup: (group) => set((state) => ({ agentGroups: [...state.agentGroups, group] })),
  updateAgentGroup: (id, updates) => set((state) => ({
    agentGroups: state.agentGroups.map(g => g.id === id ? { ...g, ...updates } : g)
  })),
  removeAgentGroup: (id) => set((state) => ({
    agentGroups: state.agentGroups.filter(g => g.id !== id),
    currentAgentGroupId: state.currentAgentGroupId === id ? null : state.currentAgentGroupId
  })),
  setCurrentAgentGroupId: (id) => set({ currentAgentGroupId: id }),
  addBotToGroup: (groupId, botId) => set((state) => ({
    agentGroups: state.agentGroups.map(g =>
      g.id === groupId && !g.botIds.includes(botId)
        ? { ...g, botIds: [...g.botIds, botId] }
        : g
    )
  })),
  removeBotFromGroup: (groupId, botId) => set((state) => ({
    agentGroups: state.agentGroups.map(g =>
      g.id === groupId
        ? { ...g, botIds: g.botIds.filter(id => id !== botId) }
        : g
    )
  })),

  // 执行日志
  addExecutionLog: (log) => set((state) => ({ executionLogs: [...state.executionLogs, log] })),
  clearExecutionLogs: (taskId) => set((state) => ({
    executionLogs: taskId
      ? state.executionLogs.filter(l => l.taskId !== taskId)
      : []
  })),

  // nanobot子代理任务
  addNanobotTask: (task) => set((state) => ({ nanobotTasks: [...state.nanobotTasks, task] })),
  updateNanobotTask: (id, updates) => set((state) => ({
    nanobotTasks: state.nanobotTasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  completeNanobotTask: (id, result) => set((state) => ({
    nanobotTasks: state.nanobotTasks.map(t =>
      t.id === id
        ? { ...t, status: 'completed' as const, result, completedAt: new Date().toISOString() }
        : t
    )
  })),
  failNanobotTask: (id, error) => set((state) => ({
    nanobotTasks: state.nanobotTasks.map(t =>
      t.id === id
        ? { ...t, status: 'failed' as const, result: error }
        : t
    )
  })),

  setIsTaskProcessing: (processing) => set({ isTaskProcessing: processing }),
}))
