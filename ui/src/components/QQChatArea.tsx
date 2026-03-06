import { useState, useRef, useEffect, useCallback } from 'react'
import { Phone, Video, MoreHorizontal, Smile, Image as ImageIcon, Folder, Send, Sparkles, Loader2, CheckCircle2, Bot, AtSign } from 'lucide-react'
import { useStore } from '../stores/appStore'
import { useNanobotStore } from '../stores/nanobotStore'
import TaskCreationModal from './TaskCreationModal'
import type { Message } from '../types'
import { getCurrentMentionText, replaceMention } from '../utils/mentionParser'

interface MentionDropdownProps {
  bots: { id: string; name: string }[]
  query: string
  onSelect: (botName: string) => void
  selectedIndex: number
}

function MentionDropdown({ bots, query, onSelect, selectedIndex }: MentionDropdownProps) {
  const filtered = bots.filter(b => 
    b.name.toLowerCase().includes(query.toLowerCase())
  )

  if (filtered.length === 0) return null

  return (
    <div className="absolute bottom-full left-4 mb-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
      <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100">
        选择要@的成员
      </div>
      {filtered.map((bot, index) => (
        <button
          key={bot.id}
          onClick={() => onSelect(bot.name)}
          className={`w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors ${
            index === selectedIndex ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="truncate">{bot.name}</span>
          {index === selectedIndex && (
            <span className="ml-auto text-xs text-blue-400">↵</span>
          )}
        </button>
      ))}
    </div>
  )
}

// 高亮消息中的@提及
function HighlightedMessage({ content, bots }: { content: string; bots: { id: string; name: string }[] }) {
  const parts: (string | JSX.Element)[] = []
  let lastIndex = 0
  
  // 匹配 @名字 格式
  const mentionRegex = /@([^\s]+)/g
  let match
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const botName = match[1]
    const isValidBot = bots.some(b => b.name === botName)
    
    // 添加@前的文本
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    
    // 添加@提及
    parts.push(
      <span
        key={match.index}
        className={`font-medium ${isValidBot ? 'text-blue-600 bg-blue-50 px-1 rounded' : 'text-gray-600'}`}
      >
        @{botName}
      </span>
    )
    
    lastIndex = match.index + match[0].length
  }
  
  // 添加剩余文本
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }
  
  return <>{parts.length > 0 ? parts : content}</>
}

export default function QQChatArea() {
  const { 
    messages, 
    addMessage, 
    bots: appBots, 
    currentSessionId, 
    sessions, 
    currentProjectId,
    tasks,
    isTaskProcessing 
  } = useStore()
  
  const {
    bots: nanobotBots,
    projectBots: nanobotProjectBots,
    loadAllBots,
  } = useNanobotStore()
  
  // 加载所有 bots
  useEffect(() => {
    loadAllBots()
  }, [])
  
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mentionStartPos = useRef<number>(-1)

  const currentSession = sessions.find(s => s.id === currentSessionId)
  
  // 优先使用 nanobotStore 的数据
  let sessionBots: any[] = []
  if (currentProjectId) {
    const projectBotIds = nanobotProjectBots.get(currentProjectId) || []
    sessionBots = projectBotIds.map(id => nanobotBots.get(id)).filter(Boolean)
  }
  // 如果没有 nanobot 数据，回退到 appStore
  if (sessionBots.length === 0 && currentSession) {
    sessionBots = appBots.filter(b => currentSession.botIds.includes(b.id))
  }
  
  const primaryBot = sessionBots[0]
  const masterBot = sessionBots.find(b => b.role === 'master') || primaryBot

  // 可@的Bot列表（群聊中显示所有成员，单聊显示当前Bot）
  const mentionableBots = currentSession?.type === 'group' 
    ? sessionBots 
    : primaryBot ? [primaryBot] : []

  // 获取当前会话的活跃任务
  const activeTask = tasks.find(t => 
    t.sessionId === currentSessionId && 
    (t.status === 'running' || t.status === 'analyzing' || t.status === 'assigning')
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 检测输入中的@提及
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    
    setInput(value)
    
    // 检测是否在输入@
    const mentionText = getCurrentMentionText(value, cursorPos)
    
    if (mentionText !== null) {
      setMentionQuery(mentionText)
      setShowMentionDropdown(true)
      setMentionSelectedIndex(0)
      mentionStartPos.current = value.slice(0, cursorPos).lastIndexOf('@')
    } else {
      setShowMentionDropdown(false)
      setMentionQuery('')
    }
  }

  // 选择@提及
  const handleMentionSelect = useCallback((botName: string) => {
    if (inputRef.current && mentionStartPos.current >= 0) {
      const cursorPos = inputRef.current.selectionStart
      const { newContent, newCursorPos } = replaceMention(input, cursorPos, botName)
      
      setInput(newContent)
      setShowMentionDropdown(false)
      setMentionQuery('')
      
      // 恢复光标位置
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }, 0)
    }
  }, [input])

  // 键盘处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionDropdown) {
      const filtered = mentionableBots.filter(b => 
        b.name.toLowerCase().includes(mentionQuery.toLowerCase())
      )
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setMentionSelectedIndex(prev => 
            prev < filtered.length - 1 ? prev + 1 : 0
          )
          return
        case 'ArrowUp':
          e.preventDefault()
          setMentionSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filtered.length - 1
          )
          return
        case 'Enter':
          e.preventDefault()
          if (filtered[mentionSelectedIndex]) {
            handleMentionSelect(filtered[mentionSelectedIndex].name)
          }
          return
        case 'Escape':
          setShowMentionDropdown(false)
          return
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = async () => {
    if (!input.trim() || !currentSessionId) return
    
    // 提取@提及的Bot IDs
    const mentionRegex = /@([^\s]+)/g
    const mentions: string[] = []
    let match
    const content = input
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const botName = match[1]
      const bot = sessionBots.find(b => b.name === botName)
      if (bot) {
        mentions.push(bot.id)
      }
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      sessionId: currentSessionId,
      type: 'text',
      mentions: mentions.length > 0 ? mentions : undefined
    }
    
    addMessage(userMessage)
    setInput('')
    setIsLoading(true)
    
    // 模拟Bot响应
    setTimeout(() => {
      // 如果有@提及，让被@的Bot回复
      const targetBot = mentions.length > 0 
        ? sessionBots.find(b => b.id === mentions[0])
        : primaryBot
        
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: mentions.length > 0
          ? `收到@，我来处理这个任务...`
          : `收到消息: ${input}${primaryBot ? `\n\n来自: ${primaryBot.name}` : ''}`,
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
        type: 'text',
        botId: targetBot?.id
      }
      addMessage(botResponse)
      setIsLoading(false)
    }, 1000)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Filter messages for current session
  const sessionMessages = messages.filter(m => m.sessionId === currentSessionId)

  if (!currentSessionId) {
    return (
      <div className="h-full flex flex-col bg-[#f5f5f5]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white text-3xl font-bold">W</span>
            </div>
            <p className="text-gray-500 text-sm">选择一个会话开始聊天</p>
            <p className="text-gray-400 text-xs mt-1">或点击左侧 + 新建会话</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#f5f5f5]">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            currentSession?.type === 'group' 
              ? 'bg-gradient-to-br from-green-400 to-green-600'
              : 'bg-gradient-to-br from-blue-400 to-blue-600'
          }`}>
            <span className="text-white font-medium">
              {currentSession?.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{currentSession?.name}</h2>
            <p className="text-xs text-gray-500">
              {sessionBots.length > 0 
                ? sessionBots.map(b => b.name).join(', ')
                : '未配置 Bot'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Task Banner */}
      {activeTask && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100 px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                正在执行：{activeTask.title}
              </p>
              <p className="text-xs text-gray-500">
                {activeTask.subTasks.filter(st => st.status === 'completed').length}/{activeTask.subTasks.length} 个子任务已完成
              </p>
            </div>
            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              查看详情 →
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {sessionMessages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <span className="text-2xl">👋</span>
            </div>
            <p className="text-gray-400 text-sm">开始和 {currentSession?.name} 对话</p>
            <p className="text-gray-400 text-xs mt-2">
              {currentSession?.type === 'group' 
                ? '使用 @名字 来指定某个成员处理任务'
                : '或创建一个任务让 Agent 协同完成'}
            </p>
          </div>
        ) : (
          sessionMessages.map((msg, index) => {
            const isUser = msg.role === 'user'
            const showTime = index === 0 || 
              new Date(msg.timestamp).getTime() - new Date(sessionMessages[index - 1].timestamp).getTime() > 5 * 60 * 1000

            return (
              <div key={msg.id}>
                {showTime && (
                  <div className="text-center my-4">
                    <span className="text-xs text-gray-400 bg-gray-200/50 px-3 py-1 rounded-full">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                )}
                <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isUser 
                      ? 'bg-gradient-to-br from-blue-400 to-blue-600' 
                      : msg.type === 'task' || msg.type === 'system'
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                        : 'bg-gradient-to-br from-gray-400 to-gray-600'
                  }`}>
                    <span className="text-white text-sm font-medium">
                      {isUser ? '我' : msg.botId 
                        ? sessionBots.find((b: any) => b.id === msg.botId)?.name[0] || 'B'
                        : 'B'}
                    </span>
                  </div>
                  <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                    {/* Bot 名称 */}
                    {!isUser && msg.botId && (
                      <span className="text-xs text-gray-400 mb-1 ml-1">
                        {sessionBots.find((b: any) => b.id === msg.botId)?.name || 'Bot'}
                      </span>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-[#95ec69] text-gray-900 rounded-tr-sm'
                        : msg.type === 'task' || msg.type === 'system'
                          ? 'bg-amber-50 text-gray-900 rounded-tl-sm border border-amber-100'
                          : 'bg-white text-gray-900 rounded-tl-sm shadow-sm'
                    }`}>
                      <HighlightedMessage content={msg.content} bots={sessionBots} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">B</span>
            </div>
            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Task Buttons */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setShowTaskModal(true)}
            disabled={isTaskProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm font-medium hover:shadow-md transition-all disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            创建任务
          </button>
          {currentSession?.type === 'group' && sessionBots.map(bot => (
            <button
              key={bot.id}
              onClick={() => {
                setInput(prev => prev + `@${bot.name} `)
                inputRef.current?.focus()
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-full text-sm hover:bg-blue-100 transition-colors whitespace-nowrap"
            >
              <AtSign className="w-3.5 h-3.5" />
              {bot.name}
            </button>
          ))}
          <button
            onClick={() => {
              setInput('帮我调研一下最新的AI发展趋势')
            }}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            📊 调研分析
          </button>
          <button
            onClick={() => {
              setInput('帮我写一个用户登录功能')
            }}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            💻 代码开发
          </button>
          <button
            onClick={() => {
              setInput('整理一下项目文档')
            }}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            📝 文档整理
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        {/* Toolbar */}
        <div className="flex items-center gap-1 mb-3">
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <Smile className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ImageIcon className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <Folder className="w-5 h-5" />
          </button>
          {currentSession?.type === 'group' && (
            <button 
              onClick={() => {
                setInput(prev => prev + '@')
                inputRef.current?.focus()
              }}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="@提及成员"
            >
              <AtSign className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1" />
          {masterBot && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full text-xs text-amber-700">
              <Bot className="w-3.5 h-3.5" />
              群主：{masterBot.name}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-end gap-3 relative">
          {showMentionDropdown && (
            <MentionDropdown
              bots={mentionableBots}
              query={mentionQuery}
              onSelect={handleMentionSelect}
              selectedIndex={mentionSelectedIndex}
            />
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={currentSession?.type === 'group' ? "请输入消息，使用 @ 提及成员..." : "请输入消息..."}
            rows={1}
            className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[44px] max-h-[120px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-[#95ec69] hover:bg-[#85d95c] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-gray-900 font-medium text-sm transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>
      </div>

      {/* Task Creation Modal */}
      {currentProjectId && (
        <TaskCreationModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          sessionId={currentSessionId}
          projectId={currentProjectId}
        />
      )}
    </div>
  )
}
