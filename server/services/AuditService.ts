import { getDatabase } from '../database/connection';
import { AuditLog } from '../types/models';

export class AuditService {
  private static db = getDatabase();

  /**
   * Логування дії в audit_logs
   */
  static log(params: {
    userId?: number | null;
    action: string;
    entityType?: string;
    entityId?: number;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
  }): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const detailsJson = params.details ? JSON.stringify(params.details) : null;

      stmt.run(
        params.userId || null,
        params.action,
        params.entityType || null,
        params.entityId || null,
        params.ipAddress || null,
        params.userAgent || null,
        detailsJson
      );
    } catch (error) {
      console.error('Error logging audit:', error);
      // Не кидаємо помилку, щоб не порушити основний процес
    }
  }

  /**
   * Отримання логів з фільтрацією
   */
  static getLogs(params: {
    page?: number;
    limit?: number;
    userId?: number;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): {
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const values: any[] = [];

    if (params.userId) {
      whereClause += ' AND user_id = ?';
      values.push(params.userId);
    }

    if (params.action) {
      whereClause += ' AND action = ?';
      values.push(params.action);
    }

    if (params.dateFrom) {
      whereClause += ' AND created_at >= ?';
      values.push(params.dateFrom.toISOString());
    }

    if (params.dateTo) {
      whereClause += ' AND created_at <= ?';
      values.push(params.dateTo.toISOString());
    }

    // Підрахунок загальної кількості
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM audit_logs ${whereClause}`);
    const total = (countStmt.get(...values) as { count: number }).count;

    // Отримання логів
    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const logs = stmt.all(...values, limit, offset) as AuditLog[];
    const totalPages = Math.ceil(total / limit);

    return {
      logs,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Видалення всіх логів
   */
  static deleteAllLogs(): void {
    try {
      this.db.prepare('DELETE FROM audit_logs').run();
    } catch (error) {
      console.error('Error deleting all audit logs:', error);
      throw error;
    }
  }
}
