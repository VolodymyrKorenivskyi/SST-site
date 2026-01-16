import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api';
import LocationEditForm from './LocationEditForm';

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

interface Location {
  id: number;
  terminalNumber: string | null;
  objectName: string;
  locationTypeId: number | null;
  locationType: LocationType | null;
  address: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  mapUrl: string | null;
  contactName: string | null;
  contactPhones: string[];
  contactTelegrams: string[];
  addInfo: string | null;
  status: {
    id: number;
    code: string;
    nameRu: string;
    nameEn: string;
    nameKy: string;
    descriptionRu: string;
    descriptionEn: string;
    descriptionKy: string;
  } | null;
  lastContactDate: string | null;
  workingHours: string | null;
  hasCableConnection: boolean;
  rentCostKGS: string | null;
  rentCostUSD: string | null;
  presentationUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

type SortDir = 'asc' | 'desc';
type SortKey =
  | 'terminalNumber'
  | 'objectName'
  | 'locationType'
  | 'city'
  | 'address'
  | 'contactName'
  | 'contacts'
  | 'status'
  | 'addInfo';

function SearchLocationsPage() {
  const { t, i18n } = useTranslation();
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [locationStatuses, setLocationStatuses] = useState<LocationStatus[]>([]);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('terminalNumber');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadLocations();
    loadLocationStatuses();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/terminals/search-locations');
      if (response.data.success) {
        setAllLocations(response.data.data.locations);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocationStatuses = async () => {
    try {
      const response = await apiClient.get('/terminals/location-statuses');
      if (response.data.success) {
        setLocationStatuses(response.data.data.locationStatuses);
      }
    } catch (error) {
      console.error('Error loading location statuses:', error);
    }
  };

  const getStatusName = (status: LocationStatus): string => {
    const lang = i18n.language;
    if (lang === 'en') return status.nameEn;
    if (lang === 'ky') return status.nameKy;
    return status.nameRu;
  };

  const getLocationStatusName = (location: Location): string => {
    if (!location.status) return '';
    const lang = i18n.language;
    if (lang === 'en') return location.status.nameEn || '';
    if (lang === 'ky') return location.status.nameKy || '';
    return location.status.nameRu || '';
  };

  const handleRowClick = (location: Location) => {
    setSelectedLocation(location);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedLocation(null);
    loadLocations(); // Reload locations after closing modal
  };

  const getLocationTypeName = (locationType: LocationType | null): string => {
    if (!locationType) return t('terminals.location.unknown', 'Неизвестно');
    const lang = i18n.language;
    if (lang === 'en') return locationType.nameEn;
    if (lang === 'ky') return locationType.nameKy;
    return locationType.nameRu;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const renderSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return (
      <span style={{ marginLeft: '0.25rem', fontSize: '0.75rem', opacity: 0.9 }}>
        {sortDir === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  const normalize = (v: string) => v.toLowerCase().trim();

  const getContactsValue = (l: Location) => {
    const phones = (l.contactPhones || []).filter((p) => p && p.trim()).join(' ');
    const tgs = (l.contactTelegrams || []).filter((tg) => tg && tg.trim()).join(' ');
    return `${phones} ${tgs}`.trim();
  };

  const matchesQuery = (location: Location, q: string) => {
    if (!q) return true;
    const haystack = [
      location.terminalNumber || '',
      location.objectName || '',
      getLocationTypeName(location.locationType) || '',
      location.city || '',
      location.address || '',
      location.contactName || '',
      getContactsValue(location),
      getLocationStatusName(location),
      location.addInfo || '',
      location.mapUrl || '',
    ]
      .join(' ')
      .toLowerCase();

    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    // Words for prefix-matching short queries (1–2 chars) so filtering is noticeable immediately
    const words =
      haystack.match(/[\p{L}\p{N}]+/gu)?.map((w) => w.toLowerCase()) ?? [];

    return tokens.every((token) => {
      if (token.length < 3) {
        return words.some((w) => w.startsWith(token));
      }
      return haystack.includes(token);
    });
  };

  const filteredLocations =
    selectedStatusId === null
      ? allLocations
      : allLocations.filter((loc) => loc.status?.id === selectedStatusId);

  const contextFilteredLocations = (() => {
    const q = normalize(searchQuery);
    if (!q || q.length < 3) return filteredLocations;
    return filteredLocations.filter((loc) => matchesQuery(loc, q));
  })();

  const sortedLocations = contextFilteredLocations
    .map((loc, idx) => ({ loc, idx }))
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;

      const asString = (v: unknown) => (v == null ? '' : String(v));
      const compareString = (av: string, bv: string) =>
        av.localeCompare(bv, i18n.language, { sensitivity: 'base' });

      const compare = (avRaw: unknown, bvRaw: unknown) => {
        const av = asString(avRaw).trim();
        const bv = asString(bvRaw).trim();
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return compareString(av, bv);
      };

      let result = 0;
      switch (sortKey) {
        case 'terminalNumber': {
          const an = a.loc.terminalNumber ? parseInt(a.loc.terminalNumber, 10) : NaN;
          const bn = b.loc.terminalNumber ? parseInt(b.loc.terminalNumber, 10) : NaN;
          if (Number.isNaN(an) && Number.isNaN(bn)) result = 0;
          else if (Number.isNaN(an)) result = 1;
          else if (Number.isNaN(bn)) result = -1;
          else result = an - bn;
          break;
        }
        case 'objectName':
          result = compare(a.loc.objectName, b.loc.objectName);
          break;
        case 'locationType':
          result = compare(getLocationTypeName(a.loc.locationType), getLocationTypeName(b.loc.locationType));
          break;
        case 'city':
          result = compare(a.loc.city, b.loc.city);
          break;
        case 'address':
          result = compare(a.loc.address, b.loc.address);
          break;
        case 'contactName':
          result = compare(a.loc.contactName, b.loc.contactName);
          break;
        case 'contacts':
          result = compare(getContactsValue(a.loc), getContactsValue(b.loc));
          break;
        case 'status':
          result = compare(getLocationStatusName(a.loc), getLocationStatusName(b.loc));
          break;
        case 'addInfo':
          result = compare(a.loc.addInfo, b.loc.addInfo);
          break;
        default:
          result = 0;
      }

      if (result !== 0) return result * dir;
      // stable fallback
      return a.idx - b.idx;
    })
    .map((x) => x.loc);

  if (loading) {
    return <div style={{ color: '#ffffff', textAlign: 'center', padding: '2rem' }}>{t('auth.loading')}</div>;
  }

  return (
    <div style={{ color: '#ffffff', marginTop: '-1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <h1 style={{ marginTop: '0', marginBottom: '0', fontSize: '1.5rem', fontWeight: 600 }}>
          {t('nav.searchLocations', 'Поиск локаций')}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('terminals.searchLocations.searchPlaceholder', 'Поиск...')}
            style={{
              padding: '0.5rem',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              fontSize: '0.9rem',
              width: '240px',
              boxSizing: 'border-box',
            }}
          />
          <label style={{ color: '#fff', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
            {t('terminals.searchLocations.filterByStatus', 'Фильтр по статусу')}:
          </label>
          <select
            value={selectedStatusId || ''}
            onChange={(e) => setSelectedStatusId(e.target.value ? parseInt(e.target.value) : null)}
            style={{
              padding: '0.5rem',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              minWidth: '200px',
            }}
          >
            <option value="">{t('terminals.searchLocations.allStatuses', 'Все статусы')}</option>
            {locationStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {getStatusName(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sortedLocations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
          {t('terminals.searchLocations.notFound', 'Локации не найдены')}
        </div>
      ) : (
        <div style={{ backgroundColor: '#2a2a2a', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a1a1a', borderBottom: '2px solid #B19CD9' }}>
                <th
                  onClick={() => handleSort('terminalNumber')}
                  style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '3%', cursor: 'pointer', userSelect: 'none' }}
                >
                  №{renderSortIndicator('terminalNumber')}
                </th>
                <th
                  onClick={() => handleSort('objectName')}
                  style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '12%', cursor: 'pointer', userSelect: 'none' }}
                >
                  {t('terminals.table.objectName', 'Название объекта')}
                  {renderSortIndicator('objectName')}
                </th>
                <th
                  onClick={() => handleSort('locationType')}
                  style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '7.5%', cursor: 'pointer', userSelect: 'none' }}
                >
                  {t('terminals.table.location', 'Среда размещения')}
                  {renderSortIndicator('locationType')}
                </th>
                <th
                  onClick={() => handleSort('city')}
                  style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '6.25%', cursor: 'pointer', userSelect: 'none' }}
                >
                  {t('terminals.table.city', 'Город')}
                  {renderSortIndicator('city')}
                </th>
                <th
                  onClick={() => handleSort('address')}
                  style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '21.25%', cursor: 'pointer', userSelect: 'none' }}
                >
                  {t('terminals.table.address', 'Адрес')}
                  {renderSortIndicator('address')}
                </th>
                <th
                  onClick={() => handleSort('contactName')}
                  style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '12%', cursor: 'pointer', userSelect: 'none' }}
                >
                  {t('terminals.searchLocations.contactName', 'ФИО контактного лица')}
                  {renderSortIndicator('contactName')}
                </th>
                <th
                  onClick={() => handleSort('contacts')}
                  style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '12%', cursor: 'pointer', userSelect: 'none' }}
                >
                  {t('terminals.searchLocations.contacts', 'Контакты')}
                  {renderSortIndicator('contacts')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '5%', cursor: 'pointer', userSelect: 'none' }}
                >
                  {t('terminals.searchLocations.status', 'Статус')}
                  {renderSortIndicator('status')}
                </th>
                <th
                  onClick={() => handleSort('addInfo')}
                  style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '23%', cursor: 'pointer', userSelect: 'none' }}
                >
                  {t('terminals.management.addInfo', 'Дополнительная информация')}
                  {renderSortIndicator('addInfo')}
                </th>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '5%' }}>
                  {t('terminals.table.map', 'Карта')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLocations.map((location) => (
                <tr
                  key={location.id}
                  onClick={() => handleRowClick(location)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid #444',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#333';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '0.25rem', color: '#fff', width: '3%', fontSize: '0.875rem', textAlign: 'center' }}>{location.terminalNumber || '-'}</td>
                  <td style={{ padding: '0.25rem', color: '#fff', width: '12%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{location.objectName}</td>
                  <td style={{ padding: '0.25rem', color: '#fff', fontSize: '0.875rem', width: '7.5%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getLocationTypeName(location.locationType)}
                  </td>
                  <td style={{ padding: '0.25rem', color: '#fff', fontSize: '0.875rem', width: '6.25%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {location.city || '-'}
                  </td>
                  <td style={{ padding: '0.25rem', color: '#fff', fontSize: '0.875rem', width: '21.25%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location.address || '-'}</td>
                  <td style={{ padding: '0.25rem', color: '#fff', fontSize: '0.875rem', width: '12%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location.contactName || '-'}</td>
                  <td style={{ padding: '0.25rem', color: '#fff', fontSize: '0.875rem', width: '12%', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {location.contactPhones && location.contactPhones.length > 0 && (
                        <div>
                          {location.contactPhones.map((phone, idx) => (
                            <div key={idx} style={{ fontSize: '0.875rem' }}>📞 {phone}</div>
                          ))}
                        </div>
                      )}
                      {location.contactTelegrams && location.contactTelegrams.filter(tg => tg && tg.trim()).length > 0 && (
                        <div>
                          {location.contactTelegrams
                            .filter(tg => tg && tg.trim())
                            .map((tg, idx) => (
                            <div key={idx} style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{ flexShrink: 0 }}
                              >
                                <path
                                  d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
                                  fill="#0088cc"
                                />
                              </svg>
                              <span>{tg}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {(!location.contactPhones || location.contactPhones.length === 0) &&
                       (!location.contactTelegrams || location.contactTelegrams.length === 0) && (
                        <span>-</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.25rem', color: '#fff', fontSize: '0.875rem', width: '5%' }}>
                    <div style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      backgroundColor: location.status ? '#2a2a2a' : 'transparent',
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }} title={location.status ? (i18n.language === 'en' ? location.status.descriptionEn : i18n.language === 'ky' ? location.status.descriptionKy : location.status.descriptionRu) : ''}>
                      {location.status ? (i18n.language === 'en' ? location.status.nameEn : i18n.language === 'ky' ? location.status.nameKy : location.status.nameRu) : '-'}
                    </div>
                  </td>
                  <td style={{ padding: '0.25rem', color: '#fff', fontSize: '0.875rem', width: '23%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {location.addInfo || '-'}
                  </td>
                  <td style={{ padding: '0.25rem', color: '#fff', textAlign: 'center', width: '5%', fontSize: '0.875rem' }}>
                    {location.mapUrl ? (
                      <a
                        href={location.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={t('terminals.table.viewMap', 'Открыть карту')}
                        style={{
                          color: '#B19CD9',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.7';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedLocation && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem',
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: '100%',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1rem', position: 'relative' }}>
              <button
                onClick={handleCloseModal}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  lineHeight: 1,
                  zIndex: 1001,
                }}
              >
                ×
              </button>
              <LocationEditForm locationId={selectedLocation.id} onSave={handleCloseModal} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchLocationsPage;
