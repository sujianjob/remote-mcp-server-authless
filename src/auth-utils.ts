/**
 * JWT鉴权工具函数
 * 提供JWT生成和验证等实用工具
 */

/**
 * 生成JWT Token (简化版本)
 * 注意：这是一个简化版本，生产环境建议使用专业的JWT库
 */
export async function generateJWT(payload: Record<string, any>, secret: string, expiresInSeconds: number = 3600): Promise<string> {
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

/**
 * 生成JWT签名
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
 * 哈希密码 (使用SHA-256)
 */
export async function hashPassword(password: string, salt?: string): Promise<string> {
	const actualSalt = salt || generateApiKey(16);
	const encoder = new TextEncoder();
	const data = encoder.encode(password + actualSalt);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	return `${hashHex}:${actualSalt}`;
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
	const [hash, salt] = hashedPassword.split(':');
	if (!hash || !salt) {
		return false;
	}
	
	const newHash = await hashPassword(password, salt);
	return newHash === hashedPassword;
}

/**
 * 生成安全的随机字符串
 */
export function generateSecureRandom(length: number = 32): string {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}



/**
 * 创建基本的用户会话信息
 */
export interface UserSession {
	userId: string;
	username?: string;
	roles?: string[];
	permissions?: string[];
	createdAt: number;
	expiresAt: number;
}

/**
 * 创建用户会话
 */
export function createUserSession(userId: string, options: {
	username?: string;
	roles?: string[];
	permissions?: string[];
	expiresInSeconds?: number;
} = {}): UserSession {
	const now = Date.now();
	const expiresInSeconds = options.expiresInSeconds || 3600; // 默认1小时

	return {
		userId,
		username: options.username,
		roles: options.roles || [],
		permissions: options.permissions || [],
		createdAt: now,
		expiresAt: now + (expiresInSeconds * 1000)
	};
}

/**
 * 验证用户会话是否有效
 */
export function isSessionValid(session: UserSession): boolean {
	return Date.now() < session.expiresAt;
}

/**
 * 检查用户是否有特定权限
 */
export function hasPermission(session: UserSession, permission: string): boolean {
	return session.permissions?.includes(permission) || false;
}

/**
 * 检查用户是否有特定角色
 */
export function hasRole(session: UserSession, role: string): boolean {
	return session.roles?.includes(role) || false;
}

/**
 * 速率限制相关工具
 */
export interface RateLimitInfo {
	count: number;
	resetTime: number;
}

/**
 * 简单的内存速率限制器 (注意：在多实例环境中不共享状态)
 */
export class SimpleRateLimiter {
	private limits = new Map<string, RateLimitInfo>();
	private maxRequests: number;
	private windowMs: number;

	constructor(maxRequests: number = 100, windowMs: number = 60000) {
		this.maxRequests = maxRequests;
		this.windowMs = windowMs;
	}

	isAllowed(identifier: string): boolean {
		const now = Date.now();
		const limit = this.limits.get(identifier);

		if (!limit || now > limit.resetTime) {
			// 重置或创建新的限制记录
			this.limits.set(identifier, {
				count: 1,
				resetTime: now + this.windowMs
			});
			return true;
		}

		if (limit.count >= this.maxRequests) {
			return false;
		}

		limit.count++;
		return true;
	}

	getRemainingRequests(identifier: string): number {
		const limit = this.limits.get(identifier);
		if (!limit || Date.now() > limit.resetTime) {
			return this.maxRequests;
		}
		return Math.max(0, this.maxRequests - limit.count);
	}

	getResetTime(identifier: string): number {
		const limit = this.limits.get(identifier);
		if (!limit || Date.now() > limit.resetTime) {
			return Date.now() + this.windowMs;
		}
		return limit.resetTime;
	}
}

/**
 * 日志记录工具
 */
export function logAuthEvent(event: string, details: Record<string, any> = {}) {
	console.log(JSON.stringify({
		timestamp: new Date().toISOString(),
		event,
		...details
	}));
}
