# API 接口设计文档

## 概述

本文档定义了 Cloudflare Workers 版本 Interactive Feedback 系统的 RESTful API 接口规范。

## 基础信息

### 基础 URL
- **生产环境**: `https://api.feedback.example.com`
- **开发环境**: `https://api-dev.feedback.example.com`

### 认证方式
- **API Key**: 通过 `X-API-Key` 请求头传递
- **会话认证**: 通过会话 ID 进行访问控制

### 响应格式
所有 API 响应均采用 JSON 格式，包含以下标准字段：
```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## API 端点详细设计

### 1. 创建反馈会话

**端点**: `POST /api/feedback/create`

**描述**: 创建新的反馈会话，返回会话 ID 和访问 URL

**请求头**:
```
Content-Type: application/json
X-API-Key: your-api-key
```

**请求体**:
```json
{
  "message": "请确认是否继续执行此操作？",
  "predefinedOptions": [
    "继续执行",
    "修改参数后执行",
    "取消操作"
  ],
  "timeout": 300,
  "metadata": {
    "source": "ai-assistant",
    "requestId": "req-12345"
  }
}
```

**请求参数说明**:
- `message` (string, 必需): 向用户显示的提示信息
- `predefinedOptions` (array, 可选): 预定义选项列表
- `timeout` (number, 可选): 会话超时时间(秒)，默认 300 秒
- `metadata` (object, 可选): 附加元数据

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "feedbackUrl": "https://feedback.example.com/session/550e8400-e29b-41d4-a716-446655440000",
    "statusUrl": "https://api.feedback.example.com/api/feedback/550e8400-e29b-41d4-a716-446655440000/status",
    "expiresAt": "2024-01-01T00:05:00Z"
  },
  "error": null,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**错误响应** (400):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "消息内容不能为空",
    "details": {
      "field": "message",
      "reason": "required"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 2. 获取反馈界面

**端点**: `GET /feedback/{sessionId}`

**描述**: 返回用户反馈界面的 HTML 页面

**路径参数**:
- `sessionId` (string): 会话 ID

**查询参数**:
- `theme` (string, 可选): 主题模式 (`light` | `dark`)，默认 `dark`
- `lang` (string, 可选): 语言设置 (`zh` | `en`)，默认 `zh`

**成功响应** (200):
```html
<!DOCTYPE html>
<html>
<head>
    <title>Interactive Feedback</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- CSS 和 JavaScript 内联 -->
</head>
<body>
    <!-- 反馈界面内容 -->
</body>
</html>
```

**错误响应** (404):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "会话不存在或已过期"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 3. 提交反馈

**端点**: `POST /api/feedback/{sessionId}/submit`

**描述**: 提交用户反馈内容

**路径参数**:
- `sessionId` (string): 会话 ID

**请求体**:
```json
{
  "selectedOptions": ["继续执行"],
  "freeText": "请在执行前备份数据",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2024-01-01T00:02:30Z"
  }
}
```

**请求参数说明**:
- `selectedOptions` (array, 可选): 选中的预定义选项
- `freeText` (string, 可选): 用户输入的自由文本
- `metadata` (object, 可选): 客户端元数据

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "submittedAt": "2024-01-01T00:02:30Z"
  },
  "error": null,
  "timestamp": "2024-01-01T00:02:30Z"
}
```

**错误响应** (409):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ALREADY_SUBMITTED",
    "message": "该会话已经提交过反馈"
  },
  "timestamp": "2024-01-01T00:02:30Z"
}
```

### 4. 查询反馈状态

**端点**: `GET /api/feedback/{sessionId}/status`

**描述**: 查询反馈会话的当前状态

**路径参数**:
- `sessionId` (string): 会话 ID

**请求头**:
```
X-API-Key: your-api-key
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "createdAt": "2024-01-01T00:00:00Z",
    "expiresAt": "2024-01-01T00:05:00Z",
    "submittedAt": "2024-01-01T00:02:30Z"
  },
  "error": null,
  "timestamp": "2024-01-01T00:02:35Z"
}
```

**状态值说明**:
- `pending`: 等待用户反馈
- `completed`: 已完成反馈
- `expired`: 会话已过期

### 5. 获取反馈结果

**端点**: `GET /api/feedback/{sessionId}/result`

**描述**: 获取用户提交的反馈内容

**路径参数**:
- `sessionId` (string): 会话 ID

**请求头**:
```
X-API-Key: your-api-key
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "feedback": {
      "selectedOptions": ["继续执行"],
      "freeText": "请在执行前备份数据",
      "combinedFeedback": "继续执行\n\n请在执行前备份数据"
    },
    "submittedAt": "2024-01-01T00:02:30Z",
    "metadata": {
      "userAgent": "Mozilla/5.0...",
      "clientTimestamp": "2024-01-01T00:02:30Z"
    }
  },
  "error": null,
  "timestamp": "2024-01-01T00:02:35Z"
}
```

**错误响应** (404):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NO_FEEDBACK_AVAILABLE",
    "message": "该会话尚未提交反馈或已过期"
  },
  "timestamp": "2024-01-01T00:02:35Z"
}
```

