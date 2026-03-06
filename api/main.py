"""
nanobot UI 集成 API
每个数字员工是一个独立的 nanobot 实例，共享项目级记忆
"""

import asyncio
import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from loguru import logger

# nanobot 导入
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "nanobot"))

from nanobot.agent.loop import AgentLoop
from nanobot.agent.memory import MemoryStore
from nanobot.agent.skills import SkillsLoader
from nanobot.agent.context import ContextBuilder
from nanobot.bus.queue import MessageBus
from nanobot.bus.events import InboundMessage, OutboundMessage
from nanobot.providers.base import LLMProvider
from nanobot.providers.registry import ProviderRegistry
from nanobot.config.loader import load_config
from nanobot.session.manager import SessionManager


# ============== 数据模型 ==============

class BotConfig(BaseModel):
    """数字员工配置"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    model: str = "anthropic/claude-3-5-sonnet"
    provider: str = "openrouter"
    description: str = ""
    skills: List[str] = []  # 启用的技能列表
    is_active: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class Project(BaseModel):
    """项目"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    path: str  # 项目路径，也是记忆存储路径
    bots: List[str] = []  # Bot IDs
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class ChatMessage(BaseModel):
    """聊天消息"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str  # user, bot, system
    content: str
    bot_id: Optional[str] = None  # 哪个 bot 发送的
    mentions: List[str] = []  # @提及的 bot IDs
    metadata: Dict[str, Any] = {}
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class SkillInfo(BaseModel):
    """技能信息"""
    name: str
    description: str
    source: str  # builtin, workspace
    available: bool


# ============== Bot 实例 ==============

class BotInstance:
    """数字员工实例 - 包装 nanobot AgentLoop"""
    
    def __init__(
        self,
        config: BotConfig,
        project_path: Path,
        provider: LLMProvider,
        on_message: Optional[callable] = None
    ):
        self.config = config
        self.project_path = project_path
        self.on_message = on_message
        
        # Bot 自己的工作目录（用于技能等）
        self.bot_workspace = project_path / ".bots" / config.id
        self.bot_workspace.mkdir(parents=True, exist_ok=True)
        
        # 创建消息总线
        self.bus = MessageBus()
        
        # 创建 Agent Loop - 使用项目路径作为记忆存储路径
        self.agent = AgentLoop(
            bus=self.bus,
            provider=provider,
            workspace=project_path,  # 关键：使用项目路径，共享项目记忆
            model=config.model,
            temperature=0.1,
            max_tokens=4096,
        )
        
        # 技能加载器
        self.skills_loader = SkillsLoader(self.bot_workspace)
        
        # 会话管理器（共享项目级会话）
        self.session_manager = SessionManager(project_path)
        
        # 运行状态
        self._running = False
        self._task: Optional[asyncio.Task] = None
        
        # 加载启用的技能
        self._load_skills()
        
        logger.info(f"Bot instance created: {config.name} ({config.id})")
    
    def _load_skills(self):
        """加载启用的技能到上下文"""
        # 技能通过 ContextBuilder 在构建消息时注入
        pass
    
    async def start(self):
        """启动 Bot"""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._run())
        logger.info(f"Bot started: {self.config.name}")
    
    async def stop(self):
        """停止 Bot"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self.agent.stop()
        logger.info(f"Bot stopped: {self.config.name}")
    
    async def _run(self):
        """运行 Bot 消息循环"""
        while self._running:
            try:
                # 从总线消费消息
                msg = await asyncio.wait_for(self.bus.consume_inbound(), timeout=1.0)
                
                # 处理消息
                response = await self.agent._process_message(msg)
                
                if response and self.on_message:
                    await self.on_message(self.config.id, response.content)
                    
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Bot {self.config.name} error: {e}")
    
    async def send_message(self, content: str, session_id: str = "default") -> str:
        """发送消息给 Bot 并获取响应"""
        # 构建包含技能提示的上下文
        skills_context = self._build_skills_context()
        
        # 创建入站消息
        msg = InboundMessage(
            channel="api",
            sender_id="user",
            chat_id=session_id,
            content=f"{skills_context}\n\n{content}" if skills_context else content,
        )
        
        # 发布到总线
        await self.bus.publish_inbound(msg)
        
        # 等待响应（通过回调）
        # 这里简化处理，直接调用处理
        response = await self.agent._process_message(msg)
        
        return response.content if response else ""
    
    def _build_skills_context(self) -> str:
        """构建技能上下文提示"""
        if not self.config.skills:
            return ""
        
        parts = []
        for skill_name in self.config.skills:
            content = self.skills_loader.load_skill(skill_name)
            if content:
                parts.append(f"## Skill: {skill_name}\n{content}")
        
        if parts:
            return "# Your Skills\n\n" + "\n\n---\n\n".join(parts)
        return ""


