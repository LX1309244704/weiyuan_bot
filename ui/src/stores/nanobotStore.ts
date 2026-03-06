/**
 * nanobot 集成 Store
 * 对接后端 API，管理项目和 Bot
 */

import { create } from 'zustand'
import {
  listProjects,
  createProject,
  deleteProject,
  listBots,
  listAllBots,
  createBot,
  deleteBot,
  startBot,
  stopBot,
  updateBot,
  updateBotSkills,
  getMessages,
  sendMessage,
  listSkills,
  createProjectWebSocket,
} from '../services/api'

export interface Project {
  id: string
  name: string
  description: string
  path: string
  bots: string[]
  created_at: string
}

export interface Bot {
  id: string
  name: string
  model: string
  provider: string
  description: string
  skills: string[]
  is_active: boolean
  created_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'bot' | 'system'
  content: string
  bot_id?: string
  mentions: string[]
  metadata: Record<string, any>
  created_at: string
}

export interface Skill {
  name: string
  description: string
  source: string
  available: boolean
}

interface NanobotState {
  // 状态
  projects: Project[]
  currentProjectId: string | null
  bots: Map<string, Bot>  // bot_id -> Bot
  projectBots: Map<string, string[]>  // project_id -> bot_ids
  messages: ChatMessage[]
  skills: Skill[]
  isLoading: boolean
  error: string | null
  wsConnection: WebSocket | null

  // 方法
  loadProjects: () => Promise<void>
  addProject: (name: string, description?: string) => Promise<void>
  removeProject: (id: string) => Promise<void>
  setCurrentProject: (id: string | null) => void

  loadBots: (projectId: string) => Promise<void>
  loadAllBots: () => Promise<void>
  addBot: (projectId: string, name: string, description?: string, model?: string) => Promise<void>
  removeBot: (botId: string) => Promise<void>
  toggleBot: (botId: string) => Promise<void>
  configureBot: (botId: string, config: Partial<Bot>) => Promise<void>
  setBotSkills: (botId: string, skills: string[]) => Promise<void>
  assignBotToProject: (botId: string, projectId: string) => void
  removeBotFromProject: (botId: string, projectId: string) => void

  loadMessages: (projectId: string) => Promise<void>
  sendChatMessage: (content: string, botId?: string) => Promise<void>

  loadSkills: () => Promise<void>

  connectWebSocket: (projectId: string) => void
  disconnectWebSocket: () => void
}

