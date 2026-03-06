import { useEffect } from 'react'
import { useStore } from './stores/appStore'
import QQSidebar from './components/QQSidebar'
import QQSessionList from './components/QQSessionList'
import QQChatArea from './components/QQChatArea'
import AgentGroupPanel from './components/AgentGroupPanel'
import { setupNanobotListeners } from './utils/taskProcessor'

function App() {
  const { currentProjectId, setFiles, setIsConnected, currentSessionId } = useStore()

  useEffect(() => {
    setIsConnected(true)

    // 设置 nanobot 消息监听
    const cleanup = setupNanobotListeners()
    return cleanup
  }, [setIsConnected])

  useEffect(() => {
    if (currentProjectId) {
      const loadFiles = async () => {
        const project = useStore.getState().projects.find(p => p.id === currentProjectId)
        if (project?.workspace && window.electronAPI) {
          const files = await window.electronAPI.readDirectory(project.workspace)
          setFiles(files)
        }
      }
      loadFiles()
    }
  }, [currentProjectId, setFiles])

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      {/* 第1列: 左侧窄边栏 - QQ风格导航 */}
      <div className="w-[60px] flex-shrink-0 h-full">
        <QQSidebar />
      </div>

      {/* 第2列: 会话列表 */}
      <div className="w-[280px] flex-shrink-0 h-full border-r border-gray-200">
        <QQSessionList />
      </div>

      {/* 第3列: 聊天区域 */}
      <div className="flex-1 h-full min-w-0 bg-[#f5f5f5]">
        <QQChatArea />
      </div>

      {/* 第4列: Agent群聊任务协作面板 */}
      {currentSessionId && currentProjectId && (
        <div className="w-[320px] flex-shrink-0 h-full">
          <AgentGroupPanel
            sessionId={currentSessionId}
            projectId={currentProjectId}
          />
        </div>
      )}
    </div>
  )
}

export default App
