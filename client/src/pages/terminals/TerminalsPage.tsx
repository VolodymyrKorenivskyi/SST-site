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

interface Terminal {
  id: number;
  idTerminal: string;
  objectName: string;
  locationTypeId: number | null;
  locationType: LocationType | null;
  address: string | null;
  city: string | null;
  mapUrl: string | null;
}

function TerminalsPage() {
  const { t, i18n } = useTranslation();
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTerminals();
  }, []);

  const loadTerminals = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/terminals');
      if (response.data.success) {
        setTerminals(response.data.data.terminals);
      }
    } catch (error) {
      console.error('Error loading terminals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocationTypeName = (locationType: LocationType | null): string => {
    if (!locationType) return t('terminals.location.unknown', 'Неизвестно');
    const lang = i18n.language;
    if (lang === 'en') return locationType.nameEn;
    if (lang === 'ky') return locationType.nameKy;
    return locationType.nameRu;
  };

  const normalize = (v: string) => v.toLowerCase().trim();

  const filteredTerminals = (() => {
    const q = normalize(searchQuery);
    if (!q || q.length < 3) return terminals;

    return terminals.filter((terminal) => {
      const haystack = [
        terminal.idTerminal,
        terminal.objectName,
        getLocationTypeName(terminal.locationType),
        terminal.city || '',
        terminal.address || '',
        terminal.mapUrl || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  })();

  return (
    <div style={{ color: '#ffffff', marginTop: '-1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <h1 style={{ marginTop: '0', marginBottom: '0', fontSize: '1.5rem', fontWeight: 600 }}>
          {t('terminals.title', 'Список терминалов')}
        </h1>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('terminals.searchPlaceholder', 'Поиск (от 3 символов)...')}
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
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>{t('auth.loading')}</div>
      ) : (
        <div style={{ backgroundColor: '#2a2a2a', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a1a1a', borderBottom: '2px solid #B19CD9' }}>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '5%' }}>
                  {t('terminals.table.idTerminal', 'ID терминала')}
                </th>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '20%' }}>
                  {t('terminals.table.object', 'Объект')}
                </th>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '7.5%' }}>
                  {t('terminals.table.location', 'Среда размещения')}
                </th>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '12.5%' }}>
                  {t('terminals.table.city', 'Город')}
                </th>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '30%' }}>
                  {t('terminals.table.address', 'Адрес')}
                </th>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '5%' }}>
                  {t('terminals.table.map', 'Карта')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTerminals.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                    {t('terminals.notFound', 'Терминалов не найдено')}
                  </td>
                </tr>
              ) : (
                filteredTerminals.map((terminal) => (
                  <tr key={terminal.id} style={{ borderBottom: '1px solid #444' }}>
                    <td style={{ padding: '0.25rem', color: '#fff', fontFamily: 'monospace', fontWeight: 500, fontSize: '0.875rem', textAlign: 'center' }}>
                      {terminal.idTerminal}
                    </td>
                    <td style={{ padding: '0.25rem', color: '#fff', fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {terminal.objectName}
                    </td>
                    <td style={{ padding: '0.25rem', color: '#fff', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getLocationTypeName(terminal.locationType)}
                    </td>
                    <td style={{ padding: '0.25rem', color: '#fff', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {terminal.city || '-'}
                    </td>
                    <td style={{ padding: '0.25rem', color: '#fff', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {terminal.address || '-'}
                    </td>
                    <td style={{ padding: '0.25rem', textAlign: 'center', fontSize: '0.875rem' }}>
                      {terminal.mapUrl ? (
                        <a
                          href={terminal.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t('terminals.viewMap', 'Открыть на карте')}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TerminalsPage;
