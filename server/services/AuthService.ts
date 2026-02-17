import { getDatabase } from '../database/connection';
import { hashPassword, comparePassword, generateUUID, generateVerificationCode, normalizeEmail } from '../utils/crypto';
import { User, Session, VerificationCode } from '../types/models';
import { EmailService } from './EmailService';
import { AuditService } from './AuditService';
import { TwoFactorService } from './TwoFactorService';

interface TempTokenData {
  userId: number;
  email: string;
  createdAt: Date;
}

// Сховище для тимчасових токенів (для 2FA)
// У production краще використовувати Redis
const tempTokens = new Map<string, TempTokenData>();

export class AuthService {
  private static db = getDatabase();

  /**
   * Реєстрація нового користувача
   */
  static async register(params: {
    email: string;
    password: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    phone?: string;
    companyName?: string;
    jobTitle?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ userId: number; email: string }> {
    const normalizedEmail = normalizeEmail(params.email);
    const passwordHash = await hashPassword(params.password);

    // Перевірка наявності користувача
    const existingUser = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(normalizedEmail) as { id: number } | undefined;

    if (existingUser) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // Створення користувача
    const insertUser = this.db.prepare(`
      INSERT INTO users (
        email, password_hash, first_name, middle_name, last_name,
        phone, company_name, job_title, status, is_email_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)
    `);

    const result = insertUser.run(
      normalizedEmail,
      passwordHash,
      params.firstName,
      params.middleName || null,
      params.lastName,
      params.phone || null,
      params.companyName || null,
      params.jobTitle || null
    );

    const userId = result.lastInsertRowid as number;

    // Назначення ролі Guest (завжди автоматично)
    const assignGuestRole = this.db.prepare(`
      INSERT INTO user_roles (user_id, role_id) VALUES (?, 1)
    `);
    assignGuestRole.run(userId);
    
    // Всі нові користувачі починають як Guest без додаткових ролей

    // Генерація коду верифікації
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 хвилин

    const insertCode = this.db.prepare(`
      INSERT INTO verification_codes (user_id, code, type, expires_at)
      VALUES (?, ?, 'registration', ?)
    `);
    insertCode.run(userId, code, expiresAt.toISOString());

    // Відправка email
    try {
      await EmailService.sendVerificationEmail(normalizedEmail, params.firstName, code);
    } catch (error) {
      console.error('Ошибка отправки email при регистрации:', error);
    }

    // Логування
    AuditService.log({
      userId,
      action: 'user_registered',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return { userId, email: normalizedEmail };
  }

  /**
   * Підтвердження email
   */
  static verifyEmail(params: {
    email: string;
    code: string;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    const normalizedEmail = normalizeEmail(params.email);

    // Знаходження користувача
    const user = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(normalizedEmail) as { id: number } | undefined;

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Перевірка коду
    const codeRecord = this.db
      .prepare(`
        SELECT * FROM verification_codes
        WHERE user_id = ? AND code = ? AND type = 'registration' AND is_used = 0
        ORDER BY created_at DESC LIMIT 1
      `)
      .get(user.id, params.code) as VerificationCode | undefined;

    if (!codeRecord) {
      throw new Error('INVALID_CODE');
    }

    // Перевірка терміну дії
    const expiresAt = new Date(codeRecord.expiresAt);
    if (expiresAt < new Date()) {
      throw new Error('CODE_EXPIRED');
    }

    // Позначення email як верифікованого
    this.db.prepare('UPDATE users SET is_email_verified = 1 WHERE id = ?').run(user.id);

    // Позначення коду як використаного
    this.db.prepare('UPDATE verification_codes SET is_used = 1 WHERE id = ?').run(codeRecord.id);

    // Логування
    AuditService.log({
      userId: user.id,
      action: 'email_verified',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Вхід в систему (крок 1 - email і пароль)
   */
  static async login(params: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ requires2FA: boolean; tempToken?: string; sessionId?: string; user?: any }> {
    const normalizedEmail = normalizeEmail(params.email);

    // Знаходження користувача
    const user = this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(normalizedEmail) as User | undefined;

    if (!user) {
      // Логування невдалої спроби
      AuditService.log({
        action: 'failed_login',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: { reason: 'user_not_found', email: normalizedEmail },
      });
      throw new Error('INVALID_CREDENTIALS');
    }

    // Конвертація user з БД (snake_case) в camelCase
    const dbUser = user as any;
    const userStatus = dbUser.status;
    const blockedUntil = dbUser.blocked_until ? new Date(dbUser.blocked_until) : null;
    const failedLoginAttempts = dbUser.failed_login_attempts || 0;
    const passwordHash = dbUser.password_hash;
    const isEmailVerified = !!dbUser.is_email_verified;
    const is2FAEnabled = !!dbUser.is_2fa_enabled;

    // Перевірка статусу
    if (userStatus === 'blocked') {
      if (blockedUntil && blockedUntil > new Date()) {
        throw new Error('ACCOUNT_BLOCKED');
      }
      // Розблокувати якщо термін минув
      this.db.prepare('UPDATE users SET status = ? WHERE id = ?').run('active', user.id);
    }

    if (userStatus === 'deleted') {
      throw new Error('ACCOUNT_BLOCKED');
    }

    // Перевірка пароля
    if (!passwordHash) {
      console.error('❌ Password hash not found for user:', user.id);
      throw new Error('INVALID_CREDENTIALS');
    }
    
    const isValidPassword = await comparePassword(params.password, passwordHash);
    if (!isValidPassword) {
      // Збільшення лічильника невдалих спроб
      const failedAttempts = failedLoginAttempts + 1;
      const maxAttempts = 10;

      if (failedAttempts >= maxAttempts) {
        // Блокування на 30 хвилин
        const blockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        this.db
          .prepare('UPDATE users SET failed_login_attempts = ?, blocked_until = ?, status = ? WHERE id = ?')
          .run(failedAttempts, blockedUntil.toISOString(), 'blocked', user.id);

        AuditService.log({
          userId: user.id,
          action: 'user_blocked',
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          details: { reason: 'max_login_attempts' },
        });
      } else {
        this.db.prepare('UPDATE users SET failed_login_attempts = ? WHERE id = ?').run(failedAttempts, user.id);
      }

      AuditService.log({
        userId: user.id,
        action: 'failed_login',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: { reason: 'invalid_password' },
      });

      throw new Error('INVALID_CREDENTIALS');
    }

    // Перевірка верифікації email
    if (!isEmailVerified) {
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    // Отримання ролей
    const roles = this.db
      .prepare(`
        SELECT r.name FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `)
      .all(user.id) as { name: string }[];

    const roleNames = roles.map((r) => r.name);

    // Перевірка потреби 2FA (тільки якщо 2FA обов'язковий для не-Guest ролей)
    // Поки що вимикаємо цю перевірку, щоб дозволити вхід без 2FA
    // const hasNonGuestRole = roleNames.some((role) => role !== 'Guest');
    // if (hasNonGuestRole && !user.is2FAEnabled) {
    //   throw new Error('2FA_REQUIRED');
    // }

    // Якщо 2FA увімкнено - повертаємо тимчасовий токен
    if (is2FAEnabled) {
      const tempToken = generateUUID();
      tempTokens.set(tempToken, {
        userId: user.id,
        email: normalizedEmail,
        createdAt: new Date(),
      });

      // Видаляємо токен через 5 хвилин
      setTimeout(() => {
        tempTokens.delete(tempToken);
      }, 5 * 60 * 1000);

      return {
        requires2FA: true,
        tempToken,
        user: undefined,
      };
    }

    // Створення сесії для Guest (без 2FA)
    const sessionId = this.createSession(user.id, params.ipAddress, params.userAgent);

    // Оновлення last_login_at та скидання failed_login_attempts
    this.db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP, failed_login_attempts = 0 WHERE id = ?').run(user.id);

    // Логування
    AuditService.log({
      userId: user.id,
      action: 'user_login',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: { success: true },
    });

    return {
      requires2FA: false,
      sessionId,
      user: this.formatUserResponse(user, roleNames),
    };
  }

  /**
   * Верифікація 2FA (крок 2 входу)
   */
  static async verify2FA(params: {
    tempToken: string;
    code: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ sessionId: string; user: any }> {
    const tempTokenData = tempTokens.get(params.tempToken);
    if (!tempTokenData) {
      throw new Error('INVALID_TEMP_TOKEN');
    }

    // Видалення токену (одноразовий)
    tempTokens.delete(params.tempToken);

    // Отримання користувача
    const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(tempTokenData.userId) as User | undefined;
    if (!user || !user.totpSecret) {
      throw new Error('USER_NOT_FOUND');
    }

    // Перевірка TOTP коду
    const isValid = TwoFactorService.verifyToken(user.totpSecret, params.code);
    if (!isValid) {
      AuditService.log({
        userId: user.id,
        action: 'failed_login',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: { reason: 'invalid_2fa_code' },
      });
      throw new Error('INVALID_2FA_CODE');
    }

    // Створення сесії
    const sessionId = this.createSession(user.id, params.ipAddress, params.userAgent);

    // Оновлення last_login_at
    this.db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP, failed_login_attempts = 0 WHERE id = ?').run(user.id);

    // Отримання ролей
    const roles = this.db
      .prepare(`
        SELECT r.name FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `)
      .all(user.id) as { name: string }[];
    const roleNames = roles.map((r) => r.name);

    // Логування
    AuditService.log({
      userId: user.id,
      action: 'user_login',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: { success: true, with2FA: true },
    });

    return {
      sessionId,
      user: this.formatUserResponse(user, roleNames),
    };
  }

  /**
   * Створення сесії
   */
  private static createSession(userId: number, ipAddress?: string, userAgent?: string): string {
    const sessionId = generateUUID();
    // Сесія до закриття браузера (встановимо expires_at на далеке майбутнє, але перевіряти по last_activity_at)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 днів на всякий випадок

    const insertSession = this.db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertSession.run(sessionId, userId, expiresAt.toISOString(), ipAddress || null, userAgent || null);

    return sessionId;
  }

  /**
   * Форматування відповіді користувача
   */
  private static formatUserResponse(user: any, roles: string[]): any {
    // user може бути з БД (snake_case) або вже оброблений (camelCase)
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name || user.firstName,
      middleName: user.middle_name || user.middleName,
      lastName: user.last_name || user.lastName,
      phone: user.phone,
      avatarUrl: user.avatar_url || user.avatarUrl,
      companyName: user.company_name || user.companyName,
      jobTitle: user.job_title || user.jobTitle,
      timezone: user.timezone,
      country: user.country,
      language: user.language,
      is2FAEnabled: !!(user.is_2fa_enabled || user.is2FAEnabled),
      roles,
      createdAt: user.created_at || user.createdAt,
      lastLoginAt: user.last_login_at || user.lastLoginAt,
    };
  }

  /**
   * Перевірка сесії
   */
  static verifySession(sessionId: string): { valid: boolean; userId?: number } {
    const session = this.db
      .prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > CURRENT_TIMESTAMP')
      .get(sessionId) as Session | undefined;

    if (!session) {
      // Діагностика: перевіряємо, чи існує сесія взагалі
      const anySession = this.db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .get(sessionId) as Session | undefined;
      
      console.log('⚠️ Session not found or expired:', {
        sessionId: sessionId.substring(0, 8) + '...',
        exists: !!anySession,
        expired: anySession ? new Date(anySession.expiresAt) < new Date() : false,
      });
      
      return { valid: false };
    }

    // Оновлення last_activity_at
    this.db.prepare('UPDATE sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?').run(sessionId);

    // Читаємо user_id з бази даних (snake_case)
    const userId = (session as any).user_id || session.userId;
    
    console.log('✅ Session verified:', { 
      sessionId: sessionId.substring(0, 8) + '...', 
      userId,
      sessionRaw: session
    });
    
    return { valid: true, userId };
  }

  /**
   * Вихід з системи
   */
  static logout(sessionId: string, userId: number): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);

    AuditService.log({
      userId,
      action: 'user_logout',
    });
  }
}
