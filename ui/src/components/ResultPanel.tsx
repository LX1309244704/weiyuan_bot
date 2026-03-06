import { FileCode, FileText, Image } from 'lucide-react'
import { useStore } from '../stores/appStore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ResultPanel() {
  const { taskResults } = useStore()

  const demoResults = taskResults.length > 0 ? taskResults : [
    {
      id: '1',
      type: 'html' as const,
      content: '<div class="demo">\n  <h1>Hello World</h1>\n  <p>这是一个HTML预览示例</p>\n</div>',
      timestamp: new Date().toISOString()
    },
    {
      id: '2',
      type: 'markdown' as const,
      content: '# 任务结果\n\n## 完成状态\n- [x] 创建组件\n- [x] 添加样式\n- [ ] 编写测试\n\n这是一个**Markdown**预览示例。',
      timestamp: new Date().toISOString()
    }
  ]

  const renderContent = (result: typeof demoResults[0]) => {
    if (result.type === 'html') {
      return (
        <div className="border rounded overflow-hidden">
          <div className="bg-gray-100 px-2 py-1 text-xs text-gray-500 border-b flex items-center gap-1">
            <FileCode className="w-3 h-3" />
            <span>HTML预览</span>
          </div>
          <div
            className="p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: result.content }}
          />
        </div>
      )
    }

    if (result.type === 'markdown') {
      return (
        <div className="border rounded overflow-hidden">
          <div className="bg-gray-100 px-2 py-1 text-xs text-gray-500 border-b flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span>Markdown预览</span>
          </div>
          <div className="p-4 bg-white prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result.content}
            </ReactMarkdown>
          </div>
        </div>
      )
    }

    return (
      <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">
        {result.content}
      </pre>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 flex items-center px-4 border-b border-[#e5e5e5]">
        <span className="font-semibold text-sm text-gray-900">项目结果</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {demoResults.map((result) => (
          <div key={result.id} className="border rounded-lg overflow-hidden shadow-sm">
            <div className="px-3 py-2 bg-gray-50 flex items-center gap-2">
              {result.type === 'html' && <FileCode className="w-4 h-4" />}
              {result.type === 'markdown' && <FileText className="w-4 h-4" />}
              {result.type === 'image' && <Image className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {result.type === 'html' ? 'HTML' : result.type === 'markdown' ? 'Markdown' : '文件'}
              </span>
              <span className="text-xs text-gray-500 ml-auto">
                {new Date(result.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="p-2.5">
              {renderContent(result)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
