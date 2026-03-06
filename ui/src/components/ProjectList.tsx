/**
 * ProjectList 组件 - 项目列表
 */

import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
} from '@mui/icons-material'
import { useNanobotStore } from '../stores/nanobotStore'

export const ProjectList: React.FC = () => {
  const {
    projects,
    currentProjectId,
    loadProjects,
    addProject,
    removeProject,
    setCurrentProject,
  } = useNanobotStore()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return

    setIsLoading(true)
    await addProject(newProjectName.trim(), newProjectDescription)
    setIsLoading(false)
    setIsAddDialogOpen(false)
    setNewProjectName('')
    setNewProjectDescription('')
  }

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个项目吗？')) return
    await removeProject(id)
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
        <Typography variant="subtitle2" fontWeight={600}>
          项目 ({projects.length})
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setIsAddDialogOpen(true)}
        >
          新建
        </Button>
      </Box>

      {/* 项目列表 */}
      <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {projects.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              暂无项目
            </Typography>
          </Box>
        ) : (
          projects.map((project) => (
            <ListItem
              key={project.id}
              disablePadding
              secondaryAction={
                <Tooltip title="删除项目">
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e: React.MouseEvent) => handleDeleteProject(e, project.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemButton
                selected={currentProjectId === project.id}
                onClick={() => setCurrentProject(project.id)}
              >
                <FolderIcon
                  sx={{
                    mr: 1,
                    color: currentProjectId === project.id ? 'primary.main' : 'text.secondary',
                  }}
                />
                <ListItemText
                  primary={project.name}
                  secondary={project.description || '无描述'}
                  primaryTypographyProps={{ noWrap: true, fontSize: '0.9rem' }}
                  secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>

      {/* 添加项目对话框 */}
      <Dialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>新建项目</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="项目名称"
              value={newProjectName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)}
              fullWidth
              size="small"
              autoFocus
            />
            <TextField
              label="描述（可选）"
              value={newProjectDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProjectDescription(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)} disabled={isLoading}>
            取消
          </Button>
          <Button
            onClick={handleAddProject}
            variant="contained"
            disabled={!newProjectName.trim() || isLoading}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
