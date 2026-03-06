import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { spawn } from 'child_process'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

// nanobot 进程管理
let nanobotProcess: ReturnType<typeof spawn> | null = null
const runningSubagents = new Map<string, { status: string; result?: string; error?: string }>()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
    frame: true,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // 启动 nanobot 服务（如果配置存在）
  startNanobotService()
})

app.on('window-all-closed', () => {
  // 停止 nanobot 进程
  if (nanobotProcess) {
    nanobotProcess.kill()
    nanobotProcess = null
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ==================== 文件系统 IPC ====================

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  return result.filePaths[0] || null
})

ipcMain.handle('read-directory', async (_event, dirPath: string) => {
  const fs = await import('fs/promises')
  const pathModule = await import('path')

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = pathModule.join(dirPath, entry.name)
        const stats = await fs.stat(fullPath)
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString(),
        }
      })
    )
    return files
  } catch (error) {
    console.error('Error reading directory:', error)
    return []
  }
})

ipcMain.handle('read-file', async (_event, filePath: string) => {
  const fs = await import('fs/promises')
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return content
  } catch (error) {
    console.error('Error reading file:', error)
    return null
  }
})

ipcMain.handle('save-file', async (_event, filePath: string, content: string) => {
  const fs = await import('fs/promises')
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  } catch (error) {
    console.error('Error saving file:', error)
    return false
  }
})

ipcMain.handle('create-directory', async (_event, dirPath: string) => {
  const fs = await import('fs/promises')
  try {
    await fs.mkdir(dirPath, { recursive: true })
    return true
  } catch (error) {
    console.error('Error creating directory:', error)
    return false
  }
})

