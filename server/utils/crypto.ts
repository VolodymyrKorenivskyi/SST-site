import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 10;

// Хешування пароля
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Перевірка пароля
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Генерація UUID
export function generateUUID(): string {
  return uuidv4();
}

// Генерація 6-значного коду верифікації
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Нормалізація email (приведення до нижнього регістру та видалення пробілів)
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
