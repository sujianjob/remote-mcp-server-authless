/**
 * 反馈会话管理服务
 */

import {
	FeedbackSession,
	CreateFeedbackRequest,
	CreateFeedbackData,
	SessionStatusData,
	FeedbackResultData,
	SubmitFeedbackRequest,
	SubmitFeedbackData,
	FeedbackListData,
	FeedbackListItem,
	SessionStatus,
	KV_KEYS,
	CONSTANTS
} from '../types/feedback.js';

export class FeedbackService {
	constructor(private kv: KVNamespace, private env?: any) {}

	/**
	 * 创建新的反馈会话
	 */
	async createSession(request: CreateFeedbackRequest, baseUrl: string): Promise<CreateFeedbackData> {
		const sessionId = crypto.randomUUID();
		const timeout = Math.min(request.timeout || CONSTANTS.DEFAULT_TIMEOUT, CONSTANTS.MAX_TIMEOUT);
		const expiresAt = new Date(Date.now() + timeout * 1000);

		const session: FeedbackSession = {
			sessionId,
			title: request.title,
			message: request.message,
			aiContent: request.aiContent,
			predefinedOptions: request.predefinedOptions,
			status: 'pending',
			createdAt: new Date().toISOString(),
			expiresAt: expiresAt.toISOString(),
			metadata: request.metadata
		};

		// 存储到KV
		const kvKey = KV_KEYS.session(sessionId);
		await this.kv.put(kvKey, JSON.stringify(session), {
			expirationTtl: timeout
		});

		// 返回响应
		return {
			sessionId,
			feedbackUrl: `${baseUrl}/feedback/${sessionId}`,
			statusUrl: `${baseUrl}/api/feedback/${sessionId}/status`,
			expiresAt: expiresAt.toISOString(),
		};
	}

	/**
	 * 获取会话状态
	 */
	async getSessionStatus(sessionId: string): Promise<SessionStatusData | null> {
		const session = await this.getSession(sessionId);
		if (!session) {
			return null;
		}

		return {
			sessionId: session.sessionId,
			status: session.status,
			createdAt: session.createdAt,
			expiresAt: session.expiresAt,
			submittedAt: session.submittedAt
		};
	}

	/**
	 * 获取完整会话数据（内部使用）
	 */
	async getSession(sessionId: string): Promise<FeedbackSession | null> {
		const kvKey = KV_KEYS.session(sessionId);
		const sessionData = await this.kv.get(kvKey);

		if (!sessionData) {
			return null;
		}

		try {
			const session: FeedbackSession = JSON.parse(sessionData);

			// 检查是否过期
			if (new Date() > new Date(session.expiresAt)) {
				session.status = 'expired';
				// 更新状态到KV
				await this.kv.put(kvKey, JSON.stringify(session), {
					expirationTtl: 60 // 过期会话保留1分钟用于查询
				});
			}

			return session;
		} catch (error) {
			console.error('Error parsing session data:', error);
			return null;
		}
	}

	/**
	 * 提交反馈
	 */
	async submitFeedback(sessionId: string, request: SubmitFeedbackRequest): Promise<SubmitFeedbackData> {
		const session = await this.getSession(sessionId);

		if (!session) {
			throw new Error('Session not found or expired');
		}

		// 检查会话状态
		if (session.status !== 'pending') {
			throw new Error('already submitted');
		}

		// 检查是否过期
		if (new Date() > new Date(session.expiresAt)) {
			throw new Error('expired');
		}

		// 验证反馈内容
		this.validateFeedbackRequest(request, session);

		// 构建组合反馈内容
		const feedbackParts: string[] = [];

		if (request.selectedOptions && request.selectedOptions.length > 0) {
			feedbackParts.push(request.selectedOptions.join('\n'));
		}

		if (request.freeText && request.freeText.trim()) {
			feedbackParts.push(request.freeText.trim());
		}

		const combinedFeedback = feedbackParts.join('\n\n');

		// 更新会话状态
		const submittedAt = new Date().toISOString();
		session.feedback = {
			selectedOptions: request.selectedOptions,
			freeText: request.freeText,
			combinedFeedback
		};
		session.status = 'completed';
		session.submittedAt = submittedAt;

		// 合并元数据
		if (request.metadata) {
			session.metadata = { ...session.metadata, ...request.metadata };
		}

		// 保存更新后的会话
		const kvKey = KV_KEYS.session(sessionId);
		await this.kv.put(kvKey, JSON.stringify(session), {
			expirationTtl: 3600 // 完成的会话保留1小时
		});

		// 发送WebSocket通知
		await this.notifyStatusChange(sessionId, 'pending', 'completed');
		await this.notifyFeedbackSubmitted(sessionId, {
			preview: combinedFeedback.substring(0, 100) + (combinedFeedback.length > 100 ? '...' : '')
		});

		return {
			sessionId,
			status: 'completed',
			submittedAt
		};
	}

	/**
	 * 获取反馈结果
	 */
	async getFeedbackResult(sessionId: string): Promise<FeedbackResultData | null> {
		const session = await this.getSession(sessionId);

		if (!session || session.status !== 'completed' || !session.feedback) {
			return null;
		}

		return {
			sessionId: session.sessionId,
			feedback: session.feedback,
			submittedAt: session.submittedAt!,
			metadata: session.metadata
		};
	}