ipcMain.handle('write-agent-config', async (_event, agentDir: string, config: { name: string; description: string; model: string; skills: string[]; prompt: string; workspace: string; port: number }) => {
  const fs = await import('fs/promises')
  const pathModule = await import('path')
  
  try {
    // 创建 agent 目录
    await fs.mkdir(agentDir, { recursive: true })
    
    // 生成 config.json
    const configJson = {
      agents: {
        defaults: {
          workspace: config.workspace,
          model: config.model,
          maxTokens: 8192,
          temperature: 0.7,
          maxToolIterations: 100
        }
      },
      channels: {
        feishu: {
          enabled: false
        }
      },
      providers: {
        deepseek: {
          apiKey: "",
          apiBase: null,
          extraHeaders: null
        }
      },
      gateway: {
        host: "0.0.0.0",
        port: config.port
      },
      tools: {
        web: {
          search: {
            apiKey: "",
            maxResults: 5
          }
        },
        exec: {
          timeout: 60
        },
        restrictToWorkspace: false
      }
    }
    
    // 创建 prompt 文件
    const promptPath = pathModule.join(agentDir, 'prompt.md')
    await fs.writeFile(promptPath, config.prompt, 'utf-8')
    
    // 创建 config.json
    const configPath = pathModule.join(agentDir, 'config.json')
    await fs.writeFile(configPath, JSON.stringify(configJson, null, 2), 'utf-8')
    
    // 创建启动脚本
    const startBat = `@echo off\ncd /d "%~dp0"\npython -m nanobot agent run --name ${config.name}\n`
    const startBatPath = pathModule.join(agentDir, 'start.bat')
    await fs.writeFile(startBatPath, startBat, 'utf-8')
    
    const startPs1 = `cd "$PSScriptRoot"\npython -m nanobot agent run --name ${config.name}\n`
    const startPs1Path = pathModule.join(agentDir, 'run.ps1')
    await fs.writeFile(startPs1Path, startPs1, 'utf-8')
    
    return { success: true, configPath, promptPath }
  } catch (error) {
    console.error('Error writing agent config:', error)
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('list-agents', async (_event, agentsBaseDir: string) => {
  const fs = await import('fs/promises')
  const pathModule = await import('path')
  
  try {
    const entries = await fs.readdir(agentsBaseDir, { withFileTypes: true })
    const agents = []
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const configPath = pathModule.join(agentsBaseDir, entry.name, 'config.json')
        const promptPath = pathModule.join(agentsBaseDir, entry.name, 'prompt.md')
        
        try {
          const configContent = await fs.readFile(configPath, 'utf-8')
          const config = JSON.parse(configContent)
          
          let prompt = ''
          try {
            prompt = await fs.readFile(promptPath, 'utf-8')
          } catch {}
          
          agents.push({
            name: entry.name,
            config,
            prompt,
            configPath,
            promptPath
          })
        } catch {}
      }
    }
    
    return agents
  } catch (error) {
    console.error('Error listing agents:', error)
    return []
  }
})

// ==================== nanobot IPC ====================

/**
 * 启动 nanobot 服务
 */
function startNanobotService() {
  // 检查 nanobot 是否可用
  const nanobotPath = path.join(process.cwd(), '..', 'nanobot')

  // 实际项目中这里应该启动 nanobot 的 Python 服务
  // 目前使用模拟实现
  console.log('[nanobot] Service initialized')
}

/**
 * 拆解任务 - 调用 LLM 自动拆解
 */
ipcMain.handle('nanobot-decompose-task', async (_event, taskDescription: string, availableBots: Array<{ id: string; name: string; skills: string[] }>) => {
  console.log('[nanobot] Decomposing task:', taskDescription)

  // 实际项目中应该调用 nanobot 的 Python API
  // 这里返回模拟数据
  await simulateDelay(1000)

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
})

/**
 * 生成子代理任务 - 模拟 nanobot SubagentManager.spawn
 */
ipcMain.handle('nanobot-spawn-subagent', async (_event, task: { taskId: string; subTaskId: string; label: string; description: string; botId: string; botName: string; workspace: string }) => {
  console.log('[nanobot] Spawning subagent:', task.label, 'for bot:', task.botName)

  const subagentId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // 记录子代理任务
  runningSubagents.set(subagentId, { status: 'running' })

  // 模拟异步执行
  simulateSubagentExecution(subagentId, task)

  return {
    taskId: subagentId,
    status: 'running',
  }
})

/**
 * 获取子代理任务状态
 */
ipcMain.handle('nanobot-get-subagent-status', async (_event, taskId: string) => {
  const task = runningSubagents.get(taskId)
  if (!task) {
    return { status: 'not_found', error: 'Task not found' }
  }
  return task
})

/**
 * 匹配 Bot 到任务
 */
ipcMain.handle('nanobot-match-bot', async (_event, taskDescription: string, availableBots: Array<{ id: string; name: string; skills: string[] }>) => {
  console.log('[nanobot] Matching bots for task:', taskDescription)

  await simulateDelay(500)

  const desc = taskDescription.toLowerCase()
  const matches = availableBots.map(bot => {
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
  })

  matches.sort((a, b) => b.matchScore - a.matchScore)
  return matches
})

/**
 * 发送消息到 nanobot
 */
ipcMain.handle('nanobot-send-message', async (_event, channel: string, chatId: string, content: string, metadata?: Record<string, unknown>) => {
  console.log('[nanobot] Sending message:', { channel, chatId, content, metadata })

  // 实际项目中应该通过 WebSocket 或其他方式发送给 nanobot
  // 这里只是模拟
  await simulateDelay(100)

  return { success: true }
})

// ==================== 辅助函数 ====================

function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 模拟子代理任务执行
 */
async function simulateSubagentExecution(subagentId: string, task: { label: string; description: string; botName: string }) {
  const steps = [
    { progress: 25, message: '正在分析任务...' },
    { progress: 50, message: '执行中...' },
    { progress: 75, message: '处理结果...' },
    { progress: 100, message: '完成' },
  ]

  for (const step of steps) {
    await simulateDelay(2000 + Math.random() * 3000)

    // 通知前端进度更新
    if (mainWindow) {
      mainWindow.webContents.send('nanobot-task-update', {
        taskId: subagentId,
        status: step.progress === 100 ? 'completed' : 'running',
        progress: step.progress,
      })
    }
  }

  // 标记任务完成
  const resultMessages = [
    `✅ ${task.botName} 已完成「${task.label}」`,
    `📊 生成了详细的分析报告`,
    `📝 执行过程中发现了 3 个关键点`,
    `💡 建议：可以进一步优化处理流程`,
  ]

  runningSubagents.set(subagentId, {
    status: 'completed',
    result: resultMessages.join('\n'),
  })

  // 通知前端任务完成
  if (mainWindow) {
    mainWindow.webContents.send('nanobot-task-update', {
      taskId: subagentId,
      status: 'completed',
      progress: 100,
      result: resultMessages.join('\n'),
    })

    // 发送消息通知
    mainWindow.webContents.send('nanobot-message', {
      type: 'subagent-complete',
      content: `子代理 ${task.botName} 完成了任务：${task.label}`,
      taskId: subagentId,
    })
  }
}
