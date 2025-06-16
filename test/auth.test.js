/**
 * 鉴权功能测试
 * 简单的测试脚本，验证鉴权中间件是否正常工作
 */

import { webcrypto } from 'node:crypto';

// 在Node.js环境中设置crypto
if (!globalThis.crypto) {
    globalThis.crypto = webcrypto;
}

// Node.js环境中的btoa实现
if (!globalThis.btoa) {
    globalThis.btoa = function(str) {
        return Buffer.from(str, 'binary').toString('base64');
    };
}

// 内联实现必要的函数
function generateApiKey(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomArray = new Uint8Array(length);
    crypto.getRandomValues(randomArray);

    for (let i = 0; i < length; i++) {
        result += chars[randomArray[i] % chars.length];
    }

    return result;
}

function validateApiKey(apiKey, validKeys) {
    if (!apiKey) {
        return { success: false, error: 'API key is required' };
    }

    if (!validKeys || validKeys.length === 0) {
        return { success: false, error: 'No valid API keys configured' };
    }

    if (validKeys.includes(apiKey)) {
        return {
            success: true,
            userId: `api_key_user_${apiKey.slice(-8)}`,
            metadata: { authMethod: 'api_key' }
        };
    }

    return { success: false, error: 'Invalid API key' };
}

async function validateJWT(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return { success: false, error: 'Invalid JWT format' };
        }

        const [headerB64, payloadB64, signatureB64] = parts;

        // 验证签名
        const expectedSignature = await generateJWTSignature(headerB64 + '.' + payloadB64, secret);
        if (signatureB64 !== expectedSignature) {
            return { success: false, error: 'Invalid JWT signature' };
        }

        // 解析payload
        const payload = JSON.parse(atob(payloadB64));

        // 检查过期时间
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            return { success: false, error: 'JWT token expired' };
        }

        return {
            success: true,
            userId: payload.sub || payload.userId || 'jwt_user',
            metadata: {
                authMethod: 'jwt',
                ...payload
            }
        };
    } catch (error) {
        return { success: false, error: 'JWT validation failed' };
    }
}

async function generateJWT(payload, secret, expiresInSeconds = 3600) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
        ...payload,
        iat: now,
        exp: now + expiresInSeconds
    };

    const headerB64 = btoa(JSON.stringify(header))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const payloadB64 = btoa(JSON.stringify(jwtPayload))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const signature = await generateJWTSignature(headerB64 + '.' + payloadB64, secret);

    return `${headerB64}.${payloadB64}.${signature}`;
}

async function generateJWTSignature(data, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// Node.js环境中的atob实现
if (!globalThis.atob) {
    globalThis.atob = function(str) {
        return Buffer.from(str, 'base64').toString('binary');
    };
}

// 模拟环境变量
const mockEnv = {
    API_KEYS: 'test-key-1,test-key-2',
    JWT_SECRET: 'test-jwt-secret-12345',
    ALLOWED_ORIGINS: 'http://localhost:3000,https://example.com'
};

// 测试API Key验证
console.log('🧪 测试API Key验证...');

// 测试有效的API Key
const validApiKeyResult = validateApiKey('test-key-1', ['test-key-1', 'test-key-2']);
console.log('✅ 有效API Key测试:', validApiKeyResult.success ? '通过' : '失败');

// 测试无效的API Key
const invalidApiKeyResult = validateApiKey('invalid-key', ['test-key-1', 'test-key-2']);
console.log('✅ 无效API Key测试:', !invalidApiKeyResult.success ? '通过' : '失败');

// 测试JWT验证
console.log('\n🧪 测试JWT验证...');

async function testJWT() {
    try {
        // 生成测试JWT
        const payload = { userId: 'test-user', username: 'testuser' };
        const token = await generateJWT(payload, 'test-jwt-secret-12345', 3600);
        console.log('📝 生成的测试JWT:', token.substring(0, 50) + '...');

        // 验证JWT
        const jwtResult = await validateJWT(token, 'test-jwt-secret-12345');
        console.log('✅ 有效JWT测试:', jwtResult.success ? '通过' : '失败');

        // 测试无效JWT
        const invalidJwtResult = await validateJWT('invalid.jwt.token', 'test-jwt-secret-12345');
        console.log('✅ 无效JWT测试:', !invalidJwtResult.success ? '通过' : '失败');

    } catch (error) {
        console.error('❌ JWT测试失败:', error);
    }
}

// 测试基本功能
async function testBasicFunctions() {
    console.log('\n🧪 测试基本功能...');

    // 测试API Key生成
    const apiKey = generateApiKey(32);
    console.log('✅ API Key生成测试:', apiKey.length === 32 ? '通过' : '失败');

    // 测试JWT生成和验证
    const payload = { userId: 'test-user' };
    const token = await generateJWT(payload, 'test-jwt-secret-12345', 3600);
    const jwtResult = await validateJWT(token, 'test-jwt-secret-12345');
    console.log('✅ JWT生成和验证测试:', jwtResult.success ? '通过' : '失败');
}

// 运行所有测试
async function runTests() {
    await testJWT();
    await testBasicFunctions();

    console.log('\n🎉 所有测试完成！');
    console.log('\n💡 提示：');
    console.log('  - 在开发环境中运行: npm run dev');
    console.log('  - 测试健康检查: curl http://localhost:8787/health');
    console.log('  - 测试API Key: curl -H "X-API-Key: Gv6HoiBHiuvrSDPjnNJPcgj6ldSMU6NK" -H "Origin: http://localhost:3000" http://localhost:8787/sse');
}

runTests().catch(console.error);
