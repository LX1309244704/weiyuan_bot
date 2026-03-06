/**
 * BotManagerDialog 组件 - 数字员工管理弹窗
 * 管理所有数字员工，可以添加、启动/停止
 * 支持创建数字员工并配置 skill 和 prompt
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Tooltip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material'
import {
  Add as AddIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  SmartToy as BotIcon,
  CheckCircle as CheckIcon,
  AddCircle as AddCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  Settings as SettingsIcon,
  Edit as EditIcon,
} from '@mui/icons-material'
import { useNanobotStore, Bot } from '../stores/nanobotStore'

const AVAILABLE_MODELS = [
  { value: 'anthropic/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
]

const AVAILABLE_SKILLS = [
  '代码编写',
  '文件操作',
  '搜索工具',
  '天气查询',
  '日程管理',
  '邮件处理',
  '数据处理',
  '文档撰写',
]

interface BotConfig {
  name: string
  description: string
  model: string
  skills: string[]
  prompt: string
}

interface BotManagerDialogProps {
  open: boolean
  onClose: () => void
}

export const BotManagerDialog: React.FC<BotManagerDialogProps> = ({ open, onClose }) => {
  const {
    currentProjectId,
    bots,
    projectBots,
    loadAllBots,
    addBot,
    removeBot,
    toggleBot,
    assignBotToProject,
    removeBotFromProject,
  } = useNanobotStore()

  const [activeTab, setActiveTab] = useState(0)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [agentsBaseDir, setAgentsBaseDir] = useState('')

  // 添加 Bot 表单状态
  const [newBotName, setNewBotName] = useState('')
  const [newBotDescription, setNewBotDescription] = useState('')
  const [newBotModel, setNewBotModel] = useState('anthropic/claude-3-5-sonnet')
  const [newBotSkills, setNewBotSkills] = useState<string[]>([])
  const [newBotPrompt, setNewBotPrompt] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // 加载所有 bots
  useEffect(() => {
    if (open) {
      loadAllBots()
    }
  }, [open, loadAllBots])

  // 获取所有 bot 列表
  const allBots = Array.from(bots.values())
  const currentProjectBotIds = currentProjectId ? projectBots.get(currentProjectId) || [] : []
  const projectBotsList = currentProjectBotIds.map(id => bots.get(id)).filter(Boolean) as Bot[]

  // 处理选择工作目录
  const handleSelectAgentsDir = async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.selectDirectory()
      if (dir) {
        setAgentsBaseDir(dir)
      }
    }
  }

  // 处理添加 Bot
  const handleAddBot = async () => {
    if (!newBotName.trim()) return

    setIsAdding(true)
    setAddError(null)

    try {
      // 如果有当前项目，添加到项目；否则只创建 Bot
      const projectId = currentProjectId || 'default'
      await addBot(projectId, newBotName.trim(), newBotDescription, newBotModel)

      // 如果选择了 agents 目录，保存配置
      if (agentsBaseDir && window.electronAPI) {
        const agentDir = `${agentsBaseDir}/${newBotName.trim()}`
        const port = 18790 + Math.floor(Math.random() * 100)
        
        await window.electronAPI.writeAgentConfig(agentDir, {
          name: newBotName.trim(),
          description: newBotDescription,
          model: newBotModel,
          skills: newBotSkills,
          prompt: newBotPrompt || `你是一个名为 ${newBotName.trim()} 的 AI 助手。`,
          workspace: agentDir,
          port,
        })
      }

      setIsAddDialogOpen(false)
      setNewBotName('')
      setNewBotDescription('')
      setNewBotModel('anthropic/claude-3-5-sonnet')
      setNewBotSkills([])
      setNewBotPrompt('')
    } catch (err: any) {
      setAddError(err.message || '添加失败')
    } finally {
      setIsAdding(false)
    }
  }

  // 处理删除 Bot
  const handleDeleteBot = async (botId: string) => {
    if (!confirm('确定要删除这个数字员工吗？')) return
    await removeBot(botId)
  }

  // 处理将 Bot 添加到当前项目
  const handleAddToProject = (botId: string) => {
    if (!currentProjectId) return
    assignBotToProject(botId, currentProjectId)
  }

  // 处理将 Bot 从当前项目移除
  const handleRemoveFromProject = (botId: string) => {
    if (!currentProjectId) return
    removeBotFromProject(botId, currentProjectId)
  }

  // 检查 Bot 是否在当前项目中
  const isBotInCurrentProject = (botId: string) => {
    return currentProjectBotIds.includes(botId)
  }

  // 处理 skill 选择
  const handleSkillToggle = (skill: string) => {
    setNewBotSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BotIcon color="primary" />
            <Typography variant="h6" component="span">
              数字员工管理
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`全部 (${allBots.length})`} />
            <Tab label={`当前项目 (${projectBotsList.length})`} />
          </Tabs>

          <Box sx={{ p: 2, minHeight: 400 }}>
            {/* 全部 Bots 标签 */}
            {activeTab === 0 && (
              <Box>
                {allBots.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      暂无数字员工
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      点击右下角按钮创建数字员工
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {allBots.map((bot) => (
                      <ListItem
                        key={bot.id}
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {currentProjectId && (
                              <Tooltip
                                title={
                                  isBotInCurrentProject(bot.id)
                                    ? '从项目移除'
                                    : bot.is_active
                                      ? '添加到项目'
                                      : '需先启动才能添加'
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      isBotInCurrentProject(bot.id)
                                        ? handleRemoveFromProject(bot.id)
                                        : handleAddToProject(bot.id)
                                    }
                                    disabled={!isBotInCurrentProject(bot.id) && !bot.is_active}
                                    color={isBotInCurrentProject(bot.id) ? 'error' : 'success'}
                                  >
                                    {isBotInCurrentProject(bot.id) ? (
                                      <RemoveCircleIcon fontSize="small" />
                                    ) : (
                                      <AddCircleIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}

                            <Tooltip title={bot.is_active ? '停止' : '启动'}>
                              <IconButton
                                size="small"
                                onClick={() => toggleBot(bot.id)}
                                color={bot.is_active ? 'error' : 'success'}
                              >
                                {bot.is_active ? (
                                  <StopIcon fontSize="small" />
                                ) : (
                                  <StartIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="删除">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteBot(bot.id)}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: bot.is_active ? 'success.main' : 'grey.400',
                              width: 40,
                              height: 40,
                            }}
                          >
                            <BotIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2">{bot.name}</Typography>
                              <Chip
                                size="small"
                                label={bot.is_active ? '运行中' : '已停止'}
                                color={bot.is_active ? 'success' : 'default'}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                              {isBotInCurrentProject(bot.id) && (
                                <Chip
                                  size="small"
                                  label="已加入"
                                  color="primary"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                  icon={<CheckIcon fontSize="small" />}
                                />
                              )}
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                          secondary={
                            <Box component="div">
                              <Typography variant="caption" color="text.secondary" component="span">
                                {bot.model.split('/').pop()}
                              </Typography>
                              {bot.description && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  component="div"
                                  sx={{ mt: 0.5 }}
                                >
                                  {bot.description}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}

            {/* 当前项目 Bots 标签 */}
            {activeTab === 1 && (
              <Box>
                {!currentProjectId ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      请先选择一个项目
                    </Typography>
                  </Box>
                ) : projectBotsList.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      当前项目暂无数字员工
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      在"全部"标签中添加已启动的数字员工
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {projectBotsList.map((bot) => (
                      <ListItem
                        key={bot.id}
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title={bot.is_active ? '停止' : '启动'}>
                              <IconButton
                                size="small"
                                onClick={() => toggleBot(bot.id)}
                                color={bot.is_active ? 'error' : 'success'}
                              >
                                {bot.is_active ? (
                                  <StopIcon fontSize="small" />
                                ) : (
                                  <StartIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="从项目移除">
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveFromProject(bot.id)}
                                color="error"
                              >
                                <RemoveCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: bot.is_active ? 'success.main' : 'grey.400',
                              width: 40,
                              height: 40,
                            }}
                          >
                            <BotIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2">{bot.name}</Typography>
                              <Chip
                                size="small"
                                label={bot.is_active ? '运行中' : '已停止'}
                                color={bot.is_active ? 'success' : 'default'}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                          secondary={
                            <Box component="div">
                              <Typography variant="caption" color="text.secondary" component="span">
                                {bot.model.split('/').pop()}
                              </Typography>
                              {bot.description && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  component="div"
                                  sx={{ mt: 0.5 }}
                                >
                                  {bot.description}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}
          </Box>

        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>关闭</Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsAddDialogOpen(true)}
          >
            创建数字员工
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建 Bot 对话框 */}
      <Dialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>创建数字员工</DialogTitle>
        <DialogContent>
          {addError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="名称"
              value={newBotName}
              onChange={(e) => setNewBotName(e.target.value)}
              fullWidth
              size="small"
              placeholder="例如：代码助手"
            />

            <TextField
              label="描述"
              value={newBotDescription}
              onChange={(e) => setNewBotDescription(e.target.value)}
              fullWidth
              size="small"
              placeholder="可选"
            />

            <FormControl fullWidth size="small">
              <InputLabel>模型</InputLabel>
              <Select
                value={newBotModel}
                onChange={(e) => setNewBotModel(e.target.value)}
              >
                {AVAILABLE_MODELS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" fontWeight={600}>
              配置技能（可选）
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {AVAILABLE_SKILLS.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  onClick={() => handleSkillToggle(skill)}
                  color={newBotSkills.includes(skill) ? 'primary' : 'default'}
                  variant={newBotSkills.includes(skill) ? 'filled' : 'outlined'}
                  clickable
                />
              ))}
            </Box>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" fontWeight={600}>
              系统提示词（可选）
            </Typography>

            <TextField
              label="提示词"
              value={newBotPrompt}
              onChange={(e) => setNewBotPrompt(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={4}
              placeholder="定义数字员工的行为方式、能力特点等..."
            />

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" fontWeight={600}>
              保存配置到文件（可选）
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Agent 配置目录"
                value={agentsBaseDir}
                onChange={(e) => setAgentsBaseDir(e.target.value)}
                fullWidth
                size="small"
                placeholder="选择保存目录，将在目录下创建 Agent 配置文件"
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleSelectAgentsDir}
              >
                选择
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
              配置将保存到选中目录下的 Agent 目录中，包含 config.json 和 prompt.md
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)} disabled={isAdding}>
            取消
          </Button>
          <Button
            onClick={handleAddBot}
            variant="contained"
            disabled={!newBotName.trim() || isAdding}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
