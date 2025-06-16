import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { authenticate, createAuthErrorResponse } from "./auth.js";

// Define our MCP agent with Interactive Feedback tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Interactive Feedback MCP",
		version: "2.0.0",
	});

	// 添加env属性以便访问KV和Durable Objects
	env!: Env;

	async init() {
		// Interactive feedback tool - 使用新的API架构
		this.server.tool(
			"interactive_feedback",
			{
				message: z.string().min(1).max(1000).describe("向用户显示的提示信息"),
				predefinedOptions: z.array(z.string().max(100)).max(10).optional().describe("预定义选项列表"),
				timeout: z.number().min(30).max(3600).optional().describe("会话超时时间(秒)，默认300秒"),
				metadata: z.record(z.any()).optional().describe("附加元数据")
			},
			async ({ message, predefinedOptions, timeout, metadata }) => {
				try {
					// 使用新的FeedbackService创建会话
					const { FeedbackService } = await import('./services/feedbackService.js');
					const feedbackService = new FeedbackService(this.env.OAUTH_KV, this.env);

					const baseUrl = this.getBaseUrl();
					const createRequest = {
						message,
						predefinedOptions,
						timeout,
						metadata: {
							...metadata,
							source: 'mcp-tool',
							createdBy: 'ai-assistant',
							timestamp: new Date().toISOString()
						}
					};

					const response = await feedbackService.createSession(createRequest, baseUrl);

					// 返回格式化的响应
					return {
						content: [
							{
								type: "text",
								text: `🎯 Interactive Feedback Session Created Successfully!\n\n` +
									  `📋 Session Details:\n` +
									  `   • Session ID: ${response.sessionId}\n` +
									  `   • Expires at: ${response.expiresAt}\n\n` +
									  `🌐 User Access:\n` +
									  `   • Feedback URL: ${response.feedbackUrl}\n` +
									  `   • Direct link for user to provide feedback\n\n` +
									  `🔍 Monitoring:\n` +
									  `   • Status URL: ${response.statusUrl}\n` +
									  `   • Use this to check submission status\n\n` +
									  `💡 Next Steps:\n` +
									  `   1. Share the Feedback URL with the user\n` +
									  `   2. Monitor the Status URL for responses\n` +
									  `   3. Retrieve results when status shows 'completed'\n\n` +
									  `⏰ Session will expire automatically after ${timeout || 300} seconds.`
							}
						]
					};
				} catch (error) {
					console.error('Interactive feedback tool error:', error);
					return {
						content: [
							{
								type: "text",
								text: `❌ Error creating feedback session:\n\n` +
									  `${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
									  `Please check your request parameters and try again.`
							}
						]
					};
				}
			}
		);

		// 添加获取反馈结果的工具
		this.server.tool(
			"get_feedback_result",
			{
				sessionId: z.string().uuid().describe("反馈会话ID")
			},
			async ({ sessionId }) => {
				try {
					const { FeedbackService } = await import('./services/feedbackService.js');
					const feedbackService = new FeedbackService(this.env.OAUTH_KV, this.env);

					const result = await feedbackService.getFeedbackResult(sessionId);

					if (!result) {
						return {
							content: [
								{
									type: "text",
									text: `❌ No feedback result found for session: ${sessionId}\n\n` +
										  `Possible reasons:\n` +
										  `• Session doesn't exist or has expired\n` +
										  `• User hasn't submitted feedback yet\n` +
										  `• Session ID is incorrect\n\n` +
										  `Please check the session status first.`
								}
							]
						};
					}

					// 格式化反馈结果
					let feedbackText = `✅ Feedback Result Retrieved Successfully!\n\n`;
					feedbackText += `📋 Session: ${result.sessionId}\n`;
					feedbackText += `⏰ Submitted: ${result.submittedAt}\n\n`;
					feedbackText += `💬 User Feedback:\n`;
					feedbackText += `${result.feedback.combinedFeedback}\n\n`;

					if (result.feedback.selectedOptions && result.feedback.selectedOptions.length > 0) {
						feedbackText += `✅ Selected Options:\n`;
						result.feedback.selectedOptions.forEach(option => {
							feedbackText += `   • ${option}\n`;
						});
						feedbackText += `\n`;
					}

					if (result.feedback.freeText) {
						feedbackText += `📝 Additional Comments:\n`;
						feedbackText += `${result.feedback.freeText}\n\n`;
					}

					if (result.metadata) {
						feedbackText += `📊 Metadata:\n`;
						feedbackText += `${JSON.stringify(result.metadata, null, 2)}`;
					}

					return {
						content: [
							{
								type: "text",
								text: feedbackText
							}
						]
					};
				} catch (error) {
					console.error('Get feedback result error:', error);
					return {
						content: [
							{
								type: "text",
								text: `❌ Error retrieving feedback result:\n\n` +
									  `${error instanceof Error ? error.message : 'Unknown error'}`
							}
						]
					};
				}
			}
		);

		// 添加检查会话状态的工具
		this.server.tool(
			"check_feedback_status",
			{
				sessionId: z.string().uuid().describe("反馈会话ID")
			},
			async ({ sessionId }) => {
				try {
					const { FeedbackService } = await import('./services/feedbackService.js');
					const feedbackService = new FeedbackService(this.env.OAUTH_KV, this.env);

					const status = await feedbackService.getSessionStatus(sessionId);

					if (!status) {
						return {
							content: [
								{
									type: "text",
									text: `❌ Session not found: ${sessionId}\n\n` +
										  `The session may have expired or the ID is incorrect.`
								}
							]
						};
					}

					const statusEmoji = {
						'pending': '⏳',
						'completed': '✅',
						'expired': '⏰'
					}[status.status] || '❓';

					let statusText = `${statusEmoji} Feedback Session Status\n\n`;
					statusText += `📋 Session ID: ${status.sessionId}\n`;
					statusText += `📊 Status: ${status.status.toUpperCase()}\n`;
					statusText += `🕐 Created: ${status.createdAt}\n`;
					statusText += `⏰ Expires: ${status.expiresAt}\n`;

					if (status.submittedAt) {
						statusText += `✅ Submitted: ${status.submittedAt}\n`;
					}

					statusText += `\n`;

					switch (status.status) {
						case 'pending':
							statusText += `🔄 Status: Waiting for user feedback\n`;
							statusText += `💡 The user can still submit their response.`;
							break;
						case 'completed':
							statusText += `✅ Status: Feedback received\n`;
							statusText += `💡 Use 'get_feedback_result' tool to retrieve the feedback.`;
							break;
						case 'expired':
							statusText += `⏰ Status: Session has expired\n`;
							statusText += `💡 No feedback can be submitted for this session.`;
							break;
					}

					return {
						content: [
							{
								type: "text",
								text: statusText
							}
						]
					};
				} catch (error) {
					console.error('Check feedback status error:', error);
					return {
						content: [
							{
								type: "text",
								text: `❌ Error checking feedback status:\n\n` +
									  `${error instanceof Error ? error.message : 'Unknown error'}`
							}
						]
					};
				}
			}
		);
	}

	private getBaseUrl(): string {
		// 在实际环境中，这应该从请求中获取
		// 这里先用一个默认值，后续会改进
		return 'https://remote-mcp-server-authless.sujianjob.workers.dev';
	}
}