## WebSocket API (核心功能)

### 连接端点
`wss://api.feedback.example.com/ws/{sessionId}`

### 认证方式
```
连接时通过查询参数传递认证信息：
wss://api.feedback.example.com/ws/{sessionId}?apiKey={apiKey}&clientType={web|app}
```

### 连接生命周期

#### 1. 连接建立
```json
// 服务器发送连接确认
{
  "type": "connection_established",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "clientId": "client-uuid",
    "serverTime": "2024-01-01T00:00:00Z"
  }
}
```

#### 2. 心跳保持
**客户端 → 服务器**:
```json
{
  "type": "ping",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**服务器 → 客户端**:
```json
{
  "type": "pong",
  "timestamp": "2024-01-01T00:00:01Z"
}
```

### 消息类型定义

#### 1. 状态更新通知
**服务器 → 客户端**:
```json
{
  "type": "session_status_changed",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "oldStatus": "pending",
    "newStatus": "completed",
    "timestamp": "2024-01-01T00:02:30Z"
  }
}
```

#### 2. 反馈提交通知
**服务器 → 客户端**:
```json
{
  "type": "feedback_submitted",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "submittedBy": "user",
    "timestamp": "2024-01-01T00:02:30Z",
    "preview": "继续执行..."
  }
}
```

#### 3. 会话过期通知
**服务器 → 客户端**:
```json
{
  "type": "session_expired",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "timeout",
    "timestamp": "2024-01-01T00:05:00Z"
  }
}
```

#### 4. 错误通知
**服务器 → 客户端**:
```json
{
  "type": "error",
  "data": {
    "code": "SESSION_NOT_FOUND",
    "message": "会话不存在或已过期",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### 5. 多端同步 (App 支持)
**服务器 → 所有客户端**:
```json
{
  "type": "multi_client_sync",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "activeClients": ["web-client-1", "app-client-2"],
    "lastActivity": "2024-01-01T00:02:30Z"
  }
}
```

### App 专用消息

#### 1. App 注册
**App 客户端 → 服务器**:
```json
{
  "type": "app_register",
  "data": {
    "deviceId": "device-uuid",
    "platform": "ios|android",
    "appVersion": "1.0.0",
    "pushToken": "fcm-or-apns-token"
  }
}
```

#### 2. 推送通知请求
**服务器 → App 客户端**:
```json
{
  "type": "push_notification_request",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "需要您的反馈",
    "body": "AI 助手正在等待您的确认",
    "deepLink": "app://feedback/550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 连接管理

#### 1. 自动重连机制
- **重连间隔**: 1s, 2s, 4s, 8s, 16s, 30s (指数退避)
- **最大重连次数**: 10 次
- **重连条件**: 网络错误、服务器重启、连接超时

#### 2. 连接池管理
- **每个会话最多 5 个并发连接**
- **连接空闲超时**: 5 分钟
- **连接总数限制**: 每个 Durable Object 最多 100 个连接

#### 3. 错误处理
```json
{
  "type": "connection_error",
  "data": {
    "code": "CONNECTION_LIMIT_EXCEEDED",
    "message": "连接数超过限制",
    "retryAfter": 30,
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## 错误代码规范

| 错误代码 | HTTP 状态码 | 描述 |
|---------|------------|------|
| `INVALID_REQUEST` | 400 | 请求参数无效 |
| `UNAUTHORIZED` | 401 | API Key 无效或缺失 |
| `SESSION_NOT_FOUND` | 404 | 会话不存在 |
| `SESSION_EXPIRED` | 410 | 会话已过期 |
| `ALREADY_SUBMITTED` | 409 | 重复提交反馈 |
| `NO_FEEDBACK_AVAILABLE` | 404 | 无可用反馈 |
| `RATE_LIMITED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

## 速率限制

### API Key 限制
- **创建会话**: 100 次/分钟
- **状态查询**: 1000 次/分钟
- **结果获取**: 1000 次/分钟

### IP 限制
- **反馈提交**: 10 次/分钟
- **界面访问**: 100 次/分钟

### 响应头
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 数据模型

### Session 对象
```typescript
interface Session {
  sessionId: string;
  message: string;
  predefinedOptions?: string[];
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
  expiresAt: string;
  submittedAt?: string;
  feedback?: {
    selectedOptions?: string[];
    freeText?: string;
    combinedFeedback: string;
  };
  metadata?: Record<string, any>;
}
```

### API Response 对象
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  } | null;
  timestamp: string;
}
```
