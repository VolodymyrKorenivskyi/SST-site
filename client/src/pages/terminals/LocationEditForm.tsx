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

interface LocationStatus {
  id: number;
  code: string;
  nameRu: string;
  nameEn: string;
  nameKy: string;
  descriptionRu: string;
  descriptionEn: string;
  descriptionKy: string;
}

interface LocationEditFormProps {
  locationId: number;
  onSave: () => void;
}

function LocationEditForm({ locationId, onSave }: LocationEditFormProps) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationTypes, setLocationTypes] = useState<LocationType[]>([]);
  const [locationStatuses, setLocationStatuses] = useState<LocationStatus[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isUpdatingExchange, setIsUpdatingExchange] = useState(false);
  const [isUsingFallbackRate, setIsUsingFallbackRate] = useState(false);
  const [formData, setFormData] = useState({
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
    status: null as number | null,
    statusDate: '',
    lastContactDate: '',
    workingHours: '',
    hasCableConnection: false,
    rentCostKGS: '',
    rentCostUSD: '',
    presentationUrl: '',
  });

  useEffect(() => {
    loadLocationTypes();
    loadLocationStatuses();
    loadLocation();
    loadExchangeRate();
  }, [locationId]);

  const loadExchangeRate = async () => {
    try {
      // Используем API для получения курса USD к KGS
      // Пример: 1 USD = 87.41 KGS (текущий курс)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (response.ok) {
        const data = await response.json();
        const kgsRate = data.rates?.KGS;
        if (kgsRate) {
          setExchangeRate(kgsRate);
          setIsUsingFallbackRate(false);
        } else {
          // Fallback: используем текущий курс, если API не вернул KGS
          setExchangeRate(87.41);
          setIsUsingFallbackRate(true);
        }
      } else {
        // Fallback: используем текущий курс при ошибке API
        setExchangeRate(87.41);
        setIsUsingFallbackRate(true);
      }
    } catch (error) {
      console.error('Error loading exchange rate:', error);
      // Fallback: используем текущий курс при ошибке
      setExchangeRate(87.41);
      setIsUsingFallbackRate(true);
    }
  };

  const loadLocationTypes = async () => {
    try {
      const response = await apiClient.get('/terminals/location-types');
      setLocationTypes(response.data.data.locationTypes);
    } catch (error) {
      console.error('Error loading location types:', error);
    }
  };

  const loadLocationStatuses = async () => {
    try {
      const response = await apiClient.get('/terminals/location-statuses');
      setLocationStatuses(response.data.data.locationStatuses);
      // Устанавливаем дефолтный статус (active) если статусы загружены
      if (response.data.data.locationStatuses.length > 0 && !formData.status) {
        const activeStatus = response.data.data.locationStatuses.find((s: LocationStatus) => s.code === 'active');
        if (activeStatus) {
          setFormData(prev => ({ ...prev, status: activeStatus.id }));
        }
      }
    } catch (error) {
      console.error('Error loading location statuses:', error);
    }
  };

  const loadLocation = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/terminals/search-locations/${locationId}`);
      if (response.data.success) {
        const location = response.data.data.location;
        setFormData({
          objectName: location.objectName || '',
          locationTypeId: location.locationTypeId || null,
          address: location.address || '',
          latitude: location.latitude || '',
          longitude: location.longitude || '',
          mapUrl: location.mapUrl || '',
          contactName: location.contactName || '',
          contactPhones: location.contactPhones && location.contactPhones.length > 0 ? location.contactPhones : [''],
          contactTelegrams: location.contactTelegrams && location.contactTelegrams.length > 0 ? location.contactTelegrams : [''],
          addInfo: location.addInfo || '',
          status: location.status?.id || null,
          statusDate: location.statusDate || '',
          lastContactDate: location.lastContactDate || '',
          workingHours: location.workingHours || '',
          hasCableConnection: location.hasCableConnection || false,
          rentCostKGS: location.rentCostKGS || '',
          rentCostUSD: location.rentCostUSD || '',
          presentationUrl: location.presentationUrl || '',
        });
      }
    } catch (error) {
      console.error('Error loading location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiClient.patch(`/terminals/search-locations/${locationId}`, formData);
      onSave();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || t('terminals.management.saveError', 'Ошибка сохранения'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | boolean | number | string[] | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRentCostKGSChange = (value: string) => {
    if (isUpdatingExchange) return;
    
    // Убираем звездочку при вводе
    const cleanValue = value.replace(/\*$/, '');
    setFormData((prev) => ({ ...prev, rentCostKGS: cleanValue }));
    
    if (cleanValue && exchangeRate && !isNaN(parseFloat(cleanValue))) {
      setIsUpdatingExchange(true);
      const kgsValue = parseFloat(cleanValue);
      const usdValue = (kgsValue / exchangeRate).toFixed(2);
      const usdValueWithStar = isUsingFallbackRate ? `${usdValue}*` : usdValue;
      setFormData((prev) => ({ ...prev, rentCostUSD: usdValueWithStar }));
      setTimeout(() => setIsUpdatingExchange(false), 100);
    } else if (!cleanValue) {
      setIsUpdatingExchange(true);
      setFormData((prev) => ({ ...prev, rentCostUSD: '' }));
      setTimeout(() => setIsUpdatingExchange(false), 100);
    }
  };

  const handleRentCostUSDChange = (value: string) => {
    if (isUpdatingExchange) return;
    
    // Убираем звездочку при вводе
    const cleanValue = value.replace(/\*$/, '');
    setFormData((prev) => ({ ...prev, rentCostUSD: cleanValue }));
    
    if (cleanValue && exchangeRate && !isNaN(parseFloat(cleanValue))) {
      setIsUpdatingExchange(true);
      const usdValue = parseFloat(cleanValue);
      const kgsValue = (usdValue * exchangeRate).toFixed(2);
      const kgsValueWithStar = isUsingFallbackRate ? `${kgsValue}*` : kgsValue;
      setFormData((prev) => ({ ...prev, rentCostKGS: kgsValueWithStar }));
      setTimeout(() => setIsUpdatingExchange(false), 100);
    } else if (!cleanValue) {
      setIsUpdatingExchange(true);
      setFormData((prev) => ({ ...prev, rentCostKGS: '' }));
      setTimeout(() => setIsUpdatingExchange(false), 100);
    }
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
    marginBottom: '0.1875rem',
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
    marginBottom: '0.1875rem',
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
    gridTemplateColumns: 'repeat(6, 1fr)',
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
          <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
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
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#B19CD9',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  height: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  width: '70px',
                }}
              >
                {t('terminals.management.add', 'Добавить')}
              </button>
            </div>
            {formData.contactPhones.map((phone, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(index, e.target.value)}
                  placeholder="+996 XXX XXX XXX"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {formData.contactPhones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhone(index)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#f44336',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontSize: '0.8rem',
                      height: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '70px',
                      flexShrink: 0,
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
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#B19CD9',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  height: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  width: '70px',
                }}
              >
                {t('terminals.management.add', 'Добавить')}
              </button>
            </div>
            {formData.contactTelegrams.map((telegram, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => handleTelegramChange(index, e.target.value)}
                  placeholder="@username"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {formData.contactTelegrams.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTelegram(index)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#f44336',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontSize: '0.8rem',
                      height: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '70px',
                      flexShrink: 0,
                    }}
                  >
                    {t('terminals.management.remove', 'Удалить')}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ ...formGroupStyle, gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', minHeight: '1.5rem' }}>
              <label style={labelStyle}>
                {t('terminals.management.rentCostKGS', 'Стоимость аренды, СОМ')}
              </label>
              <div style={{ width: '70px' }}></div>
            </div>
            <input
              type="text"
              value={formData.rentCostKGS}
              onChange={(e) => handleRentCostKGSChange(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ ...formGroupStyle, gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', minHeight: '1.5rem' }}>
              <label style={labelStyle}>
                {t('terminals.management.rentCostUSD', 'Стоимость аренды, USD')}
              </label>
              <div style={{ width: '70px' }}></div>
            </div>
            <input
              type="text"
              value={formData.rentCostUSD}
              onChange={(e) => handleRentCostUSDChange(e.target.value)}
              style={inputStyle}
            />
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
              value={formData.status || ''}
              onChange={(e) => handleChange('status', e.target.value ? parseInt(e.target.value) : null)}
              style={selectStyle}
            >
              <option value="">{t('terminals.management.selectStatus', 'Выберите статус...')}</option>
              {locationStatuses.map((status) => {
                const currentLang = i18n.language;
                const name = currentLang === 'en' ? status.nameEn : currentLang === 'ky' ? status.nameKy : status.nameRu;
                const description = currentLang === 'en' ? status.descriptionEn : currentLang === 'ky' ? status.descriptionKy : status.descriptionRu;
                return (
                  <option key={status.id} value={status.id} title={description}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Поле для даты статуса (показывается только для "Отсрочено" и "Приостановлено") */}
          {(formData.status && locationStatuses.find(s => s.id === formData.status)?.code === 'postponed') ||
           (formData.status && locationStatuses.find(s => s.id === formData.status)?.code === 'suspended') ? (
            <div style={formGroupStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', minHeight: '1.5rem' }}>
                <label style={labelStyle}>
                  {t('terminals.management.statusDate', 'Планируется на ...')}
                </label>
                <div style={{ width: '70px' }}></div>
              </div>
              <input
                type="date"
                value={formData.statusDate}
                onChange={(e) => handleChange('statusDate', e.target.value)}
                style={inputStyle}
              />
            </div>
          ) : null}

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
                {t('terminals.management.hasCableConnectionLabel', 'укажи, если есть')}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Дополнительно */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          {t('terminals.management.sections.additional', 'Дополнительно')}
        </h2>
        <div style={gridStyle}>
          <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
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

export default LocationEditForm;
