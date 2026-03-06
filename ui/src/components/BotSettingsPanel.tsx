import { useState } from 'react'
import { X, Check, Plus, Trash2, Bot, Power, PowerOff } from 'lucide-react'
import { useStore } from '../stores/appStore'
import { Bot as BotType } from '../types'

interface Props {
  bot: BotType | null
  onClose: () => void
}

export default function BotSettingsPanel({ bot: initialBot, onClose }: Props) {
  const { bots, updateBot, addBot, removeBot, availableSkills, currentProjectId } = useStore()
  const [selectedBotId, setSelectedBotId] = useState<string | null>(initialBot?.id || null)
  const [isCreating, setIsCreating] = useState(false)

  const selectedBot = bots.find(b => b.id === selectedBotId)

  // Form states
  const [name, setName] = useState(initialBot?.name || '')
  const [description, setDescription] = useState(initialBot?.description || '')
  const [skills, setSkills] = useState<string[]>(initialBot?.skills || [])
  const [enabled, setEnabled] = useState(initialBot?.enabled || false)

  const handleToggleSkill = (skillName: string) => {
    setSkills(prev =>
      prev.includes(skillName)
        ? prev.filter(s => s !== skillName)
        : [...prev, skillName]
    )
  }

  const handleSelectBot = (bot: BotType) => {
    setSelectedBotId(bot.id)
    setIsCreating(false)
    setName(bot.name)
    setDescription(bot.description || '')
    setSkills(bot.skills)
    setEnabled(bot.enabled)
  }

  const handleCreateNew = () => {
    setIsCreating(true)
    setSelectedBotId(null)
    setName('')
    setDescription('')
    setSkills([])
    setEnabled(false)
  }

  const handleSave = () => {
    if (isCreating) {
      if (!name.trim() || !currentProjectId) return
      const newBot: BotType = {
        id: Date.now().toString(),
        projectId: currentProjectId,
        name: name.trim(),
        description,
        skills,
        enabled,
      }
      addBot(newBot)
      setIsCreating(false)
      setSelectedBotId(newBot.id)
    } else if (selectedBot) {
      updateBot(selectedBot.id, {
        name,
        description,
        skills,
        enabled,
      })
    }
  }

  const handleDelete = () => {
    if (selectedBot) {
      removeBot(selectedBot.id)
      setSelectedBotId(null)
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[640px] h-[560px] overflow-hidden flex animate-in fade-in zoom-in-95 duration-200">
        {/* Left Sidebar - Bot List */}
        <div className="w-64 border-r border-gray-100 flex flex-col bg-gray-50/50">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Bot 管理</h3>
            <button
              onClick={handleCreateNew}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {bots.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无 Bot</p>
                <p className="text-xs mt-1">点击 + 创建</p>
              </div>
            ) : (
              bots.map((bot) => (
                <div
                  key={bot.id}
                  onClick={() => handleSelectBot(bot)}
                  className={`mx-2 px-3 py-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all ${
                    selectedBotId === bot.id && !isCreating
                      ? 'bg-black text-white'
                      : 'hover:bg-white text-gray-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedBotId === bot.id && !isCreating ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    <Bot className={`w-4 h-4 ${selectedBotId === bot.id && !isCreating ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selectedBotId === bot.id && !isCreating ? 'text-white' : 'text-gray-900'}`}>
                      {bot.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${bot.enabled ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <span className={`text-xs ${selectedBotId === bot.id && !isCreating ? 'text-white/70' : 'text-gray-500'}`}>
                        {bot.enabled ? '已启用' : '未启用'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Content - Settings */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">
              {isCreating ? '创建 Bot' : selectedBot ? 'Bot 设置' : '选择 Bot'}
            </h3>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isCreating || selectedBot ? (
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bot 名称
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="输入 Bot 名称"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    描述
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="描述这个 Bot 的角色和能力..."
                    rows={3}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 resize-none transition-all"
                  />
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    技能配置
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableSkills.map((skill) => (
                      <button
                        key={skill.name}
                        onClick={() => handleToggleSkill(skill.name)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5 ${
                          skills.includes(skill.name)
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {skills.includes(skill.name) && <Check className="w-3.5 h-3.5" />}
                        <span>{skill.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    状态
                  </label>
                  <button
                    onClick={() => setEnabled(!enabled)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                      enabled
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                  >
                    {enabled ? (
                      <Power className="w-5 h-5" />
                    ) : (
                      <PowerOff className="w-5 h-5" />
                    )}
                    <span className="font-medium">{enabled ? '已启用' : '未启用'}</span>
                    <span className="text-xs opacity-70 ml-2">
                      {enabled ? '可以加入群聊' : '无法在群聊中使用'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Bot className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm">选择一个 Bot 进行配置</p>
                <p className="text-xs mt-1">或点击左上角 + 创建新 Bot</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {(isCreating || selectedBot) && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              {!isCreating && selectedBot && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? '创建' : '保存'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
