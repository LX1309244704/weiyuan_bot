import { useState } from 'react'
import { CheckCircle2, Circle, Clock, AlertCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import type { Task, SubTask } from '../types'

interface TaskCardProps {
  task: Task
  showSubTasks?: boolean
}

const statusConfig = {
  pending: { color: 'bg-gray-100 text-gray-600', icon: Circle, label: '待处理' },
  analyzing: { color: 'bg-blue-50 text-blue-600', icon: Loader2, label: '分析中' },
  assigning: { color: 'bg-purple-50 text-purple-600', icon: Loader2, label: '分配中' },
  running: { color: 'bg-yellow-50 text-yellow-600', icon: Loader2, label: '执行中' },
  completed: { color: 'bg-green-50 text-green-600', icon: CheckCircle2, label: '已完成' },
  failed: { color: 'bg-red-50 text-red-600', icon: AlertCircle, label: '失败' },
}

const subTaskStatusConfig = {
  pending: { color: 'text-gray-400', icon: Circle, label: '待处理' },
  assigned: { color: 'text-blue-400', icon: Circle, label: '已分配' },
  running: { color: 'text-yellow-500', icon: Loader2, label: '执行中' },
  completed: { color: 'text-green-500', icon: CheckCircle2, label: '已完成' },
  failed: { color: 'text-red-500', icon: AlertCircle, label: '失败' },
}

export default function TaskCard({ task, showSubTasks = true }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const status = statusConfig[task.status]
  const StatusIcon = status.icon

  const completedCount = task.subTasks.filter(st => st.status === 'completed').length
  const progress = task.subTasks.length > 0 ? (completedCount / task.subTasks.length) * 100 : 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* 任务头部 */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          <div className={`w-1 h-12 rounded-full ${
            task.status === 'completed' ? 'bg-green-400' :
            task.status === 'failed' ? 'bg-red-400' :
            task.status === 'running' ? 'bg-yellow-400' :
            'bg-blue-400'
          }`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
              <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${status.color}`}>
                <StatusIcon className={`w-3 h-3 ${task.status === 'running' || task.status === 'analyzing' || task.status === 'assigning' ? 'animate-spin' : ''}`} />
                {status.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 line-clamp-2">{task.description}</p>

            {/* 进度条 */}
            {task.subTasks.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>进度</span>
                  <span>{completedCount}/{task.subTasks.length}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      task.status === 'completed' ? 'bg-green-400' :
                      task.status === 'failed' ? 'bg-red-400' :
                      'bg-blue-400'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {showSubTasks && task.subTasks.length > 0 && (
            <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 子任务列表 */}
      {showSubTasks && isExpanded && task.subTasks.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          <div className="p-3 space-y-2">
            {task.subTasks
              .sort((a, b) => a.order - b.order)
              .map((subTask) => (
                <SubTaskItem key={subTask.id} subTask={subTask} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SubTaskItem({ subTask }: { subTask: SubTask }) {
  const status = subTaskStatusConfig[subTask.status]
  const StatusIcon = status.icon

  return (
    <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-gray-100">
      <StatusIcon className={`w-4 h-4 ${status.color} ${subTask.status === 'running' ? 'animate-spin' : ''}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{subTask.title}</span>
          <span className={`text-xs ${status.color}`}>{status.label}</span>
        </div>
        <p className="text-xs text-gray-500 truncate">{subTask.description}</p>
      </div>

      {subTask.assignedBotId && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-[10px] font-medium">
            {(subTask as unknown as Record<string, string>).botName?.[0] || 'B'}
          </div>
        </div>
      )}
    </div>
  )
}
