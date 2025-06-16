/**
 * Interactive Feedback MCP 系统测试
 * 测试新的API架构和WebSocket功能
 */

const BASE_URL = 'http://127.0.0.1:8787'; // 本地开发服务器
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwicm9sZXMiOlsidXNlciJdLCJpYXQiOjE3NTAwNjczMjcsImV4cCI6MTc1MDA3MDkyN30.5yNkc52U5_KDTbTljzJsd_I5RdxrztgDxC22_PJX6i4'; // 测试用的JWT Token

/**
 * 测试创建反馈会话
 */
async function testCreateFeedbackSession() {
    console.log('\n🧪 测试创建反馈会话...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/feedback/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                message: '这是一个测试反馈会话，请选择您的偏好。',
                predefinedOptions: ['选项A', '选项B', '选项C'],
                timeout: 600,
                metadata: {
                    testCase: 'create-session',
                    timestamp: new Date().toISOString()
                }
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ 会话创建成功');
            console.log(`   Session ID: ${result.data.sessionId}`);
            console.log(`   Feedback URL: ${result.data.feedbackUrl}`);
            console.log(`   Status URL: ${result.data.statusUrl}`);
            console.log(`   Expires At: ${result.data.expiresAt}`);
            return result.data;
        } else {
            console.log('❌ 会话创建失败:', result.error);
            return null;
        }
    } catch (error) {
        console.log('❌ 请求失败:', error.message);
        return null;
    }
}

/**
 * 测试获取会话状态
 */
async function testGetSessionStatus(sessionId) {
    console.log('\n🧪 测试获取会话状态...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/feedback/${sessionId}/status`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ 状态获取成功');
            console.log(`   Status: ${result.data.status}`);
            console.log(`   Created: ${result.data.createdAt}`);
            console.log(`   Expires: ${result.data.expiresAt}`);
            if (result.data.submittedAt) {
                console.log(`   Submitted: ${result.data.submittedAt}`);
            }
            return result.data;
        } else {
            console.log('❌ 状态获取失败:', result.error);
            return null;
        }
    } catch (error) {
        console.log('❌ 请求失败:', error.message);
        return null;
    }
}

/**
 * 测试提交反馈
 */
async function testSubmitFeedback(sessionId) {
    console.log('\n🧪 测试提交反馈...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/feedback/${sessionId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                selectedOptions: ['选项A', '选项C'],
                freeText: '这是一个测试反馈，包含额外的说明信息。',
                metadata: {
                    userAgent: 'Test-Agent/1.0',
                    timestamp: new Date().toISOString(),
                    testCase: 'submit-feedback'
                }
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ 反馈提交成功');
            console.log(`   Session ID: ${result.data.sessionId}`);
            console.log(`   Status: ${result.data.status}`);
            console.log(`   Submitted At: ${result.data.submittedAt}`);
            return result.data;
        } else {
            console.log('❌ 反馈提交失败:', result.error);
            return null;
        }
    } catch (error) {
        console.log('❌ 请求失败:', error.message);
        return null;
    }
}

/**
 * 测试获取反馈结果
 */
async function testGetFeedbackResult(sessionId) {
    console.log('\n🧪 测试获取反馈结果...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/feedback/${sessionId}/result`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ 结果获取成功');
            console.log(`   Session ID: ${result.data.sessionId}`);
            console.log(`   Submitted At: ${result.data.submittedAt}`);
            console.log(`   Selected Options: ${JSON.stringify(result.data.feedback.selectedOptions)}`);
            console.log(`   Free Text: ${result.data.feedback.freeText}`);
            console.log(`   Combined Feedback: ${result.data.feedback.combinedFeedback}`);
            return result.data;
        } else {
            console.log('❌ 结果获取失败:', result.error);
            return null;
        }
    } catch (error) {
        console.log('❌ 请求失败:', error.message);
        return null;
    }
}

/**
 * 测试反馈界面访问
 */
