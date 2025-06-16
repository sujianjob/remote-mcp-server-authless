/**
 * WebSocket会话管理器
 * 使用Durable Objects实现实时通信和状态同步
 */

import {
	WebSocketMessage,
	ConnectionEstablishedMessage,
	SessionStatusChangedMessage,
	FeedbackSubmittedMessage,
	SessionExpiredMessage,
	ErrorMessage,
	SessionStatus
} from '../types/feedback.js';

interface ClientConnection {
	websocket: WebSocket;
	sessionId: string;
	clientType: 'web' | 'app';
	connectedAt: string;
	lastActivity: string;
}

interface SessionInfo {
	sessionId: string;
	status: SessionStatus;
	createdAt: string;
	expiresAt: string;
	submittedAt?: string;
}

export class SessionManager {
	private connections: Map<string, ClientConnection> = new Map();
	private sessions: Map<string, SessionInfo> = new Map();
	private heartbeatInterval: number | null = null;

	constructor(private state: DurableObjectState, private env: any) {
		// 启动心跳检查
		this.startHeartbeat();
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// WebSocket连接处理
		if (url.pathname.startsWith('/ws/')) {
			return this.handleWebSocket(request);
		}

		// 会话状态更新通知
		if (url.pathname.startsWith('/notify/')) {
			return this.handleNotification(request);
		}

		return new Response('Not found', { status: 404 });
	}

	/**
	 * 处理WebSocket连接
	 */
	async handleWebSocket(request: Request): Promise<Response> {
		const upgradeHeader = request.headers.get('Upgrade');
		if (upgradeHeader !== 'websocket') {
			return new Response('Expected websocket', { status: 400 });
		}

		const url = new URL(request.url);
		const sessionId = url.pathname.split('/')[2];
		const apiKey = url.searchParams.get('apiKey');
		const clientType = (url.searchParams.get('clientType') || 'web') as 'web' | 'app';

		// 验证会话和API Key
		if (!sessionId || !this.validateSession(sessionId, apiKey)) {
			return new Response('Unauthorized', { status: 401 });
		}

		const [client, server] = Object.values(new WebSocketPair());

		// 接受WebSocket连接
		server.accept();

		// 生成客户端ID
		const clientId = crypto.randomUUID();
		const now = new Date().toISOString();

		// 存储连接信息
		const connection: ClientConnection = {
			websocket: server,
			sessionId,
			clientType,
			connectedAt: now,
			lastActivity: now
		};
		this.connections.set(clientId, connection);

		// 发送连接确认
		this.sendToClient(clientId, {
			type: 'connection_established',
			data: {
				sessionId,
				clientId,
				serverTime: now
			}
		} as ConnectionEstablishedMessage);

		// 设置消息处理器
		server.addEventListener('message', (event) => {
			this.handleMessage(clientId, sessionId, event.data as string);
		});

		// 设置关闭处理器
		server.addEventListener('close', () => {
			this.connections.delete(clientId);
			console.log(`WebSocket connection closed: ${clientId}`);
		});

		// 设置错误处理器
		server.addEventListener('error', (error) => {
			console.error(`WebSocket error for client ${clientId}:`, error);
			this.connections.delete(clientId);
		});

		console.log(`WebSocket connection established: ${clientId} for session ${sessionId}`);

		return new Response(null, { status: 101, webSocket: client });
	}

	/**
	 * 处理外部通知
	 */
	async handleNotification(request: Request): Promise<Response> {
		if (request.method !== 'POST') {
			return new Response('Method not allowed', { status: 405 });
		}

		try {
			const notification = await request.json();
			const { sessionId, type, data } = notification;

			switch (type) {
				case 'status_changed':
					await this.notifyStatusChange(sessionId, data.oldStatus, data.newStatus);
					break;
				case 'feedback_submitted':
					await this.notifyFeedbackSubmitted(sessionId, data);
					break;
				case 'session_expired':
					await this.notifySessionExpired(sessionId, data.reason);
					break;
				default:
					console.warn('Unknown notification type:', type);
			}

			return new Response('OK');
		} catch (error) {
			console.error('Error handling notification:', error);
			return new Response('Internal error', { status: 500 });
		}
	}

	/**
	 * 处理WebSocket消息
	 */
	private handleMessage(clientId: string, sessionId: string, message: string): void {
		try {
			const data = JSON.parse(message) as WebSocketMessage;
			const connection = this.connections.get(clientId);
			
			if (!connection) {
				return;
			}

			// 更新最后活动时间
			connection.lastActivity = new Date().toISOString();

			switch (data.type) {
				case 'ping':
					this.sendToClient(clientId, {
						type: 'pong',
						timestamp: new Date().toISOString()
					});
					break;

				case 'app_register':
					this.handleAppRegistration(clientId, sessionId, data.data);
					break;

				default:
					console.warn('Unknown message type:', data.type);
			}
		} catch (error) {
			console.error('Error handling message:', error);
			this.sendToClient(clientId, {
				type: 'error',
				data: {
					code: 'MESSAGE_PARSE_ERROR',
					message: 'Invalid message format',
					timestamp: new Date().toISOString()
				}
			} as ErrorMessage);
		}
	}

