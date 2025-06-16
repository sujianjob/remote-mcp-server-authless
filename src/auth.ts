/**
 * 简化的鉴权中间件
 * 只支持JWT Bearer Token验证
 */

export interface AuthResult {
	success: boolean;
	error?: string;
	userId?: string;
	metadata?: Record<string, any>;
}

/**
 * Base64 URL解码函数 (兼容Cloudflare Workers)
 */
function base64UrlDecode(str: string): string {
	// 添加padding
	str += '='.repeat((4 - str.length % 4) % 4);
	// 替换URL安全字符
	str = str.replace(/-/g, '+').replace(/_/g, '/');

	// 在Cloudflare Workers中使用atob，如果不可用则使用Buffer
	try {
		return atob(str);
	} catch {
		// 备用方案：手动解码
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
		let result = '';
		let i = 0;

		str = str.replace(/[^A-Za-z0-9+/]/g, '');

		while (i < str.length) {
			const encoded1 = chars.indexOf(str.charAt(i++));
			const encoded2 = chars.indexOf(str.charAt(i++));
			const encoded3 = chars.indexOf(str.charAt(i++));
			const encoded4 = chars.indexOf(str.charAt(i++));

			const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;

			result += String.fromCharCode((bitmap >> 16) & 255);
			if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
			if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
		}

		return result;
	}
}



/**
 * 简单的JWT验证 (不依赖外部库)
 * 注意：这是一个简化版本，生产环境建议使用专业的JWT库
 */
export async function validateJWT(token: string, secret: string): Promise<AuthResult> {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) {
			return { success: false, error: 'Invalid JWT format' };
		}

		const [headerB64, payloadB64, signatureB64] = parts;
		
		// 验证签名 (简化版本)
		const expectedSignature = await generateJWTSignature(headerB64 + '.' + payloadB64, secret);
		if (signatureB64 !== expectedSignature) {
			return { success: false, error: 'Invalid JWT signature' };
		}

		// 解析payload
		const payload = JSON.parse(base64UrlDecode(payloadB64));
		
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

/**
 * 生成JWT签名 (简化版本)
 */
async function generateJWTSignature(data: string, secret: string): Promise<string> {
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



/**
 * 简化的鉴权中间件 - 只支持JWT Bearer Token
 */
export async function authenticate(request: Request, env: Env): Promise<AuthResult> {
	// 检查是否配置了JWT密钥
	if (!env.JWT_SECRET) {
		return {
			success: true,
			userId: 'anonymous',
			metadata: { authMethod: 'none' }
		};
	}

	// 获取Authorization头
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return { success: false, error: 'Bearer token required' };
	}

	// 提取并验证JWT token
	const token = authHeader.substring(7);
	const result = await validateJWT(token, env.JWT_SECRET);

	return result;
}

/**
 * 创建鉴权错误响应
 */
export function createAuthErrorResponse(error: string, status: number = 401): Response {
	return new Response(JSON.stringify({ error }), {
		status,
		headers: {
			'Content-Type': 'application/json',
		},
	});
}
