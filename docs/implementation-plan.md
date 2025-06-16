# 实施计划和技术选型

## 项目概述

本文档详细描述了将 Interactive Feedback MCP 项目迁移到 Cloudflare Workers 平台的实施计划、技术选型和开发路线图。

## 技术选型

### 核心技术栈

#### 1. Cloudflare Workers
**选择理由**:
- 全球边缘计算，低延迟响应
- 无服务器架构，自动扩缩容
- 强大的生态系统和工具链
- 优秀的性能和可靠性

**版本要求**: Workers Runtime API v1.0+

#### 2. TypeScript
**选择理由**:
- 类型安全，减少运行时错误
- 优秀的 IDE 支持和开发体验
- 与 Workers 生态系统完美集成
- 便于团队协作和代码维护

**版本要求**: TypeScript 5.0+

#### 3. Cloudflare KV
**选择理由**:
- 全球分布式键值存储
- 最终一致性，适合会话数据
- 简单的 API，易于使用
- 与 Workers 深度集成

**存储策略**:
- 会话数据: TTL 1小时
- 反馈结果: TTL 24小时
- 配置数据: 永久存储

#### 4. Durable Objects
**选择理由**:
- 强一致性状态管理
- 支持 WebSocket 长连接
- 适合实时通信场景
- 自动故障转移

**使用场景**:
- 会话状态管理
- WebSocket 连接管理
- 实时通知推送

#### 5. 前端技术
**HTML5 + CSS3 + Vanilla JavaScript**
- 无框架依赖，加载速度快
- 现代浏览器兼容性好
- 易于维护和调试
- 支持渐进式增强

### 开发工具链

#### 1. Wrangler CLI
- Cloudflare Workers 官方开发工具
- 本地开发和调试支持
- 部署和版本管理
- 日志查看和监控

#### 2. Miniflare
- 本地 Workers 运行时模拟器
- 支持 KV 和 Durable Objects
- 热重载和调试功能
- 单元测试支持

#### 3. Vitest
- 现代化测试框架
- 支持 TypeScript
- 快速执行和热重载
- 优秀的错误报告

## 项目结构设计

```
cloudflare-workers-feedback/
├── src/
│   ├── handlers/           # API 处理器
│   │   ├── feedback.ts     # 反馈相关 API
│   │   ├── session.ts      # 会话管理 API
│   │   └── websocket.ts    # WebSocket 处理
│   ├── services/           # 业务逻辑服务
│   │   ├── sessionService.ts
│   │   ├── feedbackService.ts
│   │   └── notificationService.ts
│   ├── storage/            # 存储层
│   │   ├── kvStorage.ts    # KV 存储封装
│   │   └── durableObjects.ts
│   ├── utils/              # 工具函数
│   │   ├── validation.ts   # 数据验证
│   │   ├── response.ts     # 响应格式化
│   │   └── security.ts     # 安全相关
│   ├── types/              # TypeScript 类型定义
│   │   ├── api.ts
│   │   ├── session.ts
│   │   └── feedback.ts
│   ├── templates/          # HTML 模板
│   │   ├── feedback.html   # 反馈界面模板
│   │   └── error.html      # 错误页面模板
│   ├── static/             # 静态资源
│   │   ├── styles.css      # 样式文件
│   │   └── script.js       # 前端脚本
│   └── index.ts            # 入口文件
├── tests/                  # 测试文件
│   ├── unit/               # 单元测试
│   ├── integration/        # 集成测试
│   └── e2e/                # 端到端测试
├── docs/                   # 文档
├── wrangler.toml           # Workers 配置
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
└── vitest.config.ts        # 测试配置
```

## 开发阶段规划

### 第一阶段：基础架构搭建 (1-2 周)

**目标**: 建立基础开发环境和核心架构

**任务清单**:
- [ ] 初始化 Cloudflare Workers 项目
- [ ] 配置 TypeScript 开发环境
- [ ] 设置 Wrangler 和 Miniflare
- [ ] 创建基础项目结构
- [ ] 实现基础 API 路由框架
- [ ] 配置 KV 存储和 Durable Objects
- [ ] 编写基础工具函数和类型定义

