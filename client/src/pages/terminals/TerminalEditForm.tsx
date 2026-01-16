import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api';

interface LocationType {
  id: number;
  code: string;
  nameRu: string;
  nameEn: string;
  nameKy: string;
}

interface TerminalEditFormProps {
  terminalId: number;
  onSave: () => void;
}

function TerminalEditForm({ terminalId, onSave }: TerminalEditFormProps) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationTypes, setLocationTypes] = useState<LocationType[]>([]);
  const [formData, setFormData] = useState({
    idTerminal: '',
    objectName: '',
    locationTypeId: null as number | null,
    address: '',
    latitude: '',
    longitude: '',
    mapUrl: '',
    contactName: '',
    contactPhones: [''],
    contactTelegrams: [''],
    addInfo: '',
    status: 'active',
    lastContactDate: '',
    workingHours: '',
    hasCableConnection: false,
    rentCostKGS: '',
    rentCostUSD: '',
    presentationUrl: '',
  });

  useEffect(() => {
    loadLocationTypes();
    loadTerminal();
  }, [terminalId]);

  const loadLocationTypes = async () => {
    try {
      const response = await apiClient.get('/terminals/location-types');
      setLocationTypes(response.data.data.locationTypes);
    } catch (error) {
      console.error('Error loading location types:', error);
    }
  };

  const loadTerminal = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/terminals/${terminalId}`);
      if (response.data.success) {
        const terminal = response.data.data.terminal;
        setFormData({
          idTerminal: terminal.idTerminal || '',
          objectName: terminal.objectName || '',
          locationTypeId: terminal.locationTypeId || null,
          address: terminal.address || '',
          latitude: terminal.latitude || '',
          longitude: terminal.longitude || '',
          mapUrl: terminal.mapUrl || '',
          contactName: terminal.contactName || '',
          contactPhones: terminal.contactPhones && terminal.contactPhones.length > 0 ? terminal.contactPhones : [''],
          contactTelegrams: terminal.contactTelegrams && terminal.contactTelegrams.length > 0 ? terminal.contactTelegrams : [''],
          addInfo: terminal.addInfo || '',
          status: typeof terminal.status === 'string' ? terminal.status : (terminal.status?.code || 'active'),
          lastContactDate: terminal.lastContactDate || '',
          workingHours: terminal.workingHours || '',
          hasCableConnection: terminal.hasCableConnection || false,
          rentCostKGS: terminal.rentCostKGS || '',
          rentCostUSD: terminal.rentCostUSD || '',
          presentationUrl: terminal.presentationUrl || '',
        });
      }
    } catch (error) {
      console.error('Error loading terminal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiClient.patch(`/terminals/${terminalId}`, formData);
      onSave();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || t('terminals.management.saveError', 'Ошибка сохранения'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | boolean | number | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddPhone = () => {
    setFormData((prev) => ({
      ...prev,
      contactPhones: [...prev.contactPhones, ''],
    }));
  };

  const handleRemovePhone = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      contactPhones: prev.contactPhones.filter((_, i) => i !== index),
    }));
  };

  const handlePhoneChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      contactPhones: prev.contactPhones.map((phone, i) => (i === index ? value : phone)),
    }));
  };

  const handleAddTelegram = () => {
    setFormData((prev) => ({
      ...prev,
      contactTelegrams: [...prev.contactTelegrams, ''],
    }));
  };

  const handleRemoveTelegram = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      contactTelegrams: prev.contactTelegrams.filter((_, i) => i !== index),
    }));
  };

  const handleTelegramChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      contactTelegrams: prev.contactTelegrams.map((telegram, i) => (i === index ? value : telegram)),
    }));
  };

  const getLocationTypeName = (locationType: LocationType): string => {
    const lang = i18n.language;
    if (lang === 'en') return locationType.nameEn;
    if (lang === 'ky') return locationType.nameKy;
    return locationType.nameRu;
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: '#2a2a2a',
    borderRadius: '6px',
    padding: '0.5rem',
    marginBottom: '0.375rem',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '0.375rem',
    paddingBottom: '0.25rem',
    borderBottom: '1px solid #B19CD9',
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: '0.375rem',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.25rem',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 500,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    height: '2.25rem',
    lineHeight: '1.25rem',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    height: '2.25rem',
  };

  const checkboxContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const checkboxStyle: React.CSSProperties = {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.5rem 1.5rem',
    backgroundColor: '#B19CD9',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.375rem',
  };

  if (loading) {
    return <div style={{ color: '#ffffff', textAlign: 'center', padding: '2rem' }}>{t('auth.loading')}</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Основная информация */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          {t('terminals.management.sections.basic', 'Основная информация')}
        </h2>
        <div style={gridStyle}>
          <div style={formGroupStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', minHeight: '1.5rem' }}>
              <label style={labelStyle}>
                {t('terminals.management.idTerminal', 'ID терминала')} *
              </label>
              <div style={{ width: '70px' }}></div>
            </div>
            <input
              type="text"
              value={formData.idTerminal}
              onChange={(e) => handleChange('idTerminal', e.target.value)}
              placeholder="T001"
              style={inputStyle}
              required
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {t('terminals.management.objectName', 'Название объекта')} *
            </label>
            <input
              type="text"
              value={formData.objectName}
              onChange={(e) => handleChange('objectName', e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {t('terminals.management.location', 'Среда размещения')}
            </label>
            <select
              value={formData.locationTypeId || ''}
              onChange={(e) => handleChange('locationTypeId', e.target.value ? parseInt(e.target.value) : null)}
              style={selectStyle}
            >
              <option value="">{t('terminals.management.selectLocation', 'Выберите...')}</option>
              {locationTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {getLocationTypeName(lt)}
                </option>
              ))}
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {t('terminals.management.address', 'Адрес')}
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {t('terminals.management.latitude', 'Широта')}
            </label>
            <input
              type="text"
              value={formData.latitude}
              onChange={(e) => handleChange('latitude', e.target.value)}
              placeholder="42.8746"
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {t('terminals.management.longitude', 'Долгота')}
            </label>
            <input
              type="text"
              value={formData.longitude}
              onChange={(e) => handleChange('longitude', e.target.value)}
              placeholder="74.5698"
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {t('terminals.management.mapUrl', 'Ссылка на карту')}
            </label>
            <input
              type="url"
              value={formData.mapUrl}
              onChange={(e) => handleChange('mapUrl', e.target.value)}
              placeholder="https://www.google.com/maps?q=..."
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Контактная информация */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          {t('terminals.management.sections.contact', 'Контактная информация')}
        </h2>
        <div style={gridStyle}>
          <div style={formGroupStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', minHeight: '1.5rem' }}>
              <label style={labelStyle}>
                {t('terminals.management.contactName', 'ФИО контактного лица')}
              </label>
              <div style={{ width: '70px' }}></div>
            </div>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', minHeight: '1.5rem' }}>
              <label style={labelStyle}>
                {t('terminals.management.contactPhones', 'Номера телефонов')}
              </label>
              <button
                type="button"
                onClick={handleAddPhone}
                style={{
                  padding: '0.35rem 0.75rem',
                  backgroundColor: '#B19CD9',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  height: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {t('terminals.management.add', 'Добавить')}
              </button>
            </div>
            {formData.contactPhones.map((phone, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', alignItems: 'flex-start' }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(index, e.target.value)}
                  placeholder="+996 XXX XXX XXX"
                  style={inputStyle}
                />
                {formData.contactPhones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhone(index)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      backgroundColor: '#f44336',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontSize: '0.8rem',
                      alignSelf: 'flex-start',
                    }}
                  >
                    {t('terminals.management.remove', 'Удалить')}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={formGroupStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', minHeight: '1.5rem' }}>
              <label style={labelStyle}>
                {t('terminals.management.contactTelegrams', 'Телеграмы')}
              </label>
              <button
                type="button"
                onClick={handleAddTelegram}
                style={{
                  padding: '0.35rem 0.75rem',
                  backgroundColor: '#B19CD9',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  height: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {t('terminals.management.add', 'Добавить')}
              </button>
            </div>
            {formData.contactTelegrams.map((telegram, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => handleTelegramChange(index, e.target.value)}
                  placeholder="@username"
                  style={inputStyle}
                />
                {formData.contactTelegrams.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTelegram(index)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      backgroundColor: '#f44336',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontSize: '0.8rem',
                      alignSelf: 'flex-start',
                    }}
                  >
                    {t('terminals.management.remove', 'Удалить')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Статус и обслуживание */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          {t('terminals.management.sections.status', 'Статус и обслуживание')}
        </h2>
        <div style={gridStyle}>
          <div style={formGroupStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', minHeight: '1.5rem' }}>
              <label style={labelStyle}>
                {t('terminals.management.status', 'Статус')}
              </label>
              <div style={{ width: '70px' }}></div>
            </div>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              style={selectStyle}
            >
              <option value="active">{t('terminals.management.statusActive', 'Активный')}</option>
              <option value="inactive">{t('terminals.management.statusInactive', 'Неактивный')}</option>
              <option value="maintenance">{t('terminals.management.statusMaintenance', 'На обслуживании')}</option>
              <option value="planned">{t('terminals.management.statusPlanned', 'Запланирован')}</option>
            </select>
          </div>

          <div style={formGroupStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', minHeight: '1.5rem' }}>
              <label style={labelStyle}>
                {t('terminals.management.lastContactDate', 'Дата последнего контакта')}
              </label>
              <div style={{ width: '70px' }}></div>
            </div>
            <input
              type="date"
              value={formData.lastContactDate}
              onChange={(e) => handleChange('lastContactDate', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', minHeight: '1.5rem' }}>
              <label style={labelStyle}>
                {t('terminals.management.workingHours', 'Время работы')}
              </label>
              <div style={{ width: '70px' }}></div>
            </div>
            <input
              type="text"
              value={formData.workingHours}
              onChange={(e) => handleChange('workingHours', e.target.value)}
              placeholder="9:00 - 18:00"
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', minHeight: '1.5rem' }}>
              <label style={labelStyle}>
                {t('terminals.management.hasCableConnection', 'Есть ли связь по кабелю')}
              </label>
              <div style={{ width: '70px' }}></div>
            </div>
            <div style={checkboxContainerStyle}>
              <input
                type="checkbox"
                checked={formData.hasCableConnection}
                onChange={(e) => handleChange('hasCableConnection', e.target.checked)}
                style={checkboxStyle}
                id="hasCableConnection"
              />
              <label htmlFor="hasCableConnection" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                {t('terminals.management.hasCableConnection', 'Есть ли связь по кабелю')}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Финансовая информация */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          {t('terminals.management.sections.financial', 'Финансовая информация')}
        </h2>
        <div style={gridStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {t('terminals.management.rentCostKGS', 'Стоимость аренды, СОМ')}
            </label>
            <input
              type="number"
              value={formData.rentCostKGS}
              onChange={(e) => handleChange('rentCostKGS', e.target.value)}
              placeholder="0"
              style={inputStyle}
              min="0"
              step="0.01"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {t('terminals.management.rentCostUSD', 'Стоимость аренды, USD')}
            </label>
            <input
              type="number"
              value={formData.rentCostUSD}
              onChange={(e) => handleChange('rentCostUSD', e.target.value)}
              placeholder="0"
              style={inputStyle}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Дополнительно */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          {t('terminals.management.sections.additional', 'Дополнительно')}
        </h2>
        <div style={gridStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {t('terminals.management.addInfo', 'Дополнительная информация')}
            </label>
            <textarea
              value={formData.addInfo}
              onChange={(e) => handleChange('addInfo', e.target.value)}
              placeholder={t('terminals.management.addInfoPlaceholder', 'Введите дополнительную информацию...')}
              style={{
                ...inputStyle,
                height: '2.25rem',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {t('terminals.management.presentationUrl', 'Ссылка на презентацию')}
            </label>
            <input
              type="url"
              value={formData.presentationUrl}
              onChange={(e) => handleChange('presentationUrl', e.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Кнопки */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="submit" style={buttonStyle} disabled={saving}>
          {saving ? t('terminals.management.saving', 'Сохранение...') : t('terminals.management.save', 'Сохранить')}
        </button>
      </div>
    </form>
  );
}

export default TerminalEditForm;
