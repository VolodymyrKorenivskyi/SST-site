import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    // Використовуємо process.cwd() для надійного визначення шляху
    const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'sst-site.db');
    
    // Створюємо директорію для БД, якщо її немає
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('📁 Створено директорію для бази даних:', dbDir);
    }
    
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    console.log('✅ Підключено до бази даних:', dbPath);
  }
  return db;
}

export function initDatabase(): void {
  getDatabase(); // Ініціалізація підключення
  // Запускаємо міграції при ініціалізації
  const { runMigrations } = require('./migrate');
  runMigrations();
  console.log('📊 База даних ініціалізована');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('🔌 Підключення до бази даних закрито');
  }
}
