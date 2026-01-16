import express, { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDatabase } from '../database/connection';
import { errorHandler } from '../middleware/errorHandler';
import { EmailService } from '../services/EmailService';

const router = express.Router();
const db = getDatabase();

/**
 * GET /api/terminals/location-types
 * Отримання списку типів серед розміщення
 */
router.get('/location-types', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const locationTypes = db.prepare('SELECT * FROM location_types ORDER BY id').all() as any[];

    res.json({
      success: true,
      data: {
        locationTypes: locationTypes.map((lt) => ({
          id: lt.id,
          code: lt.code,
          nameRu: lt.name_ru,
          nameEn: lt.name_en,
          nameKy: lt.name_ky,
        })),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/terminals/location-statuses
 * Отримання списку статусов локаций
 */
router.get('/location-statuses', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const locationStatuses = db.prepare('SELECT * FROM location_statuses ORDER BY id').all() as any[];

    res.json({
      success: true,
      data: {
        locationStatuses: locationStatuses.map((ls) => ({
          id: ls.id,
          code: ls.code,
          nameRu: ls.name_ru,
          nameEn: ls.name_en,
          nameKy: ls.name_ky,
          descriptionRu: ls.description_ru,
          descriptionEn: ls.description_en,
          descriptionKy: ls.description_ky,
        })),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/terminals
 * Отримання списку терміналів
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const terminals = db.prepare(`
      SELECT 
        t.*,
        lt.code as location_type_code,
        lt.name_ru as location_type_name_ru,
        lt.name_en as location_type_name_en,
        lt.name_ky as location_type_name_ky,
        ls.code as status_code,
        ls.name_ru as status_name_ru,
        ls.name_en as status_name_en,
        ls.name_ky as status_name_ky,
        ls.description_ru as status_description_ru,
        ls.description_en as status_description_en,
        ls.description_ky as status_description_ky
      FROM terminals t
      LEFT JOIN location_types lt ON t.location_type_id = lt.id
      LEFT JOIN location_statuses ls ON t.status = ls.id
      ORDER BY t.id_terminal ASC, t.created_at DESC
    `).all() as any[];

    res.json({
      success: true,
      data: {
        terminals: terminals.map((term) => ({
          id: term.id,
          idTerminal: term.id_terminal,
          locationId: term.location_id,
          objectName: term.object_name,
          locationTypeId: term.location_type_id,
          locationType: term.location_type_id ? {
            id: term.location_type_id,
            code: term.location_type_code,
            nameRu: term.location_type_name_ru,
            nameEn: term.location_type_name_en,
            nameKy: term.location_type_name_ky,
          } : null,
          address: term.address,
          city: term.city,
          latitude: term.latitude,
          longitude: term.longitude,
          mapUrl: term.map_url,
          contactName: term.contact_name,
          contactPhones: term.contact_phones ? JSON.parse(term.contact_phones) : [],
          contactTelegrams: term.contact_telegrams ? JSON.parse(term.contact_telegrams) : [],
          addInfo: term.add_info,
          status: term.status ? {
            id: term.status,
            code: term.status_code,
            nameRu: term.status_name_ru,
            nameEn: term.status_name_en,
            nameKy: term.status_name_ky,
            descriptionRu: term.status_description_ru,
            descriptionEn: term.status_description_en,
            descriptionKy: term.status_description_ky,
          } : null,
          statusDate: term.status_date,
          lastContactDate: term.last_contact_date,
          workingHours: term.working_hours,
          hasCableConnection: !!term.has_cable_connection,
          rentCostKGS: term.rent_cost_kgs,
          rentCostUSD: term.rent_cost_usd,
          presentationUrl: term.presentation_url,
          createdAt: term.created_at,
          updatedAt: term.updated_at,
        })),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/terminals/collection-request
 * Отправка email-запроса по кнопке "$" (инкассация/связаться)
 */
router.post('/collection-request', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { terminalId } = req.body as { terminalId?: number };
    if (!terminalId || typeof terminalId !== 'number') {
      return res.status(400).json({
        success: false,
        error: { message: 'terminalId is required' },
      });
    }

    const formatDateTime = (date: Date) => {
      try {
        // Формат: dd.mm.yyyy hh:mm (как в примере), таймзона Бишкек
        return date.toLocaleString('ru-RU', {
          timeZone: 'Asia/Bishkek',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      } catch {
        return date.toISOString();
      }
    };

    const terminal = db
      .prepare(
        `
        SELECT
          id, id_terminal, object_name, address, city, map_url,
          contact_name, contact_phones, contact_telegrams,
          working_hours
        FROM terminals
        WHERE id = ?
      `
      )
      .get(terminalId) as
      | {
          id: number;
          id_terminal: string;
          object_name: string;
          address: string | null;
          city: string | null;
          map_url: string | null;
          contact_name: string | null;
          contact_phones: string | null;
          contact_telegrams: string | null;
          working_hours: string | null;
        }
      | undefined;

    if (!terminal) {
      return res.status(404).json({
        success: false,
        error: { message: 'Terminal not found' },
      });
    }

    // Берем email получателя из настроек (если нет — fallback)
    const emailSetting = db
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .get('collection_request_email') as { value: string } | undefined;
    const to = emailSetting?.value || 'vlad1204@gmail.com';

    const phones = terminal.contact_phones ? JSON.parse(terminal.contact_phones) : [];
    const tgs = terminal.contact_telegrams ? JSON.parse(terminal.contact_telegrams) : [];

    const requesterId = (req as any).userId ?? (req as any).user_id ?? null;
    const requester =
      typeof requesterId === 'number'
        ? (db
            .prepare('SELECT first_name, last_name, phone, email FROM users WHERE id = ?')
            .get(requesterId) as { first_name: string | null; last_name: string | null; phone: string | null; email: string | null } | undefined)
        : undefined;

    const initiatorName =
      requester && (requester.first_name || requester.last_name)
        ? `${requester.first_name || ''} ${requester.last_name || ''}`.trim()
        : '-';
    const initiatorContact = (requester?.phone || requester?.email || '-') as string;

    const subject = `Заявка на инкассацию: терминал ${terminal.id_terminal}`;

    const contactAtPointParts = [
      terminal.contact_name ? terminal.contact_name.trim() : '',
      Array.isArray(phones) && phones.length ? phones.join(', ') : '',
      Array.isArray(tgs) && tgs.length ? `TG: ${tgs.join(', ')}` : '',
    ].filter(Boolean);
    const contactAtPoint = contactAtPointParts.length ? contactAtPointParts.join(', ') : '-';

    const row = (label: string, value: string) =>
      `<tr>
         <td style="padding:6px 10px; border:1px solid #d9d9d9; font-weight:700; white-space:nowrap;">${label}</td>
         <td style="padding:6px 10px; border:1px solid #d9d9d9;">${value || '-'}</td>
       </tr>`;

    const html = `
      <div style="font-family: Arial, sans-serif; color:#000;">
        <table style="border-collapse:collapse; width:100%; max-width:900px;">
          ${row('Терминал', terminal.id_terminal)}
          ${row('Город', terminal.city || '-')}
          ${row('Адрес установки', terminal.address || '-')}
          ${row('Объект', terminal.object_name || '-')}
          ${row('Контакт на точке', contactAtPoint)}
          ${row('Причина инкассации', 'Плановая')}
          ${row('Доступ для инкассации:', terminal.working_hours || '-')}
          ${row('Инициатор заявки:', initiatorName)}
          ${row('Контакт', initiatorContact)}
          ${row('Дата и время заявки', formatDateTime(new Date()))}
        </table>
      </div>
    `;

    try {
      await EmailService.sendEmail({ to, subject, html });
      res.json({ success: true, message: 'Email отправлен' });
    } catch (error: any) {
      const isAuthError =
        error.code === 'EAUTH' ||
        error.code === 'ECONNECTION' ||
        error.message === 'SMTP_NOT_CONFIGURED' ||
        error.message?.includes('SMTP_NOT_CONFIGURED');

      const isDevMode = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      if (isAuthError || isDevMode) {
        return res.json({
          success: true,
          message: 'Email не отправлен (SMTP не настроен)',
          fallbackUsed: true,
        });
      }

      throw error;
    }
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/terminals/search-locations
 * Отримання списку локацій
 */
router.get('/search-locations', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const locations = db.prepare(`
      SELECT 
        sl.*,
        lt.code as location_type_code,
        lt.name_ru as location_type_name_ru,
        lt.name_en as location_type_name_en,
        lt.name_ky as location_type_name_ky,
        ls.id as status_id,
        ls.code as status_code,
        ls.name_ru as status_name_ru,
        ls.name_en as status_name_en,
        ls.name_ky as status_name_ky,
        ls.description_ru as status_description_ru,
        ls.description_en as status_description_en,
        ls.description_ky as status_description_ky
      FROM search_locations sl
      LEFT JOIN location_types lt ON sl.location_type_id = lt.id
      LEFT JOIN location_statuses ls ON (sl.status = ls.id OR ls.code = sl.status)
      ORDER BY CAST(sl.terminal_number AS INTEGER) ASC, sl.created_at DESC
    `).all() as any[];

    res.json({
      success: true,
      data: {
        locations: locations.map((loc) => ({
          id: loc.id,
          terminalNumber: loc.terminal_number,
          objectName: loc.object_name,
          locationTypeId: loc.location_type_id,
          locationType: loc.location_type_id ? {
            id: loc.location_type_id,
            code: loc.location_type_code,
            nameRu: loc.location_type_name_ru,
            nameEn: loc.location_type_name_en,
            nameKy: loc.location_type_name_ky,
          } : null,
          address: loc.address,
          city: loc.city,
          latitude: loc.latitude,
          longitude: loc.longitude,
          mapUrl: loc.map_url,
          contactName: loc.contact_name,
          contactPhones: loc.contact_phones ? JSON.parse(loc.contact_phones) : [],
          contactTelegrams: loc.contact_telegrams ? JSON.parse(loc.contact_telegrams) : [],
          addInfo: loc.add_info,
          status: (loc.status_code || loc.status) ? {
            id: loc.status_id || (typeof loc.status === 'number' ? loc.status : null),
            code: loc.status_code || loc.status,
            nameRu: loc.status_name_ru || '',
            nameEn: loc.status_name_en || '',
            nameKy: loc.status_name_ky || '',
            descriptionRu: loc.status_description_ru || '',
            descriptionEn: loc.status_description_en || '',
            descriptionKy: loc.status_description_ky || '',
          } : null,
          statusDate: loc.status_date,
          lastContactDate: loc.last_contact_date,
          workingHours: loc.working_hours,
          hasCableConnection: !!loc.has_cable_connection,
          rentCostKGS: loc.rent_cost_kgs,
          rentCostUSD: loc.rent_cost_usd,
          presentationUrl: loc.presentation_url,
          createdAt: loc.created_at,
          updatedAt: loc.updated_at,
        })),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/terminals/search-locations/:id
 * Отримання локації по ID
 */
router.get('/search-locations/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const location = db.prepare(`
      SELECT 
        sl.*,
        lt.code as location_type_code,
        lt.name_ru as location_type_name_ru,
        lt.name_en as location_type_name_en,
        lt.name_ky as location_type_name_ky,
        ls.id as status_id,
        ls.code as status_code,
        ls.name_ru as status_name_ru,
        ls.name_en as status_name_en,
        ls.name_ky as status_name_ky,
        ls.description_ru as status_description_ru,
        ls.description_en as status_description_en,
        ls.description_ky as status_description_ky
      FROM search_locations sl
      LEFT JOIN location_types lt ON sl.location_type_id = lt.id
      LEFT JOIN location_statuses ls ON (sl.status = ls.id OR ls.code = sl.status)
      WHERE sl.id = ?
    `).get(id) as any;

    if (!location) {
      return res.status(404).json({
        success: false,
        error: { code: 'LOCATION_NOT_FOUND', message: 'Локация не найдена' },
      });
    }

    res.json({
      success: true,
      data: {
        location: {
          id: location.id,
          terminalNumber: location.terminal_number,
          objectName: location.object_name,
          locationTypeId: location.location_type_id,
          locationType: location.location_type_id ? {
            id: location.location_type_id,
            code: location.location_type_code,
            nameRu: location.location_type_name_ru,
            nameEn: location.location_type_name_en,
            nameKy: location.location_type_name_ky,
          } : null,
          address: location.address,
          city: location.city,
          latitude: location.latitude,
          longitude: location.longitude,
          mapUrl: location.map_url,
          contactName: location.contact_name,
          contactPhones: location.contact_phones ? JSON.parse(location.contact_phones) : [],
          contactTelegrams: location.contact_telegrams ? JSON.parse(location.contact_telegrams) : [],
          addInfo: location.add_info,
          status: (location.status_code || location.status) ? {
            id: location.status_id || (typeof location.status === 'number' ? location.status : null),
            code: location.status_code || location.status,
            nameRu: location.status_name_ru || '',
            nameEn: location.status_name_en || '',
            nameKy: location.status_name_ky || '',
            descriptionRu: location.status_description_ru || '',
            descriptionEn: location.status_description_en || '',
            descriptionKy: location.status_description_ky || '',
          } : null,
          lastContactDate: location.last_contact_date,
          workingHours: location.working_hours,
          hasCableConnection: !!location.has_cable_connection,
          rentCostKGS: location.rent_cost_kgs,
          rentCostUSD: location.rent_cost_usd,
          presentationUrl: location.presentation_url,
          createdAt: location.created_at,
          updatedAt: location.updated_at,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/terminals/search-locations
 * Створення нової локації
 */
router.post('/search-locations', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      objectName,
      locationTypeId,
      address,
      city,
      latitude,
      longitude,
      mapUrl,
      contactName,
      contactPhones,
      contactTelegrams,
      addInfo,
      status,
      statusDate,
      lastContactDate,
      workingHours,
      hasCableConnection,
      rentCostKGS,
      rentCostUSD,
      presentationUrl,
    } = req.body;

    if (!objectName) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Название объекта обязательно' },
      });
    }

    const result = db.prepare(`
      INSERT INTO search_locations (
        object_name, location_type_id, address, city, latitude, longitude, map_url,
        contact_name, contact_phones, contact_telegrams, add_info, status, status_date,
        last_contact_date, working_hours, has_cable_connection,
        rent_cost_kgs, rent_cost_usd, presentation_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      objectName,
      locationTypeId || null,
      address || null,
      city || 'Бишкек',
      latitude || null,
      longitude || null,
      mapUrl || null,
      contactName || null,
      contactPhones && Array.isArray(contactPhones) ? JSON.stringify(contactPhones) : null,
      contactTelegrams && Array.isArray(contactTelegrams) ? JSON.stringify(contactTelegrams) : null,
      addInfo || null,
      status || (db.prepare('SELECT id FROM location_statuses WHERE code = ?').get('active') as { id: number } | undefined)?.id || 1,
      statusDate || null,
      lastContactDate || null,
      workingHours || null,
      hasCableConnection ? 1 : 0,
      rentCostKGS || null,
      rentCostUSD || null,
      presentationUrl || null
    );

    const locationId = result.lastInsertRowid as number;

    res.json({
      success: true,
      data: { id: locationId },
      message: 'Локация создана',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * PATCH /api/terminals/search-locations/:id
 * Оновлення локації
 */
router.patch('/search-locations/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const {
      objectName,
      locationTypeId,
      address,
      city,
      latitude,
      longitude,
      mapUrl,
      contactName,
      contactPhones,
      contactTelegrams,
      addInfo,
      status,
      statusDate,
      lastContactDate,
      workingHours,
      hasCableConnection,
      rentCostKGS,
      rentCostUSD,
      presentationUrl,
    } = req.body;

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (objectName !== undefined) {
      updateFields.push('object_name = ?');
      updateValues.push(objectName);
    }
    if (locationTypeId !== undefined) {
      updateFields.push('location_type_id = ?');
      updateValues.push(locationTypeId || null);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address || null);
    }
    if (city !== undefined) {
      updateFields.push('city = ?');
      updateValues.push(city || null);
    }
    if (latitude !== undefined) {
      updateFields.push('latitude = ?');
      updateValues.push(latitude || null);
    }
    if (longitude !== undefined) {
      updateFields.push('longitude = ?');
      updateValues.push(longitude || null);
    }
    if (mapUrl !== undefined) {
      updateFields.push('map_url = ?');
      updateValues.push(mapUrl || null);
    }
    if (contactName !== undefined) {
      updateFields.push('contact_name = ?');
      updateValues.push(contactName || null);
    }
    if (contactPhones !== undefined) {
      updateFields.push('contact_phones = ?');
      updateValues.push(contactPhones && Array.isArray(contactPhones) ? JSON.stringify(contactPhones) : null);
    }
    if (contactTelegrams !== undefined) {
      updateFields.push('contact_telegrams = ?');
      updateValues.push(contactTelegrams && Array.isArray(contactTelegrams) ? JSON.stringify(contactTelegrams) : null);
    }
    if (addInfo !== undefined) {
      updateFields.push('add_info = ?');
      updateValues.push(addInfo || null);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (statusDate !== undefined) {
      updateFields.push('status_date = ?');
      updateValues.push(statusDate || null);
    }
    if (lastContactDate !== undefined) {
      updateFields.push('last_contact_date = ?');
      updateValues.push(lastContactDate || null);
    }
    if (workingHours !== undefined) {
      updateFields.push('working_hours = ?');
      updateValues.push(workingHours || null);
    }
    if (hasCableConnection !== undefined) {
      updateFields.push('has_cable_connection = ?');
      updateValues.push(hasCableConnection ? 1 : 0);
    }
    if (rentCostKGS !== undefined) {
      updateFields.push('rent_cost_kgs = ?');
      updateValues.push(rentCostKGS || null);
    }
    if (rentCostUSD !== undefined) {
      updateFields.push('rent_cost_usd = ?');
      updateValues.push(rentCostUSD || null);
    }
    if (presentationUrl !== undefined) {
      updateFields.push('presentation_url = ?');
      updateValues.push(presentationUrl || null);
    }

    if (updateFields.length === 0) {
      return res.json({
        success: true,
        message: 'Нет изменений',
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const updateQuery = `UPDATE search_locations SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(updateQuery).run(...updateValues);

    res.json({
      success: true,
      message: 'Локация обновлена',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/terminals/:id
 * Отримання одного терміналу
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Неверный ID терминала' },
      });
    }

    const terminal = db.prepare(`
      SELECT 
        t.*,
        lt.code as location_type_code,
        lt.name_ru as location_type_name_ru,
        lt.name_en as location_type_name_en,
        lt.name_ky as location_type_name_ky,
        ls.code as status_code,
        ls.name_ru as status_name_ru,
        ls.name_en as status_name_en,
        ls.name_ky as status_name_ky,
        ls.description_ru as status_description_ru,
        ls.description_en as status_description_en,
        ls.description_ky as status_description_ky
      FROM terminals t
      LEFT JOIN location_types lt ON t.location_type_id = lt.id
      LEFT JOIN location_statuses ls ON t.status = ls.id
      WHERE t.id = ?
    `).get(id) as any;

    if (!terminal) {
      return res.status(404).json({
        success: false,
        error: { code: 'TERMINAL_NOT_FOUND', message: 'Терминал не найден' },
      });
    }

    res.json({
      success: true,
      data: {
        terminal: {
          id: terminal.id,
          idTerminal: terminal.id_terminal,
          locationId: terminal.location_id,
          objectName: terminal.object_name,
          locationTypeId: terminal.location_type_id,
          locationType: terminal.location_type_id ? {
            id: terminal.location_type_id,
            code: terminal.location_type_code,
            nameRu: terminal.location_type_name_ru,
            nameEn: terminal.location_type_name_en,
            nameKy: terminal.location_type_name_ky,
          } : null,
          address: terminal.address,
          latitude: terminal.latitude,
          longitude: terminal.longitude,
          mapUrl: terminal.map_url,
          contactName: terminal.contact_name,
          contactPhones: terminal.contact_phones ? JSON.parse(terminal.contact_phones) : [],
          contactTelegrams: terminal.contact_telegrams ? JSON.parse(terminal.contact_telegrams) : [],
          addInfo: terminal.add_info,
          status: terminal.status ? {
            id: terminal.status,
            code: terminal.status_code,
            nameRu: terminal.status_name_ru,
            nameEn: terminal.status_name_en,
            nameKy: terminal.status_name_ky,
            descriptionRu: terminal.status_description_ru,
            descriptionEn: terminal.status_description_en,
            descriptionKy: terminal.status_description_ky,
          } : null,
          statusDate: terminal.status_date,
          lastContactDate: terminal.last_contact_date,
          workingHours: terminal.working_hours,
          hasCableConnection: !!terminal.has_cable_connection,
          rentCostKGS: terminal.rent_cost_kgs,
          rentCostUSD: terminal.rent_cost_usd,
          presentationUrl: terminal.presentation_url,
          createdAt: terminal.created_at,
          updatedAt: terminal.updated_at,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * PATCH /api/terminals/:id
 * Оновлення терміналу
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Неверный ID терминала' },
      });
    }

    const {
      idTerminal,
      objectName,
      locationTypeId,
      address,
      city,
      latitude,
      longitude,
      mapUrl,
      contactName,
      contactPhones,
      contactTelegrams,
      addInfo,
      status,
      statusDate,
      lastContactDate,
      workingHours,
      hasCableConnection,
      rentCostKGS,
      rentCostUSD,
      presentationUrl,
    } = req.body;

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (idTerminal !== undefined) {
      // Проверяем, что новый ID терминала не занят другим терминалом
      if (idTerminal) {
        const existingTerminal = db.prepare('SELECT id FROM terminals WHERE id_terminal = ? AND id != ?').get(idTerminal, id) as { id: number } | undefined;
        if (existingTerminal) {
          return res.status(400).json({
            success: false,
            error: { code: 'DUPLICATE_TERMINAL_ID', message: 'Терминал с таким ID уже существует' },
          });
        }
      }
      updateFields.push('id_terminal = ?');
      updateValues.push(idTerminal);
    }
    if (objectName !== undefined) {
      updateFields.push('object_name = ?');
      updateValues.push(objectName);
    }
    if (locationTypeId !== undefined) {
      updateFields.push('location_type_id = ?');
      updateValues.push(locationTypeId || null);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address || null);
    }
    if (city !== undefined) {
      updateFields.push('city = ?');
      updateValues.push(city || null);
    }
    if (latitude !== undefined) {
      updateFields.push('latitude = ?');
      updateValues.push(latitude || null);
    }
    if (longitude !== undefined) {
      updateFields.push('longitude = ?');
      updateValues.push(longitude || null);
    }
    if (mapUrl !== undefined) {
      updateFields.push('map_url = ?');
      updateValues.push(mapUrl || null);
    }
    if (contactName !== undefined) {
      updateFields.push('contact_name = ?');
      updateValues.push(contactName || null);
    }
    if (contactPhones !== undefined) {
      updateFields.push('contact_phones = ?');
      updateValues.push(contactPhones && Array.isArray(contactPhones) ? JSON.stringify(contactPhones) : null);
    }
    if (contactTelegrams !== undefined) {
      updateFields.push('contact_telegrams = ?');
      updateValues.push(contactTelegrams && Array.isArray(contactTelegrams) ? JSON.stringify(contactTelegrams) : null);
    }
    if (addInfo !== undefined) {
      updateFields.push('add_info = ?');
      updateValues.push(addInfo || null);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (statusDate !== undefined) {
      updateFields.push('status_date = ?');
      updateValues.push(statusDate || null);
    }
    if (lastContactDate !== undefined) {
      updateFields.push('last_contact_date = ?');
      updateValues.push(lastContactDate || null);
    }
    if (workingHours !== undefined) {
      updateFields.push('working_hours = ?');
      updateValues.push(workingHours || null);
    }
    if (hasCableConnection !== undefined) {
      updateFields.push('has_cable_connection = ?');
      updateValues.push(hasCableConnection ? 1 : 0);
    }
    if (rentCostKGS !== undefined) {
      updateFields.push('rent_cost_kgs = ?');
      updateValues.push(rentCostKGS || null);
    }
    if (rentCostUSD !== undefined) {
      updateFields.push('rent_cost_usd = ?');
      updateValues.push(rentCostUSD || null);
    }
    if (presentationUrl !== undefined) {
      updateFields.push('presentation_url = ?');
      updateValues.push(presentationUrl || null);
    }

    if (updateFields.length === 0) {
      return res.json({
        success: true,
        message: 'Нет изменений',
        data: {},
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const updateQuery = `UPDATE terminals SET ${updateFields.join(', ')} WHERE id = ?`;
    try {
      db.prepare(updateQuery).run(...updateValues);
    } catch (dbError: any) {
      if (dbError.message && dbError.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_TERMINAL_ID', message: 'Терминал с таким ID уже существует' },
        });
      }
      throw dbError;
    }

    res.json({
      success: true,
      message: 'Терминал обновлен',
      data: { id },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
