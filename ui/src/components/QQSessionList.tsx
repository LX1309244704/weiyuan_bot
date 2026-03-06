import { useState, useEffect } from 'react'
import { Search, Plus, Bot, Folder, Trash2, MessageSquare, ChevronLeft, Users } from 'lucide-react'
import { useStore } from '../stores/appStore'
import { useNanobotStore } from '../stores/nanobotStore'
import { Session } from '../types'
import FileTree from './FileTree'

export default function QQSessionList() {
  const { 
    sessions, 
    currentSessionId, 
    setCurrentSessionId, 
    activeNavTab,
    setActiveNavTab,
    currentProjectId,
    setCurrentProjectId,
    bots: appBots,
    addBot,
    removeBot: removeBotFromApp
  } = useStore()
  
  const {
    projects,
    loadProjects,
    removeProject,
    bots: nanobotBots,
    projectBots
  } = useNanobotStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  
  // 加载项目列表
  useEffect(() => {
    loadProjects()
  }, [])

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  const truncateMessage = (msg?: string, length: number = 20) => {
    if (!msg) return '暂无消息'
    return msg.length > length ? msg.slice(0, length) + '...' : msg
  }

  const filteredSessions = sessions.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 设置面板
  if (activeNavTab === 'setting') {
    return <QQSettingPanel />
  }

  // 如果选中了项目，显示该项目的数字员工 + 文件树
  if (currentProjectId) {
    return <QQProjectDetail 
      projectId={currentProjectId} 
      onBack={() => setCurrentProjectId(null)}
    />
  }

  // 默认显示项目列表
  return (
    <div className="h-full flex flex-col bg-[#f5f5f5]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">项目</h2>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
              <Folder className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm">暂无项目</p>
            <p className="text-xs mt-1">点击左下角 + 创建项目</p>
          </div>
        ) : (
          <div className="py-2">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setCurrentProjectId(project.id)}
                className="mx-2 px-4 py-3 hover:bg-white cursor-pointer flex items-center gap-3 rounded-lg group transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Folder className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{project.name}</p>
                  <p className="text-xs text-gray-500 truncate">{project.workspace || '本地项目'}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('确定要删除这个项目吗？')) {
                      removeProject(project.id)
                    }
                  }}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 项目详情视图 - 上下布局：上半部分数字员工，下半部分文件树
