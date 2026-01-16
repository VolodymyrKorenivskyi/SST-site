import { getDatabase } from '../database/connection';

const db = getDatabase();

console.log('Проверка статусов в таблице search_locations:\n');

// Проверяем несколько локаций
const locations = db.prepare(`
  SELECT id, object_name, address, status 
  FROM search_locations 
  ORDER BY id 
  LIMIT 10
`).all() as any[];

console.log('Первые 10 локаций:');
locations.forEach(l => {
  console.log(`  ID: ${l.id}, Название: ${l.object_name}`);
  console.log(`    Адрес: ${l.address || 'нет'}`);
  console.log(`    Статус (значение в БД): ${l.status} (тип: ${typeof l.status})`);
  console.log('');
});

// Проверяем JOIN со справочником
const locationsWithStatus = db.prepare(`
  SELECT sl.id, sl.object_name, sl.status, 
         ls.id as status_id, ls.code as status_code, ls.name_ru as status_name
  FROM search_locations sl
  LEFT JOIN location_statuses ls ON (sl.status = ls.id OR ls.code = sl.status)
  ORDER BY sl.id 
  LIMIT 10
`).all() as any[];

console.log('Локации с JOIN к справочнику статусов:');
locationsWithStatus.forEach(l => {
  console.log(`  ID: ${l.id}, Название: ${l.object_name}`);
  console.log(`    Статус в БД: ${l.status}`);
  console.log(`    Статус ID: ${l.status_id || 'нет'}`);
  console.log(`    Статус Code: ${l.status_code || 'нет'}`);
  console.log(`    Статус Name: ${l.status_name || 'нет'}`);
  console.log('');
});

// Подсчитываем статусы
const statusCounts = db.prepare(`
  SELECT sl.status, COUNT(*) as count
  FROM search_locations sl
  GROUP BY sl.status
`).all() as any[];

console.log('Подсчет статусов в таблице:');
statusCounts.forEach(sc => {
  console.log(`  Статус "${sc.status}": ${sc.count} локаций`);
});
