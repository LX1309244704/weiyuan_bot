import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统 API
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readDirectory: (path: string) => ipcRenderer.invoke('read-directory', path),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  saveFile: (path: string, content: string) => ipcRenderer.invoke('save-file', path, content),
  createDirectory: (path: string) => ipcRenderer.invoke('create-directory', path),
  
  // Agent 配置 API
  writeAgentConfig: (agentDir: string, config: { name: string; description: string; model: string; skills: string[]; prompt: string; workspace: string; port: number }) =>
    ipcRenderer.invoke('write-agent-config', agentDir, config),
  listAgents: (agentsBaseDir: string) => ipcRenderer.invoke('list-agents', agentsBaseDir),

  // nanobot API
  nanobot: {
    // 拆解任务
    decomposeTask: (taskDescription: string, availableBots: Array<{ id: string; name: string; skills: string[] }>) =>
      ipcRenderer.invoke('nanobot-decompose-task', taskDescription, availableBots),

    // 生成子代理任务
    spawnSubagent: (task: { taskId: string; subTaskId: string; label: string; description: string; botId: string; botName: string; workspace: string }) =>
      ipcRenderer.invoke('nanobot-spawn-subagent', task),

    // 获取子代理任务状态
    getSubagentStatus: (taskId: string) =>
      ipcRenderer.invoke('nanobot-get-subagent-status', taskId),

    // 匹配 Bot 到任务
    matchBotToTask: (taskDescription: string, availableBots: Array<{ id: string; name: string; skills: string[] }>) =>
      ipcRenderer.invoke('nanobot-match-bot', taskDescription, availableBots),

    // 发送消息到 nanobot
    sendMessage: (channel: string, chatId: string, content: string, metadata?: Record<string, unknown>) =>
      ipcRenderer.invoke('nanobot-send-message', channel, chatId, content, metadata),
  },

  // 监听 nanobot 事件
  onNanobotMessage: (callback: (data: { type: string; content: string; taskId?: string }) => void) => {
    const handler = (_event: unknown, data: { type: string; content: string; taskId?: string }) => callback(data)
    ipcRenderer.on('nanobot-message', handler)
    return () => ipcRenderer.removeListener('nanobot-message', handler)
  },

  onNanobotTaskUpdate: (callback: (data: { taskId: string; status: string; result?: string; progress?: number }) => void) => {
    const handler = (_event: unknown, data: { taskId: string; status: string; result?: string; progress?: number }) => callback(data)
    ipcRenderer.on('nanobot-task-update', handler)
    return () => ipcRenderer.removeListener('nanobot-task-update', handler)
  },
})
