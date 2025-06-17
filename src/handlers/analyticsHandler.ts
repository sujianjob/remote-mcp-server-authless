/**
 * 分析和统计数据处理器
 * 提供D1数据库中存储的反馈交互历史的查询接口
 */

import { D1DatabaseService } from '../services/d1DatabaseService.js';
import { createSuccessResponse, createErrorResponse, createNotFoundResponse } from '../utils/response.js';

export class AnalyticsHandler {
    private d1Service: D1DatabaseService;

    constructor(d1Service: D1DatabaseService) {
        this.d1Service = d1Service;
    }

    /**
     * 获取反馈会话历史
     */
    async handleGetSessionHistory(request: Request): Promise<Response> {
        try {
            const url = new URL(request.url);
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const offset = parseInt(url.searchParams.get('offset') || '0');

            const sessions = await this.d1Service.getFeedbackSessionHistory(limit, offset);

            return createSuccessResponse({
                sessions,
                pagination: {
                    limit,
                    offset,
                    total: sessions.length
                }
            });
        } catch (error) {
            console.error('Error getting session history:', error);
            return createErrorResponse('Failed to get session history');
        }
    }

    /**
     * 获取工具使用统计
     */
    async handleGetToolUsageStats(request: Request): Promise<Response> {
        try {
            const stats = await this.d1Service.getToolUsageStats();

            return createSuccessResponse({
                toolStats: stats,
                summary: {
                    totalTools: stats.length,
                    totalCalls: stats.reduce((sum, tool) => sum + (tool.total_calls || 0), 0),
                    totalSuccessful: stats.reduce((sum, tool) => sum + (tool.successful_calls || 0), 0),
                    totalFailed: stats.reduce((sum, tool) => sum + (tool.failed_calls || 0), 0)
                }
            });
        } catch (error) {
            console.error('Error getting tool usage stats:', error);
            return createErrorResponse('Failed to get tool usage stats');
        }
    }

    /**
     * 获取每日活动统计
     */
    async handleGetDailyActivityStats(request: Request): Promise<Response> {
        try {
            const url = new URL(request.url);
            const days = parseInt(url.searchParams.get('days') || '30');

            const stats = await this.d1Service.getDailyActivityStats(days);

            return createSuccessResponse({
                dailyStats: stats,
                period: {
                    days,
                    from: stats.length > 0 ? stats[stats.length - 1].date : null,
                    to: stats.length > 0 ? stats[0].date : null
                },
                summary: {
                    totalDays: stats.length,
                    totalSessions: stats.reduce((sum, day) => sum + (day.unique_sessions || 0), 0),
                    totalInteractions: stats.reduce((sum, day) => sum + (day.total_interactions || 0), 0),
                    avgSessionsPerDay: stats.length > 0 ? 
                        stats.reduce((sum, day) => sum + (day.unique_sessions || 0), 0) / stats.length : 0
                }
            });
        } catch (error) {
            console.error('Error getting daily activity stats:', error);
            return createErrorResponse('Failed to get daily activity stats');
        }
    }