**交付物**:
- 可运行的基础 Workers 应用
- 完整的开发环境配置
- 基础 API 框架和路由

### 第二阶段：核心功能开发 (2-3 周)

**目标**: 实现核心反馈功能

**任务清单**:
- [ ] 实现会话创建和管理 API
- [ ] 开发反馈界面 HTML 模板
- [ ] 实现反馈提交和状态查询
- [ ] 开发前端交互逻辑
- [ ] 实现数据验证和错误处理
- [ ] 添加会话超时和清理机制
- [ ] 实现基础安全防护

**交付物**:
- 完整的反馈功能 API
- 用户友好的 Web 界面
- 数据持久化和状态管理

### 第三阶段：WebSocket 和高级功能 (2-3 周)

**目标**: 实现 WebSocket 实时通信和高级功能

**任务清单**:
- [ ] 实现 WebSocket 连接管理 (核心功能)
- [ ] 开发实时状态同步机制
- [ ] 实现多端连接支持
- [ ] 添加 App 专用消息协议
- [ ] 实现自动重连和错误处理
- [ ] 添加多语言支持
- [ ] 实现主题切换功能
- [ ] 性能优化和缓存策略
- [ ] 添加监控和日志记录
- [ ] 实现速率限制和安全防护
- [ ] 移动端适配和响应式设计

**交付物**:
- 完整的 WebSocket 实时通信
- App 集成支持
- 完整的高级功能
- 性能优化的应用
- 全面的安全防护

### 第四阶段：测试和部署 (1 周)

**目标**: 全面测试和生产部署

**任务清单**:
- [ ] 编写单元测试和集成测试
- [ ] 进行端到端测试
- [ ] 性能测试和压力测试
- [ ] 安全测试和漏洞扫描
- [ ] 配置生产环境
- [ ] 部署和监控设置
- [ ] 文档完善和交付

**交付物**:
- 全面测试的应用
- 生产环境部署
- 完整的项目文档

## 技术实现细节

### 1. 会话管理实现

```typescript
// 会话数据结构
interface Session {
  sessionId: string;
  message: string;
  predefinedOptions?: string[];
  status: SessionStatus;
  createdAt: Date;
  expiresAt: Date;
  feedback?: FeedbackData;
}

// 会话服务实现
class SessionService {
  constructor(private kv: KVNamespace) {}
  
  async createSession(data: CreateSessionRequest): Promise<Session> {
    const sessionId = crypto.randomUUID();
    const session: Session = {
      sessionId,
      message: data.message,
      predefinedOptions: data.predefinedOptions,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (data.timeout || 300) * 1000)
    };
    
    await this.kv.put(`session:${sessionId}`, JSON.stringify(session), {
      expirationTtl: data.timeout || 300
    });
    
    return session;
  }
}
```

### 2. API 路由实现

```typescript
// 路由处理器
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // API 路由
    if (path.startsWith('/api/feedback')) {
      return handleFeedbackAPI(request, env);
    }
    
    // Web 界面路由
    if (path.startsWith('/feedback/')) {
      return handleFeedbackUI(request, env);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};
```

### 3. WebSocket 实现细节