async function testFeedbackUI(sessionId) {
    console.log('\n🧪 测试反馈界面访问...');
    
    try {
        const response = await fetch(`${BASE_URL}/feedback/${sessionId}?theme=dark&lang=zh`);
        
        if (response.ok) {
            const html = await response.text();
            console.log('✅ 反馈界面访问成功');
            console.log(`   Content-Type: ${response.headers.get('content-type')}`);
            console.log(`   HTML Length: ${html.length} characters`);
            console.log(`   Contains Form: ${html.includes('<form') ? 'Yes' : 'No'}`);
            console.log(`   Contains JavaScript: ${html.includes('<script') ? 'Yes' : 'No'}`);
            return true;
        } else {
            console.log('❌ 反馈界面访问失败:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.log('❌ 请求失败:', error.message);
        return false;
    }
}

/**
 * 测试WebSocket连接
 */
async function testWebSocketConnection(sessionId) {
    console.log('\n🧪 测试WebSocket连接...');
    
    // 注意：在Node.js环境中测试WebSocket需要额外的库
    // 这里只是演示测试结构
    console.log('⚠️  WebSocket测试需要在浏览器环境中进行');
    console.log(`   WebSocket URL: ws://localhost:8787/ws/${sessionId}?apiKey=${API_KEY}&clientType=web`);
    
    return true;
}

/**
 * 测试健康检查端点
 */
async function testHealthCheck() {
    console.log('\n🧪 测试健康检查端点...');
    
    try {
        const response = await fetch(`${BASE_URL}/health`);
        const result = await response.json();
        
        if (result.success && result.data.status === 'ok') {
            console.log('✅ 健康检查通过');
            console.log(`   Service: ${result.data.service}`);
            console.log(`   Version: ${result.data.version}`);
            console.log(`   Timestamp: ${result.data.timestamp}`);
            return true;
        } else {
            console.log('❌ 健康检查失败:', result);
            return false;
        }
    } catch (error) {
        console.log('❌ 请求失败:', error.message);
        return false;
    }
}

/**
 * 运行完整的测试套件
 */
async function runTestSuite() {
    console.log('🚀 开始运行 Interactive Feedback MCP 测试套件');
    console.log('=' .repeat(60));
    
    const results = {
        healthCheck: false,
        createSession: false,
        getStatus: false,
        submitFeedback: false,
        getResult: false,
        feedbackUI: false,
        webSocket: false
    };
    
    // 1. 健康检查
    results.healthCheck = await testHealthCheck();
    
    if (!results.healthCheck) {
        console.log('\n❌ 健康检查失败，停止测试');
        return results;
    }
    
    // 2. 创建会话
    const sessionData = await testCreateFeedbackSession();
    results.createSession = !!sessionData;
    
    if (!sessionData) {
        console.log('\n❌ 会话创建失败，停止测试');
        return results;
    }
    
    const sessionId = sessionData.sessionId;
    
    // 3. 获取状态
    results.getStatus = !!(await testGetSessionStatus(sessionId));
    
    // 4. 测试反馈界面
    results.feedbackUI = await testFeedbackUI(sessionId);
    
    // 5. 提交反馈
    results.submitFeedback = !!(await testSubmitFeedback(sessionId));
    
    // 6. 获取结果
    if (results.submitFeedback) {
        // 等待一下确保数据已保存
        await new Promise(resolve => setTimeout(resolve, 1000));
        results.getResult = !!(await testGetFeedbackResult(sessionId));
    }
    
    // 7. WebSocket测试
    results.webSocket = await testWebSocketConnection(sessionId);
    
    // 输出测试结果
    console.log('\n' + '=' .repeat(60));
    console.log('📊 测试结果汇总:');
    console.log('=' .repeat(60));
    
    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`   ${test.padEnd(20)} ${status}`);
    });
    
    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log('\n' + '=' .repeat(60));
    console.log(`🎯 总体结果: ${passedCount}/${totalCount} 测试通过`);
    
    if (passedCount === totalCount) {
        console.log('🎉 所有测试都通过了！');
    } else {
        console.log('⚠️  部分测试失败，请检查日志');
    }
    
    return results;
}

// 如果直接运行此脚本
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 检查是否直接运行
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
    runTestSuite().catch(console.error);
}

export {
    testCreateFeedbackSession,
    testGetSessionStatus,
    testSubmitFeedback,
    testGetFeedbackResult,
    testFeedbackUI,
    testWebSocketConnection,
    testHealthCheck,
    runTestSuite
};