	/**
	 * 处理App注册
	 */
	private handleAppRegistration(clientId: string, sessionId: string, data: any): void {
		const connection = this.connections.get(clientId);
		if (!connection) {
			return;
		}

		// 存储App特定信息
		console.log(`App registered: ${data.platform} ${data.appVersion} for session ${sessionId}`);

		// 发送注册确认
		this.sendToClient(clientId, {
			type: 'app_registration_confirmed',
			data: {
				sessionId,
				clientId,
				timestamp: new Date().toISOString()
			}
		});
	}

	/**
	 * 通知状态变化
	 */
	async notifyStatusChange(sessionId: string, oldStatus: SessionStatus, newStatus: SessionStatus): Promise<void> {
		const message: SessionStatusChangedMessage = {
			type: 'session_status_changed',
			data: {
				sessionId,
				oldStatus,
				newStatus,
				timestamp: new Date().toISOString()
			}
		};

		this.broadcastToSession(sessionId, message);
	}

	/**
	 * 通知反馈提交
	 */
	async notifyFeedbackSubmitted(sessionId: string, data: any): Promise<void> {
		const message: FeedbackSubmittedMessage = {
			type: 'feedback_submitted',
			data: {
				sessionId,
				submittedBy: 'user',
				timestamp: new Date().toISOString(),
				preview: data.preview || 'Feedback submitted'
			}
		};

		this.broadcastToSession(sessionId, message);
	}

	/**
	 * 通知会话过期
	 */
	async notifySessionExpired(sessionId: string, reason: string): Promise<void> {
		const message: SessionExpiredMessage = {
			type: 'session_expired',
			data: {
				sessionId,
				reason,
				timestamp: new Date().toISOString()
			}
		};

		this.broadcastToSession(sessionId, message);
	}

	/**
	 * 向特定客户端发送消息
	 */
	private sendToClient(clientId: string, message: WebSocketMessage): void {
		const connection = this.connections.get(clientId);
		if (!connection) {
			return;
		}

		try {
			connection.websocket.send(JSON.stringify(message));
		} catch (error) {
			console.error(`Error sending message to client ${clientId}:`, error);
			this.connections.delete(clientId);
		}
	}

	/**
	 * 向会话的所有客户端广播消息
	 */
	private broadcastToSession(sessionId: string, message: WebSocketMessage): void {
		const messageStr = JSON.stringify(message);
		let sentCount = 0;

		for (const [clientId, connection] of this.connections) {
			if (connection.sessionId === sessionId) {
				try {
					connection.websocket.send(messageStr);
					sentCount++;
				} catch (error) {
					console.error(`Error broadcasting to client ${clientId}:`, error);
					this.connections.delete(clientId);
				}
			}
		}

		console.log(`Broadcasted message to ${sentCount} clients for session ${sessionId}`);
	}

	/**
	 * 验证会话和API Key
	 */
	private validateSession(sessionId: string, apiKey: string | null): boolean {
		// 简单验证 - 在实际应用中应该验证API Key
		return sessionId && sessionId.length > 0;
	}

	/**
	 * 启动心跳检查
	 */
	private startHeartbeat(): void {
		if (this.heartbeatInterval) {
			return;
		}

		this.heartbeatInterval = setInterval(() => {
			this.performHeartbeat();
		}, 30000) as any; // 30秒心跳检查
	}

	/**
	 * 执行心跳检查
	 */
	private performHeartbeat(): void {
		const now = Date.now();
		const timeout = 5 * 60 * 1000; // 5分钟超时

		for (const [clientId, connection] of this.connections) {
			const lastActivity = new Date(connection.lastActivity).getTime();
			
			if (now - lastActivity > timeout) {
				console.log(`Removing inactive connection: ${clientId}`);
				try {
					connection.websocket.close();
				} catch (error) {
					// 忽略关闭错误
				}
				this.connections.delete(clientId);
			}
		}
	}

	/**
	 * 获取连接统计信息
	 */
	getConnectionStats(): any {
		const stats = {
			totalConnections: this.connections.size,
			sessionCounts: new Map<string, number>(),
			clientTypes: { web: 0, app: 0 }
		};

		for (const connection of this.connections.values()) {
			// 统计每个会话的连接数
			const count = stats.sessionCounts.get(connection.sessionId) || 0;
			stats.sessionCounts.set(connection.sessionId, count + 1);

			// 统计客户端类型
			stats.clientTypes[connection.clientType]++;
		}

		return {
			...stats,
			sessionCounts: Object.fromEntries(stats.sessionCounts)
		};
	}
}
