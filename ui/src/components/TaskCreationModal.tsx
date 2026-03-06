import { useState } from 'react'
import { X, Sparkles, Bot, ChevronRight, Loader2, CheckCircle2, Users } from 'lucide-react'
import { useStore } from '../stores/appStore'
import { quickExecuteTask } from '../utils/taskProcessor'

interface TaskCreationModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  projectId: string
}

type Step = 'input' | 'select-bots' | 'confirm'

export default function TaskCreationModal({ isOpen, onClose, sessionId, projectId }: TaskCreationModalProps) {
  const { bots, sessions, isTaskProcessing, setIsTaskProcessing } = useStore()

  const [step, setStep] = useState<Step>('input')
  const [taskDescription, setTaskDescription] = useState('')
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const session = sessions.find(s => s.id === sessionId)

  // 获取可用的 bots
  const availableBots = bots.filter(b => b.enabled && session?.botIds.includes(b.id))
  const masterBot = availableBots.find(b => b.role === 'master') || availableBots[0]

  const handleNext = () => {
    if (step === 'input' && taskDescription.trim()) {
      // 默认选择所有 bots
      setSelectedBotIds(availableBots.map(b => b.id))
      setStep('select-bots')
    } else if (step === 'select-bots' && selectedBotIds.length > 0) {
      setStep('confirm')
    }
  }

  const handleBack = () => {
    if (step === 'select-bots') {
      setStep('input')
    } else if (step === 'confirm') {
      setStep('select-bots')
    }
  }

  const handleSubmit = async () => {
    if (!masterBot || !taskDescription.trim()) return

    setIsSubmitting(true)
    setIsTaskProcessing(true)

    try {
      await quickExecuteTask(
        taskDescription,
        sessionId,
        projectId,
        masterBot.id,
        selectedBotIds
      )

      onClose()
      resetForm()
    } catch (error) {
      console.error('Task creation failed:', error)
    } finally {
      setIsSubmitting(false)
      setIsTaskProcessing(false)
    }
  }

  const resetForm = () => {
    setStep('input')
    setTaskDescription('')
    setSelectedBotIds([])
    setIsSubmitting(false)
  }

  const toggleBotSelection = (botId: string) => {
    setSelectedBotIds(prev =>
      prev.includes(botId)
        ? prev.filter(id => id !== botId)
        : [...prev, botId]
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">创建协作任务</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="px-4 py-3 bg-gray-50/50">
          <div className="flex items-center justify-center gap-2">
            {[
              { id: 'input', label: '输入任务' },
              { id: 'select-bots', label: '选择 Agent' },
              { id: 'confirm', label: '确认创建' },
            ].map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  step === s.id
                    ? 'bg-blue-100 text-blue-600'
                    : index < ['input', 'select-bots', 'confirm'].indexOf(step)
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  {index < ['input', 'select-bots', 'confirm'].indexOf(step) ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                  )}
                  {s.label}
                </div>
                {index < 2 && (
                  <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  任务描述
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="描述您需要完成的任务，例如：\n• 调研AI Agent领域的最新发展趋势\n• 开发一个用户登录功能\n• 分析竞品的功能特点"
                  className="w-full h-40 p-3 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm"
                />
              </div>

              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">AI 自动拆解</p>
                    <p className="text-blue-600/80 text-xs">
                      主 Bot 会自动将您的任务拆解为可执行的子任务，并分配给合适的 Agent 协同完成。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'select-bots' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择参与协作的 Agent
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  已选择 {selectedBotIds.length} 个 Agent
                </p>
              </div>

              <div className="space-y-2">
                {/* 主 Bot（必须选择）*/}
                {masterBot && (
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium">
                      {masterBot.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{masterBot.name}</span>
                        <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded">群主</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {masterBot.skills.join('、')}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">必选</div>
                  </div>
                )}

                {/* 其他 Bots */}
                {availableBots
                  .filter(b => b.id !== masterBot?.id)
                  .map(bot => (
                    <button
                      key={bot.id}
                      onClick={() => toggleBotSelection(bot.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selectedBotIds.includes(bot.id)
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-medium">
                        {bot.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 block">{bot.name}</span>
                        <p className="text-xs text-gray-500 truncate">
                          {bot.skills.join('、')}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedBotIds.includes(bot.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedBotIds.includes(bot.id) && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2">任务信息</h4>
                <p className="text-sm text-gray-600 line-clamp-3">{taskDescription}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">参与 Agent</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBotIds.map(botId => {
                    const bot = bots.find(b => b.id === botId)
                    if (!bot) return null
                    return (
                      <div
                        key={botId}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm"
                      >
                        <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs">
                          {bot.name[0]}
                        </div>
                        {bot.name}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">即将开始</p>
                    <p className="text-amber-600/80 text-xs mt-1">
                      创建后，主 Bot 会自动拆解任务并分配给选中的 Agent 协同执行。您可以在右侧面板查看执行进度。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100">
          <button
            onClick={step === 'input' ? onClose : handleBack}
            className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            {step === 'input' ? '取消' : '上一步'}
          </button>

          {step !== 'confirm' ? (
            <button
              onClick={handleNext}
              disabled={step === 'input' ? !taskDescription.trim() : selectedBotIds.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一步
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  创建任务
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
