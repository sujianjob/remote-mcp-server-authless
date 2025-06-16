# 🚀 Interactive Feedback MCP 部署指南 v2.0

## 📋 部署前准备

### 1. 环境要求
- Node.js 18+ 
- npm 或 yarn
- Cloudflare 账户
- Wrangler CLI

### 2. 安装 Wrangler CLI
```bash
npm install -g wrangler
```

### 3. 登录 Cloudflare
```bash
wrangler auth login
```

## 🔧 配置步骤

### 1. 创建 KV 存储
```bash
# 创建生产环境 KV 存储
wrangler kv:namespace create "OAUTH_KV"

# 记录返回的 namespace ID
# 示例输出: { binding = "OAUTH_KV", id = "abc123def456" }
```

### 2. 更新配置文件
编辑 `wrangler.jsonc`，更新 KV namespace ID：
```json
"kv_namespaces": [
    {
        "binding": "OAUTH_KV",
        "id": "your-actual-kv-namespace-id",
        "preview_id": "preview_id"
    }
]
```

### 3. 设置环境变量
```bash
# 设置 JWT 密钥（必需）
wrangler secret put JWT_SECRET
# 输入一个强密码，例如：MySecureJWTSecret2024!@#
```

### 4. 更新项目名称（可选）
在 `wrangler.jsonc` 中修改项目名称：
```json
{
    "name": "interactive-feedback-mcp"
}
```

## 🚀 部署命令

### 1. 安装依赖
```bash
npm install
```

### 2. 构建项目
```bash
npm run build
```

### 3. 部署到生产环境
```bash
npm run deploy
```

## 🧪 部署后测试

### 1. 生成测试 JWT Token
```bash
npm run generate-jwt
# 复制输出的 JWT token
```

### 2. 测试健康检查
```bash
curl https://your-worker-name.your-subdomain.workers.dev/health
```

预期响应：
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "Interactive Feedback MCP Server",
    "version": "2.0.0",
    "timestamp": "2024-12-16T..."
  }
}
```

### 3. 测试反馈列表页面
在浏览器中访问：
```
https://your-worker-name.your-subdomain.workers.dev/feedback
```

### 4. 测试 API 功能
```bash
# 创建反馈会话（需要认证）
curl -X POST https://your-worker-name.your-subdomain.workers.dev/api/feedback/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试反馈",
    "message": "这是一个测试反馈会话",
    "aiContent": "## AI 分析\n\n这是一个**测试**的AI内容，支持*Markdown*格式。\n\n- 项目1\n- 项目2",
    "predefinedOptions": ["很好", "一般", "需要改进"],
    "timeout": 600
  }'
```

### 5. 测试反馈提交（无需认证）
```bash
# 使用上一步返回的 sessionId
curl -X POST https://your-worker-name.your-subdomain.workers.dev/api/feedback/SESSION_ID/submit \
  -H "Content-Type: application/json" \
  -d '{
    "selectedOptions": ["很好"],
    "freeText": "测试反馈内容",
    "metadata": {
      "testMode": true
    }
  }'
```

## 🔒 安全配置

### 1. JWT 密钥管理
- 使用至少32字符的强密码
- 包含大小写字母、数字和特殊字符
- 定期轮换密钥

### 2. 自定义域名（推荐）
在 Cloudflare Dashboard 中：
1. 进入 Workers & Pages
2. 选择您的 Worker
3. 点击 "Custom domains"
4. 添加您的域名

### 3. 访问控制
考虑添加以下安全措施：
- IP 白名单
- 请求频率限制
- 地理位置限制

## 📊 监控和维护

### 1. 查看日志
```bash
# 实时日志
wrangler tail

# 查看最近1小时的日志
wrangler tail --since 1h
```

### 2. 监控指标
在 Cloudflare Dashboard 中查看：
- 请求数量和频率
- 错误率
- 响应时间
- 带宽使用

### 3. 设置告警
配置以下告警：
- 错误率超过5%
- 响应时间超过1秒
- 请求量异常增长

## 🔄 更新部署

### 1. 代码更新
```bash
git pull origin main
npm run build
npm run deploy
```

### 2. 环境变量更新
```bash
# 更新 JWT 密钥
wrangler secret put JWT_SECRET
```

### 3. KV 数据管理
```bash
# 查看 KV 数据
wrangler kv:key list --binding=OAUTH_KV

# 删除过期数据（如需要）
wrangler kv:key delete --binding=OAUTH_KV "key-name"
```

## 🐛 故障排除

### 常见问题

**1. KV 存储错误**
```
Error: KV namespace not found
```
解决方案：
- 确认 KV namespace 已创建
- 检查 wrangler.jsonc 中的 ID 是否正确
- 重新创建 KV namespace

**2. JWT 认证失败**
```
Error: JWT verification failed
```
解决方案：
- 确认 JWT_SECRET 已设置
- 检查 token 格式是否正确
- 验证 token 是否过期

**3. 部署失败**
```
Error: Script startup exceeded CPU time limit
```
解决方案：
- 检查代码中是否有无限循环
- 优化启动时的计算量
- 分批处理大量数据

### 调试命令
```bash
# 检查环境变量
wrangler secret list

# 检查 KV 存储
wrangler kv:namespace list

# 本地开发调试
npm run dev
```

## 📝 生产环境检查清单

部署前请确认：

- [ ] KV 存储已创建并配置正确的 ID
- [ ] JWT_SECRET 已设置强密码
- [ ] 项目名称已更新（避免冲突）
- [ ] 健康检查端点正常响应
- [ ] 反馈列表页面可以访问
- [ ] API 创建会话功能正常
- [ ] 反馈提交功能正常
- [ ] AI 内容渲染正确显示
- [ ] 主题切换功能正常
- [ ] 多语言支持正常
- [ ] 自定义域名已配置（如需要）
- [ ] 监控和告警已设置
- [ ] 日志记录正常工作

## 🌐 部署后的访问地址

部署成功后，您的服务将在以下地址可用：

- **反馈列表**: `https://your-domain/feedback`
- **API 端点**: `https://your-domain/api/feedback/`
- **健康检查**: `https://your-domain/health`
- **WebSocket**: `wss://your-domain/ws/`

## 🎯 下一步

部署完成后，您可以：

1. **集成到现有系统**: 使用 API 创建反馈会话
2. **自定义样式**: 修改 CSS 以匹配您的品牌
3. **添加分析**: 集成 Google Analytics 或其他分析工具
4. **扩展功能**: 添加更多反馈类型和处理逻辑

---

**祝您部署顺利！如有问题，请查看日志或联系技术支持。** 🎉