// WebSocket管理的Durable Object
export class WebSocketManager {
	private sessionManager: any;

	constructor(private state: DurableObjectState, private env: Env) {}

	async fetch(request: Request): Promise<Response> {
		// 延迟加载SessionManager以避免循环依赖
		if (!this.sessionManager) {
			const { SessionManager } = await import('./websocket/sessionManager.js');
			this.sessionManager = new SessionManager(this.state, this.env);
		}

		return this.sessionManager.fetch(request);
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// 处理CORS预检请求
		if (request.method === 'OPTIONS') {
			const { handleCorsPreflightRequest } = await import('./utils/response.js');
			return handleCorsPreflightRequest(request.headers.get('Origin') || undefined);
		}

		// 健康检查端点（无需鉴权）
		if (url.pathname === "/health") {
			const { createSuccessResponse, addCorsHeaders } = await import('./utils/response.js');
			const response = createSuccessResponse({
				status: "ok",
				timestamp: new Date().toISOString(),
				service: "Interactive Feedback MCP Server",
				version: "2.0.0"
			});
			return addCorsHeaders(response, request.headers.get('Origin') || undefined);
		}

		// WebSocket 路由（需要鉴权）
		if (url.pathname.startsWith("/ws/")) {
			return handleWebSocketConnection(request, env, ctx);
		}

		// Interactive Feedback API 路由（需要鉴权）
		if (url.pathname.startsWith("/api/feedback")) {
			return handleFeedbackAPI(request, env, ctx);
		}

		// 反馈界面路由（无需鉴权）
		if (url.pathname.startsWith("/feedback/")) {
			return handleFeedbackUI(request, env, ctx);
		}

		// MCP 端点（需要鉴权）
		if (url.pathname === "/sse" || url.pathname === "/sse/message" || url.pathname === "/mcp") {
			return handleMCPEndpoints(request, env, ctx);
		}

		// 404 处理
		const { createNotFoundResponse } = await import('./utils/response.js');
		return createNotFoundResponse('请求的资源');
	},
};

/**
 * 处理反馈API请求
 */
