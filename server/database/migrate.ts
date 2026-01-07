import { getDatabase } from './connection';
import path from 'path';
import fs from 'fs';

export function runMigrations(): void {
  const db = getDatabase();
  
  // Створюємо папку для БД, якщо її немає
  const dbDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Тут будуть міграції
  console.log('📦 Міграції виконано');
}

if (require.main === module) {
  runMigrations();
}
