/**
 * ChatArea 组件 - 聊天区域
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Paper,
  Chip,
  Tooltip,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material'
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  AttachFile as AttachIcon,
  EmojiEmotions as EmojiIcon,
  AlternateEmail as MentionIcon,
} from '@mui/icons-material'
import { useNanobotStore } from '../stores/nanobotStore'

export const ChatArea: React.FC = () => {
  const {
    currentProjectId,
    messages,
    projectBots,
    bots,
    sendChatMessage,
  } = useNanobotStore()

  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [mentionAnchor, setMentionAnchor] = useState<HTMLElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentBotIds = currentProjectId ? projectBots.get(currentProjectId) || [] : []
  const currentBots = currentBotIds.map(id => bots.get(id)).filter(b => b?.is_active)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim() || !currentProjectId || isSending) return

    const content = inputValue.trim()
    setInputValue('')
    setIsSending(true)

    try {
      await sendChatMessage(content)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMentionClick = (event: React.MouseEvent<HTMLElement>) => {
    setMentionAnchor(event.currentTarget)
  }

  const handleMentionSelect = (botName: string) => {
    setInputValue(prev => `${prev}@${botName} `)
    setMentionAnchor(null)
    inputRef.current?.focus()
  }

  const renderMessage = (msg: typeof messages[0]) => {
    const isUser = msg.role === 'user'
    const bot = msg.bot_id ? bots.get(msg.bot_id) : null

    return (
      <Box
        key={msg.id}
        sx={{
          display: 'flex',
          gap: 1.5,
          mb: 2,
          flexDirection: isUser ? 'row-reverse' : 'row',
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: isUser ? 'primary.main' : bot?.is_active ? 'success.main' : 'grey.500',
          }}
        >
          {isUser ? <PersonIcon /> : <BotIcon />}
        </Avatar>

        <Box sx={{ maxWidth: '70%' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 0.5,
              justifyContent: isUser ? 'flex-end' : 'flex-start',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {isUser ? '我' : bot?.name || 'AI助手'}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {new Date(msg.created_at).toLocaleTimeString()}
            </Typography>
          </Box>

          <Paper
            sx={{
              p: 1.5,
              bgcolor: isUser ? 'primary.main' : 'background.paper',
              color: isUser ? 'primary.contrastText' : 'text.primary',
              borderRadius: 2,
              border: isUser ? 'none' : '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" whiteSpace="pre-wrap">
              {msg.content}
            </Typography>
          </Paper>
        </Box>
      </Box>
    )
  }

  if (!currentProjectId) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <BotIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="h6" color="text.secondary">
          请选择一个项目开始聊天
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 头部 */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          项目群聊
        </Typography>

        {currentBots.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {currentBots.slice(0, 3).map(bot => (
              <Chip
                key={bot!.id}
                size="small"
                label={bot!.name}
                color="success"
                variant="outlined"
                icon={<BotIcon />}
              />
            ))}
            {currentBots.length > 3 && (
              <Chip
                size="small"
                label={`+${currentBots.length - 3}`}
                variant="outlined"
              />
            )}
          </Box>
        )}
      </Box>

      {/* 消息列表 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {messages.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              开始群聊吧
            </Typography>
            <Typography variant="caption" color="text.disabled">
              添加数字员工后，可以@他们进行任务分配
            </Typography>
          </Box>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* 输入框 */}
      <Box
        sx={{
          p: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <Tooltip title="@提及">
            <IconButton size="small" onClick={handleMentionClick}>
              <MentionIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="添加附件">
            <IconButton size="small">
              <AttachIcon />
            </IconButton>
          </Tooltip>

          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder={currentBots.length > 0 ? "输入消息，使用 @ 提及数字员工..." : "请先添加并启动数字员工"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || currentBots.length === 0}
            size="small"
          />

          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending || currentBots.length === 0}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>

      {/* @提及弹窗 */}
      <Popover
        open={Boolean(mentionAnchor)}
        anchorEl={mentionAnchor}
        onClose={() => setMentionAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <List sx={{ minWidth: 200, maxHeight: 300, overflow: 'auto' }}>
          {currentBots.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="没有可用的数字员工"
                secondary="请先添加并启动数字员工"
              />
            </ListItem>
          ) : (
            currentBots.map(bot => (
              <ListItem
                key={bot!.id}
                button
                onClick={() => handleMentionSelect(bot!.name)}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <BotIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={bot!.name}
                  secondary={bot!.model.split('/').pop()}
                />
              </ListItem>
            ))
          )}
        </List>
      </Popover>
    </Box>
  )
}
