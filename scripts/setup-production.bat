@echo off
chcp 65001 >nul

echo 🔐 设置MCP服务器生产环境密钥
echo ==================================
echo.

REM 检查是否已登录
echo 📋 检查Cloudflare登录状态...
npx wrangler whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未登录到Cloudflare，正在启动登录流程...
    npx wrangler auth login
) else (
    echo ✅ 已登录到Cloudflare
)

echo.
echo 🔑 设置环境变量...
echo 注意：请准备好以下信息：
echo.

REM 显示当前开发环境的密钥作为参考
echo 📝 当前开发环境密钥（可用作生产环境）：
echo API_KEYS: Gv6HoiBHiuvrSDPjnNJPcgj6ldSMU6NK,o0t7kGH0AI8uYzkTBjpspifrZK7yaiMF,P2LSoZ72sW0bPbIUVDc8vq27JlhXUshw
echo JWT_SECRET: 094562b93f73fcc7a65ecae3fd4d0deea66ba0e3266bdd6dc41f5eba7391c21c80ca9e053c570b6a4b7c727f3f2a6d19996f37606f1b64689d44eeb1fc74fb61
echo ALLOWED_ORIGINS: https://playground.ai.cloudflare.com,https://mcp.123648.xyz
echo.

REM 设置API密钥
echo 1️⃣ 设置API密钥...
echo 请输入API密钥（逗号分隔多个密钥）：
npx wrangler secret put API_KEYS

echo.

REM 设置JWT密钥
echo 2️⃣ 设置JWT密钥...
echo 请输入JWT密钥：
npx wrangler secret put JWT_SECRET

echo.

REM 设置允许的来源
echo 3️⃣ 设置允许的CORS来源...
echo 请输入允许的来源（逗号分隔）：
npx wrangler secret put ALLOWED_ORIGINS

echo.
echo ✅ 环境变量设置完成！
echo.

REM 验证设置
echo 🔍 验证设置...
npx wrangler secret list

echo.
echo 🚀 现在可以部署到生产环境：
echo    npm run deploy
echo.
echo 📋 部署后测试：
echo    curl https://mcp.123648.xyz/health
echo    curl -H "X-API-Key: your-api-key" https://mcp.123648.xyz/sse

pause
