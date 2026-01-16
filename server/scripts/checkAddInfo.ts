import { getDatabase, initDatabase } from '../database/connection';

function checkAddInfo() {
  try {
    initDatabase();
    const db = getDatabase();

    console.log('🔍 Проверяю содержимое add_info...\n');

    // Проверяем search_locations
    const locations = db.prepare('SELECT id, object_name, add_info, status FROM search_locations LIMIT 10').all() as any[];
    console.log(`📊 Примеры локаций (первые 10):`);
    locations.forEach(loc => {
      console.log(`   ID: ${loc.id}, Объект: ${loc.object_name}`);
      console.log(`      add_info: "${loc.add_info || '(пусто)'}"`);
      console.log(`      status: "${loc.status || '(пусто)'}"`);
      console.log('');
    });

    // Проверяем terminals
    const terminals = db.prepare('SELECT id, id_terminal, object_name, add_info, status FROM terminals LIMIT 10').all() as any[];
    console.log(`📊 Примеры терминалов (первые 10):`);
    terminals.forEach(term => {
      console.log(`   ID: ${term.id}, ID терминала: ${term.id_terminal}, Объект: ${term.object_name}`);
      console.log(`      add_info: "${term.add_info || '(пусто)'}"`);
      console.log(`      status: "${term.status || '(пусто)'}"`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  checkAddInfo();
  process.exit(0);
}

export { checkAddInfo };
