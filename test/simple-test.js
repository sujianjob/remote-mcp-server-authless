#!/usr/bin/env node

/**
 * 简单的生产环境测试
 */

import https from 'https';
import http from 'http';

const BASE_URL = 'https://remote-mcp-server-authless.sujianjob.workers.dev';
// JWT Token需要通过 npm run generate-jwt 生成
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwicm9sZXMiOlsidXNlciJdLCJpYXQiOjE3NTAwNTc4NzcsImV4cCI6MTc1MDA2MTQ3N30.B1YVqSWfXYV9z3gXWjeynDSQYG8kAD500n8marA87YA';

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: 10000
        };

        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function testEndpoint(name, url, options = {}) {
    console.log(`\n🧪 测试: ${name}`);
    console.log(`📋 URL: ${url}`);
    if (options.headers) {
        console.log(`📋 Headers:`, options.headers);
    }
    
    try {
        const result = await makeRequest(url, options);
        console.log(`✅ 状态码: ${result.statusCode} ${result.statusMessage}`);
        console.log(`📄 响应体:`, result.body.substring(0, 200));
        return result;
    } catch (error) {
        console.log(`❌ 错误: ${error.message}`);
        return { error: error.message };
    }
}

async function runTests() {
    console.log('🚀 开始测试生产环境MCP服务器');
    console.log(`🌐 基础URL: ${BASE_URL}`);
    console.log('='.repeat(50));

    // 1. 测试健康检查
    await testEndpoint('健康检查', `${BASE_URL}/health`);

    // 2. 测试 /mcp 端点（无鉴权）
    await testEndpoint('/mcp 端点 (无鉴权)', `${BASE_URL}/mcp`);

    // 3. 测试 /mcp 端点（有效JWT Token）
    await testEndpoint('/mcp 端点 (有效JWT)', `${BASE_URL}/mcp`, {
        headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`
        }
    });

    // 4. 测试 /sse 端点（无鉴权）
    await testEndpoint('/sse 端点 (无鉴权)', `${BASE_URL}/sse`);

    // 5. 测试 /sse 端点（有效JWT Token）
    await testEndpoint('/sse 端点 (有效JWT)', `${BASE_URL}/sse`, {
        headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`
        }
    });

    // 6. 测试无效JWT Token
    await testEndpoint('无效JWT Token', `${BASE_URL}/mcp`, {
        headers: {
            'Authorization': 'Bearer invalid-token'
        }
    });

    // 7. 测试缺少Bearer前缀
    await testEndpoint('缺少Bearer前缀', `${BASE_URL}/mcp`, {
        headers: {
            'Authorization': JWT_TOKEN
        }
    });

    console.log('\n🎉 测试完成！');
}

runTests().catch(console.error);
