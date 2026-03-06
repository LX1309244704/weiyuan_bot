/**
 * 任务处理器
 * 集成 nanobot 能力实现任务自动拆解、分配和执行
 */

import { useStore } from '../stores/appStore'
import {
  decomposeTask,
  spawnSubagent,
  getSubagentStatus,
  matchBotToTask,
  sendMessageToNanobot,
} from '../api/nanobot'
import type {
  Task,
  SubTask,
  Bot,
  TaskDecomposition,
  BotSkillMatch,
  Message,
} from '../types'

/**
 * 创建新任务
 * 流程：创建任务 -> 主Bot拆解 -> 分配给群Bot -> 执行
 */
export async function createTask(params: {
  title: string
  description: string
  projectId: string
  sessionId: string
  masterBotId: string
  participantBotIds: string[]
}): Promise<Task> {
  const store = useStore.getState()
  const now = new Date().toISOString()

  // 1. 创建任务
  const task: Task = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    projectId: params.projectId,
    sessionId: params.sessionId,
    title: params.title,
    description: params.description,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    createdBy: 'user',
    subTasks: [],
    deliverables: [],
    participants: params.participantBotIds,
    masterBotId: params.masterBotId,
  }

  store.addTask(task)

  // 2. 添加系统消息
  const message: Message = {
    id: `msg_${Date.now()}`,
    role: 'bot',
    content: `收到新任务：${params.title}\n正在分析并拆解为子任务...`,
    timestamp: now,
    sessionId: params.sessionId,
    botId: params.masterBotId,
    type: 'task',
  }
  store.addMessage(message)

  return task
}

/**
 * 拆解任务 - 调用 nanobot AI 能力
 */
export async function analyzeAndDecomposeTask(taskId: string): Promise<void> {
  const store = useStore.getState()
  const task = store.tasks.find(t => t.id === taskId)
  if (!task) return

  // 更新状态为分析中
  store.updateTask(taskId, { status: 'analyzing' })

  try {
    // 获取项目中的可用 Bots
    const availableBots = store.bots
      .filter(b => task.participants.includes(b.id) && b.enabled)
      .map(b => ({ id: b.id, name: b.name, skills: b.skills }))

    // 调用 nanobot 拆解任务
    const decomposition = await decomposeTask(task.description, availableBots)

    // 创建子任务
    const subTasks: SubTask[] = decomposition.subTasks.map((st, index) => ({
      id: `sub_${taskId}_${index}`,
      taskId: taskId,
      title: st.title,
      description: st.description,
      assignedBotId: null,
      status: 'pending',
      dependencies: st.dependencies.map(depIndex => `sub_${taskId}_${depIndex}`),
      order: st.order,
    }))

    // 更新任务
    store.updateTask(taskId, {
      status: 'assigning',
      subTasks,
    })

    // 添加系统消息
    store.addMessage({
      id: `msg_${Date.now()}`,
      role: 'bot',
      content: `任务已拆解为 ${subTasks.length} 个子任务：\n${subTasks.map((st, i) => `${i + 1}. ${st.title}`).join('\n')}`,
      timestamp: new Date().toISOString(),
      sessionId: task.sessionId,
      botId: task.masterBotId,
      type: 'system',
    })

    // 3. 自动分配子任务给合适的 Bot
    await assignSubTasks(taskId)

  } catch (error) {
    console.error('Task decomposition failed:', error)
    store.updateTask(taskId, { status: 'failed' })
    store.addMessage({
      id: `msg_${Date.now()}`,
      role: 'bot',
      content: `❌ 任务拆解失败：${error instanceof Error ? error.message : '未知错误'}`,
      timestamp: new Date().toISOString(),
      sessionId: task.sessionId,
      botId: task.masterBotId,
      type: 'system',
    })
  }
}

/**
 * 分配子任务给合适的 Bot
 */
