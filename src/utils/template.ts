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
 * 生成反馈界面HTML
 */
export async function generateFeedbackHTML(
	session: any,
	request: Request,
	templateContent?: string
): Promise<string> {
	// 如果没有提供模板内容，使用内置的简化模板
	if (!templateContent) {
		return generateSimpleFeedbackHTML(session, request);
	}

	const url = new URL(request.url);
	const theme = url.searchParams.get('theme') || 'dark';
	const lang = url.searchParams.get('lang') || 'zh';

	const templateData: TemplateData = {
		sessionId: session.sessionId,
		message: session.message,
		predefinedOptions: session.predefinedOptions,
		theme,
		lang,
		title: lang === 'zh' ? 'Interactive Feedback' : 'Interactive Feedback'
	};

	return renderTemplate(templateContent, templateData);
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
            min-height: 120px; 
            padding: 16px; 
            border-radius: 6px; 
            border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
            background: ${isDark ? '#1a1a1a' : '#ffffff'};
            color: ${isDark ? '#ffffff' : '#000000'};
            font-family: inherit;
            font-size: 15px;
            resize: vertical;
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
                <h3>${isZh ? '其他说明：' : 'Additional comments:'}</h3>
                <textarea 
                    name="freeText" 
                    placeholder="${isZh ? '请输入您的反馈...' : 'Please enter your feedback...'}"
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
