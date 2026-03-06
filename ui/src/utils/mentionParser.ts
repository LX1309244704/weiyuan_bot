import React from 'react'

/**
 * @提及内容解析工具
 */

export interface MentionMatch {
  botId: string
  botName: string
  index: number
  length: number
}

/**
 * 解析消息中的@提及
 * @param content 消息内容
 * @param botMap Bot ID到名称的映射
 * @returns 解析出的提及列表
 */
export function parseMentions(content: string, botMap: Map<string, string>): MentionMatch[] {
  const mentions: MentionMatch[] = []
  const mentionRegex = /@([^\s]+)/g
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    const botName = match[1]
    // 查找对应的Bot ID
    for (const [id, name] of botMap.entries()) {
      if (name === botName) {
        mentions.push({
          botId: id,
          botName: name,
          index: match.index,
          length: match[0].length
        })
        break
      }
    }
  }

  return mentions
}

/**
 * 提取消息中@的Bot ID列表
 * @param content 消息内容
 * @param botMap Bot ID到名称的映射
 * @returns Bot ID列表
 */
export function extractMentionIds(content: string, botMap: Map<string, string>): string[] {
  const mentions = parseMentions(content, botMap)
  return mentions.map(m => m.botId)
}

/**
 * 渲染带@高亮的文本
 * @param content 消息内容
 * @param mentions 提及列表
 * @param onMentionClick 点击提及的回调
 * @returns React节点数组
 */
export function renderHighlightedMentions(
  content: string,
  mentions: MentionMatch[],
  onMentionClick?: (botId: string) => void
): (string | React.ReactElement)[] {
  if (mentions.length === 0) {
    return [content]
  }

  const result: (string | React.ReactElement)[] = []
  let lastIndex = 0

  // 按索引排序
  const sortedMentions = [...mentions].sort((a, b) => a.index - b.index)

  for (const mention of sortedMentions) {
    // 添加@前的文本
    if (mention.index > lastIndex) {
      result.push(content.slice(lastIndex, mention.index))
    }

    // 添加高亮的@
    const mentionText = content.slice(mention.index, mention.index + mention.length)
    const clickHandler = onMentionClick
    const botId = mention.botId
    
    // 使用 React.createElement 避免 JSX 类型问题
    result.push(
      React.createElement('span', {
        key: mention.index,
        className: 'text-blue-600 font-medium cursor-pointer hover:underline',
        onClick: () => clickHandler?.(botId)
      }, mentionText)
    )

    lastIndex = mention.index + mention.length
  }

  // 添加剩余文本
  if (lastIndex < content.length) {
    result.push(content.slice(lastIndex))
  }

  return result
}

/**
 * 检查光标位置是否在@提及中
 * @param content 输入内容
 * @param cursorPos 光标位置
 * @returns 是否正在输入@
 */
export function isTypingMention(content: string, cursorPos: number): boolean {
  const beforeCursor = content.slice(0, cursorPos)
  const lastAtIndex = beforeCursor.lastIndexOf('@')
  
  if (lastAtIndex === -1) return false
  
  // 检查@后是否有空格（如果有，说明已经完成了提及输入）
  const afterAt = beforeCursor.slice(lastAtIndex + 1)
  return !afterAt.includes(' ')
}

/**
 * 获取当前正在输入的@提及文本
 * @param content 输入内容
 * @param cursorPos 光标位置
 * @returns 当前提及文本（不含@）
 */
export function getCurrentMentionText(content: string, cursorPos: number): string | null {
  const beforeCursor = content.slice(0, cursorPos)
  const lastAtIndex = beforeCursor.lastIndexOf('@')
  
  if (lastAtIndex === -1) return null
  
  const afterAt = beforeCursor.slice(lastAtIndex + 1)
  if (afterAt.includes(' ')) return null
  
  return afterAt
}

/**
 * 替换当前正在输入的@提及
 * @param content 原始内容
 * @param cursorPos 光标位置
 * @param replacement 替换文本
 * @returns 新内容和新的光标位置
 */
export function replaceMention(
  content: string,
  cursorPos: number,
  replacement: string
): { newContent: string; newCursorPos: number } {
  const beforeCursor = content.slice(0, cursorPos)
  const lastAtIndex = beforeCursor.lastIndexOf('@')
  
  if (lastAtIndex === -1) {
    return { newContent: content, newCursorPos: cursorPos }
  }
  
  const newContent = content.slice(0, lastAtIndex) + '@' + replacement + ' ' + content.slice(cursorPos)
  const newCursorPos = lastAtIndex + replacement.length + 2 // +2 for @ and space
  
  return { newContent, newCursorPos }
}