async function assignSubTasks(taskId: string): Promise<void> {
  const store = useStore.getState()
  const task = store.tasks.find(t => t.id === taskId)
  if (!task) return

  const availableBots = store.bots.filter(b =>
    task.participants.includes(b.id) && b.enabled
  )

  // 为每个子任务找到最合适的 Bot
  for (const subTask of task.subTasks) {
    // 调用 nanobot 匹配 Bot
    const matches = await matchBotToTask(
      subTask.description,
      availableBots.map(b => ({ id: b.id, name: b.name, skills: b.skills }))
    )

    // 选择匹配度最高的 Bot
    const bestMatch = matches[0]
    if (bestMatch && bestMatch.matchScore > 0.7) {
      store.updateSubTask(taskId, subTask.id, {
        assignedBotId: bestMatch.botId,
        status: 'assigned',
      })

      // 添加执行日志
      store.addExecutionLog({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        taskId,
        subTaskId: subTask.id,
        botId: bestMatch.botId,
        type: 'info',
        content: `子任务「${subTask.title}」分配给 ${bestMatch.botName}（匹配度：${(bestMatch.matchScore * 100).toFixed(0)}%）`,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // 更新任务状态
  store.updateTask(taskId, { status: 'running' })

  // 添加系统消息
  const assignedCount = task.subTasks.filter(st => st.assignedBotId).length
  store.addMessage({
    id: `msg_${Date.now()}`,
    role: 'bot',
    content: `✅ 任务分配完成！\n${assignedCount}/${task.subTasks.length} 个子任务已分配给群成员\n开始协同执行...`,
    timestamp: new Date().toISOString(),
    sessionId: task.sessionId,
    botId: task.masterBotId,
    type: 'system',
  })

  // 4. 开始执行子任务
  await executeSubTasks(taskId)
}

/**
 * 执行子任务 - 调用 nanobot spawn
 */
async function executeSubTasks(taskId: string): Promise<void> {
  const store = useStore.getState()
  const task = store.tasks.find(t => t.id === taskId)
  if (!task) return

  const project = store.projects.find(p => p.id === task.projectId)
  const workspace = project?.workspace || ''

  // 按顺序执行子任务（考虑依赖关系）
  const pendingSubTasks = task.subTasks
    .filter(st => st.status === 'assigned')
    .sort((a, b) => a.order - b.order)

  for (const subTask of pendingSubTasks) {
    // 检查依赖是否完成
    const dependenciesCompleted = subTask.dependencies.every(depId => {
      const dep = task.subTasks.find(st => st.id === depId)
      return dep?.status === 'completed'
    })

    if (!dependenciesCompleted) {
      continue // 等待依赖完成
    }

    const bot = store.bots.find(b => b.id === subTask.assignedBotId)
    if (!bot) continue

    // 更新状态为执行中
    store.updateSubTask(taskId, subTask.id, {
      status: 'running',
      startedAt: new Date().toISOString(),
    })

    // 添加执行日志
    store.addExecutionLog({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      taskId,
      subTaskId: subTask.id,
      botId: bot.id,
      type: 'progress',
      content: `${bot.name} 开始执行「${subTask.title}」`,
      timestamp: new Date().toISOString(),
    })

    // 调用 nanobot spawn 执行子任务
    try {
      const nanobotTask = await spawnSubagent({
        taskId,
        subTaskId: subTask.id,
        label: subTask.title,
        description: subTask.description,
        botId: bot.id,
        botName: bot.name,
        workspace,
      })

      // 记录 nanobot 任务
      store.addNanobotTask({
        id: nanobotTask.taskId,
        taskId,
        subTaskId: subTask.id,
        label: subTask.title,
        description: subTask.description,
        botId: bot.id,
        botName: bot.name,
        workspace,
        status: 'running',
        startedAt: new Date().toISOString(),
      })

      // 开始轮询任务状态
      pollSubagentStatus(nanobotTask.taskId, taskId, subTask.id)

    } catch (error) {
      console.error('Failed to spawn subagent:', error)
      store.failSubTask(taskId, subTask.id, error instanceof Error ? error.message : '启动失败')
    }
  }
}

/**
 * 轮询子代理任务状态
 */
async function pollSubagentStatus(
  nanobotTaskId: string,
  taskId: string,
  subTaskId: string
): Promise<void> {
  const store = useStore.getState()
  const maxAttempts = 60 // 最多轮询60次（约2分钟）
  let attempts = 0

  const poll = async () => {
    if (attempts >= maxAttempts) {
      store.failSubTask(taskId, subTaskId, '执行超时')
      store.updateNanobotTask(nanobotTaskId, { status: 'failed' })
      return
    }

    attempts++

    try {
      const status = await getSubagentStatus(nanobotTaskId)

      if (status.status === 'completed') {
        // 子任务完成
        store.completeSubTask(taskId, subTaskId, status.result || '完成')
        store.updateNanobotTask(nanobotTaskId, {
          status: 'completed',
          result: status.result,
          completedAt: new Date().toISOString(),
        })

        // 添加执行日志
        store.addExecutionLog({
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          taskId,
          subTaskId,
          botId: store.tasks.find(t => t.id === taskId)?.subTasks.find(st => st.id === subTaskId)?.assignedBotId || '',
          type: 'result',
          content: `✅ 子任务完成：${status.result?.slice(0, 100)}...`,
          timestamp: new Date().toISOString(),
        })

        // 检查是否所有子任务完成
        checkTaskCompletion(taskId)

        // 继续执行依赖于此任务的子任务
        continueDependentTasks(taskId, subTaskId)

      } else if (status.status === 'failed') {
        store.failSubTask(taskId, subTaskId, status.error || '执行失败')
        store.updateNanobotTask(nanobotTaskId, { status: 'failed' })

      } else {
        // 仍在执行中，继续轮询
        setTimeout(poll, 2000)
      }

    } catch (error) {
      console.error('Failed to get subagent status:', error)
      setTimeout(poll, 5000) // 出错时延长轮询间隔
    }
  }

  poll()
}

/**
 * 继续执行依赖于此子任务的其他子任务
 */
async function continueDependentTasks(taskId: string, completedSubTaskId: string): Promise<void> {
  const store = useStore.getState()
  const task = store.tasks.find(t => t.id === taskId)
  if (!task) return

  // 找到依赖于此子任务的其他子任务
  const dependentSubTasks = task.subTasks.filter(st =>
    st.dependencies.includes(completedSubTaskId) && st.status === 'assigned'
  )

  if (dependentSubTasks.length > 0) {
    // 重新触发执行流程
    await executeSubTasks(taskId)
  }
}

/**
 * 检查任务是否全部完成
 */
function checkTaskCompletion(taskId: string): void {
  const store = useStore.getState()
  const task = store.tasks.find(t => t.id === taskId)
  if (!task) return

  const allCompleted = task.subTasks.every(st => st.status === 'completed')
  const anyFailed = task.subTasks.some(st => st.status === 'failed')

  if (allCompleted) {
    store.updateTask(taskId, { status: 'completed' })

    // 添加完成消息
    store.addMessage({
      id: `msg_${Date.now()}`,
      role: 'bot',
      content: `🎉 任务「${task.title}」已全部完成！\n所有 ${task.subTasks.length} 个子任务都已成功执行。`,
      timestamp: new Date().toISOString(),
      sessionId: task.sessionId,
      botId: task.masterBotId,
      type: 'system',
    })

  } else if (anyFailed) {
    store.updateTask(taskId, { status: 'failed' })

    store.addMessage({
      id: `msg_${Date.now()}`,
      role: 'bot',
      content: `⚠️ 任务「${task.title}」执行失败。\n部分子任务未能完成，请检查日志。`,
      timestamp: new Date().toISOString(),
      sessionId: task.sessionId,
      botId: task.masterBotId,
      type: 'system',
    })
  }
}

/**
 * 快速执行任务（简化流程）
 */
export async function quickExecuteTask(
  taskDescription: string,
  sessionId: string,
  projectId: string,
  masterBotId: string,
  participantIds: string[]
): Promise<void> {
  const store = useStore.getState()

  // 设置处理中状态
  store.setIsTaskProcessing(true)

  try {
    // 1. 创建任务
    const task = await createTask({
      title: taskDescription.slice(0, 50) + (taskDescription.length > 50 ? '...' : ''),
      description: taskDescription,
      projectId,
      sessionId,
      masterBotId,
      participantBotIds: participantIds,
    })

    // 2. 自动拆解和执行
    await analyzeAndDecomposeTask(task.id)

  } finally {
    store.setIsTaskProcessing(false)
  }
}

/**
 * 监听 nanobot 消息（在应用启动时调用）
 */
export function setupNanobotListeners(): () => void {
  const store = useStore.getState()

  // 监听 nanobot 消息
  const unsubscribeMessage = window.electronAPI?.onNanobotMessage?.((data) => {
    console.log('[nanobot] Message received:', data)

    // 可以在这里处理 nanobot 的实时消息
    if (data.type === 'subagent-complete' && data.taskId) {
      // 子代理完成通知
      const nanobotTask = store.nanobotTasks.find(t => t.id === data.taskId)
      if (nanobotTask) {
        store.completeSubTask(nanobotTask.taskId, nanobotTask.subTaskId, data.content)
      }
    }
  }) || (() => {})

  // 监听任务更新
  const unsubscribeTask = window.electronAPI?.onNanobotTaskUpdate?.((data) => {
    console.log('[nanobot] Task update:', data)

    // 更新 nanobot 任务状态
    const nanobotTask = store.nanobotTasks.find(t => t.id === data.taskId)
    if (nanobotTask) {
      store.updateNanobotTask(data.taskId, {
        status: data.status as 'running' | 'completed' | 'failed',
        result: data.result,
      })

      // 如果是完成状态，更新子任务
      if (data.status === 'completed') {
        store.completeSubTask(nanobotTask.taskId, nanobotTask.subTaskId, data.result || '')
        checkTaskCompletion(nanobotTask.taskId)
      }
    }
  }) || (() => {})

  // 返回取消订阅函数
  return () => {
    unsubscribeMessage()
    unsubscribeTask()
  }
}