function QQProjectDetail({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const { 
    projects, 
    bots: appBots, 
    setCurrentProjectId,
    setCurrentSessionId,
    addBot,
    addSession,
    sessions,
    currentSessionId
  } = useStore()
  
  const {
    bots: nanobotBots,
    projectBots: nanobotProjectBots,
    loadAllBots,
    assignBotToProject,
  } = useNanobotStore()
  
  const [showAddBot, setShowAddBot] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState('')
  const [activeTab, setActiveTab] = useState<'bots' | 'files'>('bots')

  // 加载所有 bots
  useEffect(() => {
    loadAllBots()
  }, [])

  const project = projects.find(p => p.id === projectId)
  
  // 使用 nanobotStore 的数据
  const nanobotProjectBotIds = nanobotProjectBots.get(projectId) || []
  const projectBots = nanobotProjectBotIds.map(id => nanobotBots.get(id)).filter(Boolean)
  
  // 获取可添加的 Bot：已启动且未添加到当前项目的
  const availableBots = Array.from(nanobotBots.values()).filter(
    bot => bot.is_active && !nanobotProjectBotIds.includes(bot.id)
  )
  
  // 查找该项目的群聊会话
  const groupSession = sessions.find(s => s.projectId === projectId && s.type === 'group')
  const isInGroupChat = currentSessionId === groupSession?.id

  const handleEnterGroupChat = () => {
    if (groupSession) {
      setCurrentSessionId(groupSession.id)
    }
  }

  const handleAddBot = () => {
    if (!selectedBotId) return
    
    // 将选中的数字员工添加到项目
    assignBotToProject(selectedBotId, projectId)
    
    // 如果没有群聊会话，自动创建一个
    if (!groupSession) {
      const newSession: Session = {
        id: `group-${projectId}-${Date.now()}`,
        projectId,
        name: '项目群聊',
        type: 'group',
        messages: [],
        createdAt: Date.now(),
      }
      addSession(newSession)
    }
    
    setSelectedBotId('')
    setShowAddBot(false)
  }

  return (
    <div className="h-full flex flex-col bg-[#f5f5f5]">
      {/* Header with back button */}
      <div className="p-4 border-b border-gray-200 flex items-center gap-3">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">{project?.name}</h2>
          <p className="text-xs text-gray-500">{projectBots.length} 个数字员工</p>
        </div>
        <button
          onClick={() => setShowAddBot(true)}
          className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
          title="添加数字员工"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Tab切换 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('bots')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'bots' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Bot className="w-4 h-4" />
            数字员工
            <span className="bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
              {projectBots.length}
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'files' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Folder className="w-4 h-4" />
            项目文件
          </div>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'bots' ? (
          <div className="h-full overflow-y-auto">
            {/* 群聊入口 */}
            {groupSession && (
              <div
                onClick={handleEnterGroupChat}
                className={`mx-2 mt-2 px-4 py-3 cursor-pointer flex items-center gap-3 rounded-lg transition-all ${
                  isInGroupChat 
                    ? 'bg-blue-100 border border-blue-300' 
                    : 'hover:bg-white bg-white/50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">项目群聊</p>
                  <p className="text-xs text-gray-500">
                    {projectBots.length} 人 · 点击进入群聊
                  </p>
                </div>
                {isInGroupChat && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>
            )}

            {/* Bot列表 */}
            {projectBots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                  <Bot className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm">暂无数字员工</p>
                <p className="text-xs mt-1">点击右上角 + 添加</p>
              </div>
            ) : (
              <div className="py-2">
                {projectBots.map((bot) => (
                  <div
                    key={bot.id}
                    className="mx-2 px-4 py-3 hover:bg-white cursor-pointer flex items-center gap-3 rounded-lg transition-all"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      bot.enabled ? 'bg-blue-500' : 'bg-gray-400'
                    }`}>
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{bot.name}</p>
                      <p className="text-xs text-gray-500">
                        {bot.skills.length > 0 ? `${bot.skills.length} 个技能` : '无技能'}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${bot.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <ProjectFileTree projectId={projectId} />
        )}
      </div>

      {/* Add Bot Modal - 下拉选择已启动的数字员工 */}
      {showAddBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddBot(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[400px] p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">添加数字员工</h3>
            
            {availableBots.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-2">暂无已启动的数字员工</p>
                <p className="text-sm text-gray-400">请先在"数字员工管理"中启动数字员工</p>
              </div>
            ) : (
              <>
                <select
                  value={selectedBotId}
                  onChange={(e) => setSelectedBotId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 mb-4"
                >
                  <option value="">选择已启动的数字员工</option>
                  {availableBots.map((bot) => (
                    <option key={bot.id} value={bot.id}>
                      {bot.name} ({bot.model.split('/').pop()})
                    </option>
                  ))}
                </select>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddBot(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddBot}
                    disabled={!selectedBotId}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    添加
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 项目文件树组件
function ProjectFileTree({ projectId }: { projectId: string }) {
  const { files, currentFilePath, setCurrentFilePath, setFileContent, projects } = useStore()

  const handleLoadChildren = async (dirPath: string) => {
    if (window.electronAPI) {
      return await window.electronAPI.readDirectory(dirPath)
    }
    return []
  }

  const handleSelectFile = async (path: string) => {
    setCurrentFilePath(path)
    if (window.electronAPI) {
      const content = await window.electronAPI.readFile(path)
      setFileContent(content)
    }
  }

  const project = projects.find(p => p.id === projectId)

  return (
    <div className="h-full overflow-y-auto">
      {project?.workspace && (
        <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200 truncate">
          {project.workspace}
        </div>
      )}
      <FileTree
        files={files}
        selectedPath={currentFilePath}
        onSelect={handleSelectFile}
        onLoadChildren={handleLoadChildren}
        emptyText="暂无文件，请选择工作目录"
      />
    </div>
  )
}

// 设置面板
function QQSettingPanel() {
  const { bots, projects, setActiveNavTab, setCurrentProjectId } = useStore()

  return (
    <div className="h-full flex flex-col bg-[#f5f5f5]">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">设置</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-xl">
            <p className="text-2xl font-bold text-blue-500">{bots.length}</p>
            <p className="text-sm text-gray-500">数字员工</p>
          </div>
          <div className="bg-white p-4 rounded-xl">
            <p className="text-2xl font-bold text-green-500">{projects.length}</p>
            <p className="text-sm text-gray-500">项目数量</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">快捷操作</h3>
          </div>
          <div className="divide-y divide-gray-100">
            <button 
              onClick={() => {
                setCurrentProjectId(null)
                setActiveNavTab('project')
              }}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <Folder className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-700">查看项目列表</span>
            </button>
          </div>
        </div>

        {/* Settings Options */}
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">通用设置</h3>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="p-4 flex items-center justify-between">
              <span className="text-sm text-gray-700">消息通知</span>
              <div className="w-11 h-6 bg-blue-500 rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-sm text-gray-700">声音提示</span>
              <div className="w-11 h-6 bg-gray-300 rounded-full relative">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-xl p-4">
          <h3 className="font-medium text-gray-900 mb-2">关于</h3>
          <p className="text-sm text-gray-500">微源 Bot v1.0.0</p>
          <p className="text-xs text-gray-400 mt-1">AI 驱动的多角色协作平台</p>
        </div>
      </div>
    </div>
  )
}
