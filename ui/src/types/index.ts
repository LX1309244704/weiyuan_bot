// ==================== 基础类型 ====================

export interface Project {
  id: string
  name: string
  workspace: string
  createdAt: string
}

export interface Bot {
  id: string
  projectId: string
  name: string
  skills: string[]
  enabled: boolean
  description?: string
  avatar?: string
  role?: 'master' | 'worker' | 'assistant' // Bot角色：主Bot、工作Bot、助手
}

export interface Message {
  id: string
  role: 'user' | 'bot'
  content: string
  timestamp: string
  sessionId?: string
  botId?: string // 发送消息的Bot
  type?: 'text' | 'task' | 'system' // 消息类型
  mentions?: string[] // @提及的Bot ID列表
}

export interface TaskResult {
  id: string
  type: 'html' | 'markdown' | 'image' | 'text'
  content: string
  timestamp: string
  taskName?: string
  status?: 'pending' | 'success' | 'error'
}

export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
}

// QQ风格会话类型
export interface Session {
  id: string
  name: string
  type: 'single' | 'group' | 'project'
  avatar?: string
  botIds: string[]
  projectId?: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount?: number
}

// ==================== 任务协同类型 ====================

/** 子任务状态 */
export type SubTaskStatus = 'pending' | 'assigned' | 'running' | 'completed' | 'failed'

/** 子任务 */
export interface SubTask {
  id: string
  taskId: string // 所属主任务ID
  title: string
  description: string
  assignedBotId: string | null // 分配的Bot
  status: SubTaskStatus
  result?: string // 执行结果
  startedAt?: string
  completedAt?: string
  dependencies: string[] // 依赖的其他子任务ID
  order: number // 执行顺序
}

/** 主任务状态 */
export type TaskStatus = 'draft' | 'pending' | 'analyzing' | 'assigning' | 'running' | 'completed' | 'failed'

/** 主任务 */
export interface Task {
  id: string
  projectId: string
  sessionId: string
  title: string
  description: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
  createdBy: 'user' | 'bot'
  subTasks: SubTask[]
  deliverables: Deliverable[] // 交付物
  participants: string[] // 参与的Bot ID列表
  masterBotId: string // 主负责Bot
}

/** 交付物 */
export interface Deliverable {
  id: string
  taskId: string
  name: string
  type: 'file' | 'document' | 'code' | 'data'
  content?: string
  filePath?: string
  createdAt: string
  createdBy: string // Bot ID
}

/** Agent群聊 */
export interface AgentGroup {
  id: string
  projectId: string
  sessionId: string
  name: string
  description?: string
  botIds: string[] // 群成员Bot ID
  masterBotId: string // 群主（主Bot）
  tasks: Task[]
  createdAt: string
}

/** 任务分配记录 */
export interface TaskAssignment {
  id: string
  taskId: string
  subTaskId: string
  botId: string
  assignedAt: string
  completedAt?: string
  status: SubTaskStatus
}

/** 执行日志 */
export interface ExecutionLog {
  id: string
  taskId: string
  subTaskId?: string
  botId: string
  type: 'info' | 'error' | 'progress' | 'result'
  content: string
  timestamp: string
}

/** nanobot 子代理任务 */
export interface NanobotSubagentTask {
  id: string
  taskId: string
  subTaskId: string
  label: string
  description: string
  botId: string
  botName: string
  workspace: string
  status: 'running' | 'completed' | 'failed'
  result?: string
  startedAt: string
  completedAt?: string
}

/** 任务拆解结果 */
export interface TaskDecomposition {
  title: string
  description: string
  subTasks: {
    title: string
    description: string
    order: number
    dependencies: number[] // 依赖的子任务索引
  }[]
}

/** Bot技能匹配 */
export interface BotSkillMatch {
  botId: string
  botName: string
  skills: string[]
  matchScore: number // 匹配分数 0-1
  reason: string // 匹配原因
}
