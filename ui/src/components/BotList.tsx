/**
 * BotList 组件 - 显示项目中的数字员工列表
 */

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Button,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material'
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material'
import { useNanobotStore } from '../stores/nanobotStore'
import { BotConfigDialog } from './BotConfigDialog'

export const BotList: React.FC = () => {
  const {
    currentProjectId,
    projectBots,
    bots,
    removeBot,
    toggleBot,
    assignBotToProject,
  } = useNanobotStore()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [configuringBot, setConfiguringBot] = useState<string | null>(null)
  const [selectedBotId, setSelectedBotId] = useState('')

  const currentBotIds = currentProjectId ? projectBots.get(currentProjectId) || [] : []
  const currentBots = currentBotIds.map(id => bots.get(id)).filter(Boolean)

  // 获取可添加的 Bot：已启动且未添加到当前项目的
  const availableBots = Array.from(bots.values()).filter(
    bot => bot.is_active && !currentBotIds.includes(bot.id)
  )

  // 处理从下拉列表选择并添加 Bot
  const handleSelectAndAddBot = () => {
    if (!currentProjectId || !selectedBotId) return
    assignBotToProject(selectedBotId, currentProjectId)
    setIsAddDialogOpen(false)
    setSelectedBotId('')
  }

  const handleDeleteBot = async (botId: string) => {
    if (!confirm('确定要删除这个数字员工吗？')) return
    await removeBot(botId)
  }

  const selectedBot = configuringBot ? bots.get(configuringBot) || null : null

  if (!currentProjectId) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          请先选择一个项目
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 头部 */}
      <Box sx={{
        p: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Typography variant="subtitle2" fontWeight={600}>
          数字员工 ({currentBots.length})
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setIsAddDialogOpen(true)}
        >
          添加
        </Button>
      </Box>

      {/* Bot 列表 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {currentBots.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              暂无数字员工
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              点击上方按钮添加
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {currentBots.map((bot) => (
              <Box
                key={bot!.id}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 1,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: bot!.is_active ? 'success.main' : 'grey.400',
                    }}
                  >
                    <BotIcon />
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" noWrap>
                        {bot!.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={bot!.is_active ? '运行中' : '已停止'}
                        color={bot!.is_active ? 'success' : 'default'}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>

                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {bot!.model.split('/').pop()}
                    </Typography>

                    {bot!.skills.length > 0 && (
                      <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {bot!.skills.slice(0, 3).map(skill => (
                          <Chip
                            key={skill}
                            label={skill}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                        ))}
                        {bot!.skills.length > 3 && (
                          <Chip
                            label={`+${bot!.skills.length - 3}`}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title={bot!.is_active ? '停止' : '启动'}>
                      <IconButton
                        size="small"
                        onClick={() => toggleBot(bot!.id)}
                        color={bot!.is_active ? 'error' : 'success'}
                      >
                        {bot!.is_active ? <StopIcon fontSize="small" /> : <StartIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="配置">
                      <IconButton
                        size="small"
                        onClick={() => setConfiguringBot(bot!.id)}
                      >
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteBot(bot!.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* 添加 Bot 对话框 - 下拉选择已启动的数字员工 */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>添加数字员工</DialogTitle>
        <DialogContent>
          {availableBots.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                暂无已启动的数字员工
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                请先在"数字员工管理"中启动数字员工
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>选择数字员工</InputLabel>
                <Select
                  value={selectedBotId}
                  onChange={(e) => setSelectedBotId(e.target.value)}
                  label="选择数字员工"
                >
                  {availableBots.map((bot) => (
                    <MenuItem key={bot.id} value={bot.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BotIcon fontSize="small" color="success" />
                        <span>{bot.name}</span>
                        <Typography variant="caption" color="text.secondary">
                          ({bot.model.split('/').pop()})
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={handleSelectAndAddBot}
            variant="contained"
            disabled={!selectedBotId}
          >
            添加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 配置 Bot 对话框 */}
      <BotConfigDialog
        open={!!configuringBot}
        bot={selectedBot}
        onClose={() => setConfiguringBot(null)}
      />
    </Box>
  )
}
