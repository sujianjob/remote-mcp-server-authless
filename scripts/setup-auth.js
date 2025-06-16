#!/usr/bin/env node

/**
 * 鉴权设置脚本
 * 帮助用户快速生成API密钥和JWT密钥
 */

import { webcrypto } from 'node:crypto';

// 在Node.js环境中设置crypto
if (!globalThis.crypto) {
    globalThis.crypto = webcrypto;
}

// 内联实现工具函数，避免依赖TypeScript文件
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

function generateSecureRandom(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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

// Node.js环境中的btoa实现
if (!globalThis.btoa) {
    globalThis.btoa = function(str) {
        return Buffer.from(str, 'binary').toString('base64');
    };
}

console.log('🔐 MCP Server 鉴权设置工具\n');

// 生成API密钥
console.log('📋 生成的API密钥:');
for (let i = 1; i <= 3; i++) {
    const apiKey = generateApiKey(32);
    console.log(`  API Key ${i}: ${apiKey}`);
}

console.log('\n🔑 生成的JWT密钥:');
const jwtSecret = generateSecureRandom(64);
console.log(`  JWT Secret: ${jwtSecret}`);

console.log('\n📝 设置环境变量的命令:');
console.log('  开发环境 (.dev.vars 文件):');
console.log(`    API_KEYS=key1,key2,key3`);
console.log(`    JWT_SECRET=${jwtSecret}`);
console.log(`    ALLOWED_ORIGINS=http://localhost:3000,https://playground.ai.cloudflare.com`);

console.log('\n  生产环境 (Wrangler secrets):');
console.log('    wrangler secret put API_KEYS');
console.log('    wrangler secret put JWT_SECRET');
console.log('    wrangler secret put ALLOWED_ORIGINS');

console.log('\n🧪 测试JWT生成:');
generateJWT({
    userId: 'test-user',
    username: 'testuser',
    roles: ['user']
}, jwtSecret, 3600).then(token => {
    console.log(`  示例JWT Token: ${token}`);
    console.log('\n✅ 设置完成！请参考README.md了解详细配置说明。');
}).catch(err => {
    console.error('❌ JWT生成失败:', err);
});

console.log('\n🔒 安全提醒:');
console.log('  1. 请妥善保管生成的密钥');
console.log('  2. 不要将密钥提交到版本控制系统');
console.log('  3. 定期轮换API密钥');
console.log('  4. 在生产环境中使用HTTPS');
