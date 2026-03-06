---
name: 多Agent协同工作系统
overview: 实现多Agent协同工作系统，包含任务创建、自动拆解、分配执行、进度追踪功能，参考图片设计右侧任务协作面板。
design:
  architecture:
    framework: react
  styleKeywords:
    - 浅色卡片
    - 现代简约
    - 圆角设计
    - 状态标签
    - 层次分明
  fontSystem:
    fontFamily: PingFang-SC
    heading:
      size: 16px
      weight: 600
    subheading:
      size: 14px
      weight: 500
    body:
      size: 13px
      weight: 400
  colorSystem:
    primary:
      - "#3B82F6"
      - "#10B981"
      - "#F59E0B"
    background:
      - "#F9FAFB"
      - "#FFFFFF"
      - "#F3F4F6"
    text:
      - "#111827"
      - "#6B7280"
      - "#9CA3AF"
    functional:
      - "#10B981"
      - "#F59E0B"
      - "#EF4444"
      - "#F3F4F6"
todos:
  - id: extend-types
    content: 扩展类型定义：添加Task、SubTask、AgentGroup等核心类型
    status: completed
  - id: extend-store
    content: 扩展Zustand store：添加任务管理状态和方法
    status: completed
    dependencies:
      - extend-types
  - id: create-task-processor
    content: 创建任务处理器：实现主Bot自动拆解任务逻辑
    status: completed
    dependencies:
      - extend-types
  - id: create-agent-panel
    content: 创建AgentGroupPanel组件：右侧群聊任务协作面板
    status: completed
    dependencies:
      - extend-store
  - id: create-task-components
    content: 创建任务相关子组件：TaskCard、SubTaskItem、AgentMemberList
    status: completed
    dependencies:
      - extend-types
  - id: create-task-modal
    content: 创建任务创建弹窗：支持用户输入任务并触发拆解
    status: completed
    dependencies:
      - extend-store
  - id: integrate-chat
    content: 集成任务创建入口到QQChatArea聊天区域
    status: completed
    dependencies:
      - create-task-modal
  - id: update-app-layout
    content: 更新App.tsx布局：添加右侧Agent群聊面板
    status: completed
    dependencies:
      - create-agent-panel
---

## 产品概述

实现一个多Agent协同工作系统，用户创建任务后，主Bot自动拆解任务并分配给项目群中的其他Bot协同完成。

## 核心功能

1. **任务管理**：创建任务、自动拆解子任务、分配执行Bot、追踪执行状态
2. **右侧任务协作面板**：显示Agent群聊成员、任务分配情况、执行进度和交付物
3. **主Bot自动拆解任务逻辑**：解析用户输入，智能拆解为可执行子任务
4. **Bot任务分配和执行追踪**：根据Bot技能自动匹配分配，实时追踪执行状态
5. **群聊成员管理**：添加/移除群聊中的Bot成员

## 视觉设计参考

根据参考图片，右侧面板采用浅色卡片式设计：

- 顶部显示Agent群聊标题和成员数
- 主Bot消息气泡显示任务分配说明
- 任务卡片显示：任务名称、执行Bot、执行状态（已完成/进行中）
- 交付物区域显示生成的文件
- 底部显示审核状态

## 技术栈

- **框架**：React 18 + TypeScript
- **状态管理**：Zustand（与现有项目保持一致）
- **样式**：Tailwind CSS
- **图标**：Lucide React

## 实现策略

基于现有QQ风格三栏布局进行扩展：

1. 将右侧文件面板改造为"Agent群聊"任务协作面板
2. 扩展类型定义，增加Task、SubTask、TaskAssignment等核心数据结构
3. 在Zustand store中添加任务管理状态和方法
4. 实现任务自动拆解逻辑（模拟主Bot的AI能力）
5. 添加群聊成员管理功能

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│  App.tsx (三栏布局)                                          │
│  ┌─────────┬───────────┬─────────────────┬────────────────┐ │
│  │Sidebar  │ Session   │   ChatArea      │  AgentGroup    │ │
│  │(60px)   │ List      │   (flex-1)      │  Panel (320px) │ │
│  │         │ (280px)   │                 │                │ │
│  └─────────┴───────────┴─────────────────┴────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Zustand Store                                              │
│  - tasks: Task[]                    - taskAssignments       │
│  - currentTaskId                    - agentsInGroup         │
│  - taskExecutionLogs                - groupSessions         │
└─────────────────────────────────────────────────────────────┘
```

## 关键数据结构

- **Task**: 主任务（id, title, description, status, subTasks[]）
- **SubTask**: 子任务（id, taskId, title, description, assignedBotId, status）
- **AgentGroup**: Agent群聊（id, name, projectId, botIds, tasks[]）
- **TaskAssignment**: 任务分配记录

## 目录结构

```
ui/src/
├── components/
│   ├── AgentGroupPanel.tsx      # [NEW] 右侧Agent群聊任务面板
│   ├── TaskCard.tsx             # [NEW] 任务卡片组件
│   ├── SubTaskItem.tsx          # [NEW] 子任务项组件
│   ├── AgentMemberList.tsx      # [NEW] 群聊成员列表
│   ├── TaskCreationModal.tsx    # [NEW] 创建任务弹窗
│   ├── QQChatArea.tsx           # [MODIFY] 集成任务创建入口
│   └── QQSessionList.tsx        # [MODIFY] 添加群聊会话类型
├── stores/
│   └── appStore.ts              # [MODIFY] 添加任务管理状态
├── types/
│   └── index.ts                 # [MODIFY] 添加Task相关类型
└── utils/
    └── taskProcessor.ts         # [NEW] 任务拆解处理器
```

## 设计架构

采用现代简约的浅色卡片式设计，与参考图片保持一致的三栏布局。

### 右侧Agent群聊面板设计

- **整体风格**：浅灰色背景(#f9fafb)，圆角卡片设计
- **头部区域**：白色背景，显示"Agent 群聊"标题和成员数量
- **消息区域**：主Bot的任务分配消息以浅灰色气泡展示
- **任务卡片**：
- 已完成任务：绿色左边框，显示"已完成"标签
- 进行中任务：黄色左边框，显示"进行中"标签
- 包含任务名称、执行Agent名称、执行状态
- **交付物区域**：文件卡片展示，支持预览和下载
- **审核区域**：底部审核状态，包含通过/需修改按钮

### 交互设计

- 任务卡片可点击展开查看详情
- 成员列表支持添加/移除Bot
- 实时状态更新带动画效果
- 消息时间戳显示

### 布局细节

- 面板宽度：320px固定宽度
- 卡片间距：12px
- 圆角：12px统一圆角
- 阴影：轻微阴影增加层次感