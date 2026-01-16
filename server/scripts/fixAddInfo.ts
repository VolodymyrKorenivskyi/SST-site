import { getDatabase, initDatabase } from '../database/connection';

function fixAddInfo() {
  try {
    initDatabase();
    const db = getDatabase();

    console.log('🔍 Очищаю add_info от значений статуса...\n');

    // Очищаем search_locations
    const locationsResult = db.prepare(`
      UPDATE search_locations 
      SET add_info = NULL 
      WHERE add_info IN ('active', 'inactive', 'maintenance', 'planned')
    `).run();
    
    console.log(`✅ Очищено add_info для ${locationsResult.changes} локаций`);

    // Очищаем terminals
    const terminalsResult = db.prepare(`
      UPDATE terminals 
      SET add_info = NULL 
      WHERE add_info IN ('active', 'inactive', 'maintenance', 'planned')
    `).run();
    
    console.log(`✅ Очищено add_info для ${terminalsResult.changes} терминалов`);

    console.log(`\n✅ Готово! Всего очищено: ${locationsResult.changes + terminalsResult.changes} записей`);
    
  } catch (error: any) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixAddInfo();
  process.exit(0);
}

export { fixAddInfo };
