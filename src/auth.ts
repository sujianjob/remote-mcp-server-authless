/**
 * 鉴权中间件和相关工具函数
 * 支持API Key和Bearer Token验证
 */

export interface AuthConfig {
	apiKeys?: string[];
	jwtSecret?: string;
	allowedOrigins?: string[];
}

export interface AuthResult {
	success: boolean;
	error?: string;
	userId?: string;
	metadata?: Record<string, any>;
}

/**
 * 从环境变量解析鉴权配置
 */
export function getAuthConfig(env: Env): AuthConfig {
	const config: AuthConfig = {};

	// 解析API Keys (支持逗号分隔的多个key)
	if (env.API_KEYS) {
		config.apiKeys = env.API_KEYS.split(',').map(key => key.trim()).filter(Boolean);
	}

	// JWT密钥
	if (env.JWT_SECRET) {
		config.jwtSecret = env.JWT_SECRET;
	}

	// 允许的来源域名
	if (env.ALLOWED_ORIGINS) {
		config.allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean);
	}

	return config;
}

/**
 * 验证API Key
 */
export function validateApiKey(apiKey: string, validKeys: string[]): AuthResult {
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
 * 检查CORS来源
 */
export function validateOrigin(origin: string | null, allowedOrigins?: string[]): boolean {
	if (!allowedOrigins || allowedOrigins.length === 0) {
		return true; // 如果没有配置限制，则允许所有来源
	}

	if (!origin) {
		return false;
	}

	return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
}

/**
 * 鉴权中间件
 */
export async function authenticate(request: Request, env: Env): Promise<AuthResult> {
	const config = getAuthConfig(env);
	
	// 检查CORS来源
	const origin = request.headers.get('Origin');
	if (!validateOrigin(origin, config.allowedOrigins)) {
		return { success: false, error: 'Origin not allowed' };
	}

	// 尝试API Key验证
	const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('ApiKey ', '');
	if (apiKey && config.apiKeys) {
		const result = validateApiKey(apiKey, config.apiKeys);
		if (result.success) {
			return result;
		}
	}

	// 尝试Bearer Token验证
	const authHeader = request.headers.get('Authorization');
	if (authHeader?.startsWith('Bearer ') && config.jwtSecret) {
		const token = authHeader.substring(7);
		const result = await validateJWT(token, config.jwtSecret);
		if (result.success) {
			return result;
		}
	}

	// 如果没有配置任何鉴权方式，则允许访问
	if (!config.apiKeys && !config.jwtSecret) {
		return { 
			success: true, 
			userId: 'anonymous',
			metadata: { authMethod: 'none' }
		};
	}

	return { success: false, error: 'Authentication required' };
}

/**
 * 创建鉴权响应
 */
export function createAuthErrorResponse(error: string, status: number = 401): Response {
	return new Response(JSON.stringify({ error }), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
		},
	});
}

/**
 * 处理CORS预检请求
 */
export function handleCORS(request: Request): Response | null {
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 200,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
				'Access-Control-Max-Age': '86400',
			},
		});
	}
	return null;
}
