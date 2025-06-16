/**
 * 简单的模板渲染工具
 * 支持基本的变量替换和条件渲染
 */

export interface TemplateData {
	[key: string]: any;
}

/**
 * 渲染模板字符串
 */
export function renderTemplate(template: string, data: TemplateData): string {
	let result = template;

	// 处理简单变量替换 {{variable}}
	result = result.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
		const trimmed = expression.trim();
		
		// 处理三元运算符 {{condition ? 'value1' : 'value2'}}
		if (trimmed.includes('?') && trimmed.includes(':')) {
			return evaluateConditional(trimmed, data);
		}
		
		// 处理简单变量
		return getNestedValue(data, trimmed) || '';
	});

	// 处理条件块 {{#if condition}} ... {{/if}}
	result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
		const conditionValue = evaluateCondition(condition.trim(), data);
		return conditionValue ? content : '';
	});

	// 处理循环块 {{#each array}} ... {{/each}}
	result = result.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayPath, content) => {
		const array = getNestedValue(data, arrayPath.trim());
		if (!Array.isArray(array)) {
			return '';
		}

		return array.map((item, index) => {
			let itemContent = content;
			
			// 替换 {{this}} 为当前项
			itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
			
			// 替换 {{@index}} 为当前索引
			itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
			
			// 如果item是对象，支持访问其属性
			if (typeof item === 'object' && item !== null) {
				itemContent = itemContent.replace(/\{\{([^}]+)\}\}/g, (subMatch, prop) => {
					const trimmedProp = prop.trim();
					if (trimmedProp === 'this') return String(item);
					if (trimmedProp === '@index') return String(index);
					return getNestedValue(item, trimmedProp) || '';
				});
			}
			
			return itemContent;
		}).join('');
	});

	return result;
}

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj: any, path: string): any {
	if (!path) return obj;
	
	const keys = path.split('.');
	let current = obj;
	
	for (const key of keys) {
		if (current === null || current === undefined) {
			return undefined;
		}
		current = current[key];
	}
	
	return current;
}

/**
 * 评估条件表达式
 */
function evaluateCondition(condition: string, data: TemplateData): boolean {
	// 处理简单的存在性检查
	if (!condition.includes('===') && !condition.includes('!==') && !condition.includes('==') && !condition.includes('!=')) {
		const value = getNestedValue(data, condition);
		return Boolean(value);
	}

	// 处理比较运算符
	const operators = ['===', '!==', '==', '!='];
	for (const op of operators) {
		if (condition.includes(op)) {
			const [left, right] = condition.split(op).map(s => s.trim());
			const leftValue = getNestedValue(data, left);
			const rightValue = parseValue(right);
			
			switch (op) {
				case '===':
					return leftValue === rightValue;
				case '!==':
					return leftValue !== rightValue;
				case '==':
					return leftValue == rightValue;
				case '!=':
					return leftValue != rightValue;
			}
		}
	}

	return false;
}

/**
 * 评估三元运算符表达式
 */
function evaluateConditional(expression: string, data: TemplateData): string {
	const match = expression.match(/^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/);
	if (!match) {
		return '';
	}

	const [, condition, trueValue, falseValue] = match;
	const conditionResult = evaluateCondition(condition.trim(), data);
	
	const selectedValue = conditionResult ? trueValue.trim() : falseValue.trim();
	return parseValue(selectedValue);
}

/**
 * 解析值（处理字符串字面量、数字等）
 */
function parseValue(value: string): any {
	const trimmed = value.trim();
	
	// 字符串字面量
	if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || 
		(trimmed.startsWith('"') && trimmed.endsWith('"'))) {
		return trimmed.slice(1, -1);
	}
	
	// 数字
	if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
		return Number(trimmed);
	}
	
	// 布尔值
	if (trimmed === 'true') return true;
	if (trimmed === 'false') return false;
	if (trimmed === 'null') return null;
	if (trimmed === 'undefined') return undefined;
	
	// 其他情况返回原字符串
	return trimmed;
}

/**
 * 生成反馈列表页面HTML
 */
