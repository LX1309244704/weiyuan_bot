import { Settings, FolderPlus, Users } from 'lucide-react'
import { useStore } from '../stores/appStore'
import { useState } from 'react'
import NewProjectModal from './NewProjectModal'
import { BotManagerDialog } from './BotManagerDialog'

export default function QQSidebar() {
  const { setActiveNavTab } = useStore()
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showBotManager, setShowBotManager] = useState(false)

  return (
    <div className="h-full w-[60px] bg-[#2e2e2e] flex flex-col items-center py-4">
      {/* Logo / Avatar */}
      <div className="mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-sm">W</span>
        </div>
      </div>

      {/* 按钮组：创建项目 + 数字员工管理 */}
      <div className="flex flex-col items-center gap-3 mb-4">
        {/* + 创建项目 */}
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="p-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          title="创建项目"
        >
          <FolderPlus className="w-5 h-5" />
        </button>

        {/* 数字员工管理 */}
        <button
          onClick={() => setShowBotManager(true)}
          className="p-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          title="数字员工管理"
        >
          <Users className="w-5 h-5" />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Buttons */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => setActiveNavTab('setting')}
          className="p-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
      />

      {/* Bot Manager Dialog */}
      <BotManagerDialog
        open={showBotManager}
        onClose={() => setShowBotManager(false)}
      />
    </div>
  )
}
