import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    // Визначаємо корінь проекту стабільно (працює і в dev, і в dist/)
    // server/database -> ../../ (root); dist/database -> ../../ (root)
    const projectRoot = path.resolve(__dirname, '..', '..');

    // DB_PATH може бути абсолютним або відносним
    const envDbPathRaw = process.env.DB_PATH?.trim();
    const dbPath = envDbPathRaw
      ? (path.isAbsolute(envDbPathRaw) ? envDbPathRaw : path.resolve(projectRoot, envDbPathRaw))
      : path.resolve(projectRoot, 'data', 'sst-site.db');

    const dbFileExisted = fs.existsSync(dbPath);
    
    // Створюємо директорію для БД, якщо її немає
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('📁 Створено директорію для бази даних:', dbDir);
    }
    
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    console.log('✅ Підключено до бази даних:', dbPath);

    if (!dbFileExisted) {
      console.warn(
        '⚠️  Файл БД не знайдено, створено нову (порожню) базу. ' +
          'У production це зазвичай означає, що не підключено/не скопійовано data/sst-site.db або невірно налаштовано DB_PATH.'
      );
    }
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
