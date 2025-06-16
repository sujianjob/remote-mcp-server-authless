# 🚀 部署检查清单

## 部署前准备

### 1. 环境变量设置

在部署到生产环境之前，请确保设置了以下环境变量：

```bash
# 设置API密钥
wrangler secret put API_KEYS
# 输入: your-production-api-key-1,your-production-api-key-2

# 设置JWT密钥
wrangler secret put JWT_SECRET
# 输入: your-super-secure-production-jwt-secret

# 设置允许的来源
wrangler secret put ALLOWED_ORIGINS
# 输入: https://playground.ai.cloudflare.com,https://your-domain.com
```

### 2. 生成安全密钥

使用提供的工具生成安全密钥：

```bash
npm run setup-auth
```

### 3. 本地测试

在部署前进行本地测试：

```bash
# 启动开发服务器
npm run dev

# 运行鉴权测试
npm run test-auth

# 测试健康检查
curl http://localhost:8787/health

# 测试API Key鉴权
curl -H "X-API-Key: your-test-key" http://localhost:8787/sse
```

## 部署步骤

### 1. 部署到Cloudflare Workers

```bash
npm run deploy
```

### 2. 验证部署

部署完成后，验证以下端点：

```bash
# 健康检查（无需鉴权）
curl https://your-worker.workers.dev/health

# 测试API Key鉴权
curl -H "X-API-Key: your-api-key" https://your-worker.workers.dev/sse

# 测试无效鉴权（应返回401）
curl -H "X-API-Key: invalid-key" https://your-worker.workers.dev/sse
```

### 3. 配置客户端

#### Claude Desktop配置

更新Claude Desktop配置文件：

```json
{
  "mcpServers": {
    "your-mcp-server": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker.workers.dev/sse"
      ],
      "env": {
        "MCP_REMOTE_HEADERS": "{\"X-API-Key\": \"your-api-key\"}"
      }
    }
  }
}
```

#### Cloudflare AI Playground配置

1. 访问 https://playground.ai.cloudflare.com/
2. 输入MCP服务器URL: `https://your-worker.workers.dev/sse`
3. 添加认证头: `X-API-Key: your-api-key`

## 安全检查清单

### ✅ 部署前检查

- [ ] 已生成强密码API密钥（32+字符）
- [ ] 已设置安全的JWT密钥（64+字符）
- [ ] 已配置正确的CORS来源
- [ ] 已在本地测试所有鉴权方法
- [ ] 已验证无效鉴权请求被正确拒绝
- [ ] 已检查代码中没有硬编码的密钥

### ✅ 部署后检查

- [ ] 健康检查端点正常响应
- [ ] API Key鉴权正常工作
- [ ] JWT鉴权正常工作（如果使用）
- [ ] 无效鉴权请求返回401错误
- [ ] CORS配置正确
- [ ] 客户端能够成功连接

### ✅ 安全最佳实践

- [ ] 使用HTTPS（Cloudflare Workers自动提供）
- [ ] 定期轮换API密钥
- [ ] 监控访问日志
- [ ] 限制CORS来源到必要的域名
- [ ] 不在客户端代码中暴露API密钥
- [ ] 使用环境变量而非硬编码密钥

## 故障排除

### 常见问题

**401 Unauthorized错误**
- 检查API密钥是否正确
- 验证请求头格式是否正确
- 确认环境变量已正确设置

**CORS错误**
- 检查`ALLOWED_ORIGINS`环境变量
- 确认请求来源域名在允许列表中
- 验证协议（http/https）是否匹配

**连接超时**
- 检查Worker是否正确部署
- 验证URL是否正确
- 确认网络连接正常

### 调试命令

```bash
# 查看Worker日志
wrangler tail

# 检查环境变量
wrangler secret list

# 重新部署
wrangler deploy --force
```

## 监控和维护

### 日志监控

Worker会记录以下鉴权事件：
- 成功的鉴权请求
- 失败的鉴权尝试
- 无效的API密钥使用

### 定期维护

1. **每月**: 检查访问日志，识别异常活动
2. **每季度**: 轮换API密钥
3. **每年**: 更新JWT密钥
4. **按需**: 更新允许的CORS来源

### 性能监控

使用Cloudflare Analytics监控：
- 请求量和响应时间
- 错误率
- 地理分布

## 联系支持

如果遇到问题，请检查：
1. [Cloudflare Workers文档](https://developers.cloudflare.com/workers/)
2. [MCP协议文档](https://modelcontextprotocol.io/)
3. 项目README.md文件
