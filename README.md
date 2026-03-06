# 微光机器人 (Weiyuan Bot)

微光机器人是一个智能数字员工管理平台，支持多 Agent 协作、群聊交互、项目管理等功能。

## 功能特性

- **数字员工管理**：创建、启动、配置多个 AI 数字员工
- **项目协作**：支持多项目管理和项目文件浏览
- **群聊模式**：多个数字员工可以协同工作，进行任务分配和交付
- **桌面应用**：基于 Electron + React 的桌面客户端
- **灵活配置**：支持自定义提示词、技能、工作区等

## 项目结构

```
weiyuan_bot/
├── agents/          # 数字员工配置目录
│   └── [员工名称]/
│       ├── config.json   # 配置文件
│       ├── prompt.md     # 系统提示词
│       ├── start.bat     # Windows 启动脚本
│       └── run.ps1       # PowerShell 启动脚本
├── api/              # API 服务
│   └── main.py
├── nanobot/          # 核心机器人服务
│   ├── src/
│   ├── tests/
│   └── ...
└── ui/               # Electron 桌面客户端
    ├── electron/
    └── src/
        ├── components/
        ├── stores/
        └── ...
```

## 快速开始

### 前置要求

- Node.js 18+
- Python 3.8+
- npm 或 yarn

### 安装依赖

```bash
# 安装前端依赖
cd ui && npm install

# 安装后端依赖（可选）
cd api && pip install -r requirements.txt
cd nanobot && pip install -r requirements.txt
```

### 启动开发服务

```bash
# 启动桌面应用（前端 + Electron）
cd ui && npm run electron:dev
```

启动后访问：
- 前端：http://localhost:5173
- 桌面应用：自动打开 Electron 窗口

### 构建生产版本

```bash
cd ui && npm run build
```

## 使用指南

### 1. 创建项目

点击左侧边栏的「+」按钮创建新项目。

### 2. 添加数字员工

- 点击「数字员工管理」按钮（用户图标）
- 在「全部」标签中启动数字员工
- 点击项目中的「添加」按钮，将启动的数字员工添加到项目

### 3. 群聊协作

添加数字员工后，会自动创建项目群聊，可以：
- 查看所有数字员工
- 分配任务
- 查看交付物

### 4. 创建新的数字员工

1. 打开「数字员工管理」弹窗
2. 点击「创建数字员工」按钮
3. 填写名称、描述、选择模型
4. 配置技能和系统提示词
5. 选择保存目录（可选）

## 配置说明

### 数字员工配置 (agents/[名称]/config.json)

```json
{
  "agents": {
    "defaults": {
      "workspace": "./workspace",
      "model": "anthropic/claude-3-5-sonnet",
      "maxTokens": 8192,
      "temperature": 0.7
    }
  },
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790
  },
  "tools": {
    "web": {
      "search": {
        "apiKey": "",
        "maxResults": 5
      }
    }
  }
}
```

### 支持的模型

- Anthropic Claude 3.5 Sonnet
- Anthropic Claude 3 Opus
- OpenAI GPT-4o
- DeepSeek Chat

## 技术栈

- **前端**：React + TypeScript + Vite + Tailwind CSS + MUI
- **桌面**：Electron
- **后端**：Python + FastAPI
- **AI**：支持多种大语言模型 API

## License

MIT License
