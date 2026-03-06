/**
 * API 服务 - 对接后端 nanobot API
 * 支持模拟模式（无后端时使用）
 */

const API_BASE = 'http://localhost:8000/api';

// 模拟数据存储
const mockBots: Map<string, any> = new Map();
const mockProjects: Map<string, any> = new Map();

// 检测是否使用模拟模式（开发环境默认使用模拟模式）
const isMockMode = () => {
  // 开发环境默认使用模拟模式
  return true;
};

// ============== 项目 API ==============

export async function listProjects() {
  if (isMockMode()) {
    return Array.from(mockProjects.values());
  }
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error('Failed to list projects');
  return res.json();
}

export async function createProject(name: string, description: string = '') {
  if (isMockMode()) {
    const project = {
      id: `proj_${Date.now()}`,
      name,
      description,
      path: '',
      bots: [],
      created_at: new Date().toISOString(),
    };
    mockProjects.set(project.id, project);
    return project;
  }
  const res = await fetch(`${API_BASE}/projects?name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function getProject(projectId: string) {
  if (isMockMode()) {
    return mockProjects.get(projectId);
  }
  const res = await fetch(`${API_BASE}/projects/${projectId}`);
  if (!res.ok) throw new Error('Failed to get project');
  return res.json();
}

export async function deleteProject(projectId: string) {
  if (isMockMode()) {
    mockProjects.delete(projectId);
    return { success: true };
  }
  const res = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete project');
  return res.json();
}

// ============== Bot API ==============

export async function listBots(projectId: string) {
  if (isMockMode()) {
    return Array.from(mockBots.values()).filter(b => b.projectId === projectId);
  }
  const res = await fetch(`${API_BASE}/projects/${projectId}/bots`);
  if (!res.ok) throw new Error('Failed to list bots');
  return res.json();
}

export async function listAllBots() {
  if (isMockMode()) {
    return Array.from(mockBots.values());
  }
  const res = await fetch(`${API_BASE}/bots`);
  if (!res.ok) throw new Error('Failed to list all bots');
  return res.json();
}

export async function createBot(projectId: string, name: string, description: string = '', model: string = 'anthropic/claude-3-5-sonnet') {
  if (isMockMode()) {
    const bot = {
      id: `bot_${Date.now()}`,
      name,
      description,
      model,
      provider: model.split('/')[0],
      skills: [],
      is_active: false,
      projectId,
      created_at: new Date().toISOString(),
    };
    mockBots.set(bot.id, bot);
    return bot;
  }
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/bots?name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}&model=${encodeURIComponent(model)}`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error('Failed to create bot');
  return res.json();
}

export async function getBot(botId: string) {
  if (isMockMode()) {
    return mockBots.get(botId);
  }
  const res = await fetch(`${API_BASE}/bots/${botId}`);
  if (!res.ok) throw new Error('Failed to get bot');
  return res.json();
}

export async function updateBot(botId: string, config: Record<string, any>) {
  if (isMockMode()) {
    const bot = mockBots.get(botId);
    if (bot) {
      Object.assign(bot, config);
    }
    return bot;
  }
  const res = await fetch(`${API_BASE}/bots/${botId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update bot');
  return res.json();
}

export async function deleteBot(botId: string) {
  if (isMockMode()) {
    mockBots.delete(botId);
    return { success: true };
  }
  const res = await fetch(`${API_BASE}/bots/${botId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete bot');
  return res.json();
}

export async function startBot(botId: string) {
  if (isMockMode()) {
    const bot = mockBots.get(botId);
    if (bot) {
      bot.is_active = true;
    }
    return { success: true };
  }
  const res = await fetch(`${API_BASE}/bots/${botId}/start`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to start bot');
  return res.json();
}

export async function stopBot(botId: string) {
  if (isMockMode()) {
    const bot = mockBots.get(botId);
    if (bot) {
      bot.is_active = false;
    }
    return { success: true };
  }
  const res = await fetch(`${API_BASE}/bots/${botId}/stop`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to stop bot');
  return res.json();
}

export async function updateBotSkills(botId: string, skills: string[]) {
  if (isMockMode()) {
    const bot = mockBots.get(botId);
    if (bot) {
      bot.skills = skills;
    }
    return bot;
  }
  const res = await fetch(`${API_BASE}/bots/${botId}/skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(skills),
  });
  if (!res.ok) throw new Error('Failed to update bot skills');
  return res.json();
}

// ============== 消息 API ==============

export async function getMessages(projectId: string) {
  if (isMockMode()) {
    return [];
  }
  const res = await fetch(`${API_BASE}/projects/${projectId}/messages`);
  if (!res.ok) throw new Error('Failed to get messages');
  return res.json();
}

export async function sendMessage(projectId: string, content: string, botId?: string) {
  if (isMockMode()) {
    return { data: { id: `msg_${Date.now()}`, role: 'bot', content: '模拟回复: ' + content } };
  }
  const params = new URLSearchParams({ content });
  if (botId) params.append('bot_id', botId);
  
  const res = await fetch(`${API_BASE}/projects/${projectId}/messages?${params}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

// ============== 技能 API ==============

export async function listSkills() {
  if (isMockMode()) {
    return [
      { name: '代码编写', description: '编写各类代码', source: 'builtin', available: true },
      { name: '文件操作', description: '读取写入文件', source: 'builtin', available: true },
      { name: '搜索工具', description: '网络搜索', source: 'builtin', available: true },
      { name: '天气查询', description: '查询天气信息', source: 'builtin', available: true },
      { name: '日程管理', description: '管理日程安排', source: 'builtin', available: true },
      { name: '邮件处理', description: '发送接收邮件', source: 'builtin', available: true },
    ];
  }
  const res = await fetch(`${API_BASE}/skills`);
  if (!res.ok) throw new Error('Failed to list skills');
  return res.json();
}

// ============== WebSocket ==============

export function createProjectWebSocket(projectId: string): WebSocket {
  return new WebSocket(`ws://localhost:8000/ws/projects/${projectId}`);
}
