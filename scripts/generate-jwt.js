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

// 生成测试JWT
const payload = {
    userId: 'test-user',
    username: 'testuser',
    roles: ['user']
};

const secret = '094562b93f73fcc7a65ecae3fd4d0deea66ba0e3266bdd6dc41f5eba7391c21c80ca9e053c570b6a4b7c727f3f2a6d19996f37606f1b64689d44eeb1fc74fb61';

generateJWT(payload, secret, 3600).then(token => {
    console.log(token);
}).catch(err => {
    console.error('Error generating JWT:', err);
});
