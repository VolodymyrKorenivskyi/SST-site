import { z } from 'zod';
import validator from 'validator';

// Валідація пароля
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Пароль должен содержать минимум 8 символов' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну строчную букву' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну заглавную букву' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну цифру' };
  }
  if (!/[@$!%*?&]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы один специальный символ (@$!%*?&)' };
  }
  return { valid: true };
}

// Валідація email
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const normalizedEmail = email.toLowerCase().trim();
  
  if (!normalizedEmail || normalizedEmail.length > 254) {
    return { valid: false, error: 'Email не может быть пустым или длиннее 254 символов' };
  }
  
  if (!validator.isEmail(normalizedEmail)) {
    return { valid: false, error: 'Неверный формат email' };
  }
  
  return { valid: true };
}

// Валідація телефону
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone) {
    return { valid: false, error: 'Телефон обязателен' };
  }
  
  // Міжнародний формат: +[код країни][номер]
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  
  if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
    return { valid: false, error: 'Неверный формат телефона. Используйте международный формат: +[код страны][номер]' };
  }
  
  return { valid: true };
}

// Валідація імені
const nameRegex = /^[А-ЯЁа-яёA-Za-z\s-]{2,50}$/;

export function validateName(name: string, fieldName: string = 'Имя'): { valid: boolean; error?: string } {
  if (!name || name.length < 2) {
    return { valid: false, error: `${fieldName} должно содержать минимум 2 символа` };
  }
  if (name.length > 50) {
    return { valid: false, error: `${fieldName} не может быть длиннее 50 символов` };
  }
  if (!nameRegex.test(name)) {
    return { valid: false, error: `${fieldName} может содержать только буквы, пробелы и дефисы` };
  }
  return { valid: true };
}

// Zod схеми для валідації

export const registerSchema = z.object({
  email: z.string().email('Неверный формат email').max(254, 'Email слишком длинный'),
  password: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
  firstName: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(50),
  middleName: z.string().max(50).optional(),
  lastName: z.string().min(2, 'Фамилия должна содержать минимум 2 символа').max(50),
  phone: z.string().optional(),
  companyName: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
}).refine((data) => validatePassword(data.password).valid, {
  message: 'Пароль не соответствует требованиям',
  path: ['password'],
});

export const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export const verifyEmailSchema = z.object({
  email: z.string().email('Неверный формат email'),
  code: z.string().length(6, 'Код должен содержать 6 цифр').regex(/^\d{6}$/, 'Код должен содержать только цифры'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Неверный формат email'),
  code: z.string().length(6, 'Код должен содержать 6 цифр').regex(/^\d{6}$/, 'Код должен содержать только цифры'),
  newPassword: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
}).refine((data) => validatePassword(data.newPassword).valid, {
  message: 'Пароль не соответствует требованиям',
  path: ['newPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Текущий пароль обязателен'),
  newPassword: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
}).refine((data) => validatePassword(data.newPassword).valid, {
  message: 'Пароль не соответствует требованиям',
  path: ['newPassword'],
});

export const verify2FASchema = z.object({
  tempToken: z.string().min(1, 'Временный токен обязателен'),
  code: z.string().length(6, 'Код должен содержать 6 цифр').regex(/^\d{6}$/, 'Код должен содержать только цифры'),
});
