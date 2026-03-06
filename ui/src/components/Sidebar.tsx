import { Plus, MessageSquare, Settings, HelpCircle, ChevronRight } from 'lucide-react'
import { useStore } from '../stores/appStore'

interface Session {
  id: string
  title: string
  path?: string
  isActive?: boolean
}

export default function Sidebar() {
  const { currentProjectId, projects } = useStore()
  
  // Mock sessions data - in real app would come from store
  const sessions: Session[] = [
    { id: '1', title: '参照 OpenCode 客户端的多角...', path: '~/Desktop/works/weiyuan_bot', isActive: true },
  ]

  return (
    <div className="h-full flex flex-col bg-[#f8f8f8] border-r border-[#e5e5e5]">
      {/* Logo */}
      <div className="h-12 flex items-center px-3 border-b border-[#e5e5e5]">
        <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
          <span className="text-white font-semibold text-sm">W</span>
        </div>
      </div>

      {/* New Session Button */}
      <div className="p-2">
        <button className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white border border-[#e5e5e5] rounded-md hover:bg-[#f5f5f5] transition-colors text-sm text-gray-700">
          <Plus className="w-4 h-4" />
          <span>新建会话</span>
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                session.isActive 
                  ? 'bg-white shadow-sm border border-[#e5e5e5]' 
                  : 'hover:bg-white/60'
              }`}
            >
              <MessageSquare className={`w-4 h-4 flex-shrink-0 ${session.isActive ? 'text-gray-800' : 'text-gray-400'}`} />
              <span className={`flex-1 text-sm truncate ${session.isActive ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                {session.title}
              </span>
              {session.isActive && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
            </div>
          ))}
        </div>
      </div>

      {/* Project Info */}
      <div className="px-3 py-2 border-t border-[#e5e5e5]">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="truncate">weiyuan_bot</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
          <span className="truncate">~/Desktop/works/weiyuan_bot</span>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-[#e5e5e5] flex items-center gap-1">
        <button className="p-2 rounded-md hover:bg-[#e5e5e5] transition-colors text-gray-500">
          <Settings className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-md hover:bg-[#e5e5e5] transition-colors text-gray-500">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
