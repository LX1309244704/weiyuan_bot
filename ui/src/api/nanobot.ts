/**
 * nanobot API 模块
 * 通过 Electron IPC 与 nanobot Python 后端通信
 */

import type {
  TaskDecomposition,
  BotSkillMatch,
} from '../types'

// Agent 配置接口
export interface AgentConfig {
  name: string
  description: string
  model: string
  skills: string[]
  prompt: string
  workspace: string
  port: number
}

export interface AgentInfo {
  name: string
  config: any
  prompt: string
  configPath: string
  promptPath: string
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI: {
      selectDirectory: () => Promise<string | null>
      readDirectory: (path: string) => Promise<Array<{ name: string; path: string; isDirectory: boolean; size: number; modified: string }>>
      readFile: (path: string) => Promise<string | null>
      saveFile: (path: string, content: string) => Promise<boolean>
      createDirectory: (path: string) => Promise<boolean>
      // Agent 配置 API
      writeAgentConfig: (agentDir: string, config: AgentConfig) => Promise<{ success: boolean; error?: string }>
      listAgents: (agentsBaseDir: string) => Promise<AgentInfo[]>
      // nanobot 相关 API
      nanobot: {
        decomposeTask: (taskDescription: string, availableBots: Array<{ id: string; name: string; skills: string[] }>) => Promise<TaskDecomposition>
        spawnSubagent: (task: { taskId: string; subTaskId: string; label: string; description: string; botId: string; botName: string; workspace: string }) => Promise<{ taskId: string; status: string }>
        getSubagentStatus: (taskId: string) => Promise<{ status: string; result?: string; error?: string }>
        matchBotToTask: (taskDescription: string, availableBots: Array<{ id: string; name: string; skills: string[] }>) => Promise<BotSkillMatch[]>
        sendMessage: (channel: string, chatId: string, content: string, metadata?: Record<string, unknown>) => Promise<void>
      }
    }
  }
}

/**
 * 拆解任务 - 调用 nanobot 的 AI 能力自动拆解任务
 */
export async function decomposeTask(
  taskDescription: string,
  availableBots: Array<{ id: string; name: string; skills: string[] }>
): Promise<TaskDecomposition> {
  if (!window.electronAPI?.nanobot) {
    // 模拟实现（开发环境）
    return mockDecomposeTask(taskDescription, availableBots)
  }
  return window.electronAPI.nanobot.decomposeTask(taskDescription, availableBots)
}

/**
 * 生成子代理任务 - 调用 nanobot SubagentManager.spawn
 */
export async function spawnSubagent(
  task: { taskId: string; subTaskId: string; label: string; description: string; botId: string; botName: string; workspace: string }
): Promise<{ taskId: string; status: string }> {
  if (!window.electronAPI?.nanobot) {
    return { taskId: `mock_${Date.now()}`, status: 'running' }
  }
  return window.electronAPI.nanobot.spawnSubagent(task)
}

/**
 * 获取子代理任务状态
 */
export async function getSubagentStatus(taskId: string): Promise<{ status: string; result?: string; error?: string }> {
  if (!window.electronAPI?.nanobot) {
    return { status: 'completed', result: '模拟任务结果' }
  }
  return window.electronAPI.nanobot.getSubagentStatus(taskId)
}

/**
 * 匹配 Bot 到任务
 */
export async function matchBotToTask(
  taskDescription: string,
  availableBots: Array<{ id: string; name: string; skills: string[] }>
): Promise<BotSkillMatch[]> {
  if (!window.electronAPI?.nanobot) {
    return mockMatchBot(taskDescription, availableBots)
  }
  return window.electronAPI.nanobot.matchBotToTask(taskDescription, availableBots)
}

/**
 * 发送消息到 nanobot
 */
export async function sendMessage(
  channel: string,
  chatId: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!window.electronAPI?.nanobot) {
    return
  }
  return window.electronAPI.nanobot.sendMessage(channel, chatId, content, metadata)
}

// ==================== 模拟实现 ====================

function mockDecomposeTask(
  taskDescription: string,
  _availableBots: Array<{ id: string; name: string; skills: string[] }>
): TaskDecomposition {
  const desc = taskDescription.toLowerCase()
  let subTasks = []

  if (desc.includes('调研') || desc.includes('研究') || desc.includes('报告')) {
    subTasks = [
      { title: '信息搜索', description: '搜索相关背景信息和数据', order: 1, dependencies: [] },
      { title: '数据整理', description: '整理收集到的信息', order: 2, dependencies: [1] },
      { title: '分析总结', description: '分析数据并撰写报告', order: 3, dependencies: [2] },
      { title: '审核校对', description: '审核报告内容', order: 4, dependencies: [3] },
    ]
  } else if (desc.includes('开发') || desc.includes('代码') || desc.includes('程序')) {
    subTasks = [
      { title: '需求分析', description: '分析功能需求', order: 1, dependencies: [] },
      { title: '架构设计', description: '设计系统架构', order: 2, dependencies: [1] },
      { title: '代码实现', description: '编写核心代码', order: 3, dependencies: [2] },
      { title: '测试验证', description: '编写测试用例并验证', order: 4, dependencies: [3] },
    ]
  } else {
    subTasks = [
      { title: '任务理解', description: '理解任务需求和目标', order: 1, dependencies: [] },
      { title: '方案设计', description: '制定执行方案', order: 2, dependencies: [1] },
      { title: '执行实施', description: '按方案执行任务', order: 3, dependencies: [2] },
      { title: '结果验证', description: '验证执行结果', order: 4, dependencies: [3] },
    ]
  }

  return {
    title: taskDescription.slice(0, 30) + (taskDescription.length > 30 ? '...' : ''),
    description: taskDescription,
    subTasks,
  }
}

function mockMatchBot(
  taskDescription: string,
  availableBots: Array<{ id: string; name: string; skills: string[] }>
): BotSkillMatch[] {
  const desc = taskDescription.toLowerCase()
  return availableBots.map(bot => {
    let score = 0.5
    let reason = '基础匹配'

    if (desc.includes('搜索') || desc.includes('调研')) {
      if (bot.skills.includes('搜索工具')) {
        score = 0.95
        reason = '擅长信息搜索和数据收集'
      }
    } else if (desc.includes('代码') || desc.includes('开发')) {
      if (bot.skills.includes('代码编写')) {
        score = 0.95
        reason = '擅长代码编写和程序开发'
      }
    } else if (desc.includes('文件') || desc.includes('文档')) {
      if (bot.skills.includes('文件操作')) {
        score = 0.9
        reason = '擅长文件处理和文档管理'
      }
    }

    return {
      botId: bot.id,
      botName: bot.name,
      skills: bot.skills,
      matchScore: score,
      reason,
    }
  }).sort((a, b) => b.matchScore - a.matchScore)
}
