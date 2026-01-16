import { getDatabase } from './connection';

export function runMigrations(): void {
  const db = getDatabase();

  // Включаємо foreign keys
  db.pragma('foreign_keys = ON');

  // Таблиця users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      phone TEXT,
      telegram TEXT,
      avatar_url TEXT,
      company_name TEXT,
      job_title TEXT,
      timezone TEXT DEFAULT 'UTC',
      country TEXT,
      language TEXT DEFAULT 'ru',
      status TEXT DEFAULT 'active',
      is_email_verified INTEGER DEFAULT 0,
      failed_login_attempts INTEGER DEFAULT 0,
      blocked_until DATETIME,
      password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_2fa_enabled INTEGER DEFAULT 0,
      totp_secret TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
  `);

  // Додаємо колонку telegram, якщо її немає (для існуючих баз даних)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN telegram TEXT`);
  } catch (error: any) {
    // Колонка вже існує, ігноруємо помилку
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
  }

  // Таблиця roles
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Таблиця user_roles
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_by INTEGER,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id),
      FOREIGN KEY (assigned_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
  `);

  // Таблиця verification_codes
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      is_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id);
    CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
    CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);
  `);

  // Таблиця sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  // Таблиця app_settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      value_type TEXT DEFAULT 'string',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
  `);

  // Таблиця audit_logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
  `);

  // Таблиця role_requests - заявки на ролі
  db.exec(`
    CREATE TABLE IF NOT EXISTS role_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      requested_role_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      message TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (requested_role_id) REFERENCES roles(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_role_requests_user ON role_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);
    CREATE INDEX IF NOT EXISTS idx_role_requests_role ON role_requests(requested_role_id);
  `);

  // Таблиця location_types - типи серед розміщення терміналів
  db.exec(`
    CREATE TABLE IF NOT EXISTS location_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name_ru TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_ky TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_location_types_code ON location_types(code);
  `);

  // Тригер для автоматичного оновлення updated_at
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  // Вставка предустановлених ролей
  const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };
  if (roleCount.count === 0) {
    const insertRole = db.prepare(`
      INSERT INTO roles (id, name, description) 
      VALUES (?, ?, ?)
    `);

    insertRole.run(1, 'Guest', 'Гостевая роль');
    insertRole.run(2, 'Manager', 'Менеджер');
    insertRole.run(3, 'Administrator', 'Администратор');
    insertRole.run(4, 'Director', 'Директор');
  }

  // Вставка предустановлених настройок
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM app_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const insertSetting = db.prepare(`
      INSERT INTO app_settings (key, value, description, value_type) 
      VALUES (?, ?, ?, ?)
    `);

    insertSetting.run('site_name', 'SST Site', 'Название сайта', 'string');
    insertSetting.run('notification_email', 'noreply@sst-site.com', 'Email для уведомлений', 'string');
    insertSetting.run('max_login_attempts', '10', 'Макс. попыток входа', 'number');
    insertSetting.run('verification_code_lifetime', '15', 'Время жизни кода (мин)', 'number');
    insertSetting.run('password_rotation_days', '90', 'Частота смены пароля', 'number');
    insertSetting.run('registration_enabled', 'true', 'Регистрация включена', 'boolean');
    insertSetting.run('2fa_required_except_guest', 'true', '2FA для всех кроме Guest', 'boolean');
  }

  // Гарантируем наличие ключевых email-настроек (добавляем, если отсутствуют)
  const insertSettingIfMissing = db.prepare(`
    INSERT OR IGNORE INTO app_settings (key, value, description, value_type)
    VALUES (?, ?, ?, ?)
  `);
  insertSettingIfMissing.run(
    'collection_request_email',
    'vlad1204@gmail.com',
    'Email для инкассации (заявки по кнопке "$")',
    'email'
  );
  insertSettingIfMissing.run(
    'engineering_service_email',
    'vlad1204@gmail.com',
    'Email для вызова инженерной службы',
    'email'
  );
  insertSettingIfMissing.run(
    'monitoring_email',
    'vlad1204@gmail.com',
    'Email для мониторинга',
    'email'
  );

  // Вставка предустановлених типів серед розміщення
  const locationTypesCount = db.prepare('SELECT COUNT(*) as count FROM location_types').get() as { count: number };
  if (locationTypesCount.count === 0) {
    const insertLocationType = db.prepare(`
      INSERT INTO location_types (code, name_ru, name_en, name_ky) 
      VALUES (?, ?, ?, ?)
    `);

    insertLocationType.run('shop', 'Магазин', 'Shop', 'Дүкөн');
    insertLocationType.run('supermarket', 'Супермаркет', 'Supermarket', 'Супермаркет');
    insertLocationType.run('office', 'Офис', 'Office', 'Кеңсе');
    insertLocationType.run('mall', 'Торговый центр', 'Shopping Mall', 'Соода борбору');
    insertLocationType.run('bank', 'Банк', 'Bank', 'Банк');
    insertLocationType.run('other', 'Другое', 'Other', 'Башка');
  }

  // Таблиця location_statuses - справочник статусов локаций
  db.exec(`
    CREATE TABLE IF NOT EXISTS location_statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name_ru TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_ky TEXT NOT NULL,
      description_ru TEXT,
      description_en TEXT,
      description_ky TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_location_statuses_code ON location_statuses(code);
  `);

  // Вставка предустановлених статусов локаций
  const locationStatusesCount = db.prepare('SELECT COUNT(*) as count FROM location_statuses').get() as { count: number };
  if (locationStatusesCount.count === 0) {
    const insertStatus = db.prepare(`
      INSERT INTO location_statuses (code, name_ru, name_en, name_ky, description_ru, description_en, description_ky) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertStatus.run('searching', 'В поиске', 'Searching', 'Издөөдө', 'Локация найдена, ведется первичный анализ', 'Location found, initial analysis in progress', 'Локация табылды, баштапкы анализ жүргүзүлүүдө');
    insertStatus.run('under_review', 'На рассмотрении', 'Under Review', 'Каралууда', 'Отправлена заявка, ожидается ответ', 'Application submitted, awaiting response', 'Өтүнүч жөнөтүлдү, жооп күтүлүүдө');
    insertStatus.run('postponed', 'Отсрочено', 'Postponed', 'Кечиктирилди', 'Решение отложено на определенный период', 'Decision postponed for a certain period', 'Чечим белгилүү бир мөөнөткө кечиктирилди');
    insertStatus.run('rejected', 'Отказ', 'Rejected', 'Баш тартуу', 'Получен отказ от локации', 'Location request rejected', 'Локациядан баш тартуу алынды');
    insertStatus.run('accepted', 'Принято', 'Accepted', 'Кабыл алынды', 'Локация принята, начинается оформление', 'Location accepted, processing begins', 'Локация кабыл алынды, расмийлөө башталды');
    insertStatus.run('contract_processing', 'Оформление договора', 'Contract Processing', 'Келишимди расмийлөө', 'Идет оформление договорных документов', 'Contract documents are being processed', 'Келишим документтери расмийлөөдө');
    insertStatus.run('pending_connection', 'Ожидает подключения', 'Pending Connection', 'Туташууну күтүүдө', 'Договор подписан, ожидается подключение', 'Contract signed, awaiting connection', 'Келишим кол коюлду, туташуу күтүлүүдө');
    insertStatus.run('connected', 'Подключено', 'Connected', 'Туташтырылды', 'Терминал установлен и подключен', 'Terminal installed and connected', 'Терминал орнотулду жана туташтырылды');
    insertStatus.run('active', 'Активный', 'Active', 'Активдүү', 'Терминал работает и принимает платежи', 'Terminal is working and accepting payments', 'Терминал иштейт жана төлөмдөрдү кабыл алат');
    insertStatus.run('suspended', 'Приостановлено', 'Suspended', 'Токтотулду', 'Работа временно приостановлена', 'Work temporarily suspended', 'Иш убактылуу токтотулду');
    insertStatus.run('closed', 'Закрыто', 'Closed', 'Жабылды', 'Локация закрыта, терминал демонтирован', 'Location closed, terminal dismantled', 'Локация жабылды, терминал демонтирленди');
    insertStatus.run('needs_approval', 'Требует согласования', 'Needs Approval', 'Макулдашууну талап кылат', 'Требуется дополнительное согласование', 'Additional approval required', 'Кошумча макулдашуу талап кылынат');
    insertStatus.run('negotiating', 'На переговорах', 'Negotiating', 'Сүйлөшүүлөрдө', 'Ведутся переговоры по условиям', 'Negotiating terms and conditions', 'Шарттар боюнча сүйлөшүүлөр жүргүзүлүүдө');
    insertStatus.run('technical_survey', 'Техническое обследование', 'Technical Survey', 'Техникалык текшерүү', 'Проводится техническое обследование', 'Technical survey in progress', 'Техникалык текшерүү жүргүзүлүүдө');
  }

  // Таблиця search_locations - локації для пошуку
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      terminal_number TEXT,
      object_name TEXT NOT NULL,
      location_type_id INTEGER,
      address TEXT,
      latitude TEXT,
      longitude TEXT,
      map_url TEXT,
      contact_name TEXT,
      contact_phones TEXT,
      contact_telegrams TEXT,
      status TEXT DEFAULT 'active',
      last_contact_date DATE,
      working_hours TEXT,
      has_cable_connection INTEGER DEFAULT 0,
      rent_cost_kgs TEXT,
      rent_cost_usd TEXT,
      presentation_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (location_type_id) REFERENCES location_types(id)
    );

    CREATE INDEX IF NOT EXISTS idx_search_locations_location_type ON search_locations(location_type_id);
    CREATE INDEX IF NOT EXISTS idx_search_locations_status ON search_locations(status);
  `);

  // Додаємо колонку terminal_number, якщо її немає (для існуючих баз даних)
  try {
    db.exec(`ALTER TABLE search_locations ADD COLUMN terminal_number TEXT`);
  } catch (error: any) {
    // Колонка вже існує, ігноруємо помилку
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
  }

  // Таблиця terminals - термінали самообслуговування
  db.exec(`
    CREATE TABLE IF NOT EXISTS terminals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_terminal TEXT NOT NULL UNIQUE,
      location_id INTEGER,
      object_name TEXT NOT NULL,
      location_type_id INTEGER,
      address TEXT,
      latitude TEXT,
      longitude TEXT,
      map_url TEXT,
      contact_name TEXT,
      contact_phones TEXT,
      contact_telegrams TEXT,
      add_info TEXT,
      status TEXT DEFAULT 'active',
      last_contact_date DATE,
      working_hours TEXT,
      has_cable_connection INTEGER DEFAULT 0,
      rent_cost_kgs TEXT,
      rent_cost_usd TEXT,
      presentation_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (location_type_id) REFERENCES location_types(id),
      FOREIGN KEY (location_id) REFERENCES search_locations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_terminals_id_terminal ON terminals(id_terminal);
    CREATE INDEX IF NOT EXISTS idx_terminals_location_type ON terminals(location_type_id);
  `);

  // Добавляем колонку city в terminals, если её нет
  try {
    db.exec(`ALTER TABLE terminals ADD COLUMN city TEXT`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
  }

  // Добавляем колонку city в search_locations, если её нет
  try {
    db.exec(`ALTER TABLE search_locations ADD COLUMN city TEXT`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
  }

  // Заполняем все записи в terminals значением "Бишкек", если city пустое
  try {
    db.exec(`UPDATE terminals SET city = 'Бишкек' WHERE city IS NULL OR city = ''`);
  } catch (error: any) {
    console.warn('Попередження при заповненні city в terminals:', error.message);
  }

  // Заполняем все записи в search_locations значением "Бишкек", если city пустое
  try {
    db.exec(`UPDATE search_locations SET city = 'Бишкек' WHERE city IS NULL OR city = ''`);
  } catch (error: any) {
    console.warn('Попередження при заповненні city в search_locations:', error.message);
  }

  // Додаємо колонки для існуючих баз даних (якщо їх немає)
  const columnsToAdd = [
    { name: 'location_id', type: 'INTEGER' },
    { name: 'contact_name', type: 'TEXT' },
    { name: 'contact_phones', type: 'TEXT' },
    { name: 'contact_telegrams', type: 'TEXT' },
    { name: 'status', type: 'TEXT DEFAULT "active"' },
    { name: 'last_contact_date', type: 'DATE' },
    { name: 'working_hours', type: 'TEXT' },
    { name: 'has_cable_connection', type: 'INTEGER DEFAULT 0' },
    { name: 'rent_cost_kgs', type: 'TEXT' },
    { name: 'rent_cost_usd', type: 'TEXT' },
    { name: 'presentation_url', type: 'TEXT' },
  ];

  for (const column of columnsToAdd) {
    try {
      db.exec(`ALTER TABLE terminals ADD COLUMN ${column.name} ${column.type}`);
    } catch (error: any) {
      // Колонка вже існує, ігноруємо помилку
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }
  }

  // Додаємо індекс для status, якщо його немає
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_terminals_status ON terminals(status)`);
  } catch (error: any) {
    // Індекс вже існує, ігноруємо помилку
  }

  // Міграція: перейменування status в add_info та додавання нового поля status
  // Для search_locations
  try {
    // Перевіряємо, чи існує колонка status і чи немає add_info
    const searchLocationsInfo = db.prepare("PRAGMA table_info(search_locations)").all() as any[];
    const hasStatus = searchLocationsInfo.some((col: any) => col.name === 'status');
    const hasAddInfo = searchLocationsInfo.some((col: any) => col.name === 'add_info');
    
    if (hasStatus && !hasAddInfo) {
      // Додаємо колонку add_info та копіюємо дані з status
      db.exec(`ALTER TABLE search_locations ADD COLUMN add_info TEXT`);
      db.exec(`UPDATE search_locations SET add_info = status WHERE add_info IS NULL`);
      
      // Додаємо нову колонку status з дефолтним значенням
      db.exec(`ALTER TABLE search_locations ADD COLUMN status_new TEXT DEFAULT 'active'`);
      db.exec(`UPDATE search_locations SET status_new = 'active' WHERE status_new IS NULL`);
      
      // Видаляємо стару колонку status через пересоздание таблицы
      db.exec(`
        CREATE TABLE search_locations_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          terminal_number TEXT,
          object_name TEXT NOT NULL,
          location_type_id INTEGER,
          address TEXT,
          latitude TEXT,
          longitude TEXT,
          map_url TEXT,
          contact_name TEXT,
          contact_phones TEXT,
          contact_telegrams TEXT,
          add_info TEXT,
          status TEXT DEFAULT 'active',
          last_contact_date DATE,
          working_hours TEXT,
          has_cable_connection INTEGER DEFAULT 0,
          rent_cost_kgs TEXT,
          rent_cost_usd TEXT,
          presentation_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (location_type_id) REFERENCES location_types(id)
        )
      `);
      
      db.exec(`
        INSERT INTO search_locations_new 
        SELECT id, terminal_number, object_name, location_type_id, address, latitude, longitude, 
               map_url, contact_name, contact_phones, contact_telegrams, add_info, 
               COALESCE(status_new, 'active'), last_contact_date, working_hours, 
               has_cable_connection, rent_cost_kgs, rent_cost_usd, presentation_url, 
               created_at, updated_at
        FROM search_locations
      `);
      
      db.exec(`DROP TABLE search_locations`);
      db.exec(`ALTER TABLE search_locations_new RENAME TO search_locations`);
      
      // Відновлюємо індекси
      db.exec(`CREATE INDEX IF NOT EXISTS idx_search_locations_location_type ON search_locations(location_type_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_search_locations_status ON search_locations(status)`);
    }
  } catch (error: any) {
    // Якщо помилка, ігноруємо (можливо міграція вже виконана)
    if (!error.message.includes('duplicate column name') && !error.message.includes('no such table')) {
      console.warn('Попередження при міграції search_locations:', error.message);
    }
  }

  // Для terminals
  try {
    const terminalsInfo = db.prepare("PRAGMA table_info(terminals)").all() as any[];
    const hasStatus = terminalsInfo.some((col: any) => col.name === 'status');
    const hasAddInfo = terminalsInfo.some((col: any) => col.name === 'add_info');
    
    if (hasStatus && !hasAddInfo) {
      // Додаємо колонку add_info та копіюємо дані з status
      db.exec(`ALTER TABLE terminals ADD COLUMN add_info TEXT`);
      db.exec(`UPDATE terminals SET add_info = status WHERE add_info IS NULL`);
      
      // Додаємо нову колонку status з дефолтним значенням
      db.exec(`ALTER TABLE terminals ADD COLUMN status_new TEXT DEFAULT 'active'`);
      db.exec(`UPDATE terminals SET status_new = 'active' WHERE status_new IS NULL`);
      
      // Видаляємо стару колонку status через пересоздание таблицы
      db.exec(`
        CREATE TABLE terminals_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_terminal TEXT NOT NULL UNIQUE,
          location_id INTEGER,
          object_name TEXT NOT NULL,
          location_type_id INTEGER,
          address TEXT,
          latitude TEXT,
          longitude TEXT,
          map_url TEXT,
          contact_name TEXT,
          contact_phones TEXT,
          contact_telegrams TEXT,
          add_info TEXT,
          status TEXT DEFAULT 'active',
          last_contact_date DATE,
          working_hours TEXT,
          has_cable_connection INTEGER DEFAULT 0,
          rent_cost_kgs TEXT,
          rent_cost_usd TEXT,
          presentation_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (location_type_id) REFERENCES location_types(id),
          FOREIGN KEY (location_id) REFERENCES search_locations(id)
        )
      `);
      
      db.exec(`
        INSERT INTO terminals_new 
        SELECT id, id_terminal, location_id, object_name, location_type_id, address, latitude, longitude, 
               map_url, contact_name, contact_phones, contact_telegrams, add_info, 
               COALESCE(status_new, 'active'), last_contact_date, working_hours, 
               has_cable_connection, rent_cost_kgs, rent_cost_usd, presentation_url, 
               created_at, updated_at
        FROM terminals
      `);
      
      db.exec(`DROP TABLE terminals`);
      db.exec(`ALTER TABLE terminals_new RENAME TO terminals`);
      
      // Відновлюємо індекси
      db.exec(`CREATE INDEX IF NOT EXISTS idx_terminals_id_terminal ON terminals(id_terminal)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_terminals_location_type ON terminals(location_type_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_terminals_status ON terminals(status)`);
    }
  } catch (error: any) {
    // Якщо помилка, ігноруємо (можливо міграція вже виконана)
    if (!error.message.includes('duplicate column name') && !error.message.includes('no such table')) {
      console.warn('Попередження при міграції terminals:', error.message);
    }
  }

  // Додаємо колонку add_info, якщо її немає (для нових таблиць)
  try {
    db.exec(`ALTER TABLE search_locations ADD COLUMN add_info TEXT`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      // Ігноруємо помилку, якщо колонка вже існує
    }
  }

  try {
    db.exec(`ALTER TABLE terminals ADD COLUMN add_info TEXT`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      // Ігноруємо помилку, якщо колонка вже існує
    }
  }

  // Восстанавливаем данные в add_info, если они пустые
  // Проверяем search_locations
  try {
    const locationsWithEmptyAddInfo = db.prepare(`
      SELECT id, add_info, object_name, address 
      FROM search_locations 
      WHERE add_info IS NULL OR add_info = ''
    `).all() as any[];
    
    if (locationsWithEmptyAddInfo.length > 0) {
      console.log(`⚠️  Найдено ${locationsWithEmptyAddInfo.length} локаций с пустым add_info`);
      // Пытаемся восстановить из других полей или используем дефолтное значение
      const updateLocation = db.prepare('UPDATE search_locations SET add_info = ? WHERE id = ?');
      for (const loc of locationsWithEmptyAddInfo) {
        // Если есть информация в других полях, можно использовать её
        const defaultInfo = loc.address ? `Адрес: ${loc.address}` : 'Дополнительная информация';
        updateLocation.run(defaultInfo, loc.id);
      }
      console.log(`✅ Восстановлено add_info для ${locationsWithEmptyAddInfo.length} локаций`);
    }
  } catch (error: any) {
    console.warn('Попередження при восстановлении add_info в search_locations:', error.message);
  }

  // Проверяем terminals
  try {
    const terminalsWithEmptyAddInfo = db.prepare(`
      SELECT id, add_info, object_name, address 
      FROM terminals 
      WHERE add_info IS NULL OR add_info = ''
    `).all() as any[];
    
    if (terminalsWithEmptyAddInfo.length > 0) {
      console.log(`⚠️  Найдено ${terminalsWithEmptyAddInfo.length} терминалов с пустым add_info`);
      // Пытаемся восстановить из других полей или используем дефолтное значение
      const updateTerminal = db.prepare('UPDATE terminals SET add_info = ? WHERE id = ?');
      for (const term of terminalsWithEmptyAddInfo) {
        // Если есть информация в других полях, можно использовать её
        const defaultInfo = term.address ? `Адрес: ${term.address}` : 'Дополнительная информация';
        updateTerminal.run(defaultInfo, term.id);
      }
      console.log(`✅ Восстановлено add_info для ${terminalsWithEmptyAddInfo.length} терминалов`);
    }
  } catch (error: any) {
    console.warn('Попередження при восстановлении add_info в terminals:', error.message);
  }

  // Очищаем add_info, если там находятся значения статуса (неправильно скопированные данные)
  // Проверяем search_locations
  try {
    const locationsWithWrongAddInfo = db.prepare(`
      SELECT COUNT(*) as count 
      FROM search_locations 
      WHERE add_info IN ('active', 'inactive', 'maintenance', 'planned')
    `).get() as { count: number };
    
    if (locationsWithWrongAddInfo.count > 0) {
      console.log(`⚠️  Найдено ${locationsWithWrongAddInfo.count} локаций с неправильным add_info (значение статуса)`);
      // Очищаем add_info, так как там находится значение статуса, а не дополнительная информация
      db.exec(`UPDATE search_locations SET add_info = NULL WHERE add_info IN ('active', 'inactive', 'maintenance', 'planned')`);
      console.log(`✅ Очищено add_info для ${locationsWithWrongAddInfo.count} локаций (было значение статуса)`);
    }
  } catch (error: any) {
    console.warn('Попередження при очистке add_info в search_locations:', error.message);
  }

  // Проверяем terminals
  try {
    const terminalsWithWrongAddInfo = db.prepare(`
      SELECT COUNT(*) as count 
      FROM terminals 
      WHERE add_info IN ('active', 'inactive', 'maintenance', 'planned')
    `).get() as { count: number };
    
    if (terminalsWithWrongAddInfo.count > 0) {
      console.log(`⚠️  Найдено ${terminalsWithWrongAddInfo.count} терминалов с неправильным add_info (значение статуса)`);
      // Очищаем add_info, так как там находится значение статуса, а не дополнительная информация
      db.exec(`UPDATE terminals SET add_info = NULL WHERE add_info IN ('active', 'inactive', 'maintenance', 'planned')`);
      console.log(`✅ Очищено add_info для ${terminalsWithWrongAddInfo.count} терминалов (было значение статуса)`);
    }
  } catch (error: any) {
    console.warn('Попередження при очистке add_info в terminals:', error.message);
  }

  // Міграція: зміна status з TEXT на INTEGER (foreign key до location_statuses)
  // Для search_locations
  try {
    const searchLocationsInfo = db.prepare("PRAGMA table_info(search_locations)").all() as any[];
    const statusColumn = searchLocationsInfo.find((col: any) => col.name === 'status');
    
    if (statusColumn && statusColumn.type.toUpperCase() === 'TEXT') {
      console.log('🔄 Міграція status для search_locations: TEXT -> INTEGER');
      
      // Отримуємо id статусу 'searching' як дефолтний
      const defaultStatus = db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('searching') as { id: number } | undefined;
      const defaultStatusId = defaultStatus?.id || 1;
      
      // Створюємо тимчасову колонку status_id
      db.exec(`ALTER TABLE search_locations ADD COLUMN status_id INTEGER`);
      
      // Маппинг старих значень status (TEXT) на нові id
      const statusMapping: { [key: string]: number } = {
        'active': db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('active') as { id: number } | undefined || defaultStatusId,
        'inactive': db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('suspended') as { id: number } | undefined || defaultStatusId,
        'maintenance': db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('suspended') as { id: number } | undefined || defaultStatusId,
        'planned': db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('pending_connection') as { id: number } | undefined || defaultStatusId,
      };
      
      // Отримуємо id статусу 'connected' для локацій, що співпадають з терміналами
      const connectedStatus = db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('connected') as { id: number } | undefined;
      const connectedStatusId = connectedStatus?.id || defaultStatusId;
      
      // Отримуємо адреси терміналів
      const terminals = db.prepare('SELECT address FROM terminals WHERE address IS NOT NULL AND address != ""').all() as { address: string }[];
      const terminalAddresses = new Set(terminals.map(t => t.address?.trim().toLowerCase()).filter(Boolean));
      
      // Оновлюємо status_id на основі старих значень status або співпадіння з терміналами
      const locations = db.prepare('SELECT id, status, address FROM search_locations').all() as any[];
      const updateStatus = db.prepare('UPDATE search_locations SET status_id = ? WHERE id = ?');
      
      for (const loc of locations) {
        const locationAddress = loc.address?.trim().toLowerCase();
        
        // Якщо адрес співпадає з терміналом - ставимо "connected", інакше "searching"
        if (locationAddress && terminalAddresses.has(locationAddress)) {
          updateStatus.run(connectedStatusId, loc.id);
        } else {
          // Для всіх інших - ставимо "searching" (не залежно від старого значення)
          updateStatus.run(defaultStatusId, loc.id);
        }
      }
      
      // Пересоздаємо таблицю з правильним типом
      db.exec(`
        CREATE TABLE search_locations_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          terminal_number TEXT,
          object_name TEXT NOT NULL,
          location_type_id INTEGER,
          address TEXT,
          city TEXT,
          latitude TEXT,
          longitude TEXT,
          map_url TEXT,
          contact_name TEXT,
          contact_phones TEXT,
          contact_telegrams TEXT,
          add_info TEXT,
          status INTEGER DEFAULT ${defaultStatusId},
          status_date DATE,
          last_contact_date DATE,
          working_hours TEXT,
          has_cable_connection INTEGER DEFAULT 0,
          rent_cost_kgs TEXT,
          rent_cost_usd TEXT,
          presentation_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (location_type_id) REFERENCES location_types(id),
          FOREIGN KEY (status) REFERENCES location_statuses(id)
        )
      `);
      
      db.exec(`
        INSERT INTO search_locations_new 
        SELECT id, terminal_number, object_name, location_type_id, address, city, latitude, longitude, 
               map_url, contact_name, contact_phones, contact_telegrams, add_info, 
               COALESCE(status_id, ${defaultStatusId}), NULL, last_contact_date, working_hours, 
               has_cable_connection, rent_cost_kgs, rent_cost_usd, presentation_url, 
               created_at, updated_at
        FROM search_locations
      `);
      
      db.exec(`DROP TABLE search_locations`);
      db.exec(`ALTER TABLE search_locations_new RENAME TO search_locations`);
      
      // Відновлюємо індекси
      db.exec(`CREATE INDEX IF NOT EXISTS idx_search_locations_location_type ON search_locations(location_type_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_search_locations_status ON search_locations(status)`);
      
      console.log('✅ Міграція status для search_locations завершена');
    }
  } catch (error: any) {
    if (!error.message.includes('duplicate column name') && !error.message.includes('no such table')) {
      console.warn('Попередження при міграції status для search_locations:', error.message);
    }
  }

  // Для terminals
  try {
    const terminalsInfo = db.prepare("PRAGMA table_info(terminals)").all() as any[];
    const statusColumn = terminalsInfo.find((col: any) => col.name === 'status');
    
    if (statusColumn && statusColumn.type.toUpperCase() === 'TEXT') {
      console.log('🔄 Міграція status для terminals: TEXT -> INTEGER');
      
      // Отримуємо id статусу 'searching' як дефолтний
      const defaultStatus = db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('searching') as { id: number } | undefined;
      const defaultStatusId = defaultStatus?.id || 1;
      
      // Створюємо тимчасову колонку status_id
      db.exec(`ALTER TABLE terminals ADD COLUMN status_id INTEGER`);
      
      // Маппинг старих значень status (TEXT) на нові id
      const statusMapping: { [key: string]: number } = {
        'active': db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('active') as { id: number } | undefined || defaultStatusId,
        'inactive': db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('suspended') as { id: number } | undefined || defaultStatusId,
        'maintenance': db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('suspended') as { id: number } | undefined || defaultStatusId,
        'planned': db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('pending_connection') as { id: number } | undefined || defaultStatusId,
      };
      
      // Отримуємо id статусу 'connected' для терміналів
      const connectedStatus = db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('connected') as { id: number } | undefined;
      const connectedStatusId = connectedStatus?.id || defaultStatusId;
      
      // Оновлюємо status_id для терміналів - всі ставимо "connected" (термінали вже підключені)
      const terminals = db.prepare('SELECT id, status FROM terminals').all() as any[];
      const updateStatus = db.prepare('UPDATE terminals SET status_id = ? WHERE id = ?');
      
      for (const term of terminals) {
        // Всі термінали ставимо на "connected"
        updateStatus.run(connectedStatusId, term.id);
      }
      
      // Пересоздаємо таблицю з правильним типом
      db.exec(`
        CREATE TABLE terminals_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_terminal TEXT NOT NULL UNIQUE,
          location_id INTEGER,
          object_name TEXT NOT NULL,
          location_type_id INTEGER,
          address TEXT,
          city TEXT,
          latitude TEXT,
          longitude TEXT,
          map_url TEXT,
          contact_name TEXT,
          contact_phones TEXT,
          contact_telegrams TEXT,
          add_info TEXT,
          status INTEGER DEFAULT ${defaultStatusId},
          status_date DATE,
          last_contact_date DATE,
          working_hours TEXT,
          has_cable_connection INTEGER DEFAULT 0,
          rent_cost_kgs TEXT,
          rent_cost_usd TEXT,
          presentation_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (location_type_id) REFERENCES location_types(id),
          FOREIGN KEY (location_id) REFERENCES search_locations(id),
          FOREIGN KEY (status) REFERENCES location_statuses(id)
        )
      `);
      
      db.exec(`
        INSERT INTO terminals_new 
        SELECT id, id_terminal, location_id, object_name, location_type_id, address, city, latitude, longitude, 
               map_url, contact_name, contact_phones, contact_telegrams, add_info, 
               COALESCE(status_id, ${defaultStatusId}), NULL, last_contact_date, working_hours, 
               has_cable_connection, rent_cost_kgs, rent_cost_usd, presentation_url, 
               created_at, updated_at
        FROM terminals
      `);
      
      db.exec(`DROP TABLE terminals`);
      db.exec(`ALTER TABLE terminals_new RENAME TO terminals`);
      
      // Відновлюємо індекси
      db.exec(`CREATE INDEX IF NOT EXISTS idx_terminals_id_terminal ON terminals(id_terminal)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_terminals_location_type ON terminals(location_type_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_terminals_status ON terminals(status)`);
      
      console.log('✅ Міграція status для terminals завершена');
    }
  } catch (error: any) {
    if (!error.message.includes('duplicate column name') && !error.message.includes('no such table')) {
      console.warn('Попередження при міграції status для terminals:', error.message);
    }
  }

  // Після міграції статусів - оновлюємо всі локації на "searching", а ті що співпадають з терміналами - на "connected"
  try {
    const searchingStatus = db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('searching') as { id: number } | undefined;
    const connectedStatus = db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('connected') as { id: number } | undefined;
    
    if (searchingStatus && connectedStatus) {
      // Отримуємо адреси терміналів
      const terminals = db.prepare('SELECT address FROM terminals WHERE address IS NOT NULL AND address != ""').all() as { address: string }[];
      const terminalAddresses = new Set(terminals.map(t => t.address?.trim().toLowerCase()).filter(Boolean));
      
      // Отримуємо всі локації
      const locations = db.prepare('SELECT id, address FROM search_locations').all() as { id: number; address: string | null }[];
      
      const updateStatus = db.prepare('UPDATE search_locations SET status = ? WHERE id = ?');
      let updatedToSearching = 0;
      let updatedToConnected = 0;
      
      for (const location of locations) {
        const locationAddress = location.address?.trim().toLowerCase();
        
        if (locationAddress && terminalAddresses.has(locationAddress)) {
          // Адрес співпадає з терміналом - ставимо "connected"
          updateStatus.run(connectedStatus.id, location.id);
          updatedToConnected++;
        } else {
          // Інакше ставимо "searching"
          updateStatus.run(searchingStatus.id, location.id);
          updatedToSearching++;
        }
      }
      
      console.log(`✅ Оновлено статуси локацій: "В поиске" - ${updatedToSearching}, "Подключено" - ${updatedToConnected}`);
    }
  } catch (error: any) {
    console.warn('Попередження при оновленні статусів локацій:', error.message);
  }

  // Додаємо колонку status_date, якщо її немає
  try {
    db.exec(`ALTER TABLE search_locations ADD COLUMN status_date DATE`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('Попередження при додаванні status_date в search_locations:', error.message);
    }
  }

  try {
    db.exec(`ALTER TABLE terminals ADD COLUMN status_date DATE`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('Попередження при додаванні status_date в terminals:', error.message);
    }
  }

  console.log('✅ Міграції виконано успішно');
}

if (require.main === module) {
  runMigrations();
}
