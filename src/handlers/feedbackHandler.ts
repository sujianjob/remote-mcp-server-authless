/**
 * 反馈API处理器
 * 处理所有反馈相关的API请求
 */

import { FeedbackService } from '../services/feedbackService.js';
import {
	CreateFeedbackRequest,
	SubmitFeedbackRequest,
	CreateFeedbackData,
	SessionStatusData,
	FeedbackResultData,
	SubmitFeedbackData,
	FeedbackListData
} from '../types/feedback.js';
import {
	createSuccessResponse,
	createErrorResponse,
	createMethodNotAllowedResponse,
	createValidationErrorResponse,
	createNotFoundResponse,
	handleAsyncOperation,
	addCorsHeaders
} from '../utils/response.js';
import {
	validateCreateFeedbackRequest,
	validateSubmitFeedbackRequest,
	validateSessionId,
	validateHttpMethod,
	validateContentType
} from '../utils/validation.js';

export class FeedbackHandler {
	constructor(private feedbackService: FeedbackService) {}

	/**
	 * 处理创建反馈会话请求
	 * POST /api/feedback/create
	 */
	async handleCreateSession(request: Request, baseUrl: string): Promise<Response> {
		// 验证HTTP方法
		if (!validateHttpMethod(request.method, ['POST'])) {
			return createMethodNotAllowedResponse(['POST']);
		}

		// 验证Content-Type
		if (!validateContentType(request.headers.get('content-type'))) {
			return createValidationErrorResponse('content-type', 'application/json required');
		}

		return handleAsyncOperation(async () => {
			const body = await request.json();

			// 验证请求数据
			const validation = validateCreateFeedbackRequest(body);
			if (!validation.isValid) {
				throw new Error(`validation: ${validation.errors.join(', ')}`);
			}

			const response = await this.feedbackService.createSession(validation.data!, baseUrl);
			return response;
		}, '创建反馈会话失败');
	}

	/**
	 * 处理获取会话状态请求
	 * GET /api/feedback/{sessionId}/status
	 */
	async handleGetStatus(request: Request, sessionId: string): Promise<Response> {
		// 验证HTTP方法
		if (!validateHttpMethod(request.method, ['GET'])) {
			return createMethodNotAllowedResponse(['GET']);
		}

		// 验证会话ID格式
		if (!validateSessionId(sessionId)) {
			return createValidationErrorResponse('sessionId', 'invalid format');
		}

		return handleAsyncOperation(async () => {
			const status = await this.feedbackService.getSessionStatus(sessionId);
			if (!status) {
				throw new Error('not found');
			}
			return status;
		}, '获取会话状态失败');
	}

	/**
	 * 处理提交反馈请求
	 * POST /api/feedback/{sessionId}/submit
	 */
	async handleSubmitFeedback(request: Request, sessionId: string): Promise<Response> {
		// 验证HTTP方法
		if (!validateHttpMethod(request.method, ['POST'])) {
			return createMethodNotAllowedResponse(['POST']);
		}

		// 验证会话ID格式
		if (!validateSessionId(sessionId)) {
			return createValidationErrorResponse('sessionId', 'invalid format');
		}

		// 验证Content-Type
		if (!validateContentType(request.headers.get('content-type'))) {
			return createValidationErrorResponse('content-type', 'application/json required');
		}

		return handleAsyncOperation(async () => {
			const body = await request.json();

			// 验证请求数据
			const validation = validateSubmitFeedbackRequest(body);
			if (!validation.isValid) {
				throw new Error(`validation: ${validation.errors.join(', ')}`);
			}

			const response = await this.feedbackService.submitFeedback(sessionId, validation.data!);
			return response;
		}, '提交反馈失败');
	}

