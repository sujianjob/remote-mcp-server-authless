#!/usr/bin/env node

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

async function generatePermanentJWT(payload, secret) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
        ...payload,
        iat: now,
        // 不设置exp字段，使token永久有效
        // 或者设置一个非常远的未来时间（100年后）
        exp: now + (100 * 365 * 24 * 60 * 60) // 100年后过期
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

// 生成永久JWT
const payload = {
    userId: 'permanent-user',
    username: 'permanent-access',
    roles: ['user', 'admin'], // 给予管理员权限以访问所有API
    type: 'permanent',
    description: 'Permanent access token for Interactive Feedback MCP'
};

const secret = 'ibtZyMQ0_OOtm5BUIYVKa9o0Qy_Kx3N_NC0vqL-Eev4';

console.log('🔑 Generating permanent JWT token...\n');

generatePermanentJWT(payload, secret).then(token => {
    console.log('✅ Permanent JWT Token Generated Successfully!\n');
    console.log('📋 Token Details:');
    console.log('   - User ID: permanent-user');
    console.log('   - Username: permanent-access');
    console.log('   - Roles: user, admin');
    console.log('   - Type: permanent');
    console.log('   - Expires: ~100 years from now\n');
    
    console.log('🎯 Your Permanent JWT Token:');
    console.log('─'.repeat(80));
    console.log(token);
    console.log('─'.repeat(80));
    
    console.log('\n📝 Usage Examples:');
    console.log('\n1. MCP Tool Call:');
    console.log(`curl -X POST https://mcp.123648.xyz/mcp \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`);
    
    console.log('\n2. Analytics API:');
    console.log(`curl -X GET "https://mcp.123648.xyz/api/analytics/health" \\`);
    console.log(`  -H "Authorization: Bearer ${token}"`);
    
    console.log('\n3. Feedback API:');
    console.log(`curl -X GET "https://mcp.123648.xyz/api/feedback/list" \\`);
    console.log(`  -H "Authorization: Bearer ${token}"`);
    
    console.log('\n⚠️  Security Notes:');
    console.log('   - This token will remain valid for ~100 years');
    console.log('   - Store it securely and do not share publicly');
    console.log('   - Use environment variables in production');
    console.log('   - Consider rotating tokens periodically for security\n');
    
    // 解码并显示token内容
    try {
        const parts = token.split('.');
        const decodedPayload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
        
        console.log('🔍 Decoded Token Payload:');
        console.log(JSON.stringify(decodedPayload, null, 2));
        
        const expirationDate = new Date(decodedPayload.exp * 1000);
        console.log(`\n📅 Token expires on: ${expirationDate.toISOString()}`);
        console.log(`📅 That's approximately: ${Math.round((decodedPayload.exp - Math.floor(Date.now() / 1000)) / (365 * 24 * 60 * 60))} years from now`);
    } catch (err) {
        console.log('⚠️  Could not decode token for display');
    }
    
}).catch(err => {
    console.error('❌ Error generating permanent JWT:', err);
});
