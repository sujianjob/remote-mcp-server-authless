# 🔐 JWT密钥更新指南

## 📋 当前状况

### 🔍 问题分析
- 生产环境JWT密钥状态不明确
- 本地环境和生产环境密钥可能不同步
- 需要确保密钥正确设置并生成对应的token

### 🎯 目标
- 在生产环境设置正确的JWT密钥
- 生成对应的有效JWT token
- 验证认证功能正常工作

## 🛠️ 更新方法

### 方法1：交互式更新（推荐）

1. **打开终端并进入项目目录**
```bash
cd c:\Users\win11\Documents\code\remote-mcp-server-authless
```

2. **执行密钥更新命令**
```bash
npx wrangler secret put JWT_SECRET
```

3. **输入新的JWT密钥**
当提示 `Enter a secret value:` 时，输入：
```
InteractiveFeedbackMCP2025_1750073456_SecureKey!@#$%^&*()
```

4. **确认更新成功**
应该看到类似输出：
```
✨ Success! Uploaded secret JWT_SECRET
```

### 方法2：使用文件输入

1. **创建临时密钥文件**
```bash
echo "InteractiveFeedbackMCP2025_1750073456_SecureKey!@#$%^&*()" > temp_jwt_key.txt
```

2. **使用文件输入密钥**
```bash
npx wrangler secret put JWT_SECRET < temp_jwt_key.txt
```

3. **删除临时文件**
```bash
del temp_jwt_key.txt
```

### 方法3：使用环境变量

1. **设置环境变量**
```bash
set JWT_SECRET_VALUE=InteractiveFeedbackMCP2025_1750073456_SecureKey!@#$%^&*()
```

2. **使用环境变量更新**
```bash
echo %JWT_SECRET_VALUE% | npx wrangler secret put JWT_SECRET
```

## 🔍 验证密钥设置

### 1. 检查密钥列表
```bash
npx wrangler secret list
```
**期望输出**：
```json
[
  {
    "name": "JWT_SECRET",
    "type": "secret_text"
  }
]
```

### 2. 重新部署Worker
```bash
npx wrangler deploy
```
**期望输出**：
```
✨ Success! Uploaded remote-mcp-server-authless
Your Worker has access to the following bindings:
- env.JWT_SECRET ("InteractiveFeedbackMCP2025_1750073456...")
```

## 🎯 生成生产环境Token

### 1. 生成新的JWT Token
```bash
npm run generate-jwt
```

### 2. 记录生成的Token
将输出的JWT token保存，格式类似：
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwicm9sZXMiOlsidXNlciJdLCJpYXQiOjE3NTAwNzUxNzYsImV4cCI6MTc1MDA3ODc3Nn0.R7kcm7KRbstDKHq5Zt_-ILt5XtBApPvV2CR0B-fBuwc
```

## 🧪 测试生产环境

### 1. 测试健康检查
```bash
curl https://mcp.123648.xyz/health
```

### 2. 测试JWT认证
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" https://mcp.123648.xyz/sse
```

### 3. 测试创建反馈会话
```bash
curl -X POST https://mcp.123648.xyz/api/feedback/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "生产环境测试",
    "message": "测试JWT认证功能",
    "predefinedOptions": ["认证正常", "功能正常"],
    "timeout": 600
  }'
```

## 📝 当前配置信息

### JWT密钥
```
密钥值: InteractiveFeedbackMCP2025_1750073456_SecureKey!@#$%^&*()
算法: HS256
长度: 67字符
```

### 生产环境地址
```
主域名: https://mcp.123648.xyz
Worker域名: https://remote-mcp-server-authless.sujianjob.workers.dev
```

### 本地配置
```json
// wrangler.jsonc
"vars": {
  "JWT_SECRET": "InteractiveFeedbackMCP2025_1750073456_SecureKey!@#$%^&*()"
}
```

## 🔧 故障排除

### 问题1：密钥已存在错误
```
Error: Binding name 'JWT_SECRET' already in use
```
**解决方案**：
```bash
npx wrangler secret delete JWT_SECRET
npx wrangler secret put JWT_SECRET
```

### 问题2：密钥不存在错误
```
Error: Binding 'JWT_SECRET' not found
```
**解决方案**：直接创建新密钥
```bash
npx wrangler secret put JWT_SECRET
```

### 问题3：JWT签名验证失败
```json
{"error":"Invalid JWT signature"}
```
**解决方案**：
1. 确认生产环境密钥已正确设置
2. 重新生成JWT token
3. 重新部署Worker

## ✅ 成功标志

### 密钥设置成功
- [ ] `npx wrangler secret list` 显示 JWT_SECRET
- [ ] `npx wrangler deploy` 显示密钥绑定
- [ ] 生成的JWT token格式正确

### 认证功能正常
- [ ] 健康检查端点响应正常
- [ ] JWT认证端点返回有效响应
- [ ] 创建反馈会话成功

## 🎯 下一步操作

1. **立即执行**：使用上述方法之一更新JWT密钥
2. **验证设置**：检查密钥列表和部署状态
3. **生成Token**：运行 `npm run generate-jwt`
4. **测试功能**：使用生成的token测试API端点

---

## 📞 快速操作命令

```bash
# 1. 更新密钥
npx wrangler secret put JWT_SECRET
# 输入: InteractiveFeedbackMCP2025_1750073456_SecureKey!@#$%^&*()

# 2. 验证设置
npx wrangler secret list

# 3. 重新部署
npx wrangler deploy

# 4. 生成token
npm run generate-jwt

# 5. 测试API
curl -H "Authorization: Bearer [TOKEN]" https://mcp.123648.xyz/sse
```

**记住**：每次更新密钥后都需要重新生成JWT token！
