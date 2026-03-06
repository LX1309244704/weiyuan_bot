import { useState } from 'react'
import { ChevronDown, ChevronRight, Folder, FileText, Search, RefreshCw, FileCode, Image as ImageIcon, File, GitBranch } from 'lucide-react'
import { useStore } from '../stores/appStore'

interface FileItem {
  name: string
  type: 'file' | 'folder'
  children?: FileItem[]
}

export default function RightPanel() {
  const [activeTab, setActiveTab] = useState<'review' | 'files'>('review')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['nanobot', 'ui']))
  const { files } = useStore()

  const toggleFolder = (name: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(name)) {
      newExpanded.delete(name)
    } else {
      newExpanded.add(name)
    }
    setExpandedFolders(newExpanded)
  }

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
      return <FileCode className="w-4 h-4 text-blue-500" />
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4 text-purple-500" />
    }
    if (['md', 'txt'].includes(ext || '')) {
      return <FileText className="w-4 h-4 text-gray-500" />
    }
    return <File className="w-4 h-4 text-gray-400" />
  }

  return (
    <div className="h-full flex flex-col bg-[#fafafa] border-l border-[#e5e5e5]">
      {/* Header with Tabs */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-[#e5e5e5] bg-white">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('review')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'review' 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            审查
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400">
            <Search className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Changes Dropdown */}
      <div className="px-3 py-2 border-b border-[#e5e5e5]">
        <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
          <span className="font-medium">会话变更</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Git Status */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <GitBranch className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500 mb-1">No git VCS</p>
          <p className="text-sm text-gray-400">detected, so</p>
          <p className="text-sm text-gray-400">session changes</p>
          <p className="text-sm text-gray-400">will not be</p>
          <p className="text-sm text-gray-400">detected</p>
        </div>
      </div>

      {/* File Tree Section */}
      <div className="border-t border-[#e5e5e5] bg-white">
        <div className="px-3 py-2 border-b border-[#e5e5e5] flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">所有文件</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
        
        {/* File Tree */}
        <div className="py-2">
          {/* nanobot folder */}
          <div>
            <button 
              onClick={() => toggleFolder('nanobot')}
              className="w-full flex items-center gap-1.5 px-3 py-1 hover:bg-gray-50 transition-colors"
            >
              {expandedFolders.has('nanobot') ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              )}
              <Folder className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-700">nanobot</span>
            </button>
          </div>

          {/* ui folder */}
          <div>
            <button 
              onClick={() => toggleFolder('ui')}
              className="w-full flex items-center gap-1.5 px-3 py-1 hover:bg-gray-50 transition-colors"
            >
              {expandedFolders.has('ui') ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              )}
              <Folder className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-700">ui</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Status */}
      <div className="px-3 py-2 border-t border-[#e5e5e5] bg-[#fafafa]">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>0 更改</span>
          <span>0 问题</span>
        </div>
      </div>
    </div>
  )
}