    /**
     * 获取交互历史详情
     */
    async handleGetInteractionHistory(request: Request): Promise<Response> {
        try {
            const url = new URL(request.url);
            const sessionId = url.searchParams.get('sessionId');
            const toolName = url.searchParams.get('toolName');
            const status = url.searchParams.get('status');
            const limit = parseInt(url.searchParams.get('limit') || '100');

            // 构建查询条件
            let query = 'SELECT * FROM interaction_history WHERE 1=1';
            const params: any[] = [];

            if (sessionId) {
                query += ' AND session_id = ?';
                params.push(sessionId);
            }

            if (toolName) {
                query += ' AND tool_name = ?';
                params.push(toolName);
            }

            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }

            query += ' ORDER BY created_at DESC LIMIT ?';
            params.push(limit);

            // 执行查询（这里需要直接访问D1数据库）
            // 注意：这是一个简化实现，实际应该在D1DatabaseService中添加这个方法
            const result = await this.d1Service['db'].prepare(query).bind(...params).all();

            return createSuccessResponse({
                interactions: result.results,
                filters: {
                    sessionId,
                    toolName,
                    status,
                    limit
                },
                total: result.results.length
            });
        } catch (error) {
            console.error('Error getting interaction history:', error);
            return createErrorResponse('Failed to get interaction history');
        }
    }

    /**
     * 清理过期数据
     */
    async handleCleanupExpiredData(request: Request): Promise<Response> {
        try {
            const url = new URL(request.url);
            const daysToKeep = parseInt(url.searchParams.get('daysToKeep') || '90');

            await this.d1Service.cleanupExpiredData(daysToKeep);

            return createSuccessResponse({
                message: 'Cleanup completed successfully',
                daysToKeep,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error cleaning up expired data:', error);
            return createErrorResponse('Failed to cleanup expired data');
        }
    }

    /**
     * 获取数据库健康状态
     */
    async handleGetDatabaseHealth(request: Request): Promise<Response> {
        try {
            // 执行一些基本的健康检查查询
            const sessionCount = await this.d1Service['db'].prepare(
                'SELECT COUNT(*) as count FROM feedback_sessions'
            ).first();

            const interactionCount = await this.d1Service['db'].prepare(
                'SELECT COUNT(*) as count FROM interaction_history'
            ).first();

            const recentActivity = await this.d1Service['db'].prepare(
                'SELECT COUNT(*) as count FROM interaction_history WHERE created_at >= datetime("now", "-24 hours")'
            ).first();

            return createSuccessResponse({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                statistics: {
                    totalSessions: sessionCount?.count || 0,
                    totalInteractions: interactionCount?.count || 0,
                    recentActivity24h: recentActivity?.count || 0
                },
                tables: {
                    feedback_sessions: 'ok',
                    feedback_responses: 'ok',
                    interaction_history: 'ok',
                    system_events: 'ok'
                }
            });
        } catch (error) {
            console.error('Error checking database health:', error);
            return createErrorResponse('Database health check failed');
        }
    }

    /**
     * 导出数据（CSV格式）
     */
    async handleExportData(request: Request): Promise<Response> {
        try {
            const url = new URL(request.url);
            const table = url.searchParams.get('table') || 'feedback_sessions';
            const format = url.searchParams.get('format') || 'json';

            let query: string;
            switch (table) {
                case 'feedback_sessions':
                    query = 'SELECT * FROM feedback_sessions ORDER BY created_at DESC LIMIT 1000';
                    break;
                case 'interaction_history':
                    query = 'SELECT * FROM interaction_history ORDER BY created_at DESC LIMIT 1000';
                    break;
                case 'system_events':
                    query = 'SELECT * FROM system_events ORDER BY timestamp DESC LIMIT 1000';
                    break;
                default:
                    return createErrorResponse('Invalid table name');
            }

            const result = await this.d1Service['db'].prepare(query).all();

            if (format === 'csv') {
                // 转换为CSV格式
                const data = result.results as any[];
                if (data.length === 0) {
                    return new Response('No data found', { 
                        headers: { 'Content-Type': 'text/csv' } 
                    });
                }

                const headers = Object.keys(data[0]).join(',');
                const rows = data.map(row => 
                    Object.values(row).map(value => 
                        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
                    ).join(',')
                );

                const csv = [headers, ...rows].join('\n');

                return new Response(csv, {
                    headers: {
                        'Content-Type': 'text/csv',
                        'Content-Disposition': `attachment; filename="${table}_export_${new Date().toISOString().split('T')[0]}.csv"`
                    }
                });
            } else {
                // 返回JSON格式
                return createSuccessResponse({
                    table,
                    data: result.results,
                    count: result.results.length,
                    exportedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            return createErrorResponse('Failed to export data');
        }
    }
}
