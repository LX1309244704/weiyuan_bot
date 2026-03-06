import { useState } from 'react'
import { X, FolderPlus } from 'lucide-react'
import { useStore } from '../stores/appStore'
import { Project } from '../types'

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const { addProject, setCurrentProjectId } = useStore()
  const [projectName, setProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!projectName.trim()) return

    setIsCreating(true)

    let workspace = ''
    if (window.electronAPI) {
      workspace = await window.electronAPI.selectDirectory() || ''
    }

    const project: Project = {
      id: Date.now().toString(),
      name: projectName.trim(),
      workspace,
      createdAt: new Date().toISOString()
    }

    addProject(project)
    setCurrentProjectId(project.id)
    setProjectName('')
    setIsCreating(false)
    onClose()
  }

  const handleClose = () => {
    setProjectName('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">创建项目</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目名称
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="请输入项目名称"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>

            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-700">
                创建项目后，您可以在项目中配置数字员工(Bot)并创建会话。
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!projectName.trim() || isCreating}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <FolderPlus className="w-4 h-4" />
                创建项目
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
