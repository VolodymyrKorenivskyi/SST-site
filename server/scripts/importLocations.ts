import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabase } from '../database/connection';

const db = getDatabase();

interface LocationRow {
  '№'?: number | string;
  'Среда размещения (магазин, офис, супермаркет и т.п.)'?: string;
  'Адрес'?: string;
  'Широта'?: string;
  'Долгота'?: string;
  'Ссылка на карту'?: string;
  'ФИО контактного лица'?: string;
  'Номер телефона'?: string;
  'Телеграмы'?: string;
  'Текущий статус'?: string;
  'Дата последнего контакта'?: string;
  'Время работы'?: string;
  'Есть ли связь по кабелю'?: string;
  'Стоимость аренды, СОМ'?: string;
  'Стоимость аренды, USD'?: string;
  'Ссылка на презентацию'?: string;
  [key: string]: any; // Для других колонок
}

function importLocations() {
  try {
    // Шлях до Excel файлу
    const excelPath = path.join(process.cwd(), 'Поиск локаций.xlsx');
    
    if (!fs.existsSync(excelPath)) {
      console.error('❌ Файл "Поиск локаций.xlsx" не найден в корневой директории проекта');
      process.exit(1);
    }

    console.log('📖 Чтение Excel файла:', excelPath);
    
    // Читаем Excel файл
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0]; // Берем первый лист
    const worksheet = workbook.Sheets[sheetName];
    
    // Конвертируем в JSON
    const rows = XLSX.utils.sheet_to_json<LocationRow>(worksheet);
    
    console.log(`📊 Найдено ${rows.length} строк в Excel файле`);
    
    // Очищаем существующие данные перед импортом
    const deleteCount = db.prepare('DELETE FROM search_locations').run();
    console.log(`🗑️ Удалено существующих записей: ${deleteCount.changes}`);
    
    // Получаем mapping для location_types
    const locationTypes = db.prepare('SELECT id, code, name_ru FROM location_types').all() as any[];
    const locationTypeMap: { [key: string]: number } = {};
    locationTypes.forEach((lt) => {
      locationTypeMap[lt.name_ru.toLowerCase()] = lt.id;
      locationTypeMap[lt.code.toLowerCase()] = lt.id;
    });
    
    // Функция для определения типа локации по названию объекта
    const detectLocationType = (objectName: string): number | null => {
      const lowerName = objectName.toLowerCase().trim();
      
      // Проверяем наличие ключевых слов (в порядке приоритета)
      // Торговый центр (включая сокращение ТЦ)
      if (lowerName.includes('торговый центр') || lowerName.includes('торговий центр') || 
          lowerName.startsWith('тц ') || lowerName.match(/^тц\s/) || lowerName.includes('mall')) {
        return locationTypeMap['mall'] || locationTypeMap['торговый центр'] || null;
      }
      // Супермаркет
      if (lowerName.includes('супермаркет') || lowerName.includes('supermarket')) {
        return locationTypeMap['supermarket'] || locationTypeMap['супермаркет'] || null;
      }
      // Магазин
      if (lowerName.includes('магазин') || lowerName.includes('shop')) {
        return locationTypeMap['shop'] || locationTypeMap['магазин'] || null;
      }
      // Банк
      if (lowerName.includes('банк') || lowerName.includes('bank')) {
        return locationTypeMap['bank'] || locationTypeMap['банк'] || null;
      }
      // Офис
      if (lowerName.includes('офис') || lowerName.includes('office')) {
        return locationTypeMap['office'] || locationTypeMap['офис'] || null;
      }
      
      return null;
    };
    
    // Подготовка запроса для вставки
    const insertLocation = db.prepare(`
      INSERT INTO search_locations (
        terminal_number, object_name, location_type_id, address, latitude, longitude, map_url,
        contact_name, contact_phones, contact_telegrams, status,
        last_contact_date, working_hours, has_cable_connection,
        rent_cost_kgs, rent_cost_usd, presentation_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const transaction = db.transaction(() => {
      let imported = 0;
      let skipped = 0;
      
      for (const row of rows) {
        try {
          // Название объекта берется из колонки "Среда размещения (магазин, офис, супермаркет и т.п.)"
          const objectName = row['Среда размещения (магазин, офис, супермаркет и т.п.)']?.toString().trim() || '';
          
          if (!objectName) {
            console.log('⚠️ Пропущена строка без названия объекта:', JSON.stringify(row));
            skipped++;
            continue;
          }
          
          // Определяем тип локации из контекста названия объекта
          const locationTypeId = detectLocationType(objectName);
          
          const address = row['Адрес']?.toString().trim() || null;
          const contactPhones = row['Номер телефона']?.toString().trim() || '';
          const contactTelegrams = row['Телеграмы']?.toString().trim() || '';
          
          const hasCableConnection = row['Есть ли связь по кабелю']?.toString().trim().toLowerCase();
          const hasCable = hasCableConnection === 'да' || hasCableConnection === 'yes' || hasCableConnection === '1';
          
          const lastContactDate = row['Дата последнего контакта']?.toString().trim() || null;
          
          // Номер терминала - порядковый номер (индекс + 1)
          const terminalNumber = String(imported + 1);
          
          insertLocation.run(
            terminalNumber,
            objectName,
            locationTypeId,
            address,
            row['Широта']?.toString().trim() || null,
            row['Долгота']?.toString().trim() || null,
            row['Ссылка на карту']?.toString().trim() || null,
            row['ФИО контактного лица']?.toString().trim() || null,
            contactPhones ? JSON.stringify([contactPhones]) : null,
            contactTelegrams ? JSON.stringify([contactTelegrams]) : null,
            row['Текущий статус']?.toString().trim() || 'active',
            lastContactDate || null,
            row['Время работы']?.toString().trim() || null,
            hasCable ? 1 : 0,
            row['Стоимость аренды, СОМ']?.toString().trim() || null,
            row['Стоимость аренды, USD']?.toString().trim() || null,
            row['Ссылка на презентацию']?.toString().trim() || null
          );
          
          imported++;
        } catch (error: any) {
          console.error(`❌ Ошибка импорта строки:`, error.message);
          skipped++;
        }
      }
      
      return { imported, skipped };
    });
    
    const result = transaction();
    
    console.log(`✅ Импорт завершен:`);
    console.log(`   - Импортировано: ${result.imported}`);
    console.log(`   - Пропущено: ${result.skipped}`);
    
  } catch (error: any) {
    console.error('❌ Ошибка импорта:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  importLocations();
}
