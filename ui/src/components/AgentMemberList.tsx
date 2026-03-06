import { Plus, X, Crown } from 'lucide-react'
import { useStore } from '../stores/appStore'

interface AgentMemberListProps {
  botIds: string[]
  masterBotId: string
  onAddBot?: () => void
  onRemoveBot?: (botId: string) => void
}

export default function AgentMemberList({
  botIds,
  masterBotId,
  onAddBot,
  onRemoveBot,
}: AgentMemberListProps) {
  const { bots } = useStore()

  const groupBots = bots.filter(b => botIds.includes(b.id))
  const masterBot = groupBots.find(b => b.id === masterBotId)
  const workerBots = groupBots.filter(b => b.id !== masterBotId)

  return (
    <div className="space-y-3">
      {/* 群主 */}
      {masterBot && (
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium">
              {masterBot.name[0]}
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
              <Crown className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">{masterBot.name}</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded">群主</span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {masterBot.skills.slice(0, 2).join('、')}
            </p>
          </div>
          <div className={`w-2 h-2 rounded-full ${masterBot.enabled ? 'bg-green-400' : 'bg-gray-300'}`} />
        </div>
      )}

      {/* 群成员列表 */}
      <div className="space-y-2">
        {workerBots.map((bot) => (
          <div
            key={bot.id}
            className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-xl transition-colors group"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-medium">
                {bot.name[0]}
              </div>
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                bot.enabled ? 'bg-green-400' : 'bg-gray-300'
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-800 truncate">{bot.name}</span>
              <p className="text-xs text-gray-400 truncate">
                {bot.skills.slice(0, 2).join('、')}
              </p>
            </div>

            {onRemoveBot && (
              <button
                onClick={() => onRemoveBot(bot.id)}
                className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 添加成员按钮 */}
      {onAddBot && (
        <button
          onClick={onAddBot}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">添加 Agent</span>
        </button>
      )}
    </div>
  )
}
