/**
 * D1数据库服务
 * 用于存储反馈交互历史和系统事件
 */

export interface FeedbackSession {
    id: string;
    title: string;
    message: string;
    status: 'pending' | 'completed' | 'expired';
    timeout_seconds: number;
    created_at: string;
    expires_at: string;
    submitted_at?: string;
    created_by?: string;
    source: string;
    metadata?: string;
    updated_at: string;
}

export interface FeedbackResponse {
    id?: number;
    session_id: string;
    free_text?: string;
    combined_feedback?: string;
    submitted_at: string;
    user_agent?: string;
    ip_address?: string;
    submission_metadata?: string;
}

export interface InteractionHistory {
    id?: number;
    session_id?: string;
    tool_name: string;
    tool_arguments?: string;
    tool_result?: string;
    execution_time_ms?: number;
    status: 'success' | 'error' | 'timeout';
    error_message?: string;
    user_id?: string;
    created_at: string;
    metadata?: string;
}

export interface SystemEvent {
    id?: number;
    event_type: string;
    event_data?: string;
    session_id?: string;
    user_id?: string;
    timestamp: string;
    source: string;
    severity: 'debug' | 'info' | 'warning' | 'error';
}

export class D1DatabaseService {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * 保存反馈会话到D1数据库
     */
    async saveFeedbackSession(session: Omit<FeedbackSession, 'created_at' | 'updated_at'>): Promise<void> {
        const now = new Date().toISOString();
        
        try {
            await this.db.prepare(`
                INSERT INTO feedback_sessions (
                    id, title, message, status, timeout_seconds, 
                    expires_at, submitted_at, created_by, source, 
                    metadata, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                session.id,
                session.title,
                session.message,
                session.status,
                session.timeout_seconds,
                session.expires_at,
                session.submitted_at || null,
                session.created_by || null,
                session.source,
                session.metadata || null,
                now,
                now
            ).run();

            console.log(`✅ Saved feedback session to D1: ${session.id}`);
        } catch (error) {
            console.error('❌ Failed to save feedback session to D1:', error);
            throw error;
        }
    }

    /**
     * 更新反馈会话状态
     */
    async updateFeedbackSessionStatus(
        sessionId: string, 
        status: 'pending' | 'completed' | 'expired',
        submittedAt?: string
    ): Promise<void> {
        const now = new Date().toISOString();
        
        try {
            await this.db.prepare(`
                UPDATE feedback_sessions 
                SET status = ?, submitted_at = ?, updated_at = ?
                WHERE id = ?
            `).bind(status, submittedAt || null, now, sessionId).run();

            console.log(`✅ Updated feedback session status in D1: ${sessionId} -> ${status}`);
        } catch (error) {
            console.error('❌ Failed to update feedback session status in D1:', error);
            throw error;
        }
    }

    /**
     * 保存反馈响应到D1数据库
     */
    async saveFeedbackResponse(response: Omit<FeedbackResponse, 'id' | 'submitted_at'>): Promise<void> {
        const now = new Date().toISOString();
        
        try {
            await this.db.prepare(`
                INSERT INTO feedback_responses (
                    session_id, free_text, combined_feedback, 
                    user_agent, ip_address, submission_metadata, submitted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
                response.session_id,
                response.free_text || null,
                response.combined_feedback || null,
                response.user_agent || null,
                response.ip_address || null,
                response.submission_metadata || null,
                now
            ).run();

            console.log(`✅ Saved feedback response to D1: ${response.session_id}`);
        } catch (error) {
            console.error('❌ Failed to save feedback response to D1:', error);
            throw error;
        }
    }

    /**
     * 记录工具交互历史
     */
    async recordInteraction(interaction: Omit<InteractionHistory, 'id' | 'created_at'>): Promise<void> {
        const now = new Date().toISOString();
        
        try {
            await this.db.prepare(`
                INSERT INTO interaction_history (
                    session_id, tool_name, tool_arguments, tool_result,
                    execution_time_ms, status, error_message, user_id, 
                    metadata, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                interaction.session_id || null,
                interaction.tool_name,
                interaction.tool_arguments || null,
                interaction.tool_result || null,
                interaction.execution_time_ms || null,
                interaction.status,
                interaction.error_message || null,
                interaction.user_id || null,
                interaction.metadata || null,
                now
            ).run();

            console.log(`✅ Recorded interaction in D1: ${interaction.tool_name} (${interaction.status})`);
        } catch (error) {
            console.error('❌ Failed to record interaction in D1:', error);
            throw error;
        }
    }

    /**
     * 记录系统事件
     */
    async recordSystemEvent(event: Omit<SystemEvent, 'id' | 'timestamp'>): Promise<void> {
        const now = new Date().toISOString();
        
        try {
            await this.db.prepare(`
                INSERT INTO system_events (
                    event_type, event_data, session_id, user_id, 
                    source, severity, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
                event.event_type,
                event.event_data || null,
                event.session_id || null,
                event.user_id || null,
                event.source,
                event.severity,
                now
            ).run();

            console.log(`✅ Recorded system event in D1: ${event.event_type} (${event.severity})`);
        } catch (error) {
            console.error('❌ Failed to record system event in D1:', error);
            throw error;
        }
    }

    /**
     * 获取反馈会话历史
     */
    async getFeedbackSessionHistory(limit: number = 50, offset: number = 0): Promise<FeedbackSession[]> {
        try {
            const result = await this.db.prepare(`
                SELECT * FROM feedback_sessions 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `).bind(limit, offset).all();

            return result.results as FeedbackSession[];
        } catch (error) {
            console.error('❌ Failed to get feedback session history from D1:', error);
            throw error;
        }
    }

    /**
     * 获取工具使用统计
     */
    async getToolUsageStats(): Promise<any[]> {
        try {
            const result = await this.db.prepare(`
                SELECT 
                    tool_name,
                    COUNT(*) as total_calls,
                    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_calls,
                    COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_calls,
                    COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeout_calls,
                    AVG(execution_time_ms) as avg_execution_time_ms,
                    MIN(created_at) as first_call,
                    MAX(created_at) as last_call
                FROM interaction_history
                GROUP BY tool_name
                ORDER BY total_calls DESC
            `).all();

            return result.results;
        } catch (error) {
            console.error('❌ Failed to get tool usage stats from D1:', error);
            throw error;
        }
    }

    /**
     * 获取每日活动统计
     */
    async getDailyActivityStats(days: number = 30): Promise<any[]> {
        try {
            const result = await this.db.prepare(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(DISTINCT session_id) as unique_sessions,
                    COUNT(*) as total_interactions,
                    COUNT(CASE WHEN tool_name = 'interactive_feedback' THEN 1 END) as feedback_calls,
                    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_interactions
                FROM interaction_history
                WHERE created_at >= datetime('now', '-' || ? || ' days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `).bind(days).all();

            return result.results;
        } catch (error) {
            console.error('❌ Failed to get daily activity stats from D1:', error);
            throw error;
        }
    }

    /**
     * 清理过期数据
     */
    async cleanupExpiredData(daysToKeep: number = 90): Promise<void> {
        try {
            // 清理过期的反馈会话
            const sessionsResult = await this.db.prepare(`
                DELETE FROM feedback_sessions 
                WHERE created_at < datetime('now', '-' || ? || ' days')
            `).bind(daysToKeep).run();

            // 清理过期的交互历史
            const interactionsResult = await this.db.prepare(`
                DELETE FROM interaction_history 
                WHERE created_at < datetime('now', '-' || ? || ' days')
            `).bind(daysToKeep).run();

            // 清理过期的系统事件
            const eventsResult = await this.db.prepare(`
                DELETE FROM system_events 
                WHERE timestamp < datetime('now', '-' || ? || ' days')
            `).bind(daysToKeep).run();

            console.log(`✅ Cleaned up expired data from D1:`, {
                sessions: sessionsResult.changes,
                interactions: interactionsResult.changes,
                events: eventsResult.changes
            });
        } catch (error) {
            console.error('❌ Failed to cleanup expired data from D1:', error);
            throw error;
        }
    }
}
