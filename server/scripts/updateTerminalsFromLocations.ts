import { getDatabase, initDatabase } from '../database/connection';

function updateTerminalsFromLocations() {
  try {
    initDatabase();
    const db = getDatabase();

    // Получаем все терминалы
    const terminals = db.prepare('SELECT * FROM terminals').all() as any[];
    
    // Функция для поиска локации по названию объекта или адресу
    const findLocation = (objectName: string, address: string): any => {
      // Сначала пытаемся найти по точному совпадению названия объекта
      let location = db.prepare('SELECT * FROM search_locations WHERE object_name = ? LIMIT 1').get(objectName) as any;
      
      // Если не найдено, пытаемся найти по частичному совпадению названия
      if (!location) {
        const locations = db.prepare('SELECT * FROM search_locations WHERE object_name LIKE ? LIMIT 1').all(`%${objectName}%`) as any[];
        if (locations.length > 0) {
          location = locations[0];
        }
      }
      
      // Если все еще не найдено, пытаемся найти по адресу
      if (!location && address) {
        location = db.prepare('SELECT * FROM search_locations WHERE address LIKE ? LIMIT 1').get(`%${address}%`) as any;
      }
      
      return location || null;
    };

    // Подготовка запроса для обновления терминалов
    const updateTerminal = db.prepare(`
      UPDATE terminals SET
        location_id = ?,
        location_type_id = ?,
        address = ?,
        latitude = ?,
        longitude = ?,
        map_url = ?,
        contact_name = ?,
        contact_phones = ?,
        contact_telegrams = ?,
        status = ?,
        last_contact_date = ?,
        working_hours = ?,
        has_cable_connection = ?,
        rent_cost_kgs = ?,
        rent_cost_usd = ?,
        presentation_url = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    let updated = 0;
    let skipped = 0;

    for (const terminal of terminals) {
      try {
        // Ищем соответствующую локацию
        const location = findLocation(terminal.object_name, terminal.address);
        
        if (location) {
          // Копируем все данные из локации
          updateTerminal.run(
            location.id,
            location.location_type_id,
            location.address,
            location.latitude,
            location.longitude,
            location.map_url,
            location.contact_name,
            location.contact_phones,
            location.contact_telegrams,
            location.status || 'active',
            location.last_contact_date,
            location.working_hours,
            location.has_cable_connection || 0,
            location.rent_cost_kgs,
            location.rent_cost_usd,
            location.presentation_url,
            terminal.id
          );
          updated++;
          console.log(`✅ Обновлен терминал: ${terminal.id_terminal} - ${terminal.object_name} (данные из локации ID: ${location.id})`);
        } else {
          skipped++;
          console.log(`⏭️  Локация не найдена для терминала: ${terminal.id_terminal} - ${terminal.object_name}`);
        }
      } catch (error: any) {
        console.error(`❌ Ошибка при обновлении терминала ${terminal.id_terminal}:`, error.message);
      }
    }

    console.log(`\n✅ Готово! Обновлено: ${updated}, Пропущено: ${skipped}`);
  } catch (error: any) {
    console.error('❌ Ошибка при обновлении терминалов:', error);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  updateTerminalsFromLocations();
  process.exit(0);
}

export { updateTerminalsFromLocations };
