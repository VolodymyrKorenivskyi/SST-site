import { getDatabase } from '../database/connection';

const db = getDatabase();

console.log('Проверка статусов в базе данных:\n');

// Проверяем статусы в справочнике
const statuses = db.prepare('SELECT id, code, name_ru FROM location_statuses').all() as any[];
console.log('Статусы в справочнике:');
statuses.forEach(s => console.log(`  ID: ${s.id}, Code: ${s.code}, Название: ${s.name_ru}`));

// Проверяем статусы локаций
const locations = db.prepare(`
  SELECT sl.id, sl.object_name, sl.address, sl.status, 
         ls.code as status_code, ls.name_ru as status_name
  FROM search_locations sl
  LEFT JOIN location_statuses ls ON sl.status = ls.id
  LIMIT 15
`).all() as any[];

console.log('\nЛокации (первые 15):');
locations.forEach(l => {
  console.log(`  ID: ${l.id}, Название: ${l.object_name}`);
  console.log(`    Адрес: ${l.address || 'нет'}`);
  console.log(`    Статус (raw): ${l.status}`);
  console.log(`    Статус (code): ${l.status_code || 'нет'}`);
  console.log(`    Статус (name): ${l.status_name || 'нет'}`);
  console.log('');
});

// Подсчитываем статусы
const statusCounts = db.prepare(`
  SELECT ls.code, ls.name_ru, COUNT(*) as count
  FROM search_locations sl
  LEFT JOIN location_statuses ls ON sl.status = ls.id
  GROUP BY ls.code, ls.name_ru
`).all() as any[];

console.log('Подсчет статусов:');
statusCounts.forEach(sc => {
  console.log(`  ${sc.name_ru} (${sc.code}): ${sc.count}`);
});
