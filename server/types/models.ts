// Типи для моделей бази даних

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone?: string | null;
  telegram?: string | null;
  avatarUrl?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  timezone: string;
  country?: string | null;
  language: string;
  status: 'active' | 'blocked' | 'deleted';
  isEmailVerified: boolean;
  failedLoginAttempts: number;
  blockedUntil?: Date | null;
  passwordChangedAt: Date;
  is2FAEnabled: boolean;
  totpSecret?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
}

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  createdAt: Date;
}

export interface UserRole {
  userId: number;
  roleId: number;
  assignedAt: Date;
  assignedBy?: number | null;
}

export interface VerificationCode {
  id: number;
  userId: number;
  code: string;
  type: 'registration' | 'password_reset' | 'email_change';
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

export interface Session {
  id: string; // UUID
  userId: number;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface AppSetting {
  key: string;
  value: string;
  description?: string | null;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  updatedAt: Date;
  updatedBy?: number | null;
}

export interface AuditLog {
  id: number;
  userId?: number | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: string | null; // JSON string
  createdAt: Date;
}

// Типи для запитів і відповідей API

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface Verify2FARequest {
  tempToken: string;
  code: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phone?: string;
  telegram?: string;
  companyName?: string;
  jobTitle?: string;
  timezone?: string;
  country?: string;
  language?: string;
}

export interface AssignRoleRequest {
  roleId: number;
}

export interface BlockUserRequest {
  reason: string;
  blockedUntil?: Date;
}

// Відповіді API

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone?: string | null;
  telegram?: string | null;
  avatarUrl?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  timezone: string;
  country?: string | null;
  language: string;
  is2FAEnabled: boolean;
  roles: string[];
  createdAt: Date;
  lastLoginAt?: Date | null;
}

export interface LoginResponse {
  sessionId: string;
  user: UserResponse;
}

export interface Login2FAResponse {
  requires2FA: boolean;
  tempToken: string;
  message: string;
}

export interface Enable2FAResponse {
  qrCodeUrl: string;
  secret: string;
  otpauthUrl: string;
}
