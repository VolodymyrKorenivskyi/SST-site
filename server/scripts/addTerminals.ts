import { getDatabase, initDatabase } from '../database/connection';

function addTerminals() {
  try {
    initDatabase();
    const db = getDatabase();

    // Получаем типы локаций
    const locationTypes = db.prepare('SELECT * FROM location_types').all() as any[];
    const locationTypeMap: { [key: string]: number } = {};
    locationTypes.forEach((lt) => {
      locationTypeMap[lt.code.toLowerCase()] = lt.id;
    });

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
    
    // Подготовка запроса для вставки терминалов
    const insertTerminal = db.prepare(`
      INSERT INTO terminals (
        id_terminal, location_id, object_name, location_type_id, address,
        latitude, longitude, map_url,
        contact_name, contact_phones, contact_telegrams, status,
        last_contact_date, working_hours, has_cable_connection,
        rent_cost_kgs, rent_cost_usd, presentation_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Терминалы для добавления
    const terminals = [
      {
        idTerminal: 'T001',
        objectName: 'ТЦ Бишкек Парк',
        locationType: 'mall',
        address: 'ул. Киевская, 148'
      },
      {
        idTerminal: 'T002',
        objectName: 'Супермаркет Магнит',
        locationType: 'supermarket',
        address: 'ул. Сыдыкова 184'
      },
      {
        idTerminal: 'T003',
        objectName: 'Вкус Вилл+',
        locationType: 'supermarket',
        address: 'ул. Токомбаева 17/1'
      },
      {
        idTerminal: 'T004',
        objectName: 'магазин Lime+',
        locationType: 'shop',
        address: 'ул. Аалы Токомбаева 27/3а'
      },
      {
        idTerminal: 'T005',
        objectName: 'Beta Stores',
        locationType: 'shop',
        address: 'Проспект Чуй, 150а'
      },
      {
        idTerminal: 'T006',
        objectName: 'Супермаркет Анар',
        locationType: 'supermarket',
        address: 'ул. Тимирязева 118'
      }
    ];

    let added = 0;
    let skipped = 0;

    for (const terminal of terminals) {
      try {
        // Ищем соответствующую локацию
        const location = findLocation(terminal.objectName, terminal.address);
        
        // Если найдена локация, копируем все данные из неё
        // Иначе используем данные из терминала
        const locationId = location?.id || null;
        const locationTypeId = location?.location_type_id || locationTypeMap[terminal.locationType] || null;
        const address = location?.address || terminal.address || null;
        const latitude = location?.latitude || terminal.latitude || null;
        const longitude = location?.longitude || terminal.longitude || null;
        const mapUrl = location?.map_url || terminal.mapUrl || null;
        const contactName = location?.contact_name || null;
        const contactPhones = location?.contact_phones || null;
        const contactTelegrams = location?.contact_telegrams || null;
        const status = location?.status || 'active';
        const lastContactDate = location?.last_contact_date || null;
        const workingHours = location?.working_hours || null;
        const hasCableConnection = location?.has_cable_connection || 0;
        const rentCostKgs = location?.rent_cost_kgs || null;
        const rentCostUsd = location?.rent_cost_usd || null;
        const presentationUrl = location?.presentation_url || null;
        
        insertTerminal.run(
          terminal.idTerminal,
          locationId,
          terminal.objectName,
          locationTypeId,
          address,
          latitude,
          longitude,
          mapUrl,
          contactName,
          contactPhones,
          contactTelegrams,
          status,
          lastContactDate,
          workingHours,
          hasCableConnection,
          rentCostKgs,
          rentCostUsd,
          presentationUrl
        );
        added++;
        const locationInfo = location ? ` (данные скопированы из локации ID: ${location.id})` : '';
        console.log(`✅ Добавлен терминал: ${terminal.idTerminal} - ${terminal.objectName}${locationInfo}`);
      } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
          skipped++;
          console.log(`⏭️  Терминал ${terminal.idTerminal} уже существует, пропущен`);
        } else {
          console.error(`❌ Ошибка при добавлении терминала ${terminal.idTerminal}:`, error.message);
          throw error;
        }
      }
    }


    console.log(`\n✅ Готово! Добавлено: ${added}, Пропущено: ${skipped}`);
  } catch (error: any) {
    console.error('❌ Ошибка при добавлении терминалов:', error);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  addTerminals();
  process.exit(0);
}

export { addTerminals };
