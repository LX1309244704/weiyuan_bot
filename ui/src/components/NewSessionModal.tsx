import { useState } from 'react'
import { X, Users, MessageSquare, ChevronRight, Check, Bot } from 'lucide-react'
import { useStore } from '../stores/appStore'
import { Session } from '../types'

interface NewSessionModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewSessionModal({ isOpen, onClose }: NewSessionModalProps) {
  const { bots, projects, addSession, setCurrentSessionId, setActiveNavTab } = useStore()
  const [step, setStep] = useState<'type' | 'select' | 'name'>('type')
  const [sessionType, setSessionType] = useState<'single' | 'group'>('single')
  const [selectedBots, setSelectedBots] = useState<string[]>([])
  const [sessionName, setSessionName] = useState('')

  // 只获取已启用的 Bot
  const enabledBots = bots.filter(bot => bot.enabled)

  const handleSelectType = (type: 'single' | 'group') => {
    setSessionType(type)
    setStep('select')
  }

  const toggleBotSelection = (botId: string) => {
    if (sessionType === 'single') {
      setSelectedBots([botId])
    } else {
      setSelectedBots(prev =>
        prev.includes(botId)
          ? prev.filter(id => id !== botId)
          : [...prev, botId]
      )
    }
  }

  const handleContinue = () => {
    if (selectedBots.length === 0) return
    
    // 自动生成会话名称
    const selectedBotNames = bots
      .filter(b => selectedBots.includes(b.id))
      .map(b => b.name)
    
    const defaultName = sessionType === 'single' 
      ? selectedBotNames[0]
      : `群聊 (${selectedBots.length})`
    
    setSessionName(defaultName)
    setStep('name')
  }

  const handleCreate = () => {
    if (selectedBots.length === 0) return

    const session: Session = {
      id: Date.now().toString(),
      name: sessionName.trim() || '新会话',
      type: sessionType,
      botIds: selectedBots,
      lastMessageTime: new Date().toISOString(),
    }

    addSession(session)
    setActiveNavTab('message')
    
    // Reset and close
    setStep('type')
    setSelectedBots([])
    setSessionName('')
    onClose()
  }

  const handleClose = () => {
    setStep('type')
    setSelectedBots([])
    setSessionName('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'type' && '新建会话'}
            {step === 'select' && (sessionType === 'single' ? '选择 Bot' : '选择多个 Bot')}
            {step === 'name' && '设置会话名称'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Step 1: Select Type */}
        {step === 'type' && (
          <div className="p-6 space-y-4">
            <button
              onClick={() => handleSelectType('single')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">单聊</h3>
                <p className="text-sm text-gray-500">与一个 Bot 进行一对一对话</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => handleSelectType('group')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-green-500 hover:bg-green-50/50 transition-all group"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">群聊</h3>
                <p className="text-sm text-gray-500">邀请多个 Bot 加入群聊对话</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        )}

        {/* Step 2: Select Bots */}
        {step === 'select' && (
          <div className="p-6">
            {enabledBots.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">暂无启用的 Bot</p>
                <p className="text-sm text-gray-400 mt-1">请先在设置中启用 Bot</p>
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-500 mb-3">
                  已选择 {selectedBots.length} 个 Bot
                </div>
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {enabledBots.map((bot) => (
                    <button
                      key={bot.id}
                      onClick={() => toggleBotSelection(bot.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        selectedBots.includes(bot.id)
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedBots.includes(bot.id) ? 'bg-blue-500' : 'bg-gray-300'
                      }`}>
                        <span className="text-white font-medium">{bot.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900">{bot.name}</p>
                        <p className="text-xs text-gray-500">
                          {bot.skills.slice(0, 3).join(', ') || '无技能'}
                        </p>
                      </div>
                      {selectedBots.includes(bot.id) && (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStep('type')}
                    className="flex-1 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    返回
                  </button>
                  <button
                    onClick={handleContinue}
                    disabled={selectedBots.length === 0}
                    className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    继续
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Set Name */}
        {step === 'name' && (
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                会话名称
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="输入会话名称"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                autoFocus
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 mb-2">已选择的 Bot:</p>
              <div className="flex flex-wrap gap-2">
                {bots
                  .filter(b => selectedBots.includes(b.id))
                  .map(bot => (
                    <span
                      key={bot.id}
                      className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 shadow-sm"
                    >
                      {bot.name}
                    </span>
                  ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                返回
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
              >
                创建会话
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