export async function generateFeedbackListHTML(
	feedbackList: any,
	request: Request,
	theme: string,
	lang: string
): Promise<string> {
	const url = new URL(request.url);
	const currentFilter = url.searchParams.get('status');

	const templateData: TemplateData = {
		...feedbackList,
		theme,
		lang,
		currentFilter,
		formatDate: (dateStr: string) => new Date(dateStr).toLocaleString()
	};

	// 这里应该读取模板文件，暂时使用简化版本
	return generateSimpleFeedbackListHTML(templateData);
}

/**
 * 生成反馈详情页面HTML
 */
export async function generateFeedbackDetailHTML(
	session: any,
	request: Request
): Promise<string> {
	const url = new URL(request.url);
	const theme = url.searchParams.get('theme') || 'dark';
	const lang = url.searchParams.get('lang') || 'zh';

	const templateData: TemplateData = {
		sessionId: session.sessionId,
		title: session.title,
		message: session.message,
		aiContent: session.aiContent,
		predefinedOptions: session.predefinedOptions,
		theme,
		lang,
		hasAiContent: !!session.aiContent
	};

	return generateSimpleFeedbackDetailHTML(templateData);
}

/**
 * 生成简化的反馈列表HTML
 */
function generateSimpleFeedbackListHTML(data: TemplateData): string {
	const { items, total, pending, completed, theme, lang } = data;
	const isDark = theme === 'dark';
	const isZh = lang === 'zh';

	return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isZh ? 'Interactive Feedback - 待处理反馈' : 'Interactive Feedback - Pending Tasks'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: ${isDark ? '#1a1a1a' : '#ffffff'};
            color: ${isDark ? '#ffffff' : '#000000'};
            min-height: 100vh;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 1px solid ${isDark ? '#404040' : '#dee2e6'};
        }
        .logo { font-size: 24px; font-weight: 700; color: #007bff; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: ${isDark ? '#2a2a2a' : '#f8f9fa'};
            padding: 24px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
        }
        .stat-number { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
        .stat-label { color: ${isDark ? '#b0b0b0' : '#6c757d'}; font-size: 14px; }
        .pending { color: #ffc107; }
        .completed { color: #28a745; }
        .total { color: #007bff; }
        .feedback-grid { display: grid; gap: 20px; }
        .feedback-card {
            background: ${isDark ? '#2a2a2a' : '#f8f9fa'};
            border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
            border-radius: 12px;
            padding: 24px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .feedback-card:hover {
            border-color: #007bff;
            transform: translateY(-2px);
        }
        .card-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
        .card-meta {
            font-size: 12px;
            color: ${isDark ? '#b0b0b0' : '#6c757d'};
            margin-bottom: 16px;
        }
        .card-description {
            color: ${isDark ? '#b0b0b0' : '#6c757d'};
            margin-bottom: 16px;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
        }
        .status-pending { background: rgba(255, 193, 7, 0.1); color: #ffc107; }
        .status-completed { background: rgba(40, 167, 69, 0.1); color: #28a745; }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: ${isDark ? '#b0b0b0' : '#6c757d'};
        }
        .theme-toggle {
            background: ${isDark ? '#3a3a3a' : '#e9ecef'};
            border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            color: ${isDark ? '#ffffff' : '#000000'};
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎯 Interactive Feedback</div>
            <button class="theme-toggle" onclick="toggleTheme()">
                ${isDark ? '☀️ ' + (isZh ? '明亮' : 'Light') : '🌙 ' + (isZh ? '暗色' : 'Dark')}
            </button>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number total">${total}</div>
                <div class="stat-label">${isZh ? '总任务数' : 'Total Tasks'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-number pending">${pending}</div>
                <div class="stat-label">${isZh ? '待处理' : 'Pending'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-number completed">${completed}</div>
                <div class="stat-label">${isZh ? '已完成' : 'Completed'}</div>
            </div>
        </div>

        <div class="feedback-grid">
            ${Array.isArray(items) && items.length > 0 ? items.map((item: any) => `
                <div class="feedback-card" onclick="openFeedback('${item.sessionId}')">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                        <div>
                            <h3 class="card-title">${item.title}</h3>
                            <div class="card-meta">
                                ${new Date(item.createdAt).toLocaleString()} •
                                ${isZh ? '过期时间' : 'Expires'}: ${new Date(item.expiresAt).toLocaleString()}
                            </div>
                        </div>
                        <span class="status-badge status-${item.status}">${item.status}</span>
                    </div>
                    <p class="card-description">${item.message}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
                        <span>${item.hasAiContent ? '🤖 ' + (isZh ? '包含AI内容' : 'Contains AI Content') : '📝 ' + (isZh ? '普通反馈' : 'Regular Feedback')}</span>
                        <span>${item.sessionId.substring(0, 8)}...</span>
                    </div>
                </div>
            `).join('') : `
                <div class="empty-state">
                    <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                    <h3>${isZh ? '暂无待处理反馈' : 'No Pending Feedback'}</h3>
                    <p>${isZh ? '当前没有需要处理的反馈任务' : 'There are no feedback tasks to process at the moment'}</p>
                </div>
            `}
        </div>
    </div>

    <script>
        function toggleTheme() {
            const url = new URL(window.location);
            const currentTheme = url.searchParams.get('theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            url.searchParams.set('theme', newTheme);
            window.location.href = url.toString();
        }

        function openFeedback(sessionId) {
            const url = new URL(window.location);
            url.pathname = '/feedback/' + sessionId;
            window.location.href = url.toString();
        }

        // 自动刷新
        setInterval(() => location.reload(), 30000);
    </script>
</body>
</html>`;
}

/**
 * 生成简化的反馈详情HTML（支持Markdown渲染）
 */
function generateSimpleFeedbackDetailHTML(data: TemplateData): string {
	const { sessionId, title, message, aiContent, predefinedOptions, theme, lang, hasAiContent } = data;
	const isDark = theme === 'dark';
	const isZh = lang === 'zh';

	// 简单的Markdown渲染函数
	const renderMarkdown = (text: string) => {
		if (!text) return '';
		return text
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/`(.*?)`/g, '<code>$1</code>')
			.replace(/\n\n/g, '</p><p>')
			.replace(/\n/g, '<br>');
	};

	return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Interactive Feedback</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: ${isDark ? '#1a1a1a' : '#ffffff'};
            color: ${isDark ? '#ffffff' : '#000000'};
            min-height: 100vh;
        }
        .header {
            background: ${isDark ? '#2a2a2a' : '#f8f9fa'};
            border-bottom: 1px solid ${isDark ? '#404040' : '#dee2e6'};
            padding: 20px 0;
        }
        .container { max-width: 800px; margin: 0 auto; padding: 0 20px; }
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .back-btn {
            background: ${isDark ? '#3a3a3a' : '#e9ecef'};
            border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
            border-radius: 6px;
            padding: 8px 16px;
            cursor: pointer;
            color: ${isDark ? '#ffffff' : '#000000'};
            text-decoration: none;
        }
        .main-content { padding: 40px 0; }
        .task-header {
            background: ${isDark ? '#2a2a2a' : '#f8f9fa'};
            border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .task-title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #007bff;
        }
        .task-description {
            color: ${isDark ? '#b0b0b0' : '#6c757d'};
            margin-bottom: 16px;
        }
        .ai-content {
            background: ${isDark ? '#1e3a5f' : '#e3f2fd'};
            border: 1px solid ${isDark ? '#2980b9' : '#90caf9'};
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }
        .ai-content h4 {
            color: #007bff;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .ai-content p {
            line-height: 1.6;
            margin-bottom: 12px;
        }
        .ai-content code {
            background: ${isDark ? '#2c3e50' : '#f5f5f5'};
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
        }
        .feedback-form {
            background: ${isDark ? '#2a2a2a' : '#f8f9fa'};
            border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
            border-radius: 12px;
            padding: 24px;
        }
        .form-section {
            margin-bottom: 24px;
        }
        .form-section h3 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .options {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .option {
            display: flex;
            align-items: center;
            padding: 12px;
            background: ${isDark ? '#1a1a1a' : '#ffffff'};
            border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .option:hover {
            border-color: #007bff;
        }
        .option input {
            margin-right: 12px;
            width: 18px;
            height: 18px;
        }
        .textarea-container {
            position: relative;
            margin-bottom: 8px;
        }
        textarea {
            width: 100%;
            min-height: 150px;
            padding: 20px;
            border: 2px solid ${isDark ? '#404040' : '#dee2e6'};
            border-radius: 8px;
            background: ${isDark ? '#1a1a1a' : '#ffffff'};
            color: ${isDark ? '#ffffff' : '#000000'};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            resize: vertical;
            transition: all 0.3s ease;
            box-sizing: border-box;
        }
        textarea:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
            background: ${isDark ? '#2a2a2a' : '#fafafa'};
        }
        textarea::placeholder {
            color: ${isDark ? '#888888' : '#6c757d'};
            font-style: italic;
        }
        .char-count {
            position: absolute;
            bottom: -24px;
            right: 0;
            font-size: 12px;
            color: ${isDark ? '#888888' : '#6c757d'};
        }
        .char-count.warning {
            color: #ffc107;
        }
        .char-count.danger {
            color: #dc3545;
        }
        .actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .btn-primary {
            background: #007bff;
            color: white;
        }
        .btn-primary:hover {
            background: #0056b3;
        }
        .btn-secondary {
            background: ${isDark ? '#3a3a3a' : '#6c757d'};
            color: white;
        }
        .success-page {
            text-align: center;
            padding: 40px 0;
        }
        .success-icon {
            width: 64px;
            height: 64px;
            background: #28a745;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            color: white;
            font-size: 32px;
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <a href="/feedback?theme=${theme}&lang=${lang}" class="back-btn">
                    ← ${isZh ? '返回列表' : 'Back to List'}
                </a>
                <button class="back-btn" onclick="toggleTheme()">
                    ${isDark ? '☀️ ' + (isZh ? '明亮' : 'Light') : '🌙 ' + (isZh ? '暗色' : 'Dark')}
                </button>
            </div>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <div class="task-header">
                <h1 class="task-title">${title}</h1>
                <p class="task-description">${message}</p>
            </div>

            ${hasAiContent ? `
                <div class="ai-content">
                    <h4>
                        <span>🤖</span>
                        <span>${isZh ? 'AI 反馈内容' : 'AI Feedback Content'}</span>
                    </h4>
                    <div>${renderMarkdown(aiContent)}</div>
                </div>
            ` : ''}

            <div class="feedback-form">
                <form id="feedbackForm">
                    ${predefinedOptions && predefinedOptions.length > 0 ? `
                        <div class="form-section">
                            <h3>${isZh ? '请选择适用的选项：' : 'Please select applicable options:'}</h3>
                            <div class="options">
                                ${predefinedOptions.map((option: string, index: number) => `
                                    <div class="option">
                                        <input type="checkbox" id="option-${index}" name="options" value="${option}">
                                        <label for="option-${index}">${option}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="form-section">
                        <h3>${isZh ? '您的反馈：' : 'Your Feedback:'}</h3>
                        <div class="textarea-container">
                            <textarea
                                id="freeText"
                                name="freeText"
                                placeholder="${isZh ? '请详细描述您的反馈、建议或其他说明...\n\n提示：您可以使用 Ctrl+Enter 快速提交' : 'Please provide detailed feedback, suggestions, or other comments...\n\nTip: Use Ctrl+Enter to submit quickly'}"
                                maxlength="1000"
                                oninput="updateCharCount()"
                            ></textarea>
                            <div class="char-count">
                                <span id="charCount">0</span>/1000
                            </div>
                        </div>
                    </div>

                    <div class="actions">
                        <button type="button" class="btn btn-secondary" onclick="clearForm()">
                            ${isZh ? '清空' : 'Clear'}
                        </button>
                        <button type="submit" class="btn btn-primary">
                            ${isZh ? '提交反馈' : 'Submit Feedback'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <script>
        function toggleTheme() {
            const url = new URL(window.location);
            const currentTheme = url.searchParams.get('theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            url.searchParams.set('theme', newTheme);
            window.location.href = url.toString();
        }

        function clearForm() {
            document.getElementById('feedbackForm').reset();
        }

        function showSuccess() {
            document.querySelector('.main-content').innerHTML = \`
                <div class="container">
                    <div class="success-page">
                        <div class="success-icon">✓</div>
                        <h2>${isZh ? '感谢您的反馈！' : 'Thank you for your feedback!'}</h2>
                        <p style="margin-top: 16px; color: ${isDark ? '#b0b0b0' : '#6c757d'};">
                            ${isZh ? '您的反馈已成功提交，我们会认真考虑您的建议。' : 'Your feedback has been submitted successfully. We will carefully consider your suggestions.'}
                        </p>
                        <div style="margin-top: 24px;">
                            <a href="/feedback?theme=${theme}&lang=${lang}" class="btn btn-primary">
                                ${isZh ? '返回列表' : 'Back to List'}
                            </a>
                        </div>
                    </div>
                </div>
            \`;
        }

        function updateCharCount() {
            const textarea = document.getElementById('freeText');
            const charCount = document.getElementById('charCount');
            const currentLength = textarea.value.length;

            charCount.textContent = currentLength;

            // 更新字符计数颜色
            const countElement = charCount.parentElement;
            countElement.classList.remove('warning', 'danger');

            if (currentLength > 900) {
                countElement.classList.add('danger');
            } else if (currentLength > 800) {
                countElement.classList.add('warning');
            }
        }

        // 自动调整文本区域高度
        function autoResizeTextarea() {
            const textarea = document.getElementById('freeText');
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(150, textarea.scrollHeight) + 'px';
        }

        // 键盘快捷键支持
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('feedbackForm').dispatchEvent(new Event('submit'));
            }
        });

        // 初始化
        document.addEventListener('DOMContentLoaded', () => {
            updateCharCount();
            const textarea = document.getElementById('freeText');
            textarea.addEventListener('input', () => {
                updateCharCount();
                autoResizeTextarea();
            });
        });

        document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const selectedOptions = Array.from(formData.getAll('options'));
            const freeText = formData.get('freeText')?.toString().trim();

            if (selectedOptions.length === 0 && !freeText) {
                alert('${isZh ? '请至少选择一个选项或填写文字反馈' : 'Please select at least one option or provide text feedback'}');
                return;
            }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = '${isZh ? '提交中...' : 'Submitting...'}';

            try {
                const response = await fetch('/api/feedback/${sessionId}/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
                        freeText: freeText || undefined,
                        metadata: {
                            userAgent: navigator.userAgent,
                            timestamp: new Date().toISOString(),
                            language: navigator.language,
                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        }
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showSuccess();
                } else {
                    alert('${isZh ? '提交失败：' : 'Submission failed: '}' + (result.error?.message || '${isZh ? '未知错误' : 'Unknown error'}'));
                }
            } catch (error) {
                alert('${isZh ? '网络错误，请检查连接后重试' : 'Network error, please check your connection and try again'}');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '${isZh ? '提交反馈' : 'Submit Feedback'}';
            }
        });
    </script>
</body>
</html>`;
}

/**
 * 生成简化的反馈界面HTML（备用方案）
 */
function generateSimpleFeedbackHTML(session: any, request: Request): string {
	const url = new URL(request.url);
	const theme = url.searchParams.get('theme') || 'dark';
	const lang = url.searchParams.get('lang') || 'zh';

	const isDark = theme === 'dark';
	const isZh = lang === 'zh';

	return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Feedback</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; 
            padding: 20px; 
            background: ${isDark ? '#1a1a1a' : '#ffffff'};
            color: ${isDark ? '#ffffff' : '#000000'};
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container { 
            max-width: 600px; 
            width: 100%;
            background: ${isDark ? '#2a2a2a' : '#f8f9fa'};
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .message { 
            margin-bottom: 24px; 
            padding: 20px; 
            border-radius: 8px; 
            background: ${isDark ? '#3a3a3a' : '#e9ecef'};
            border-left: 4px solid #007bff;
        }
        .options { margin: 20px 0; }
        .option { 
            margin: 12px 0; 
            padding: 12px;
            background: ${isDark ? '#1a1a1a' : '#ffffff'};
            border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
            border-radius: 6px;
            display: flex;
            align-items: center;
        }
        .option input { margin-right: 12px; width: 18px; height: 18px; }
        textarea {
            width: 100%;
            min-height: 150px;
            padding: 20px;
            border-radius: 8px;
            border: 2px solid ${isDark ? '#404040' : '#dee2e6'};
            background: ${isDark ? '#1a1a1a' : '#ffffff'};
            color: ${isDark ? '#ffffff' : '#000000'};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            resize: vertical;
            transition: all 0.3s ease;
            box-sizing: border-box;
        }
        textarea:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
            background: ${isDark ? '#2a2a2a' : '#fafafa'};
        }
        textarea::placeholder {
            color: ${isDark ? '#888888' : '#6c757d'};
            font-style: italic;
        }
        .actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
        }
        button { 
            padding: 12px 24px; 
            background: #007bff; 
            color: white; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer;
            font-size: 15px;
            font-weight: 500;
            transition: background 0.2s ease;
        }
        button:hover { background: #0056b3; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary {
            background: ${isDark ? '#3a3a3a' : '#6c757d'};
        }
        .btn-secondary:hover {
            background: ${isDark ? '#4a4a4a' : '#5a6268'};
        }
        .alert {
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 20px;
            display: none;
        }
        .alert-error {
            background: rgba(220, 53, 69, 0.1);
            border: 1px solid #dc3545;
            color: #dc3545;
        }
        .success-page {
            text-align: center;
            padding: 40px 0;
        }
        .success-icon {
            width: 64px;
            height: 64px;
            background: #28a745;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            color: white;
            font-size: 32px;
        }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .container { padding: 20px; }
            .actions { flex-direction: column; }
            button { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="alert" class="alert"></div>
        
        <div class="message">
            <h2>${isZh ? '需要您的反馈' : 'Your Feedback Required'}</h2>
            <p>${session.message}</p>
        </div>
        
        <form id="feedbackForm">
            ${session.predefinedOptions ? `
                <div class="options">
                    <h3>${isZh ? '请选择：' : 'Please select:'}</h3>
                    ${session.predefinedOptions.map((option: string, index: number) => `
                        <div class="option">
                            <input type="checkbox" id="option-${index}" name="options" value="${option}">
                            <label for="option-${index}">${option}</label>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div>
                <h3>${isZh ? '您的详细反馈：' : 'Your detailed feedback:'}</h3>
                <textarea
                    name="freeText"
                    placeholder="${isZh ? '请详细描述您的反馈、建议或其他说明...\n\n提示：您可以使用 Ctrl+Enter 快速提交' : 'Please provide detailed feedback, suggestions, or other comments...\n\nTip: Use Ctrl+Enter to submit quickly'}"
                    maxlength="1000"
                ></textarea>
            </div>
            
            <div class="actions">
                <button type="button" class="btn-secondary" onclick="clearForm()">
                    ${isZh ? '清空' : 'Clear'}
                </button>
                <button type="submit" id="submitBtn">
                    ${isZh ? '提交反馈' : 'Submit Feedback'}
                </button>
            </div>
        </form>
    </div>
    
    <script>
        function clearForm() {
            document.getElementById('feedbackForm').reset();
        }
        
        function showAlert(message) {
            const alert = document.getElementById('alert');
            alert.className = 'alert alert-error';
            alert.textContent = message;
            alert.style.display = 'block';
            setTimeout(() => alert.style.display = 'none', 5000);
        }
        
        function showSuccess() {
            document.querySelector('.container').innerHTML = \`
                <div class="success-page">
                    <div class="success-icon">✓</div>
                    <h2>${isZh ? '感谢您的反馈！' : 'Thank you for your feedback!'}</h2>
                    <p style="margin-top: 16px; color: ${isDark ? '#b0b0b0' : '#6c757d'};">
                        ${isZh ? '您的反馈已成功提交。' : 'Your feedback has been submitted successfully.'}
                    </p>
                </div>
            \`;
        }
        
        document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const selectedOptions = Array.from(formData.getAll('options'));
            const freeText = formData.get('freeText')?.toString().trim();
            
            if (selectedOptions.length === 0 && !freeText) {
                showAlert('${isZh ? '请至少选择一个选项或填写文字反馈' : 'Please select at least one option or provide text feedback'}');
                return;
            }
            
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = '${isZh ? '提交中...' : 'Submitting...'}';
            
            try {
                const response = await fetch('/api/feedback/${session.sessionId}/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
                        freeText: freeText || undefined,
                        metadata: {
                            userAgent: navigator.userAgent,
                            timestamp: new Date().toISOString()
                        }
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showSuccess();
                } else {
                    showAlert(result.error?.message || '${isZh ? '提交失败，请重试' : 'Submission failed, please try again'}');
                }
            } catch (error) {
                showAlert('${isZh ? '网络错误，请重试' : 'Network error, please try again'}');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '${isZh ? '提交反馈' : 'Submit Feedback'}';
            }
        });
        
        // 支持 Ctrl+Enter 快捷键
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('feedbackForm').dispatchEvent(new Event('submit'));
            }
        });
    </script>
</body>
</html>`;
}
