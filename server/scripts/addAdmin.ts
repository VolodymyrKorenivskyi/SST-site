import { getDatabase } from '../database/connection';
import { hashPassword } from '../utils/crypto';

async function addAdmin() {
  const db = getDatabase();
  
  const email = 'vlad1204@gmail.com';
  const password = 'ghjuyjp1204!';
  const firstName = 'Vlad';
  const lastName = 'Admin';
  
  try {
    // Перевірка чи користувач вже існує
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      console.log('❌ Користувач з таким email вже існує');
      return;
    }

    // Хешування пароля
    const passwordHash = await hashPassword(password);

    // Створення користувача
    const insertUser = db.prepare(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, 
        status, is_email_verified
      ) VALUES (?, ?, ?, ?, 'active', 1)
    `);

    const result = insertUser.run(email, passwordHash, firstName, lastName);
    const userId = result.lastInsertRowid as number;

    console.log(`✅ Користувач створено з ID: ${userId}`);

    // Назначення ролі Guest
    db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, 1)').run(userId);

    // Назначення ролі Administrator (id=3)
    db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, 3)').run(userId);

    console.log('✅ Ролі назначено: Guest, Administrator');
    console.log(`✅ Email: ${email}`);
    console.log(`✅ Пароль: ${password}`);
    console.log('✅ Користувач готовий до використання!');

  } catch (error: any) {
    console.error('❌ Помилка:', error.message);
    throw error;
  }
}

// Запуск скрипту
addAdmin()
  .then(() => {
    console.log('✅ Готово!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Помилка виконання:', error);
    process.exit(1);
  });
