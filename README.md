# Building a Remote MCP Server on Cloudflare (With JWT Authentication)

This example allows you to deploy a remote MCP server with JWT Bearer Token authentication on Cloudflare Workers. The server uses a simplified authentication mechanism for better maintainability.

## Get started: 

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless)

This will deploy your MCP server to a URL like: `remote-mcp-server-authless.<your-account>.workers.dev/sse`

Alternatively, you can use the command line below to get the remote MCP Server created on your local machine:
```bash
npm create cloudflare@latest -- my-mcp-server --template=cloudflare/ai/demos/remote-mcp-authless
```

## 🔐 JWT Authentication Configuration

This MCP server uses a simplified JWT Bearer Token authentication mechanism for better security and maintainability.

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT token validation | `your-super-secure-jwt-secret` |

### Setting up Authentication

Configure JWT secret for token validation:

```bash
# Set JWT secret
wrangler secret put JWT_SECRET
# Enter: your-super-secure-jwt-secret
```

### Authentication Method

Include the JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer your-jwt-token" https://your-worker.workers.dev/sse
```

### Generating JWT Tokens

Use the included utility to generate JWT tokens:

```bash
# Generate a JWT token
npm run generate-jwt
```

Or programmatically:

```typescript
import { generateJWT } from './src/auth-utils.js';

const payload = {
  userId: 'user123',
  username: 'john_doe',
  roles: ['user']
};

const token = await generateJWT(payload, 'your-jwt-secret', 3600); // 1 hour expiry
console.log('Generated JWT:', token);
```

## Customizing your MCP Server

To add your own [tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/) to the MCP server, define each tool inside the `init()` method of `src/index.ts` using `this.server.tool(...)`. 

## Connect to Cloudflare AI Playground

You can connect to your MCP server from the Cloudflare AI Playground, which is a remote MCP client:

1. Go to https://playground.ai.cloudflare.com/
2. Enter your deployed MCP server URL (`remote-mcp-server-authless.<your-account>.workers.dev/sse`)
3. **Important:** Add authentication header: `Authorization: Bearer your-jwt-token`
4. You can now use your MCP tools directly from the playground!

## Health Check Endpoint

The server includes a health check endpoint that doesn't require authentication:

```bash
curl https://mcp.123648.xyz/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "MCP Server with JWT Auth"
}
```

## Connect Claude Desktop to your MCP server

You can also connect to your remote MCP server from local MCP clients, by using the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote).

To connect to your MCP server from Claude Desktop, follow [Anthropic's Quickstart](https://modelcontextprotocol.io/quickstart/user) and within Claude Desktop go to Settings > Developer > Edit Config.

### Without Authentication (Development)

```json
{
  "mcpServers": {
    "calculator": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/sse"
      ]
    }
  }
}
```

### With JWT Authentication (Production)

```json
{
  "mcpServers": {
    "calculator": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://remote-mcp-server-authless.your-account.workers.dev/sse"
      ],
      "env": {
        "MCP_REMOTE_HEADERS": "{\"Authorization\": \"Bearer your-jwt-token\"}"
      }
    }
  }
}
```

Restart Claude and you should see the tools become available.

## 🔧 Development and Testing

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.dev.vars` file:
   ```
   JWT_SECRET=your-local-jwt-secret
   ```
4. Start development server: `npm run dev`

### Testing Authentication

Test the health endpoint (no auth required):
```bash
curl http://localhost:8787/health
```

Test with JWT token:
```bash
curl -H "Authorization: Bearer your-jwt-token" http://localhost:8787/sse
```

Test with invalid JWT token (should return 401):
```bash
curl -H "Authorization: Bearer invalid-token" http://localhost:8787/sse
```

### Security Best Practices

1. **Use Strong JWT Secrets**: Generate cryptographically secure JWT secrets with sufficient length (64+ characters)
2. **Rotate Secrets Regularly**: Implement a secret rotation strategy for production environments
3. **Use HTTPS**: Always use HTTPS in production to protect authentication tokens in transit
4. **Monitor Access**: Review logs regularly for suspicious authentication attempts
5. **Environment Separation**: Use different secrets for development, staging, and production environments
6. **Token Expiry**: Set appropriate expiration times for JWT tokens

### Troubleshooting

**Authentication Failed Errors:**
- Verify your JWT token is correct and not expired
- Check that the Authorization header is properly formatted (`Authorization: Bearer <token>`)
- Ensure the JWT_SECRET environment variable is correctly set
- Check the server logs for detailed error messages

**Token Issues:**
- Generate a new JWT token using `npm run generate-jwt`
- Verify the token payload contains the required fields
- Check token expiration time

## 🚀 Interactive Feedback System (v2.0)

本 MCP 服务器现已升级为完整的交互式反馈收集系统，提供以下新功能：

