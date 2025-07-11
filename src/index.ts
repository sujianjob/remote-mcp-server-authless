import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { authenticate, createAuthErrorResponse } from "./auth.js";
import { D1DatabaseService } from "./services/d1DatabaseService.js";

// 简化的MCP服务器实现，不依赖agents包的复杂会话管理
export class MyMCP {
	server = new McpServer({
		name: "Interactive Feedback MCP",
		version: "2.0.0",
	});

	// 添加env属性以便访问KV和Durable Objects
	env!: Env;
	private d1Service?: D1DatabaseService;

	// 初始化方法（保持兼容性）
	async init() {
		// 初始化D1数据库服务（如果可用）
		if (this.env?.DB) {
			this.d1Service = new D1DatabaseService(this.env.DB);
		}
	}

	// 获取基础URL
	private getBaseUrl(): string {
		// 使用生产环境的域名
		return 'https://mcp.123648.xyz';
	}

	// 静态方法用于创建HTTP处理器
	static serve(_path: string, _options?: any) {
		return {
			fetch: async (request: Request, env: any, ctx: any) => {
				const instance = new MyMCP();
				instance.env = env;
				await instance.init();
				return instance.handleRequest(request, env, ctx);
			}
		};
	}

	static serveSSE(_path: string, _options?: any) {
		return this.serve(_path, _options);
	}

	// 处理HTTP请求
	async handleRequest(request: Request, _env: any, _ctx: any): Promise<Response> {
		try {
			const body = await request.text();
			const jsonRequest = JSON.parse(body);

			// 处理不同的MCP方法
			switch (jsonRequest.method) {
				case 'initialize':
					return this.handleInitialize(jsonRequest);
				case 'tools/list':
					return this.handleToolsList(jsonRequest);
				case 'tools/call':
					return this.handleToolCall(jsonRequest);
				default:
					return this.createErrorResponse(jsonRequest.id, -32601, 'Method not found');
			}
		} catch (error) {
			console.error('MCP request error:', error);
			return this.createErrorResponse(null, -32700, 'Parse error');
		}
	}

