import { getDatabase } from '../database/connection';
import { RoleRequest } from '../types/roleRequests';
import { AuditService } from './AuditService';
import { EmailService } from './EmailService';

export class RoleRequestService {
  private static db = getDatabase();

  /**
   * Створення заявки на роль
   */
  static createRequest(params: {
    userId: number;
    requestedRoleId: number;
    message?: string;
  }): RoleRequest {
    // Перевірка чи вже є активна заявка на цю роль
    const existingRequest = this.db
      .prepare(`
        SELECT id FROM role_requests 
        WHERE user_id = ? AND requested_role_id = ? AND status = 'pending'
      `)
      .get(params.userId, params.requestedRoleId) as { id: number } | undefined;

    if (existingRequest) {
      throw new Error('REQUEST_ALREADY_EXISTS');
    }

    // Перевірка чи вже є ця роль
    const hasRole = this.db
      .prepare('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?')
      .get(params.userId, params.requestedRoleId);

    if (hasRole) {
      throw new Error('ROLE_ALREADY_ASSIGNED');
    }

    // Створення заявки
    const insertRequest = this.db.prepare(`
      INSERT INTO role_requests (user_id, requested_role_id, status, message)
      VALUES (?, ?, 'pending', ?)
    `);

    const result = insertRequest.run(
      params.userId,
      params.requestedRoleId,
      params.message || null
    );

    const requestId = result.lastInsertRowid as number;

    // Логування
    AuditService.log({
      userId: params.userId,
      action: 'role_request_created',
      entityType: 'role_request',
      entityId: requestId,
      details: { requestedRoleId: params.requestedRoleId },
    });

    // Отримання створеної заявки
    const request = this.db
      .prepare('SELECT * FROM role_requests WHERE id = ?')
      .get(requestId) as RoleRequest;

    return request;
  }

  /**
   * Отримання заявок користувача
   */
  static getUserRequests(userId: number): RoleRequest[] {
    const requests = this.db
      .prepare(`
        SELECT * FROM role_requests 
        WHERE user_id = ?
        ORDER BY created_at DESC
      `)
      .all(userId) as RoleRequest[];

    return requests;
  }

  /**
   * Отримання всіх заявок (для адміна)
   */
  static getAllRequests(status?: 'pending' | 'approved' | 'rejected'): RoleRequest[] {
    let query = 'SELECT * FROM role_requests';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const requests = this.db.prepare(query).all(...params) as RoleRequest[];
    return requests;
  }

  /**
   * Розгляд заявки (схвалення/відхилення)
   */
  static reviewRequest(params: {
    requestId: number;
    reviewerId: number;
    status: 'approved' | 'rejected';
    message?: string;
  }): void {
    // Отримання заявки
    const request = this.db
      .prepare('SELECT * FROM role_requests WHERE id = ?')
      .get(params.requestId) as any;

    if (!request) {
      throw new Error('REQUEST_NOT_FOUND');
    }

    // Отримуємо snake_case поля з бази
    const requestStatus = request.status;
    const requestMessage = request.message;
    const userId = request.user_id;
    const requestedRoleId = request.requested_role_id;

    if (requestStatus !== 'pending') {
      throw new Error('REQUEST_ALREADY_REVIEWED');
    }

    // Оновлення заявки
    this.db
      .prepare(`
        UPDATE role_requests 
        SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, message = ?
        WHERE id = ?
      `)
      .run(
        params.status,
        params.reviewerId,
        params.message || requestMessage || null,
        params.requestId
      );

    // Якщо схвалено - назначити роль
    if (params.status === 'approved') {
      // Перевірка чи роль вже призначена
      const existingRole = this.db
        .prepare('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?')
        .get(userId, requestedRoleId);
      
      if (!existingRole) {
        const assignRole = this.db.prepare(`
          INSERT INTO user_roles (user_id, role_id, assigned_by)
          VALUES (?, ?, ?)
        `);
        assignRole.run(userId, requestedRoleId, params.reviewerId);
      }

      // Логування
      AuditService.log({
        userId: params.reviewerId,
        action: 'role_assigned',
        entityType: 'user',
        entityId: userId,
        details: { 
          roleRequestId: request.id,
          roleId: requestedRoleId,
          viaRequest: true 
        },
      });
    } else {
      // Логування відхилення
      AuditService.log({
        userId: params.reviewerId,
        action: 'role_request_rejected',
        entityType: 'role_request',
        entityId: request.id,
        details: { 
          userId: userId,
          requestedRoleId: requestedRoleId 
        },
      });
    }

    // Відправка email користувачу
    const user = this.db
      .prepare('SELECT email, first_name FROM users WHERE id = ?')
      .get(userId) as { email: string; first_name: string };

    if (!user) {
      console.error(`⚠️  User not found for userId: ${userId}`);
      return;
    }

    const role = this.db
      .prepare('SELECT name FROM roles WHERE id = ?')
      .get(requestedRoleId) as { name: string };

    if (!role) {
      console.error(`⚠️  Role not found for roleId: ${requestedRoleId}`);
      return;
    }

    // Відправка email про рішення по заявці
    if (params.status === 'approved') {
      EmailService.sendRoleAssignedEmail(user.email, user.first_name, role.name).catch((error) => {
        console.error('Ошибка отправки email о назначении роли:', error);
      });
    } else {
      EmailService.sendRoleRequestRejectedEmail(
        user.email,
        user.first_name,
        role.name,
        params.message || requestMessage
      ).catch((error) => {
        console.error('Ошибка отправки email об отклонении заявки:', error);
      });
    }
  }
}
