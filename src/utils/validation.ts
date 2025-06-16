/**
 * 数据验证工具
 * 提供输入数据的验证功能
 */

import { CreateFeedbackRequest, SubmitFeedbackRequest, CONSTANTS } from '../types/feedback.js';

/**
 * 验证创建反馈会话请求
 */
export function validateCreateFeedbackRequest(request: any): {
	isValid: boolean;
	errors: string[];
	data?: CreateFeedbackRequest;
} {
	const errors: string[] = [];

	// 检查必需字段
	if (!request.message) {
		errors.push('message字段是必需的');
	} else if (typeof request.message !== 'string') {
		errors.push('message必须是字符串类型');
	} else if (request.message.length === 0) {
		errors.push('message不能为空');
	} else if (request.message.length > CONSTANTS.MAX_MESSAGE_LENGTH) {
		errors.push(`message长度不能超过${CONSTANTS.MAX_MESSAGE_LENGTH}个字符`);
	}

	// 检查预定义选项
	if (request.predefinedOptions !== undefined) {
		if (!Array.isArray(request.predefinedOptions)) {
			errors.push('predefinedOptions必须是数组类型');
		} else {
			if (request.predefinedOptions.length > CONSTANTS.MAX_OPTIONS_COUNT) {
				errors.push(`预定义选项数量不能超过${CONSTANTS.MAX_OPTIONS_COUNT}个`);
			}

			for (let i = 0; i < request.predefinedOptions.length; i++) {
				const option = request.predefinedOptions[i];
				if (typeof option !== 'string') {
					errors.push(`预定义选项[${i}]必须是字符串类型`);
				} else if (option.length === 0) {
					errors.push(`预定义选项[${i}]不能为空`);
				} else if (option.length > CONSTANTS.MAX_OPTION_LENGTH) {
					errors.push(`预定义选项[${i}]长度不能超过${CONSTANTS.MAX_OPTION_LENGTH}个字符`);
				}
			}
		}
	}

	// 检查超时时间
	if (request.timeout !== undefined) {
		if (typeof request.timeout !== 'number') {
			errors.push('timeout必须是数字类型');
		} else if (request.timeout < 30) {
			errors.push('timeout不能小于30秒');
		} else if (request.timeout > CONSTANTS.MAX_TIMEOUT) {
			errors.push(`timeout不能超过${CONSTANTS.MAX_TIMEOUT}秒`);
		}
	}

	// 检查元数据
	if (request.metadata !== undefined) {
		if (typeof request.metadata !== 'object' || request.metadata === null) {
			errors.push('metadata必须是对象类型');
		}
	}

	if (errors.length > 0) {
		return { isValid: false, errors };
	}

	return {
		isValid: true,
		errors: [],
		data: {
			message: request.message,
			predefinedOptions: request.predefinedOptions,
			timeout: request.timeout,
			metadata: request.metadata
		}
	};
}

/**
 * 验证提交反馈请求
 */
export function validateSubmitFeedbackRequest(request: any): {
	isValid: boolean;
	errors: string[];
	data?: SubmitFeedbackRequest;
} {
	const errors: string[] = [];

	// 检查是否至少有一种反馈类型
	if (!request.selectedOptions && !request.freeText) {
		errors.push('必须提供selectedOptions或freeText中的至少一个');
	}

	// 检查选中的选项
	if (request.selectedOptions !== undefined) {
		if (!Array.isArray(request.selectedOptions)) {
			errors.push('selectedOptions必须是数组类型');
		} else {
			for (let i = 0; i < request.selectedOptions.length; i++) {
				const option = request.selectedOptions[i];
				if (typeof option !== 'string') {
					errors.push(`selectedOptions[${i}]必须是字符串类型`);
				} else if (option.length === 0) {
					errors.push(`selectedOptions[${i}]不能为空`);
				}
			}
		}
	}

	// 检查自由文本
	if (request.freeText !== undefined) {
		if (typeof request.freeText !== 'string') {
			errors.push('freeText必须是字符串类型');
		} else if (request.freeText.length > CONSTANTS.MAX_MESSAGE_LENGTH) {
			errors.push(`freeText长度不能超过${CONSTANTS.MAX_MESSAGE_LENGTH}个字符`);
		}
	}

	// 检查元数据
	if (request.metadata !== undefined) {
		if (typeof request.metadata !== 'object' || request.metadata === null) {
			errors.push('metadata必须是对象类型');
		}
	}

	if (errors.length > 0) {
		return { isValid: false, errors };
	}

	return {
		isValid: true,
		errors: [],
		data: {
			selectedOptions: request.selectedOptions,
			freeText: request.freeText,
			metadata: request.metadata
		}
	};
}

/**
 * 验证会话ID格式
 */
export function validateSessionId(sessionId: string): boolean {
	// UUID v4 格式验证
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(sessionId);
}

/**
 * 验证API Key格式
 */
export function validateApiKey(apiKey: string): boolean {
	// 简单的API Key格式验证
	return typeof apiKey === 'string' && apiKey.length >= 10;
}

/**
 * 清理和规范化输入数据
 */
export function sanitizeInput(input: string): string {
	if (typeof input !== 'string') {
		return '';
	}
	
	// 移除前后空白字符
	return input.trim();
}

/**
 * 验证HTTP方法
 */
export function validateHttpMethod(method: string, allowedMethods: string[]): boolean {
	return allowedMethods.includes(method.toUpperCase());
}

/**
 * 验证Content-Type
 */
export function validateContentType(contentType: string | null, expectedType: string = 'application/json'): boolean {
	if (!contentType) {
		return false;
	}
	
	return contentType.toLowerCase().includes(expectedType.toLowerCase());
}

/**
 * 验证查询参数
 */
export function validateQueryParams(url: URL): {
	theme?: 'light' | 'dark';
	lang?: 'zh' | 'en';
} {
	const params: any = {};
	
	const theme = url.searchParams.get('theme');
	if (theme && ['light', 'dark'].includes(theme)) {
		params.theme = theme;
	}
	
	const lang = url.searchParams.get('lang');
	if (lang && ['zh', 'en'].includes(lang)) {
		params.lang = lang;
	}
	
	return params;
}

/**
 * 验证用户代理字符串
 */
export function validateUserAgent(userAgent: string | null): string {
	if (!userAgent || typeof userAgent !== 'string') {
		return 'Unknown';
	}
	
	// 限制长度并清理
	return userAgent.substring(0, 500).trim();
}

/**
 * 验证IP地址格式
 */
export function validateIpAddress(ip: string | null): string | null {
	if (!ip || typeof ip !== 'string') {
		return null;
	}
	
	// 简单的IP地址格式验证
	const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
	const ipv6Regex = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;
	
	if (ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
		return ip;
	}
	
	return null;
}