	/**
	 * 获取反馈列表（支持分页和状态过滤）
	 */
	async getFeedbackList(status?: SessionStatus, limit: number = 50): Promise<FeedbackListData> {
		try {
			// 注意：这是一个简化实现，在生产环境中应该使用更高效的索引方案
			// KV存储不支持复杂查询，这里我们使用list操作来获取所有会话
			const listResult = await this.kv.list({ prefix: 'feedback:session:' });

			const sessions: FeedbackSession[] = [];

			// 获取所有会话数据
			for (const key of listResult.keys) {
				try {
					const sessionData = await this.kv.get(key.name);
					if (sessionData) {
						const session: FeedbackSession = JSON.parse(sessionData);

						// 检查是否过期
						if (new Date() > new Date(session.expiresAt)) {
							session.status = 'expired';
						}

						sessions.push(session);
					}
				} catch (error) {
					console.error(`Error parsing session ${key.name}:`, error);
				}
			}

			// 按状态过滤
			let filteredSessions = sessions;
			if (status) {
				filteredSessions = sessions.filter(s => s.status === status);
			}

			// 按创建时间倒序排序
			filteredSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

			// 限制数量
			const limitedSessions = filteredSessions.slice(0, limit);

			// 转换为列表项格式
			const items: FeedbackListItem[] = limitedSessions.map(session => ({
				sessionId: session.sessionId,
				title: session.title,
				message: session.message,
				status: session.status,
				createdAt: session.createdAt,
				expiresAt: session.expiresAt,
				submittedAt: session.submittedAt,
				hasAiContent: !!session.aiContent
			}));

			// 统计信息
			const total = sessions.length;
			const pending = sessions.filter(s => s.status === 'pending').length;
			const completed = sessions.filter(s => s.status === 'completed').length;

			return {
				items,
				total,
				pending,
				completed
			};
		} catch (error) {
			console.error('Error getting feedback list:', error);
			return {
				items: [],
				total: 0,
				pending: 0,
				completed: 0
			};
		}
	}

	/**
	 * 清理过期会话
	 */
	async cleanupExpiredSessions(): Promise<void> {
		// 这是一个简化的清理实现
		// 在实际应用中，可能需要更复杂的清理策略
		const lastCleanup = await this.kv.get(KV_KEYS.cleanup);
		const now = Date.now();
		
		if (lastCleanup) {
			const lastCleanupTime = parseInt(lastCleanup);
			if (now - lastCleanupTime < CONSTANTS.CLEANUP_INTERVAL) {
				return; // 还没到清理时间
			}
		}

		// 更新清理时间戳
		await this.kv.put(KV_KEYS.cleanup, now.toString());
		
		// 注意：KV的自动过期机制会处理大部分清理工作
		// 这里主要是记录清理时间
		console.log('Cleanup task executed at:', new Date().toISOString());
	}

	/**
	 * 验证反馈请求
	 */
	private validateFeedbackRequest(request: SubmitFeedbackRequest, session: FeedbackSession): void {
		// 检查是否至少有一种反馈类型
		if (!request.selectedOptions?.length && !request.freeText?.trim()) {
			throw new Error('validation: 必须提供选择的选项或自由文本');
		}

		// 验证选中的选项
		if (request.selectedOptions && request.selectedOptions.length > 0) {
			if (!session.predefinedOptions) {
				throw new Error('validation: 该会话不支持预定义选项');
			}

			for (const option of request.selectedOptions) {
				if (!session.predefinedOptions.includes(option)) {
					throw new Error(`validation: 无效的预定义选项: ${option}`);
				}
			}
		}

		// 验证自由文本
		if (request.freeText && request.freeText.length > CONSTANTS.MAX_MESSAGE_LENGTH) {
			throw new Error(`validation: 自由文本长度不能超过${CONSTANTS.MAX_MESSAGE_LENGTH}个字符`);
		}
	}

	/**
	 * 发送状态变化通知到WebSocket
	 */
	private async notifyStatusChange(sessionId: string, oldStatus: string, newStatus: string): Promise<void> {
		if (!this.env?.MCP_OBJECT) {
			return; // 没有配置WebSocket支持
		}

		try {
			const durableObjectId = this.env.MCP_OBJECT.idFromName('websocket-manager');
			const durableObject = this.env.MCP_OBJECT.get(durableObjectId);

			await durableObject.fetch(new Request(`https://internal/notify/status_changed`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId,
					type: 'status_changed',
					data: { oldStatus, newStatus }
				})
			}));
		} catch (error) {
			console.error('Failed to send WebSocket notification:', error);
		}
	}

	/**
	 * 发送反馈提交通知到WebSocket
	 */
	private async notifyFeedbackSubmitted(sessionId: string, data: any): Promise<void> {
		if (!this.env?.MCP_OBJECT) {
			return; // 没有配置WebSocket支持
		}

		try {
			const durableObjectId = this.env.MCP_OBJECT.idFromName('websocket-manager');
			const durableObject = this.env.MCP_OBJECT.get(durableObjectId);

			await durableObject.fetch(new Request(`https://internal/notify/feedback_submitted`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId,
					type: 'feedback_submitted',
					data
				})
			}));
		} catch (error) {
			console.error('Failed to send WebSocket notification:', error);
		}
	}

	/**
	 * 发送会话过期通知到WebSocket
	 */
	private async notifySessionExpired(sessionId: string, reason: string): Promise<void> {
		if (!this.env?.MCP_OBJECT) {
			return; // 没有配置WebSocket支持
		}

		try {
			const durableObjectId = this.env.MCP_OBJECT.idFromName('websocket-manager');
			const durableObject = this.env.MCP_OBJECT.get(durableObjectId);

			await durableObject.fetch(new Request(`https://internal/notify/session_expired`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId,
					type: 'session_expired',
					data: { reason }
				})
			}));
		} catch (error) {
			console.error('Failed to send WebSocket notification:', error);
		}
	}
}
