# 🔐 Interactive Feedback MCP 生产环境密钥信息

## 🌐 生产环境地址
**主域名**: `https://remote-mcp-server-authless.sujianjob.workers.dev`

## 🎯 立即可用的JWT Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwicm9sZXMiOlsidXNlciJdLCJpYXQiOjE3NTAwNzE4MjYsImV4cCI6MTc1MDA3NTQyNn0.gbrMYdH3smi9wazQeIqgPgKIISFNAiNhFdLO54u3Jn4
```

**有效期**: 1小时（到期时间: 2025-06-16 11:30:26 UTC）

## 🔑 JWT密钥配置
```
JWT_SECRET = "InteractiveFeedbackMCP2024SecureJWTKey!@#$%^&*()"
```

## 📊 KV存储配置
```
KV Namespace ID: 78857d9441204fbebd5b9db9d11b6909
Binding Name: OAUTH_KV
```

## 🚀 快速测试命令

### 1. 健康检查
```bash
curl https://remote-mcp-server-authless.sujianjob.workers.dev/health
```

### 2. 创建反馈会话
```bash
curl -X POST https://remote-mcp-server-authless.sujianjob.workers.dev/api/feedback/create \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwicm9sZXMiOlsidXNlciJdLCJpYXQiOjE3NTAwNzE4MjYsImV4cCI6MTc1MDA3NTQyNn0.gbrMYdH3smi9wazQeIqgPgKIISFNAiNhFdLO54u3Jn4" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "生产环境测试",
    "message": "这是一个生产环境测试会话",
    "aiContent": "## AI分析\n\n**系统状态**: 正常运行\n\n**功能检查**:\n- ✅ API响应正常\n- ✅ 数据库连接正常\n- ✅ 认证机制工作正常",
    "predefinedOptions": ["系统正常", "功能完整", "性能良好", "需要优化"],
    "timeout": 1800
  }'
```

### 3. 访问Web界面
**反馈列表页面**: https://remote-mcp-server-authless.sujianjob.workers.dev/feedback

## 🔄 生成新JWT Token
当当前token过期时，运行以下命令生成新的：
```bash
npm run generate-jwt
```

## 🎯 MCP工具使用
在Claude或其他MCP客户端中使用：
```json
{
  "tool": "interactive_feedback",
  "arguments": {
    "title": "用户反馈收集",
    "message": "请对我们的服务进行评价",
    "predefinedOptions": ["很满意", "满意", "一般", "不满意"],
    "timeout": 600
  }
}
```

## 📱 Web界面特性
- ✅ 反馈列表管理
- ✅ AI内容Markdown渲染
- ✅ 主题切换（暗色/明亮）
- ✅ 多语言支持（中英文）
- ✅ 响应式设计
- ✅ 实时状态更新

## 🔒 安全信息
- JWT认证保护管理API
- 用户反馈提交无需认证
- HTTPS加密传输
- 会话自动过期机制

---

**部署状态**: ✅ 成功部署并运行中
**最后更新**: 2025-06-16 10:30:26 UTC
