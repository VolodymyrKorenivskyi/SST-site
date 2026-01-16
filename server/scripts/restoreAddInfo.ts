import { getDatabase, initDatabase } from '../database/connection';

async function restoreAddInfo() {
  try {
    initDatabase();
    const db = getDatabase();

    console.log('🔍 Проверяю состояние данных...\n');

    // Проверяем search_locations
    const locations = db.prepare('SELECT id, add_info, status FROM search_locations').all() as any[];
    console.log(`📊 Найдено локаций: ${locations.length}`);
    
    let locationsUpdated = 0;
    for (const loc of locations) {
      // Если add_info содержит только значение статуса (active, inactive, maintenance, planned), очищаем его
      if (loc.add_info && ['active', 'inactive', 'maintenance', 'planned'].includes(loc.add_info.trim())) {
        db.prepare('UPDATE search_locations SET add_info = NULL WHERE id = ?').run(loc.id);
        locationsUpdated++;
        console.log(`  ✅ Очищено add_info для локации ID: ${loc.id} (было значение статуса: "${loc.add_info}")`);
      } else if (!loc.add_info || loc.add_info.trim() === '') {
        // Если add_info пустое, оставляем как есть (пользователь может заполнить вручную)
        console.log(`  ⚠️  Локация ID: ${loc.id} имеет пустое add_info`);
      }
    }

    // Проверяем terminals
    const terminals = db.prepare('SELECT id, id_terminal, add_info, status FROM terminals').all() as any[];
    console.log(`\n📊 Найдено терминалов: ${terminals.length}`);
    
    let terminalsUpdated = 0;
    for (const term of terminals) {
      // Если add_info содержит только значение статуса (active, inactive, maintenance, planned), очищаем его
      if (term.add_info && ['active', 'inactive', 'maintenance', 'planned'].includes(term.add_info.trim())) {
        db.prepare('UPDATE terminals SET add_info = NULL WHERE id = ?').run(term.id);
        terminalsUpdated++;
        console.log(`  ✅ Очищено add_info для терминала ID: ${term.id} (${term.id_terminal}) (было значение статуса: "${term.add_info}")`);
      } else if (!term.add_info || term.add_info.trim() === '') {
        // Если add_info пустое, оставляем как есть (пользователь может заполнить вручную)
        console.log(`  ⚠️  Терминал ID: ${term.id} (${term.id_terminal}) имеет пустое add_info`);
      }
    }

    console.log(`\n✅ Готово! Обновлено локаций: ${locationsUpdated}, терминалов: ${terminalsUpdated}`);
    
    // Показываем статистику
    const allLocations = db.prepare('SELECT id, add_info FROM search_locations').all() as any[];
    const locationsWithInfo = allLocations.filter(loc => loc.add_info && loc.add_info.trim() !== '').length;
    
    const allTerminals = db.prepare('SELECT id, add_info FROM terminals').all() as any[];
    const terminalsWithInfo = allTerminals.filter(term => term.add_info && term.add_info.trim() !== '').length;
    
    console.log(`\n📈 Статистика:`);
    console.log(`   Локаций с add_info: ${locationsWithInfo} из ${locations.length}`);
    console.log(`   Терминалов с add_info: ${terminalsWithInfo} из ${terminals.length}`);
    
    // Показываем примеры записей с пустым add_info
    const emptyLocations = locations.filter(loc => !loc.add_info || loc.add_info.trim() === '');
    const emptyTerminals = terminals.filter(term => !term.add_info || term.add_info.trim() === '');
    
    if (emptyLocations.length > 0) {
      console.log(`\n⚠️  Локации с пустым add_info (${emptyLocations.length}):`);
      emptyLocations.slice(0, 5).forEach(loc => {
        console.log(`   ID: ${loc.id}, status: ${loc.status || 'N/A'}`);
      });
    }
    
    if (emptyTerminals.length > 0) {
      console.log(`\n⚠️  Терминалы с пустым add_info (${emptyTerminals.length}):`);
      emptyTerminals.slice(0, 5).forEach(term => {
        console.log(`   ID: ${term.id}, ${term.id_terminal}, status: ${term.status || 'N/A'}`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ Ошибка при восстановлении данных:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  restoreAddInfo();
  process.exit(0);
}

export { restoreAddInfo };
