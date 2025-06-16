#!/usr/bin/env node

/**
 * 生产环境测试脚本
 * 测试MCP服务器的各个端点
 */

const BASE_URL = 'https://remote-mcp-server-authless.sujianjob.workers.dev';

// API密钥
const API_KEY = 'Gv6HoiBHiuvrSDPjnNJPcgj6ldSMU6NK';

async function testEndpoint(url, options = {}) {
    try {
        console.log(`\n🧪 测试: ${url}`);
        console.log(`📋 选项:`, JSON.stringify(options, null, 2));
        
        const response = await fetch(url, options);
        
        console.log(`📊 状态码: ${response.status} ${response.statusText}`);
        console.log(`📋 响应头:`, Object.fromEntries(response.headers.entries()));
        
        const contentType = response.headers.get('content-type');
        let body;
        
        if (contentType && contentType.includes('application/json')) {
            body = await response.json();
            console.log(`📄 响应体 (JSON):`, JSON.stringify(body, null, 2));
        } else {
            body = await response.text();
            console.log(`📄 响应体 (Text):`, body.substring(0, 200) + (body.length > 200 ? '...' : ''));
        }
        
        return { status: response.status, body, headers: response.headers };
    } catch (error) {
        console.error(`❌ 错误:`, error.message);
        return { error: error.message };
    }
}

async function runTests() {
    console.log('🚀 开始测试生产环境MCP服务器');
    console.log(`🌐 基础URL: ${BASE_URL}`);
    console.log('=' .repeat(50));

    // 1. 测试健康检查端点
    await testEndpoint(`${BASE_URL}/health`);

    // 2. 测试 /mcp 端点（无鉴权，应该返回401）
    await testEndpoint(`${BASE_URL}/mcp`);

    // 3. 测试 /mcp 端点（有API Key鉴权）
    await testEndpoint(`${BASE_URL}/mcp`, {
        headers: {
            'X-API-Key': API_KEY,
            'Origin': 'https://playground.ai.cloudflare.com'
        }
    });

    // 4. 测试 /sse 端点（无鉴权，应该返回401）
    await testEndpoint(`${BASE_URL}/sse`);

    // 5. 测试 /sse 端点（有API Key鉴权）
    await testEndpoint(`${BASE_URL}/sse`, {
        headers: {
            'X-API-Key': API_KEY,
            'Origin': 'https://playground.ai.cloudflare.com'
        }
    });

    // 6. 测试无效的API Key
    await testEndpoint(`${BASE_URL}/mcp`, {
        headers: {
            'X-API-Key': 'invalid-key',
            'Origin': 'https://playground.ai.cloudflare.com'
        }
    });

    // 7. 测试CORS（无效来源）
    await testEndpoint(`${BASE_URL}/mcp`, {
        headers: {
            'X-API-Key': API_KEY,
            'Origin': 'https://malicious-site.com'
        }
    });

    // 8. 测试OPTIONS请求（CORS预检）
    await testEndpoint(`${BASE_URL}/mcp`, {
        method: 'OPTIONS',
        headers: {
            'Origin': 'https://playground.ai.cloudflare.com',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'X-API-Key'
        }
    });

    console.log('\n🎉 测试完成！');
    console.log('\n📋 测试总结:');
    console.log('✅ 健康检查端点应该返回200');
    console.log('✅ 无鉴权的/mcp和/sse端点应该返回401');
    console.log('✅ 有效API Key的请求应该成功');
    console.log('✅ 无效API Key应该返回401');
    console.log('✅ 无效来源应该返回401');
    console.log('✅ OPTIONS请求应该返回200');
}

runTests().catch(console.error);
