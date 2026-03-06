import { Plus } from 'lucide-react'
import { useStore } from '../stores/appStore'
import FileTree from './FileTree'

export default function FilePanel() {
  const { files, currentFilePath, setCurrentFilePath, setFileContent, currentProjectId, projects } = useStore()

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

  if (!currentProjectId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-400">请先创建项目</p>
      </div>
    )
  }

  const project = projects.find(p => p.id === currentProjectId)

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 flex items-center px-4 border-b border-[#e5e5e5]">
        <span className="font-semibold text-sm text-gray-900">项目文件</span>
      </div>

      {project?.workspace && (
        <div className="p-3 border-b border-[#e5e5e5] flex items-center justify-between">
          <span className="text-xs text-gray-500 truncate" title={project.workspace}>
            {project.workspace}
          </span>
          <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
            <Plus className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        <FileTree
          files={files}
          selectedPath={currentFilePath}
          onSelect={handleSelectFile}
          onLoadChildren={handleLoadChildren}
          emptyText="暂无文件，请选择项目工作目录"
        />
      </div>
    </div>
  )
}
