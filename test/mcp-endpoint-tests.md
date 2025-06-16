# 🧪 /mcp 端点测试用例

## 基础信息
- **生产环境URL**: `https://mcp.123648.xyz`
- **测试API Key**: `Gv6HoiBHiuvrSDPjnNJPcgj6ldSMU6NK`
- **允许的Origin**: `https://playground.ai.cloudflare.com`

## 测试用例

### 1. 健康检查端点 ✅
```bash
curl https://mcp.123648.xyz/health
```
**预期结果**: 200 OK
**实际结果**: ✅ 通过
```json
{"status":"ok","timestamp":"2025-06-16T06:23:44.484Z","service":"MCP Server with Auth"}
```

### 2. /mcp 端点 - 无鉴权
```bash
curl https://mcp.123648.xyz/mcp
```
**预期结果**: 401 Unauthorized
**预期响应**: `{"error":"Origin not allowed"}` 或 `{"error":"Authentication required"}`

### 3. /mcp 端点 - 有效API Key
```bash
curl -H "X-API-Key: Gv6HoiBHiuvrSDPjnNJPcgj6ldSMU6NK" \
     -H "Origin: https://playground.ai.cloudflare.com" \
     https://mcp.123648.xyz/mcp
```
**预期结果**: 200 OK 或 MCP协议相关响应

### 4. /mcp 端点 - 无效API Key
```bash
curl -H "X-API-Key: invalid-key" \
     -H "Origin: https://playground.ai.cloudflare.com" \
     https://mcp.123648.xyz/mcp
```
**预期结果**: 401 Unauthorized
**预期响应**: `{"error":"Authentication required"}`

### 5. /mcp 端点 - 无效Origin
```bash
curl -H "X-API-Key: Gv6HoiBHiuvrSDPjnNJPcgj6ldSMU6NK" \
     -H "Origin: https://malicious-site.com" \
     https://mcp.123648.xyz/mcp
```
**预期结果**: 401 Unauthorized
**预期响应**: `{"error":"Origin not allowed"}`

### 6. CORS 预检请求
```bash
curl -X OPTIONS \
     -H "Origin: https://playground.ai.cloudflare.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-API-Key" \
     https://mcp.123648.xyz/mcp
```
**预期结果**: 200 OK
**预期响应头**:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key`

### 7. /sse 端点 - 有效API Key
```bash
curl -H "X-API-Key: Gv6HoiBHiuvrSDPjnNJPcgj6ldSMU6NK" \
     -H "Origin: https://playground.ai.cloudflare.com" \
     https://mcp.123648.xyz/sse
```
**预期结果**: 200 OK，开始SSE连接
**预期响应**: 开始Server-Sent Events流

## JWT Token 测试

### 8. 生成JWT Token
```bash
npm run generate-jwt
```

### 9. /mcp 端点 - JWT鉴权
```bash
# 使用生成的JWT token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Origin: https://playground.ai.cloudflare.com" \
     https://mcp.123648.xyz/mcp
```
**预期结果**: 200 OK

## 浏览器测试

### 10. 浏览器直接访问
在浏览器中访问：
- `https://mcp.123648.xyz/health` ✅
- `https://mcp.123648.xyz/mcp` (应显示401错误)

## 客户端集成测试

### 11. Claude Desktop 配置
```json
{
  "mcpServers": {
    "calculator": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.123648.xyz/sse"
      ],
      "env": {
        "MCP_REMOTE_HEADERS": "{\"X-API-Key\": \"Gv6HoiBHiuvrSDPjnNJPcgj6ldSMU6NK\"}"
      }
    }
  }
}
```

### 12. Cloudflare AI Playground
1. 访问: https://playground.ai.cloudflare.com/
2. 输入MCP服务器URL: `https://mcp.123648.xyz/sse`
3. 添加认证头: `X-API-Key: Gv6HoiBHiuvrSDPjnNJPcgj6ldSMU6NK`

## 监控和调试

### 查看实时日志
```bash
npx wrangler tail --format pretty
```

### 检查部署状态
```bash
npx wrangler deployments list
```

### 检查环境变量
```bash
npx wrangler secret list
```

## 故障排除

如果遇到问题：

1. **网络连接问题**: 检查防火墙和代理设置
2. **鉴权失败**: 验证API密钥是否正确设置
3. **CORS错误**: 确认Origin头是否在允许列表中
4. **Worker错误**: 查看wrangler tail日志

## 测试状态

- ✅ 健康检查端点：正常
- ⏳ /mcp端点鉴权：需要进一步验证
- ⏳ /sse端点：需要进一步验证
- ⏳ JWT鉴权：需要进一步验证
- ⏳ CORS功能：需要进一步验证
