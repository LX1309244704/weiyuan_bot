import { Settings, Wifi, WifiOff } from 'lucide-react'
import { useStore } from '../stores/appStore'

export default function Header() {
  const { isConnected, projects, currentProjectId } = useStore()
  const currentProject = projects.find(p => p.id === currentProjectId)

  return (
    <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-white/90 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-primary rounded flex items-center justify-center shadow-sm">
          <span className="text-primary-foreground font-semibold text-sm">B</span>
        </div>
        <span className="font-semibold font-base text-foreground">微源Bot</span>
        {currentProject && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-sm text-muted-foreground">{currentProject.name}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-sm">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-green-500 font-sm">已连接</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-red-500 font-sm">未连接</span>
            </>
          )}
        </div>
        <button className="p-1.5 hover:bg-secondary rounded transition-colors shadow-sm">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