### ✨ 新增功能

#### 📋 完整的反馈 API
- **创建会话**: `POST /api/feedback/create` - 创建新的反馈会话
- **获取状态**: `GET /api/feedback/{sessionId}/status` - 查询会话状态
- **提交反馈**: `POST /api/feedback/{sessionId}/submit` - 提交用户反馈
- **获取结果**: `GET /api/feedback/{sessionId}/result` - 获取反馈结果

#### 🎨 响应式 Web 界面
- **反馈页面**: `GET /feedback/{sessionId}` - 用户友好的反馈界面
- **主题支持**: 支持明暗主题切换 (`?theme=dark|light`)
- **多语言**: 支持中英文切换 (`?lang=zh|en`)
- **响应式设计**: 适配桌面和移动设备

#### ⚡ WebSocket 实时通信
- **实时状态更新**: 会话状态变化时自动推送
- **多端同步**: 支持多个客户端同时监听
- **App 集成**: 支持移动应用和 Web 应用连接

#### 🛠️ 增强的 MCP 工具
- **interactive_feedback**: 创建反馈会话
- **get_feedback_result**: 获取反馈结果
- **check_feedback_status**: 检查会话状态

### 📖 使用示例

#### 1. 通过 MCP 工具创建反馈会话

```typescript
// 在 Claude Desktop 或其他 MCP 客户端中使用
{
  "tool": "interactive_feedback",
  "arguments": {
    "message": "请对我们的服务进行评价",
    "predefinedOptions": ["非常满意", "满意", "一般", "不满意"],
    "timeout": 600,
    "metadata": {
      "source": "customer-service",
      "category": "satisfaction-survey"
    }
  }
}
```

#### 2. 通过 API 创建反馈会话

```bash
curl -X POST https://your-worker.workers.dev/api/feedback/create \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请选择您喜欢的功能",
    "predefinedOptions": ["功能A", "功能B", "功能C"],
    "timeout": 300
  }'
```

#### 3. 用户访问反馈界面

用户访问返回的 `feedbackUrl`，例如：
```
https://your-worker.workers.dev/feedback/123e4567-e89b-12d3-a456-426614174000?theme=dark&lang=zh
```

#### 4. 获取反馈结果

```bash
curl -H "Authorization: Bearer your-jwt-token" \
  https://your-worker.workers.dev/api/feedback/123e4567-e89b-12d3-a456-426614174000/result
```

#### 5. WebSocket 实时监听

```javascript
const ws = new WebSocket('wss://your-worker.workers.dev/ws/123e4567-e89b-12d3-a456-426614174000?apiKey=your-api-key&clientType=web');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('收到消息:', message);

  switch (message.type) {
    case 'connection_established':
      console.log('连接已建立');
      break;
    case 'session_status_changed':
      console.log('状态变化:', message.data);
      break;
    case 'feedback_submitted':
      console.log('反馈已提交:', message.data);
      break;
  }
};
```

### 🧪 测试

运行完整的测试套件：

```bash
# 安装测试依赖
npm install

# 运行测试
node test/interactive-feedback-tests.js
```

测试包括：
- ✅ 健康检查
- ✅ 创建反馈会话
- ✅ 获取会话状态
- ✅ 提交反馈
- ✅ 获取反馈结果
- ✅ 反馈界面访问
- ✅ WebSocket 连接

### 🔧 配置选项

#### 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 令牌密钥 | 必需 |
| `OAUTH_KV` | KV 存储绑定 | 必需 |

#### 会话配置

- **默认超时**: 300 秒 (5 分钟)
- **最大超时**: 3600 秒 (1 小时)
- **最大消息长度**: 1000 字符
- **最大选项数量**: 10 个
- **最大选项长度**: 100 字符

### 🏗️ 架构说明

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │    │   Web Browser   │    │  Mobile App     │
│  (Claude etc.)  │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ JWT Auth             │ No Auth              │ WebSocket
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Cloudflare Worker                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ MCP Handler │  │ API Handler │  │   WebSocket Handler     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                           │                                     │
│  ┌─────────────────────────┼─────────────────────────────────┐  │
│  │              Feedback Service                            │  │
│  └─────────────────────────┼─────────────────────────────────┘  │
└────────────────────────────┼───────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   KV Storage    │
                    │   (Sessions)    │
                    └─────────────────┘
```

### 📚 API 文档

详细的 API 文档请参考 `docs/api-design.md` 文件。

### 🔄 版本历史

- **v2.0.0**: 完整的交互式反馈系统
  - 新增 RESTful API
  - 响应式 Web 界面
  - WebSocket 实时通信
  - 增强的 MCP 工具
  - 完整的测试套件

- **v1.0.0**: 基础 MCP 服务器
  - JWT 认证
  - 基础反馈工具
  - KV 存储