export const useNanobotStore = create<NanobotState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  bots: new Map(),
  projectBots: new Map(),
  messages: [],
  skills: [],
  isLoading: false,
  error: null,
  wsConnection: null,

  // ========== 项目管理 ==========
  loadProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const projects = await listProjects()
      set({ projects, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  addProject: async (name, description = '') => {
    set({ isLoading: true, error: null })
    try {
      const project = await createProject(name, description)
      set(state => ({
        projects: [...state.projects, project],
        isLoading: false,
      }))
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  removeProject: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await deleteProject(id)
      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        isLoading: false,
      }))
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  setCurrentProject: (id) => {
    set({ currentProjectId: id, messages: [] })
    if (id) {
      get().loadBots(id)
      get().loadMessages(id)
      get().connectWebSocket(id)
    } else {
      get().disconnectWebSocket()
    }
  },

  // ========== Bot 管理 ==========
  loadBots: async (projectId) => {
    try {
      const bots = await listBots(projectId)
      const botMap = new Map<string, Bot>()
      const botIds: string[] = []

      for (const bot of bots) {
        botMap.set(bot.id, bot)
        botIds.push(bot.id)
      }

      set(state => ({
        bots: new Map([...state.bots, ...botMap]),
        projectBots: new Map(state.projectBots).set(projectId, botIds),
      }))
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  loadAllBots: async () => {
    try {
      const bots = await listAllBots()
      const botMap = new Map<string, Bot>()
      for (const bot of bots) {
        botMap.set(bot.id, bot)
      }
      set(state => ({
        bots: new Map([...state.bots, ...botMap]),
      }))
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  addBot: async (projectId, name, description = '', model = 'anthropic/claude-3-5-sonnet') => {
    set({ isLoading: true, error: null })
    try {
      const bot = await createBot(projectId, name, description, model)

      set(state => {
        const newBots = new Map(state.bots)
        newBots.set(bot.id, bot)

        const newProjectBots = new Map(state.projectBots)
        const existing = newProjectBots.get(projectId) || []
        newProjectBots.set(projectId, [...existing, bot.id])

        return { bots: newBots, projectBots: newProjectBots, isLoading: false }
      })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  removeBot: async (botId) => {
    set({ isLoading: true, error: null })
    try {
      await deleteBot(botId)

      set(state => {
        const newBots = new Map(state.bots)
        newBots.delete(botId)

        // 从所有项目中移除
        const newProjectBots = new Map(state.projectBots)
        for (const [pid, bids] of newProjectBots) {
          newProjectBots.set(pid, bids.filter(id => id !== botId))
        }

        return { bots: newBots, projectBots: newProjectBots, isLoading: false }
      })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  toggleBot: async (botId) => {
    const bot = get().bots.get(botId)
    if (!bot) return

    try {
      if (bot.is_active) {
        await stopBot(botId)
      } else {
        await startBot(botId)
      }

      set(state => {
        const newBots = new Map(state.bots)
        newBots.set(botId, { ...bot, is_active: !bot.is_active })
        return { bots: newBots }
      })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  configureBot: async (botId, config) => {
    try {
      const updated = await updateBot(botId, config)
      set(state => {
        const newBots = new Map(state.bots)
        newBots.set(botId, updated)
        return { bots: newBots }
      })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  setBotSkills: async (botId, skills) => {
    try {
      const updated = await updateBotSkills(botId, skills)
      set(state => {
        const newBots = new Map(state.bots)
        newBots.set(botId, updated)
        return { bots: newBots }
      })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  assignBotToProject: (botId, projectId) => {
    set(state => {
      const newProjectBots = new Map(state.projectBots)
      const existing = newProjectBots.get(projectId) || []
      if (!existing.includes(botId)) {
        newProjectBots.set(projectId, [...existing, botId])
      }
      return { projectBots: newProjectBots }
    })
  },

  removeBotFromProject: (botId, projectId) => {
    set(state => {
      const newProjectBots = new Map(state.projectBots)
      const existing = newProjectBots.get(projectId) || []
      newProjectBots.set(projectId, existing.filter(id => id !== botId))
      return { projectBots: newProjectBots }
    })
  },

  // ========== 消息管理 ==========
  loadMessages: async (projectId) => {
    try {
      const messages = await getMessages(projectId)
      set({ messages })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  sendChatMessage: async (content, botId) => {
    const { currentProjectId } = get()
    if (!currentProjectId) return

    // 乐观更新 - 先显示用户消息
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      mentions: [],
      metadata: {},
      created_at: new Date().toISOString(),
    }

    set(state => ({ messages: [...state.messages, tempMsg] }))

    try {
      const response = await sendMessage(currentProjectId, content, botId)

      // 如果是群聊模式（没有指定 botId），响应格式不同
      if (response.data) {
        // 单聊模式
        set(state => ({
          messages: [...state.messages.filter(m => m.id !== tempMsg.id), response.data],
        }))
      } else {
        // 群聊模式 - 移除临时消息，等待 WebSocket 推送
        set(state => ({
          messages: state.messages.filter(m => m.id !== tempMsg.id),
        }))
      }
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  // ========== 技能管理 ==========
  loadSkills: async () => {
    try {
      const skills = await listSkills()
      set({ skills })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  // ========== WebSocket ==========
  connectWebSocket: (projectId) => {
    // 断开已有连接
    get().disconnectWebSocket()

    const ws = createProjectWebSocket(projectId)

    ws.onopen = () => {
      console.log('WebSocket connected:', projectId)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'history') {
        // 历史消息
        set({ messages: data.data })
      } else if (data.type === 'message') {
        // 新消息
        set(state => ({
          messages: [...state.messages, data.data],
        }))
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected:', projectId)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      set({ error: 'WebSocket connection error' })
    }

    set({ wsConnection: ws })
  },

  disconnectWebSocket: () => {
    const { wsConnection } = get()
    if (wsConnection) {
      wsConnection.close()
      set({ wsConnection: null })
    }
  },
}))