# ============== 项目管理器 ==============

class ProjectManager:
    """项目管理器 - 管理项目和 Bot 实例"""
    
    def __init__(self, workspace_path: Path):
        self.workspace_path = workspace_path
        self.workspace_path.mkdir(parents=True, exist_ok=True)
        
        # 加载配置
        config_path = workspace_path / "config.json"
        self.config = load_config(config_path) if config_path.exists() else None
        
        # Provider
        self.provider_registry = ProviderRegistry()
        self.provider = self._create_provider()
        
        # 数据存储
        self.projects: Dict[str, Project] = {}
        self.bots: Dict[str, BotConfig] = {}
        self.bot_instances: Dict[str, BotInstance] = {}
        self.messages: Dict[str, List[ChatMessage]] = {}  # project_id -> messages
        
        # WebSocket 连接
        self.project_websockets: Dict[str, List[WebSocket]] = {}
        
        # 加载数据
        self._load_data()
    
    def _create_provider(self) -> LLMProvider:
        """创建 LLM Provider"""
        if self.config and self.config.providers:
            # 使用配置中的 provider
            for name, provider_config in self.config.providers:
                if provider_config.api_key:
                    return self.provider_registry.create(
                        name=name,
                        api_key=provider_config.api_key,
                        api_base=provider_config.api_base,
                    )
        
        # 默认使用环境变量
        api_key = os.getenv("OPENROUTER_API_KEY", "")
        return self.provider_registry.create("openrouter", api_key=api_key)
    
    def _load_data(self):
        """从磁盘加载项目数据"""
        data_file = self.workspace_path / "data.json"
        if data_file.exists():
            with open(data_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            for p in data.get("projects", []):
                self.projects[p["id"]] = Project(**p)
            
            for b in data.get("bots", []):
                self.bots[b["id"]] = BotConfig(**b)
            
            for pid, msgs in data.get("messages", {}).items():
                self.messages[pid] = [ChatMessage(**m) for m in msgs]
        
        logger.info(f"Loaded {len(self.projects)} projects, {len(self.bots)} bots")
    
    def _save_data(self):
        """保存数据到磁盘"""
        data = {
            "projects": [p.model_dump() for p in self.projects.values()],
            "bots": [b.model_dump() for b in self.bots.values()],
            "messages": {
                pid: [m.model_dump() for m in msgs]
                for pid, msgs in self.messages.items()
            },
        }
        
        data_file = self.workspace_path / "data.json"
        with open(data_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    # ========== 项目管理 ==========
    
    def create_project(self, name: str, description: str = "", path: Optional[str] = None) -> Project:
        """创建项目"""
        project_path = Path(path) if path else self.workspace_path / "projects" / str(uuid.uuid4())
        project_path.mkdir(parents=True, exist_ok=True)
        
        project = Project(
            name=name,
            description=description,
            path=str(project_path),
        )
        
        self.projects[project.id] = project
        self.messages[project.id] = []
        self._save_data()
        
        logger.info(f"Project created: {name} ({project.id})")
        return project
    
    def get_project(self, project_id: str) -> Optional[Project]:
        """获取项目"""
        return self.projects.get(project_id)
    
    def list_projects(self) -> List[Project]:
        """列出所有项目"""
        return list(self.projects.values())
    
    def delete_project(self, project_id: str):
        """删除项目"""
        if project_id in self.projects:
            # 停止所有 Bot
            project = self.projects[project_id]
            for bot_id in project.bots:
                self.stop_bot(bot_id)
            
            del self.projects[project_id]
            del self.messages[project_id]
            self._save_data()
    
    # ========== Bot 管理 ==========
    
    def create_bot(self, project_id: str, name: str, **kwargs) -> BotConfig:
        """创建 Bot"""
        project = self.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        bot = BotConfig(name=name, **kwargs)
        self.bots[bot.id] = bot
        
        # 添加到项目
        project.bots.append(bot.id)
        self._save_data()
        
        logger.info(f"Bot created: {name} ({bot.id}) for project {project_id}")
        return bot
    
    def get_bot(self, bot_id: str) -> Optional[BotConfig]:
        """获取 Bot 配置"""
        return self.bots.get(bot_id)
    
    def update_bot(self, bot_id: str, **kwargs) -> Optional[BotConfig]:
        """更新 Bot 配置"""
        bot = self.bots.get(bot_id)
        if not bot:
            return None
        
        for key, value in kwargs.items():
            if hasattr(bot, key):
                setattr(bot, key, value)
        
        self._save_data()
        
        # 如果 Bot 正在运行，重启以应用配置
        if bot_id in self.bot_instances:
            asyncio.create_task(self.restart_bot(bot_id))
        
        return bot
    
    def delete_bot(self, bot_id: str):
        """删除 Bot"""
        if bot_id in self.bots:
            # 停止 Bot
            self.stop_bot(bot_id)
            
            # 从项目中移除
            for project in self.projects.values():
                if bot_id in project.bots:
                    project.bots.remove(bot_id)
            
            del self.bots[bot_id]
            self._save_data()
    
    async def start_bot(self, bot_id: str):
        """启动 Bot 实例"""
        if bot_id in self.bot_instances:
            return  # 已经在运行
        
        bot_config = self.bots.get(bot_id)
        if not bot_config:
            raise ValueError(f"Bot {bot_id} not found")
        
        # 找到 Bot 所属的项目
        project = None
        for p in self.projects.values():
            if bot_id in p.bots:
                project = p
                break
        
        if not project:
            raise ValueError(f"Bot {bot_id} is not associated with any project")
        
        # 创建实例
        instance = BotInstance(
            config=bot_config,
            project_path=Path(project.path),
            provider=self.provider,
            on_message=self._on_bot_message,
        )
        
        self.bot_instances[bot_id] = instance
        await instance.start()
        
        bot_config.is_active = True
        self._save_data()
        
        logger.info(f"Bot started: {bot_config.name}")
    
    async def stop_bot(self, bot_id: str):
        """停止 Bot 实例"""
        if bot_id in self.bot_instances:
            instance = self.bot_instances[bot_id]
            await instance.stop()
            del self.bot_instances[bot_id]
            
            if bot_id in self.bots:
                self.bots[bot_id].is_active = False
                self._save_data()
            
            logger.info(f"Bot stopped: {bot_id}")
    
    async def restart_bot(self, bot_id: str):
        """重启 Bot"""
        await self.stop_bot(bot_id)
        await self.start_bot(bot_id)
    
    async def send_message_to_bot(self, bot_id: str, content: str, session_id: str = "default") -> str:
        """发送消息给 Bot"""
        # 确保 Bot 在运行
        if bot_id not in self.bot_instances:
            await self.start_bot(bot_id)
        
        instance = self.bot_instances[bot_id]
        response = await instance.send_message(content, session_id)
        return response
    
    def _on_bot_message(self, bot_id: str, content: str):
        """Bot 发送消息的回调"""
        # 找到 Bot 所属的项目
        for project in self.projects.values():
            if bot_id in project.bots:
                # 创建消息
                msg = ChatMessage(
                    role="bot",
                    content=content,
                    bot_id=bot_id,
                )
                self.messages[project.id].append(msg)
                self._save_data()
                
                # 广播到 WebSocket
                asyncio.create_task(self._broadcast_to_project(project.id, {
                    "type": "message",
                    "data": msg.model_dump(),
                }))
                break
    
    # ========== WebSocket ==========
    
    async def connect_websocket(self, project_id: str, websocket: WebSocket):
        """连接 WebSocket"""
        await websocket.accept()
        
        if project_id not in self.project_websockets:
            self.project_websockets[project_id] = []
        
        self.project_websockets[project_id].append(websocket)
        
        # 发送历史消息
        history = self.messages.get(project_id, [])
        await websocket.send_json({
            "type": "history",
            "data": [m.model_dump() for m in history],
        })
    
    def disconnect_websocket(self, project_id: str, websocket: WebSocket):
        """断开 WebSocket"""
        if project_id in self.project_websockets:
            if websocket in self.project_websockets[project_id]:
                self.project_websockets[project_id].remove(websocket)
    
    async def _broadcast_to_project(self, project_id: str, message: Dict):
        """广播消息到项目的所有 WebSocket"""
        if project_id not in self.project_websockets:
            return
        
        disconnected = []
        for ws in self.project_websockets[project_id]:
            try:
                await ws.send_json(message)
            except:
                disconnected.append(ws)
        
        for ws in disconnected:
            self.project_websockets[project_id].remove(ws)
    
    # ========== 技能 ==========
    
    def list_skills(self) -> List[SkillInfo]:
        """列出所有可用技能"""
        skills = []
        
        # 内置技能
        builtin_skills_dir = Path(__file__).parent.parent / "nanobot" / "nanobot" / "skills"
        if builtin_skills_dir.exists():
            for skill_dir in builtin_skills_dir.iterdir():
                if skill_dir.is_dir() and (skill_dir / "SKILL.md").exists():
                    content = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
                    description = self._extract_skill_description(content)
                    skills.append(SkillInfo(
                        name=skill_dir.name,
                        description=description,
                        source="builtin",
                        available=True,
                    ))
        
        return skills
    
    def _extract_skill_description(self, content: str) -> str:
        """从技能文件提取描述"""
        # 简单提取第一行非空行作为描述
        for line in content.split("\n"):
            line = line.strip()
            if line and not line.startswith("#"):
                return line[:100]
        return ""


# ============== FastAPI 应用 ==============

# 全局管理器
workspace_path = Path.home() / ".weiyuan_bot"
manager = ProjectManager(workspace_path)

app = FastAPI(title="WeiYuan Bot API", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== 项目 API ==========

@app.get("/api/projects", response_model=List[Project])
async def list_projects():
    """列出所有项目"""
    return manager.list_projects()


@app.post("/api/projects", response_model=Project)
async def create_project(name: str, description: str = ""):
    """创建项目"""
    return manager.create_project(name, description)


@app.get("/api/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """获取项目详情"""
    project = manager.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    """删除项目"""
    manager.delete_project(project_id)
    return {"status": "ok"}


# ========== Bot API ==========

@app.get("/api/projects/{project_id}/bots", response_model=List[BotConfig])
async def list_bots(project_id: str):
    """列出项目的所有 Bot"""
    project = manager.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return [manager.get_bot(bid) for bid in project.bots if manager.get_bot(bid)]


@app.post("/api/projects/{project_id}/bots", response_model=BotConfig)
async def create_bot(project_id: str, name: str, description: str = "", model: str = "anthropic/claude-3-5-sonnet"):
    """创建 Bot"""
    return manager.create_bot(project_id, name, description=description, model=model)


@app.get("/api/bots/{bot_id}", response_model=BotConfig)
async def get_bot(bot_id: str):
    """获取 Bot 详情"""
    bot = manager.get_bot(bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


@app.put("/api/bots/{bot_id}", response_model=BotConfig)
async def update_bot(bot_id: str, config: Dict[str, Any]):
    """更新 Bot 配置"""
    bot = manager.update_bot(bot_id, **config)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


@app.delete("/api/bots/{bot_id}")
async def delete_bot(bot_id: str):
    """删除 Bot"""
    manager.delete_bot(bot_id)
    return {"status": "ok"}


@app.post("/api/bots/{bot_id}/start")
async def start_bot(bot_id: str):
    """启动 Bot"""
    await manager.start_bot(bot_id)
    return {"status": "ok"}


@app.post("/api/bots/{bot_id}/stop")
async def stop_bot(bot_id: str):
    """停止 Bot"""
    await manager.stop_bot(bot_id)
    return {"status": "ok"}


@app.post("/api/bots/{bot_id}/skills")
async def update_bot_skills(bot_id: str, skills: List[str]):
    """更新 Bot 技能"""
    bot = manager.update_bot(bot_id, skills=skills)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


# ========== 聊天 API ==========

@app.get("/api/projects/{project_id}/messages", response_model=List[ChatMessage])
async def get_messages(project_id: str):
    """获取项目消息历史"""
    return manager.messages.get(project_id, [])


@app.post("/api/projects/{project_id}/messages")
async def send_message(project_id: str, content: str, bot_id: Optional[str] = None):
    """发送消息"""
    project = manager.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 保存用户消息
    user_msg = ChatMessage(role="user", content=content)
    manager.messages[project_id].append(user_msg)
    
    # 广播用户消息
    await manager._broadcast_to_project(project_id, {
        "type": "message",
        "data": user_msg.model_dump(),
    })
    
    # 如果有指定 Bot，发送给 Bot
    if bot_id:
        response = await manager.send_message_to_bot(bot_id, content, project_id)
        
        # 保存 Bot 响应
        bot_msg = ChatMessage(role="bot", content=response, bot_id=bot_id)
        manager.messages[project_id].append(bot_msg)
        manager._save_data()
        
        # 广播 Bot 消息
        await manager._broadcast_to_project(project_id, {
            "type": "message",
            "data": bot_msg.model_dump(),
        })
        
        return bot_msg
    
    # 如果没有指定 Bot，发送给所有活跃的 Bot（群聊模式）
    responses = []
    for bid in project.bots:
        bot = manager.get_bot(bid)
        if bot and bot.is_active:
            response = await manager.send_message_to_bot(bid, content, project_id)
            responses.append({"bot_id": bid, "response": response})
    
    return {"status": "ok", "responses": responses}


# ========== WebSocket ==========

@app.websocket("/ws/projects/{project_id}")
async def project_websocket(websocket: WebSocket, project_id: str):
    """项目 WebSocket 连接"""
    await manager.connect_websocket(project_id, websocket)
    
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                content = data.get("content", "")
                bot_id = data.get("bot_id")
                
                # 处理消息
                await send_message(project_id, content, bot_id)
                
    except WebSocketDisconnect:
        manager.disconnect_websocket(project_id, websocket)


# ========== 技能 API ==========

@app.get("/api/skills", response_model=List[SkillInfo])
async def list_skills():
    """列出所有可用技能"""
    return manager.list_skills()


# ============== 启动 ==============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