	// 处理初始化请求
	private handleInitialize(request: any): Response {
		const result = {
			jsonrpc: "2.0",
			id: request.id,
			result: {
				protocolVersion: "2024-11-05",
				capabilities: {
					tools: {
						listChanged: true
					}
				},
				serverInfo: {
					name: "Interactive Feedback MCP",
					version: "2.0.0"
				}
			}
		};

		return new Response(`event: message\ndata: ${JSON.stringify(result)}\n\n`, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive'
			}
		});
	}

	// 处理工具列表请求
	private handleToolsList(request: any): Response {
		const tools = [
			{
				name: "interactive_feedback",
				description: "创建交互式反馈会话，等待用户提交反馈",
				inputSchema: {
					type: "object",
					properties: {
						message: {
							type: "string",
							description: "向用户显示的提示信息",
							minLength: 1,
							maxLength: 1000
						},
						timeout: {
							type: "number",
							description: "会话超时时间(秒)，默认300秒",
							minimum: 30,
							maximum: 3600
						},
						metadata: {
							type: "object",
							description: "附加元数据"
						}
					},
					required: ["message"]
				}
			},
			{
				name: "get_feedback_result",
				description: "获取反馈会话的结果",
				inputSchema: {
					type: "object",
					properties: {
						sessionId: {
							type: "string",
							description: "反馈会话ID",
							format: "uuid"
						}
					},
					required: ["sessionId"]
				}
			},
			{
				name: "check_feedback_status",
				description: "检查反馈会话的状态",
				inputSchema: {
					type: "object",
					properties: {
						sessionId: {
							type: "string",
							description: "反馈会话ID",
							format: "uuid"
						}
					},
					required: ["sessionId"]
				}
			}
		];

		const result = {
			jsonrpc: "2.0",
			id: request.id,
			result: {
				tools: tools
			}
		};

		return new Response(JSON.stringify(result), {
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	// 处理工具调用请求
	private async handleToolCall(request: any): Promise<Response> {
		const { name, arguments: args } = request.params;
		const startTime = Date.now();

		try {
			let result;
			let sessionId: string | undefined;

			switch (name) {
				case 'interactive_feedback':
					result = await this.handleInteractiveFeedback(args);
					// 尝试从结果中提取sessionId
					if (result?.content?.[0]?.text) {
						const sessionIdMatch = result.content[0].text.match(/Session ID: ([a-f0-9-]+)/);
						sessionId = sessionIdMatch?.[1];
					}
					break;
				case 'get_feedback_result':
					result = await this.handleGetFeedbackResult(args);
					sessionId = args.sessionId;
					break;
				case 'check_feedback_status':
					result = await this.handleCheckFeedbackStatus(args);
					sessionId = args.sessionId;
					break;
				default:
					return this.createErrorResponse(request.id, -32601, `Unknown tool: ${name}`);
			}

			const executionTime = Date.now() - startTime;

			// 记录成功的工具调用到D1数据库
			if (this.d1Service) {
				try {
					await this.d1Service.recordInteraction({
						session_id: sessionId,
						tool_name: name,
						tool_arguments: JSON.stringify(args),
						tool_result: JSON.stringify(result),
						execution_time_ms: executionTime,
						status: 'success',
						user_id: 'mcp-user', // 可以从请求头获取
						metadata: JSON.stringify({
							requestId: request.id,
							timestamp: new Date().toISOString()
						})
					});
				} catch (dbError) {
					console.error('Failed to record interaction in D1:', dbError);
				}
			}

			const response = {
				jsonrpc: "2.0",
				id: request.id,
				result: result
			};

			return new Response(JSON.stringify(response), {
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} catch (error) {
			const executionTime = Date.now() - startTime;
			console.error(`Tool call error for ${name}:`, error);

			// 记录失败的工具调用到D1数据库
			if (this.d1Service) {
				try {
					await this.d1Service.recordInteraction({
						tool_name: name,
						tool_arguments: JSON.stringify(args),
						execution_time_ms: executionTime,
						status: 'error',
						error_message: error instanceof Error ? error.message : 'Unknown error',
						user_id: 'mcp-user',
						metadata: JSON.stringify({
							requestId: request.id,
							timestamp: new Date().toISOString()
						})
					});
				} catch (dbError) {
					console.error('Failed to record error interaction in D1:', dbError);
				}
			}

			return this.createErrorResponse(request.id, -32000, `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	// 创建错误响应
	private createErrorResponse(id: any, code: number, message: string): Response {
		const error = {
			jsonrpc: "2.0",
			id: id,
			error: {
				code: code,
				message: message
			}
		};

		return new Response(JSON.stringify(error), {
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	// 处理交互式反馈工具
	private async handleInteractiveFeedback(args: any) {
		const { message, timeout, metadata } = args;
		
		try {
			// 使用新的FeedbackService创建会话
			const { FeedbackService } = await import('./services/feedbackService.js');
			const feedbackService = new FeedbackService(this.env.OAUTH_KV, this.env);

			const baseUrl = this.getBaseUrl();
			const sessionTimeout = timeout || 300; // 默认5分钟
			const createRequest = {
				title: message.substring(0, 50) + (message.length > 50 ? '...' : ''), // 使用消息前50字符作为标题
				message,
				timeout: sessionTimeout,
				metadata: {
					...metadata,
					source: 'mcp-tool',
					createdBy: 'ai-assistant',
					timestamp: new Date().toISOString()
				}
			};

			const response = await feedbackService.createSession(createRequest, baseUrl);
			const sessionId = response.sessionId;

			// 显示会话创建信息
			console.log(`🎯 Interactive Feedback Session Created: ${sessionId}`);
			console.log(`📋 Feedback URL: ${response.feedbackUrl}`);
			console.log(`⏰ Waiting for user feedback (timeout: ${sessionTimeout}s)...`);

			// 等待用户反馈的轮询逻辑
			const startTime = Date.now();
			const maxWaitTime = sessionTimeout * 1000; // 转换为毫秒
			const pollInterval = 2000; // 每2秒检查一次

			while (true) {
				const elapsedTime = Date.now() - startTime;

				// 检查是否超时
				if (elapsedTime >= maxWaitTime) {
					return {
						content: [
							{
								type: "text",
								text: `⏰ **Feedback Session Timed Out**\n\n` +
									  `📋 Session ID: ${sessionId}\n` +
									  `⏱️ Timeout: ${sessionTimeout} seconds\n` +
									  `📊 Status: No feedback received within the timeout period\n\n` +
									  `💡 The user did not provide feedback before the session expired.\n` +
									  `You may want to create a new session or contact the user directly.`
							}
						]
					};
				}

				// 检查会话状态
				const status = await feedbackService.getSessionStatus(sessionId);

				if (!status) {
					return {
						content: [
							{
								type: "text",
								text: `❌ **Session Error**\n\n` +
									  `📋 Session ID: ${sessionId}\n` +
									  `📊 Status: Session not found or expired\n\n` +
									  `💡 The feedback session may have been deleted or expired.`
							}
						]
					};
				}

				// 如果用户已提交反馈，获取结果并返回
				if (status.status === 'completed') {
					const result = await feedbackService.getFeedbackResult(sessionId);

					if (result) {
						let feedbackText = `✅ **Feedback Received Successfully!**\n\n`;
						feedbackText += `📋 Session ID: ${sessionId}\n`;
						feedbackText += `⏰ Submitted: ${result.submittedAt}\n`;
						feedbackText += `⏱️ Response Time: ${Math.round(elapsedTime / 1000)} seconds\n\n`;
						feedbackText += `💬 **User Feedback:**\n`;
						feedbackText += `${result.feedback.combinedFeedback}\n\n`;

						if (result.feedback.freeText) {
							feedbackText += `📝 **Additional Comments:**\n`;
							feedbackText += `${result.feedback.freeText}\n\n`;
						}

						if (result.metadata) {
							feedbackText += `📊 **Metadata:**\n`;
							feedbackText += `\`\`\`json\n${JSON.stringify(result.metadata, null, 2)}\n\`\`\``;
						}

						return {
							content: [
								{
									type: "text",
									text: feedbackText
								}
							]
						};
					}
				}

				// 等待下次轮询
				await new Promise(resolve => setTimeout(resolve, pollInterval));
			}

		} catch (error) {
			console.error('Interactive feedback tool error:', error);
			return {
				content: [
					{
						type: "text",
						text: `❌ **Error in Interactive Feedback**\n\n` +
							  `🔍 Error Details: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
							  `💡 Please check your request parameters and try again.\n` +
							  `If the problem persists, contact the system administrator.`
					}
				]
			};
		}
	}

	// 处理获取反馈结果工具
	private async handleGetFeedbackResult(args: any) {
		const { sessionId } = args;

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

	// 处理检查反馈状态工具
	private async handleCheckFeedbackStatus(args: any) {
		const { sessionId } = args;

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
}

// WebSocket功能暂时移除，使用简化的实现

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

		// Analytics API 路由（需要鉴权）
		if (url.pathname.startsWith("/api/analytics")) {
			return handleAnalyticsAPI(request, env, ctx);
		}

		// 反馈界面路由（无需鉴权）
		if (url.pathname === "/feedback" || url.pathname.startsWith("/feedback/")) {
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
 * 处理分析API请求
 */
async function handleAnalyticsAPI(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
	const url = new URL(request.url);
	const { addCorsHeaders } = await import('./utils/response.js');

	// 分析API需要认证
	const authResult = await authenticate(request, env);
	if (!authResult.success) {
		console.log(`Analytics API authentication failed: ${authResult.error}`);
		const { createUnauthorizedResponse } = await import('./utils/response.js');
		return addCorsHeaders(
			createUnauthorizedResponse(authResult.error || "API Key required"),
			request.headers.get('Origin') || undefined
		);
	}

	// 检查是否有D1数据库
	if (!env.DB) {
		const { createInternalErrorResponse } = await import('./utils/response.js');
		return addCorsHeaders(
			createInternalErrorResponse('D1 database not available'),
			request.headers.get('Origin') || undefined
		);
	}

	// 初始化服务
	const { D1DatabaseService } = await import('./services/d1DatabaseService.js');
	const { AnalyticsHandler } = await import('./handlers/analyticsHandler.js');
	const d1Service = new D1DatabaseService(env.DB);
	const analyticsHandler = new AnalyticsHandler(d1Service);

	let response: Response;

	try {
		if (url.pathname === "/api/analytics/sessions") {
			// 获取反馈会话历史
			response = await analyticsHandler.handleGetSessionHistory(request);
		} else if (url.pathname === "/api/analytics/tools") {
			// 获取工具使用统计
			response = await analyticsHandler.handleGetToolUsageStats(request);
		} else if (url.pathname === "/api/analytics/activity") {
			// 获取每日活动统计
			response = await analyticsHandler.handleGetDailyActivityStats(request);
		} else if (url.pathname === "/api/analytics/interactions") {
			// 获取交互历史
			response = await analyticsHandler.handleGetInteractionHistory(request);
		} else if (url.pathname === "/api/analytics/health") {
			// 获取数据库健康状态
			response = await analyticsHandler.handleGetDatabaseHealth(request);
		} else if (url.pathname === "/api/analytics/export") {
			// 导出数据
			response = await analyticsHandler.handleExportData(request);
		} else if (url.pathname === "/api/analytics/cleanup") {
			// 清理过期数据（仅POST请求）
			if (request.method === 'POST') {
				response = await analyticsHandler.handleCleanupExpiredData(request);
			} else {
				const { createNotFoundResponse } = await import('./utils/response.js');
				response = createNotFoundResponse('Analytics端点');
			}
		} else {
			const { createNotFoundResponse } = await import('./utils/response.js');
			response = createNotFoundResponse('Analytics端点');
		}
	} catch (error) {
		console.error('Analytics API error:', error);
		const { createInternalErrorResponse } = await import('./utils/response.js');
		response = createInternalErrorResponse('Analytics API处理失败');
	}

	// 添加CORS头
	return addCorsHeaders(response, request.headers.get('Origin') || undefined);
}

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
					  url.pathname === "/api/feedback/list" ||
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
		} else if (url.pathname === "/api/feedback/list") {
			// 获取反馈列表（需要认证）
			response = await feedbackHandler.handleGetFeedbackList(request);
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
		// WebSocket功能暂时不可用，返回适当的响应
		const { createNotImplementedResponse } = await import('./utils/response.js');
		return createNotImplementedResponse('WebSocket功能暂时不可用');
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

	try {
		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return await MyMCP.serveSSE("/sse", { binding: "MCP_OBJECT" }).fetch(modifiedRequest, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return await MyMCP.serve("/mcp", { binding: "MCP_OBJECT" }).fetch(modifiedRequest, env, ctx);
		}

		const { createNotFoundResponse } = await import('./utils/response.js');
		return createNotFoundResponse('MCP端点');
	} catch (error) {
		console.error('MCP endpoint error:', error);
		const { createInternalErrorResponse } = await import('./utils/response.js');
		return createInternalErrorResponse(`MCP处理失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
