import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data', 'sst-site.db');
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    console.log('✅ Підключено до бази даних:', dbPath);
  }
  return db;
}

export function initDatabase(): void {
  const database = getDatabase();
  // Тут буде ініціалізація таблиць
  console.log('📊 База даних ініціалізована');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('🔌 Підключення до бази даних закрито');
  }
}
