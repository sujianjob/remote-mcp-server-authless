/**
 * API响应格式化工具
 * 提供标准化的成功和错误响应格式
 */

import { ApiResponse, ErrorCode } from '../types/feedback.js';

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(data: T, status: number = 200): Response {
	const response: ApiResponse<T> = {
		success: true,
		data,
		error: null,
		timestamp: new Date().toISOString()
	};

	return new Response(JSON.stringify(response), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache'
		}
	});
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
	code: ErrorCode | string,
	message: string,
	status: number = 400,
	details?: Record<string, any>
): Response {
	const response: ApiResponse<null> = {
		success: false,
		data: null,
		error: {
			code,
			message,
			details
		},
		timestamp: new Date().toISOString()
	};

	return new Response(JSON.stringify(response), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache'
		}
	});
}

/**
 * 创建验证错误响应
 */
export function createValidationErrorResponse(
	field: string,
	reason: string,
	value?: any
): Response {
	return createErrorResponse(
		ErrorCode.INVALID_REQUEST,
		`验证失败: ${field}`,
		400,
		{ field, reason, value }
	);
}

/**
 * 创建未找到错误响应
 */
export function createNotFoundResponse(resource: string = '资源'): Response {
	return createErrorResponse(
		ErrorCode.SESSION_NOT_FOUND,
		`${resource}不存在或已过期`,
		404
	);
}

/**
 * 创建未授权错误响应
 */
export function createUnauthorizedResponse(message: string = '认证失败'): Response {
	return createErrorResponse(
		ErrorCode.UNAUTHORIZED,
		message,
		401
	);
}

/**
 * 创建会话过期错误响应
 */
export function createSessionExpiredResponse(): Response {
	return createErrorResponse(
		ErrorCode.SESSION_EXPIRED,
		'会话已过期',
		410
	);
}

/**
 * 创建重复提交错误响应
 */
export function createAlreadySubmittedResponse(): Response {
	return createErrorResponse(
		ErrorCode.ALREADY_SUBMITTED,
		'该会话已经提交过反馈',
		409
	);
}

/**
 * 创建速率限制错误响应
 */
export function createRateLimitResponse(retryAfter: number = 60): Response {
	const response = createErrorResponse(
		ErrorCode.RATE_LIMITED,
		'请求频率超限，请稍后重试',
		429
	);

	// 添加 Retry-After 头
	const headers = new Headers(response.headers);
	headers.set('Retry-After', retryAfter.toString());

	return new Response(response.body, {
		status: response.status,
		headers
	});
}

/**
 * 创建内部服务器错误响应
 */
export function createInternalErrorResponse(message: string = '服务器内部错误'): Response {
	return createErrorResponse(
		ErrorCode.INTERNAL_ERROR,
		message,
		500
	);
}

/**
 * 创建方法不允许错误响应
 */
export function createMethodNotAllowedResponse(allowedMethods: string[] = []): Response {
	const response = createErrorResponse(
		ErrorCode.INVALID_REQUEST,
		'请求方法不允许',
		405
	);

	if (allowedMethods.length > 0) {
		const headers = new Headers(response.headers);
		headers.set('Allow', allowedMethods.join(', '));
		
		return new Response(response.body, {
			status: response.status,
			headers
		});
	}

	return response;
}

/**
 * 处理异步操作并返回标准化响应
 */
export async function handleAsyncOperation<T>(
	operation: () => Promise<T>,
	errorMessage: string = '操作失败'
): Promise<Response> {
	try {
		const result = await operation();
		return createSuccessResponse(result);
	} catch (error) {
		console.error('Async operation failed:', error);
		
		if (error instanceof Error) {
			// 检查是否是已知的业务错误
			if (error.message.includes('not found')) {
				return createNotFoundResponse();
			}
			if (error.message.includes('expired')) {
				return createSessionExpiredResponse();
			}
			if (error.message.includes('already submitted')) {
				return createAlreadySubmittedResponse();
			}
			if (error.message.includes('validation')) {
				return createValidationErrorResponse('unknown', error.message);
			}
			
			return createInternalErrorResponse(error.message);
		}
		
		return createInternalErrorResponse(errorMessage);
	}
}

/**
 * 添加CORS头到响应
 */
export function addCorsHeaders(response: Response, origin?: string): Response {
	const headers = new Headers(response.headers);
	
	// 设置CORS头
	headers.set('Access-Control-Allow-Origin', origin || '*');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
	headers.set('Access-Control-Max-Age', '86400');
	
	return new Response(response.body, {
		status: response.status,
		headers
	});
}

/**
 * 处理CORS预检请求
 */
export function handleCorsPreflightRequest(origin?: string): Response {
	return addCorsHeaders(new Response(null, { status: 204 }), origin);
}
