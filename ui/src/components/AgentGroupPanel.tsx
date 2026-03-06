import { useState, useEffect } from 'react'
import { Users, CheckCircle2, Clock, FileText, Loader2, Check, X, FileOutput, Play, Settings } from 'lucide-react'
import { useStore } from '../stores/appStore'
import { useNanobotStore } from '../stores/nanobotStore'
import TaskCard from './TaskCard'
import AgentMemberList from './AgentMemberList'
import type { Task, Deliverable } from '../types'

interface AgentGroupPanelProps {
  sessionId: string
  projectId: string
}

export default function AgentGroupPanel({ sessionId, projectId }: AgentGroupPanelProps) {
  const {
    bots: appBots,
    tasks,
    sessions,
    currentSessionId,
    agentGroups,
    addAgentGroup,
    addBotToGroup,
    removeBotFromGroup,
  } = useStore()
  
  const {
    bots: nanobotBots,
    projectBots: nanobotProjectBots,
  } = useNanobotStore()

  const [activeTab, setActiveTab] = useState<'tasks' | 'members' | 'deliverables'>('tasks')
  const [showAddBotModal, setShowAddBotModal] = useState(false)

  // 获取或创建当前会话的 Agent Group
  const agentGroup = agentGroups.find(g => g.sessionId === sessionId)

  // 获取项目的 bots（优先使用 nanobotStore）
  const projectBotIds = nanobotProjectBots.get(projectId) || []
  const projectBots = projectBotIds.map(id => nanobotBots.get(id)).filter(Boolean)
  const allBots = projectBots.length > 0 ? projectBots : appBots

  useEffect(() => {
    if (!agentGroup && sessionId && projectId) {
      // 自动创建 Agent Group
      const session = sessions.find(s => s.id === sessionId)
      const masterBot = allBots.find(b => b.role === 'master') || allBots[0]

      if (session) {
        addAgentGroup({
          id: `group_${Date.now()}`,
          projectId,
          sessionId,
          name: session.name,
          description: `${session.name} 的 Agent 协作群`,
          botIds: projectBotIds,
          masterBotId: masterBot?.id || '',
          tasks: [],
          createdAt: new Date().toISOString(),
        })
      }
    }
  }, [sessionId, projectId, agentGroup, sessions, allBots, projectBotIds, addAgentGroup])

  // 获取当前会话的任务
  const sessionTasks = tasks.filter(t => t.sessionId === sessionId)
  const activeTask = sessionTasks.find(t => t.status === 'running' || t.status === 'analyzing' || t.status === 'assigning')
  const completedTasks = sessionTasks.filter(t => t.status === 'completed')

  // 获取所有交付物
  const deliverables = sessionTasks.flatMap(t => t.deliverables)

  // 获取可用 bots（不在群里的）
  const availableBots = allBots.filter(b =>
    (b.enabled ?? b.is_active) && !agentGroup?.botIds.includes(b.id)
  )

  const handleAddBot = (botId: string) => {
    if (agentGroup) {
      addBotToGroup(agentGroup.id, botId)
    }
    setShowAddBotModal(false)
  }

  const handleRemoveBot = (botId: string) => {
    if (agentGroup) {
      removeBotFromGroup(agentGroup.id, botId)
    }
  }

  if (!agentGroup) {
    return (
      <div className="w-[320px] h-full bg-[#f9fafb] border-l border-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p className="text-sm">初始化 Agent 群聊...</p>
        </div>
      </div>
    )
  }

  const masterBot = allBots.find(b => b.id === agentGroup.masterBotId)

  return (
    <div className="w-[320px] h-full bg-[#f9fafb] border-l border-gray-200 flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">Agent 群聊</h3>
            <p className="text-xs text-gray-500">{agentGroup.botIds.length} 个成员</p>
          </div>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex gap-1 mt-3">
          {[
            { id: 'tasks', label: '任务', count: sessionTasks.length },
            { id: 'members', label: '成员', count: agentGroup.botIds.length },
            { id: 'deliverables', label: '交付物', count: deliverables.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.id ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'tasks' && (
          <>
            {/* 主 Bot 消息气泡 */}
            {masterBot && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-medium">
                    {masterBot.name[0]}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{masterBot.name}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {activeTask
                    ? `正在执行「${activeTask.title}」，已分配给 ${activeTask.subTasks.filter(st => st.assignedBotId).length} 个 Agent。`
                    : '我是主 Bot，负责协调群里的任务分配。请创建任务让我来拆解和分配。'}
                </p>
              </div>
            )}

            {/* 任务分配指示 */}
            {activeTask && (
              <div className="text-center">
                <span className="text-xs text-gray-400">— 任务分配 —</span>
              </div>
            )}

            {/* 任务列表 */}
            {sessionTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Play className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无任务</p>
                <p className="text-xs mt-1">在聊天区创建任务开始协作</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 进行中的任务 */}
                {sessionTasks
                  .filter(t => t.status !== 'completed')
                  .map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}

                {/* 已完成任务 */}
                {completedTasks.length > 0 && (
                  <>
                    <div className="text-center pt-2">
                      <span className="text-xs text-gray-400">— 已完成 —</span>
                    </div>
                    {completedTasks.map(task => (
                      <TaskCard key={task.id} task={task} showSubTasks={false} />
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'members' && (
          <AgentMemberList
            groupId={agentGroup.id}
            botIds={agentGroup.botIds}
            masterBotId={agentGroup.masterBotId}
            onAddBot={() => setShowAddBotModal(true)}
            onRemoveBot={handleRemoveBot}
          />
        )}

        {activeTab === 'deliverables' && (
          <>
            {deliverables.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileOutput className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无交付物</p>
                <p className="text-xs mt-1">任务完成后将生成交付物</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deliverables.map(deliverable => (
                  <DeliverableCard key={deliverable.id} deliverable={deliverable} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部审核区（如果有进行中的任务） */}
      {activeTask && activeTask.status === 'running' && (
        <div className="bg-white border-t border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{masterBot?.name} 审核</span>
            <span className="text-xs text-gray-400">检查执行结果</span>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
              <Check className="w-4 h-4" />
              审核通过
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
              <X className="w-4 h-4" />
              需修改
            </button>
          </div>
        </div>
      )}

      {/* 添加 Bot 弹窗 */}
      {showAddBotModal && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-4 w-72 shadow-xl">
            <h4 className="font-semibold text-gray-900 mb-3">添加 Agent</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableBots.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">没有可添加的 Agent</p>
              ) : (
                availableBots.map(bot => (
                  <button
                    key={bot.id}
                    onClick={() => handleAddBot(bot.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-medium">
                      {bot.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-800 block truncate">{bot.name}</span>
                      <span className="text-xs text-gray-400 truncate">
                        {bot.skills.slice(0, 2).join('、')}
                      </span>
                    </div>
                    <Plus className="w-4 h-4 text-gray-300" />
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowAddBotModal(false)}
              className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DeliverableCard({ deliverable }: { deliverable: Deliverable }) {
  const getIcon = () => {
    switch (deliverable.type) {
      case 'file':
        return <FileText className="w-5 h-5 text-blue-400" />
      case 'code':
        return <FileText className="w-5 h-5 text-purple-400" />
      default:
        return <FileOutput className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-800 block truncate">{deliverable.name}</span>
        <span className="text-xs text-gray-400">
          {new Date(deliverable.createdAt).toLocaleDateString()}
        </span>
      </div>
      <button className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
        查看
      </button>
    </div>
  )
}
