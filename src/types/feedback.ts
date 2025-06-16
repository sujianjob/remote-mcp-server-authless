/**
 * Interactive Feedback MCP 系统类型定义
 * 基于 Cloudflare Workers 架构设计
 */

// 会话状态枚举
export type SessionStatus = 'pending' | 'completed' | 'expired';

// 标准化API响应格式
export interface ApiResponse<T = any> {
	success: boolean;
	data: T | null;
	error: {
		code: string;
		message: string;
		details?: Record<string, any>;
	} | null;
	timestamp: string;
}

// 会话数据结构
export interface FeedbackSession {
	sessionId: string;
	message: string;
	predefinedOptions?: string[];
	status: SessionStatus;
	createdAt: string;
	expiresAt: string;
	submittedAt?: string;
	feedback?: {
		selectedOptions?: string[];
		freeText?: string;
		combinedFeedback: string;
	};
	metadata?: Record<string, any>;
}

// API 请求类型
export interface CreateFeedbackRequest {
	message: string;
	predefinedOptions?: string[];
	timeout?: number; // 超时时间（秒），默认300秒
	metadata?: Record<string, any>;
}

// API 响应数据类型
export interface CreateFeedbackData {
	sessionId: string;
	feedbackUrl: string;
	statusUrl: string;
	expiresAt: string;
}

export interface SessionStatusData {
	sessionId: string;
	status: SessionStatus;
	createdAt: string;
	expiresAt: string;
	submittedAt?: string;
}

export interface FeedbackResultData {
	sessionId: string;
	feedback: {
		selectedOptions?: string[];
		freeText?: string;
		combinedFeedback: string;
	};
	submittedAt: string;
	metadata?: Record<string, any>;
}

export interface SubmitFeedbackRequest {
	selectedOptions?: string[];
	freeText?: string;
	metadata?: Record<string, any>;
}

export interface SubmitFeedbackData {
	sessionId: string;
	status: string;
	submittedAt: string;
}

// WebSocket 消息类型
export interface WebSocketMessage {
	type: string;
	data?: any;
	timestamp?: string;
}

export interface ConnectionEstablishedMessage extends WebSocketMessage {
	type: 'connection_established';
	data: {
		sessionId: string;
		clientId: string;
		serverTime: string;
	};
}

export interface SessionStatusChangedMessage extends WebSocketMessage {
	type: 'session_status_changed';
	data: {
		sessionId: string;
		oldStatus: SessionStatus;
		newStatus: SessionStatus;
		timestamp: string;
	};
}

export interface FeedbackSubmittedMessage extends WebSocketMessage {
	type: 'feedback_submitted';
	data: {
		sessionId: string;
		submittedBy: string;
		timestamp: string;
		preview: string;
	};
}

export interface SessionExpiredMessage extends WebSocketMessage {
	type: 'session_expired';
	data: {
		sessionId: string;
		reason: string;
		timestamp: string;
	};
}

export interface ErrorMessage extends WebSocketMessage {
	type: 'error';
	data: {
		code: string;
		message: string;
		timestamp: string;
	};
}

// 错误代码枚举
export enum ErrorCode {
	INVALID_REQUEST = 'INVALID_REQUEST',
	UNAUTHORIZED = 'UNAUTHORIZED',
	SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
	SESSION_EXPIRED = 'SESSION_EXPIRED',
	ALREADY_SUBMITTED = 'ALREADY_SUBMITTED',
	NO_FEEDBACK_AVAILABLE = 'NO_FEEDBACK_AVAILABLE',
	RATE_LIMITED = 'RATE_LIMITED',
	INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// 会话配置
export interface SessionConfig {
	defaultTimeout: number;
	maxTimeout: number;
	cleanupInterval: number;
	maxMessageLength: number;
	maxOptionsCount: number;
	maxOptionLength: number;
}

// KV 存储键格式
export const KV_KEYS = {
	session: (sessionId: string) => `feedback:session:${sessionId}`,
	cleanup: 'feedback:cleanup:last',
} as const;

// 常量定义
export const CONSTANTS = {
	DEFAULT_TIMEOUT: 300, // 5分钟
	MAX_TIMEOUT: 3600, // 1小时
	MAX_MESSAGE_LENGTH: 1000,
	MAX_OPTIONS_COUNT: 10,
	MAX_OPTION_LENGTH: 100,
	CLEANUP_INTERVAL: 3600000, // 1小时（毫秒）
} as const;