async function handleFeedbackAPI(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
	const url = new URL(request.url);
	const { parseApiPath, getBaseUrl } = await import('./handlers/feedbackHandler.js');
	const { FeedbackHandler } = await import('./handlers/feedbackHandler.js');
	const { FeedbackService } = await import('./services/feedbackService.js');
	const { addCorsHeaders } = await import('./utils/response.js');

	// 解析路径
	const { sessionId, action } = parseApiPath(url.pathname);

	// 检查哪些端点需要认证
	const needsAuth = url.pathname === "/api/feedback/create" ||
					  (sessionId && (action === "status" || action === "result"));

	// 只对需要认证的端点进行鉴权
	if (needsAuth) {
		const authResult = await authenticate(request, env);
		if (!authResult.success) {
			console.log(`API authentication failed: ${authResult.error}`);
			const { createUnauthorizedResponse } = await import('./utils/response.js');
			return addCorsHeaders(
				createUnauthorizedResponse(authResult.error || "API Key required"),
				request.headers.get('Origin') || undefined
			);
		}
		console.log(`API authentication successful for user: ${authResult.userId}`);
	}

	// 初始化服务
	const feedbackService = new FeedbackService(env.OAUTH_KV, env);
	const feedbackHandler = new FeedbackHandler(feedbackService);
	const baseUrl = getBaseUrl(request);

	let response: Response;

	try {
		if (url.pathname === "/api/feedback/create") {
			// 创建反馈会话（需要认证）
			response = await feedbackHandler.handleCreateSession(request, baseUrl);
		} else if (sessionId && action === "status") {
			// 获取会话状态（需要认证）
			response = await feedbackHandler.handleGetStatus(request, sessionId);
		} else if (sessionId && action === "submit") {
			// 提交反馈（公开访问，无需认证）
			response = await feedbackHandler.handleSubmitFeedback(request, sessionId);
		} else if (sessionId && action === "result") {
			// 获取反馈结果（需要认证）
			response = await feedbackHandler.handleGetResult(request, sessionId);
		} else {
			const { createNotFoundResponse } = await import('./utils/response.js');
			response = createNotFoundResponse('API端点');
		}
	} catch (error) {
		console.error('API error:', error);
		const { createInternalErrorResponse } = await import('./utils/response.js');
		response = createInternalErrorResponse('API处理失败');
	}

	// 添加CORS头
	return addCorsHeaders(response, request.headers.get('Origin') || undefined);
}

/**
 * 处理反馈界面请求
 */
async function handleFeedbackUI(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
	const url = new URL(request.url);
	const { parseApiPath } = await import('./handlers/feedbackHandler.js');
	const { FeedbackHandler } = await import('./handlers/feedbackHandler.js');
	const { FeedbackService } = await import('./services/feedbackService.js');

	// 解析会话ID
	const { sessionId } = parseApiPath(url.pathname);

	if (!sessionId) {
		const { createNotFoundResponse } = await import('./utils/response.js');
		return createNotFoundResponse('反馈页面');
	}

	// 初始化服务
	const feedbackService = new FeedbackService(env.OAUTH_KV, env);
	const feedbackHandler = new FeedbackHandler(feedbackService);

	try {
		return await feedbackHandler.handleGetFeedbackUI(request, sessionId);
	} catch (error) {
		console.error('UI error:', error);
		const { createInternalErrorResponse } = await import('./utils/response.js');
		return createInternalErrorResponse('页面加载失败');
	}
}

/**
 * 处理WebSocket连接请求
 */
async function handleWebSocketConnection(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
	// WebSocket连接需要鉴权
	const url = new URL(request.url);
	const apiKey = url.searchParams.get('apiKey');

	if (!apiKey) {
		const { createUnauthorizedResponse } = await import('./utils/response.js');
		return createUnauthorizedResponse('WebSocket连接需要API Key');
	}

	// 简单的API Key验证（在实际应用中应该更严格）
	if (!env.JWT_SECRET) {
		console.log('WebSocket connection allowed (no auth configured)');
	} else {
		// 这里可以添加更严格的API Key验证
		console.log(`WebSocket connection authenticated with API Key: ${apiKey.substring(0, 8)}...`);
	}

	try {
		// 获取WebSocket管理的Durable Object实例
		// 暂时使用MCP_OBJECT，后续会更新类型定义
		const durableObjectId = env.MCP_OBJECT.idFromName('websocket-manager');
		const durableObject = env.MCP_OBJECT.get(durableObjectId);

		// 转发请求到Durable Object
		return await durableObject.fetch(request);
	} catch (error) {
		console.error('WebSocket connection error:', error);
		const { createInternalErrorResponse } = await import('./utils/response.js');
		return createInternalErrorResponse('WebSocket连接失败');
	}
}

/**
 * 处理MCP端点请求
 */
async function handleMCPEndpoints(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const authResult = await authenticate(request, env);

	if (!authResult.success) {
		console.log(`MCP authentication failed: ${authResult.error}`);
		return createAuthErrorResponse(authResult.error || "Authentication failed");
	}

	console.log(`MCP authentication successful for user: ${authResult.userId}`);

	// 在请求头中添加用户信息，供下游使用
	const modifiedRequest = new Request(request, {
		headers: {
			...Object.fromEntries(request.headers.entries()),
			'X-User-ID': authResult.userId || 'unknown'
		}
	});

	const url = new URL(request.url);

	if (url.pathname === "/sse" || url.pathname === "/sse/message") {
		return MyMCP.serveSSE("/sse").fetch(modifiedRequest, env, ctx);
	}

	if (url.pathname === "/mcp") {
		return MyMCP.serve("/mcp").fetch(modifiedRequest, env, ctx);
	}

	const { createNotFoundResponse } = await import('./utils/response.js');
	return createNotFoundResponse('MCP端点');
}