	/**
	 * 处理获取反馈结果请求
	 * GET /api/feedback/{sessionId}/result
	 */
	async handleGetResult(request: Request, sessionId: string): Promise<Response> {
		// 验证HTTP方法
		if (!validateHttpMethod(request.method, ['GET'])) {
			return createMethodNotAllowedResponse(['GET']);
		}

		// 验证会话ID格式
		if (!validateSessionId(sessionId)) {
			return createValidationErrorResponse('sessionId', 'invalid format');
		}

		return handleAsyncOperation(async () => {
			const result = await this.feedbackService.getFeedbackResult(sessionId);
			if (!result) {
				throw new Error('not found');
			}
			return result;
		}, '获取反馈结果失败');
	}
	/**
	 * 处理获取反馈列表请求
	 * GET /api/feedback/list
	 */
	async handleGetFeedbackList(request: Request): Promise<Response> {
		// 验证HTTP方法
		if (!validateHttpMethod(request.method, ['GET'])) {
			return createMethodNotAllowedResponse(['GET']);
		}

		const url = new URL(request.url);
		const status = url.searchParams.get('status') as any;
		const limit = parseInt(url.searchParams.get('limit') || '50');

		return handleAsyncOperation(async () => {
			const result = await this.feedbackService.getFeedbackList(status, limit);
			return result;
		}, '获取反馈列表失败');
	}

	/**
	 * 处理获取反馈界面请求
	 * GET /feedback 或 GET /feedback/{sessionId}
	 */
	async handleGetFeedbackUI(request: Request, sessionId?: string): Promise<Response> {
		// 验证HTTP方法
		if (!validateHttpMethod(request.method, ['GET'])) {
			return createMethodNotAllowedResponse(['GET']);
		}

		try {
			if (!sessionId) {
				// 显示反馈列表页面
				const html = await this.generateFeedbackListHTML(request);
				return new Response(html, {
					headers: {
						'Content-Type': 'text/html; charset=utf-8',
						'Cache-Control': 'no-cache'
					}
				});
			} else {
				// 验证会话ID格式
				if (!validateSessionId(sessionId)) {
					return createNotFoundResponse('反馈页面');
				}

				// 检查会话是否存在
				const session = await this.feedbackService.getSession(sessionId);
				if (!session) {
					return createNotFoundResponse('反馈会话');
				}

				// 生成反馈详情页面
				const html = await this.generateFeedbackDetailHTML(session, request);
				return new Response(html, {
					headers: {
						'Content-Type': 'text/html; charset=utf-8',
						'Cache-Control': 'no-cache'
					}
				});
			}
		} catch (error) {
			console.error('获取反馈界面失败:', error);
			const { createInternalErrorResponse } = await import('../utils/response.js');
			return createInternalErrorResponse('页面加载失败');
		}
	}

	/**
	 * 生成反馈列表页面HTML
	 */
	private async generateFeedbackListHTML(request: Request): Promise<string> {
		const url = new URL(request.url);
		const theme = url.searchParams.get('theme') || 'dark';
		const lang = url.searchParams.get('lang') || 'zh';

		// 获取反馈列表数据
		const feedbackList = await this.feedbackService.getFeedbackList('pending', 50);

		const { generateFeedbackListHTML } = await import('../utils/template.js');
		return generateFeedbackListHTML(feedbackList, request, theme, lang);
	}

	/**
	 * 生成反馈详情页面HTML
	 */
	private async generateFeedbackDetailHTML(session: any, request: Request): Promise<string> {
		// 使用模板工具生成HTML
		const { generateFeedbackDetailHTML } = await import('../utils/template.js');
		return generateFeedbackDetailHTML(session, request);
	}
}

/**
 * 解析URL路径参数
 */
export function parseApiPath(pathname: string): {
	sessionId?: string;
	action?: string;
} {
	// 匹配 /api/feedback/{sessionId}/{action}
	const apiMatch = pathname.match(/^\/api\/feedback\/([^\/]+)\/?(status|submit|result)?$/);
	if (apiMatch) {
		return {
			sessionId: apiMatch[1],
			action: apiMatch[2]
		};
	}

	// 匹配 /feedback/{sessionId}
	const uiMatch = pathname.match(/^\/feedback\/([^\/]+)$/);
	if (uiMatch) {
		return {
			sessionId: uiMatch[1]
		};
	}

	return {};
}

/**
 * 获取基础URL
 */
export function getBaseUrl(request: Request): string {
	const url = new URL(request.url);
	return `${url.protocol}//${url.host}`;
}
