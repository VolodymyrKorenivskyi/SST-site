import { getDatabase } from '../database/connection';

function updateLocationStatuses() {
  const db = getDatabase();

  try {
    // Получаем id статусов
    const searchingStatus = db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('searching') as { id: number } | undefined;
    const connectedStatus = db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('connected') as { id: number } | undefined;

    if (!searchingStatus || !connectedStatus) {
      console.error('❌ Статусы не найдены в справочнике');
      return;
    }

    console.log(`📊 Найден статус "В поиске" с id: ${searchingStatus.id}`);
    console.log(`📊 Найден статус "Подключено" с id: ${connectedStatus.id}`);

    // Проверяем структуру таблицы search_locations
    const tableInfo = db.prepare("PRAGMA table_info(search_locations)").all() as any[];
    const hasAddress = tableInfo.some((col: any) => col.name === 'address');
    const statusColumn = tableInfo.find((col: any) => col.name === 'status');
    
    if (!statusColumn) {
      console.error('❌ Колонка status не найдена в таблице search_locations');
      return;
    }
    
    console.log(`📊 Тип колонки status: ${statusColumn.type}`);
    
    // Проверяем структуру таблицы terminals
    const terminalsTableInfo = db.prepare("PRAGMA table_info(terminals)").all() as any[];
    const terminalsHasAddress = terminalsTableInfo.some((col: any) => col.name === 'address');
    
    // Получаем все терминалы с их адресами
    let terminals: { address?: string }[] = [];
    if (terminalsHasAddress) {
      try {
        terminals = db.prepare('SELECT address FROM terminals WHERE address IS NOT NULL AND address != \'\'').all() as { address: string }[];
      } catch (error: any) {
        console.warn('⚠️  Ошибка при получении терминалов:', error.message);
        terminals = [];
      }
    }
    const terminalAddresses = new Set(terminals.map(t => (t.address || '').trim().toLowerCase()).filter(Boolean));
    
    console.log(`📋 Найдено ${terminals.length} терминалов с адресами`);
    console.log(`📋 Уникальных адресов терминалов: ${terminalAddresses.size}`);

    type LocationRow = { id: number; address?: string | null };

    // Получаем все локации
    const locations: LocationRow[] = hasAddress
      ? (db.prepare('SELECT id, address FROM search_locations').all() as { id: number; address: string | null }[])
      : (db.prepare('SELECT id FROM search_locations').all() as { id: number }[]);
    console.log(`📋 Найдено ${locations.length} локаций`);

    let updatedToSearching = 0;
    let updatedToConnected = 0;

    // Обновляем статусы
    // Если status еще TEXT, используем код, иначе id
    const isTextStatus = statusColumn.type.toUpperCase() === 'TEXT';
    
    // Проверяем, что таблица существует
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='search_locations'").get();
    if (!tableExists) {
      console.error('❌ Таблица search_locations не найдена');
      return;
    }
    
    const updateStatus = db.prepare('UPDATE search_locations SET status = ? WHERE id = ?');
    
    for (const location of locations) {
      const locationAddress = hasAddress ? (location.address ?? '').trim().toLowerCase() : null;
      
      if (locationAddress && terminalAddresses.has(locationAddress)) {
        // Адрес совпадает с терминалом - ставим "Подключено"
        const statusValue = isTextStatus ? 'connected' : connectedStatus.id;
        updateStatus.run(statusValue, location.id);
        updatedToConnected++;
        if (hasAddress) {
          console.log(`✅ Локация ${location.id} (${location.address ?? ''}) -> "Подключено"`);
        } else {
          console.log(`✅ Локация ${location.id} -> "Подключено"`);
        }
      } else {
        // Иначе ставим "В поиске"
        const statusValue = isTextStatus ? 'searching' : searchingStatus.id;
        updateStatus.run(statusValue, location.id);
        updatedToSearching++;
      }
    }

    console.log(`\n✅ Обновление завершено:`);
    console.log(`   - Установлено "В поиске": ${updatedToSearching}`);
    console.log(`   - Установлено "Подключено": ${updatedToConnected}`);
    console.log(`   - Всего обновлено: ${updatedToSearching + updatedToConnected}`);

  } catch (error: any) {
    console.error('❌ Ошибка при обновлении статусов:', error.message);
    throw error;
  }
}

if (require.main === module) {
  updateLocationStatuses();
}

export { updateLocationStatuses };