```typescript
// Durable Object 实现 WebSocket 管理
export class SessionManager {
  private connections: Map<string, WebSocket> = new Map();
  private sessionData: Map<string, SessionInfo> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/ws/')) {
      return this.handleWebSocket(request);
    }

    return new Response('Not found', { status: 404 });
  }

  async handleWebSocket(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }

    const url = new URL(request.url);
    const sessionId = url.pathname.split('/')[2];
    const apiKey = url.searchParams.get('apiKey');
    const clientType = url.searchParams.get('clientType') || 'web';

    // 验证会话和 API Key
    if (!this.validateSession(sessionId, apiKey)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    // 接受 WebSocket 连接
    server.accept();

    // 生成客户端 ID
    const clientId = crypto.randomUUID();

    // 存储连接
    this.connections.set(clientId, server);

    // 发送连接确认
    server.send(JSON.stringify({
      type: 'connection_established',
      data: {
        sessionId,
        clientId,
        serverTime: new Date().toISOString()
      }
    }));

    // 设置消息处理器
    server.addEventListener('message', (event) => {
      this.handleMessage(clientId, sessionId, event.data);
    });

    // 设置关闭处理器
    server.addEventListener('close', () => {
      this.connections.delete(clientId);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private handleMessage(clientId: string, sessionId: string, message: string) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'ping':
          this.sendToClient(clientId, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
          break;

        case 'app_register':
          this.handleAppRegistration(clientId, sessionId, data.data);
          break;

        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  // 广播消息到所有连接的客户端
  broadcastToSession(sessionId: string, message: any) {
    const messageStr = JSON.stringify(message);

    for (const [clientId, connection] of this.connections) {
      if (this.isClientInSession(clientId, sessionId)) {
        try {
          connection.send(messageStr);
        } catch (error) {
          console.error('Error sending message to client:', clientId, error);
          this.connections.delete(clientId);
        }
      }
    }
  }
}
```

### 4. 前端 WebSocket 集成

```javascript
// 前端 WebSocket 客户端
class FeedbackWebSocket {
  constructor(sessionId, apiKey) {
    this.sessionId = sessionId;
    this.apiKey = apiKey;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
  }

  connect() {
    const wsUrl = `wss://api.feedback.example.com/ws/${this.sessionId}?apiKey=${this.apiKey}&clientType=web`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.stopHeartbeat();
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleMessage(message) {
    switch (message.type) {
      case 'connection_established':
        this.onConnectionEstablished(message.data);
        break;

      case 'session_status_changed':
        this.onStatusChanged(message.data);
        break;

      case 'feedback_submitted':
        this.onFeedbackSubmitted(message.data);
        break;

      case 'session_expired':
        this.onSessionExpired(message.data);
        break;

      case 'pong':
        // 心跳响应
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // 30 秒心跳
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, delay);
    }
  }
}

// 在反馈界面中使用
const feedbackWS = new FeedbackWebSocket(sessionId, apiKey);
feedbackWS.connect();

// 监听状态变化
feedbackWS.onStatusChanged = (data) => {
  updateUIStatus(data.newStatus);
};
```

## 部署策略

### 环境配置

#### 开发环境
```toml
# wrangler.toml
name = "feedback-dev"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.dev]
kv_namespaces = [
  { binding = "FEEDBACK_KV", id = "dev-kv-id" }
]

[env.dev.durable_objects]
bindings = [
  { name = "SESSION_MANAGER", class_name = "SessionManager" }
]
```

#### 生产环境
```toml
[env.production]
kv_namespaces = [
  { binding = "FEEDBACK_KV", id = "prod-kv-id" }
]

[env.production.durable_objects]
bindings = [
  { name = "SESSION_MANAGER", class_name = "SessionManager" }
]

[env.production.vars]
API_KEY_HASH = "production-api-key-hash"
```

### CI/CD 流程

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run test
      - run: npm run build
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          environment: production
```

## 监控和运维

### 性能监控
- Workers Analytics 监控请求量和延迟
- KV 操作性能监控
- 错误率和成功率统计

### 日志记录
- 结构化日志输出
- 错误堆栈跟踪
- 用户行为分析

### 告警配置
- API 错误率超过 5% 告警
- 响应时间超过 1s 告警
- KV 存储使用率告警

## 风险评估和缓解

### 技术风险
1. **Workers 运行时限制**: 通过异步处理和状态外化缓解
2. **KV 最终一致性**: 使用 Durable Objects 提供强一致性
3. **冷启动延迟**: 通过预热和缓存优化缓解

### 业务风险
1. **会话丢失**: 实现多重备份和恢复机制
2. **用户体验**: 提供离线支持和错误重试
3. **安全漏洞**: 实施全面的安全防护措施

### 运维风险
1. **服务中断**: 多区域部署和自动故障转移
2. **数据丢失**: 定期备份和数据恢复流程
3. **性能下降**: 实时监控和自动扩缩容
