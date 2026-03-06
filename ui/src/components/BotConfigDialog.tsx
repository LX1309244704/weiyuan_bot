/**
 * Bot 配置对话框
 * 配置 Bot 的模型、技能等
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useNanobotStore, Bot } from '../stores/nanobotStore'

interface BotConfigDialogProps {
  open: boolean
  bot: Bot | null
  onClose: () => void
}

const AVAILABLE_MODELS = [
  { value: 'anthropic/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
  { value: 'deepseek/deepseek-coder', label: 'DeepSeek Coder' },
  { value: 'google/gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
]

export const BotConfigDialog: React.FC<BotConfigDialogProps> = ({
  open,
  bot,
  onClose,
}) => {
  const { skills, loadSkills, configureBot, setBotSkills, toggleBot } = useNanobotStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [model, setModel] = useState('anthropic/claude-3-5-sonnet')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [isActive, setIsActive] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadSkills()
    }
  }, [open])

  useEffect(() => {
    if (bot) {
      setName(bot.name)
      setDescription(bot.description)
      setModel(bot.model)
      setSelectedSkills(bot.skills || [])
      setIsActive(bot.is_active)
    }
  }, [bot])

  const handleSave = async () => {
    if (!bot) return

    setIsSaving(true)
    setError(null)

    try {
      // 更新基本配置
      await configureBot(bot.id, {
        name,
        description,
        model,
      })

      // 更新技能
      const currentSkills = bot.skills || []
      if (JSON.stringify(currentSkills) !== JSON.stringify(selectedSkills)) {
        await setBotSkills(bot.id, selectedSkills)
      }

      onClose()
    } catch (err: any) {
      setError(err.message || '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!bot) return

    try {
      await toggleBot(bot.id)
      setIsActive(!isActive)
    } catch (err: any) {
      setError(err.message || '操作失败')
    }
  }

  const handleSkillToggle = (skillName: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillName)
        ? prev.filter(s => s !== skillName)
        : [...prev, skillName]
    )
  }

  if (!bot) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>配置数字员工 - {bot.name}</DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 基本配置 */}
          <TextField
            label="名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
          />

          <TextField
            label="描述"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            size="small"
          />

          <FormControl fullWidth size="small">
            <InputLabel>模型</InputLabel>
            <Select value={model} onChange={(e) => setModel(e.target.value)}>
              {AVAILABLE_MODELS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider />

          {/* 运行状态 */}
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={handleToggleActive}
                color="success"
              />
            }
            label={isActive ? '运行中' : '已停止'}
          />

          <Divider />

          {/* 技能配置 */}
          <Typography variant="subtitle2" color="text.secondary">
            启用技能
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {skills.map((skill) => (
              <Chip
                key={skill.name}
                label={skill.name}
                title={skill.description}
                onClick={() => handleSkillToggle(skill.name)}
                color={selectedSkills.includes(skill.name) ? 'primary' : 'default'}
                variant={selectedSkills.includes(skill.name) ? 'filled' : 'outlined'}
                disabled={!skill.available}
              />
            ))}
          </Box>

          {skills.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              暂无可用技能
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          取消
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  )
}
