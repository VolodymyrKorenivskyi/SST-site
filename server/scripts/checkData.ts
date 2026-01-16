import { getDatabase, initDatabase } from '../database/connection';

function checkData() {
  try {
    initDatabase();
    const db = getDatabase();

    console.log('🔍 Проверяю данные в базе...\n');

    // Проверяем terminals
    const terminals = db.prepare('SELECT id, id_terminal, add_info, status FROM terminals').all() as any[];
    console.log(`📊 Терминалы (${terminals.length}):`);
    terminals.forEach(term => {
      const addInfoValue = term.add_info || '(NULL)';
      const isStatusValue = ['active', 'inactive', 'maintenance', 'planned'].includes(addInfoValue);
      console.log(`   ID: ${term.id}, ${term.id_terminal}`);
      console.log(`      add_info: "${addInfoValue}" ${isStatusValue ? '⚠️ (это значение статуса!)' : ''}`);
      console.log(`      status: "${term.status || '(NULL)'}"`);
      console.log('');
    });

    // Проверяем search_locations
    const locations = db.prepare('SELECT id, object_name, add_info, status FROM search_locations LIMIT 10').all() as any[];
    console.log(`\n📊 Локации (первые 10 из всех):`);
    locations.forEach(loc => {
      const addInfoValue = loc.add_info || '(NULL)';
      const isStatusValue = ['active', 'inactive', 'maintenance', 'planned'].includes(addInfoValue);
      console.log(`   ID: ${loc.id}, ${loc.object_name}`);
      console.log(`      add_info: "${addInfoValue}" ${isStatusValue ? '⚠️ (это значение статуса!)' : ''}`);
      console.log(`      status: "${loc.status || '(NULL)'}"`);
      console.log('');
    });

    // Подсчитываем записи с неправильными значениями
    const terminalsWithStatus = db.prepare(`
      SELECT COUNT(*) as count 
      FROM terminals 
      WHERE add_info IN ('active', 'inactive', 'maintenance', 'planned')
    `).get() as { count: number };
    
    const locationsWithStatus = db.prepare(`
      SELECT COUNT(*) as count 
      FROM search_locations 
      WHERE add_info IN ('active', 'inactive', 'maintenance', 'planned')
    `).get() as { count: number };

    console.log(`\n📈 Статистика:`);
    console.log(`   Терминалов с неправильным add_info: ${terminalsWithStatus.count}`);
    console.log(`   Локаций с неправильным add_info: ${locationsWithStatus.count}`);

  } catch (error: any) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  checkData();
  process.exit(0);
}

export { checkData };
