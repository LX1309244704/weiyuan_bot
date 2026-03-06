import { useState } from 'react'
import { Folder, File, ChevronRight, ChevronDown, FileCode, FileText, Image as ImageIcon } from 'lucide-react'
import { FileItem } from '../types'

interface FileTreeItemProps {
  item: FileItem
  level: number
  onSelect: (path: string) => void
  selectedPath: string | null
  onLoadChildren: (path: string) => Promise<FileItem[]>
}

function FileTreeItem({ item, level, onSelect, selectedPath, onLoadChildren }: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [children, setChildren] = useState<FileItem[]>([])

  const isSelected = selectedPath === item.path
  const isDirectory = item.isDirectory

  const handleClick = async () => {
    if (isDirectory) {
      if (!isExpanded && children.length === 0) {
        const loaded = await onLoadChildren(item.path)
        setChildren(loaded)
      }
      setIsExpanded(!isExpanded)
    } else {
      onSelect(item.path)
    }
  }

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go'].includes(ext || '')) {
      return <FileCode className="w-4 h-4 text-yellow-500" />
    }
    if (['md', 'txt', 'json'].includes(ext || '')) {
      return <FileText className="w-4 h-4 text-gray-500" />
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4 text-purple-500" />
    }
    return <File className="w-4 h-4 text-gray-400" />
  }

  return (
    <div>
      <div
        onClick={handleClick}
        className={`
          flex items-center gap-1.5 py-1 px-2.5 cursor-pointer text-sm
          hover:bg-gray-50 transition-colors
          ${isSelected ? 'bg-blue-50 text-blue-600' : ''}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {isDirectory && (
          isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
        )}
        {isDirectory ? <Folder className="w-4 h-4 text-yellow-500" /> : getFileIcon(item.name)}
        <span className="truncate">{item.name}</span>
      </div>

      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <FileTreeItem
              key={child.path}
              item={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
              onLoadChildren={onLoadChildren}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FileTreeProps {
  files: FileItem[]
  selectedPath: string | null
  onSelect: (path: string) => void
  onLoadChildren: (path: string) => Promise<FileItem[]>
  emptyText?: string
}

export default function FileTree({ 
  files, 
  selectedPath, 
  onSelect, 
  onLoadChildren,
  emptyText = '暂无文件'
}: FileTreeProps) {
  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-400">
        <p>{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="py-1">
      {files.map((item) => (
        <FileTreeItem
          key={item.path}
          item={item}
          level={0}
          onSelect={onSelect}
          selectedPath={selectedPath}
          onLoadChildren={onLoadChildren}
        />
      ))}
    </div>
  )
}
