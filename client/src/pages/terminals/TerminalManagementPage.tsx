import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api';
import TerminalEditForm from './TerminalEditForm';

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
  mapUrl: string | null;
}

function TerminalManagementPage() {
  const { t, i18n } = useTranslation();
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  const handleRowClick = (terminal: Terminal) => {
    setSelectedTerminal(terminal);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTerminal(null);
    loadTerminals(); // Reload terminals after closing modal
  };

  const handleCollection = (e: React.MouseEvent, terminal: Terminal) => {
    e.stopPropagation();
    apiClient
      .post('/terminals/collection-request', { terminalId: terminal.id })
      .then((response) => {
        if (response.data?.success) {
          alert(response.data.message || t('terminals.management.emailSent', 'Письмо отправлено'));
        } else {
          alert(response.data?.error?.message || t('terminals.management.emailError', 'Ошибка отправки письма'));
        }
      })
      .catch((error) => {
        alert(error.response?.data?.error?.message || t('terminals.management.emailError', 'Ошибка отправки письма'));
      });
  };

  const handleRepair = (e: React.MouseEvent, terminal: Terminal) => {
    e.stopPropagation();
    // TODO: Implement repair action
    alert(t('terminals.operations.repair', 'Выполнить ремонт терминала') + ` - ${terminal.idTerminal}`);
  };

  const handleMonitoring = (e: React.MouseEvent, terminal: Terminal) => {
    e.stopPropagation();
    // TODO: Implement monitoring action
    alert(t('terminals.operations.monitoring', 'Мониторинг состояния') + ` - ${terminal.idTerminal}`);
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
        terminal.address || '',
        terminal.mapUrl || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  })();

  if (loading) {
    return <div style={{ color: '#ffffff', textAlign: 'center', padding: '2rem' }}>{t('auth.loading')}</div>;
  }

  return (
    <div style={{ color: '#ffffff', marginTop: '-1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <h1 style={{ marginTop: '0', marginBottom: '0', fontSize: '1.5rem', fontWeight: 600 }}>
          {t('terminals.management.title', 'Управление терминалами')}
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

      {filteredTerminals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
          {t('terminals.notFound', 'Терминалов не найдено')}
        </div>
      ) : (
        <div style={{ backgroundColor: '#2a2a2a', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a1a1a', borderBottom: '2px solid #B19CD9' }}>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '5%' }}>
                  {t('terminals.table.idTerminal', 'ID терминала')}
                </th>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '22%' }}>
                  {t('terminals.table.object', 'Объект')}
                </th>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '15%' }}>
                  {t('terminals.table.location', 'Среда размещения')}
                </th>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '30%' }}>
                  {t('terminals.table.address', 'Адрес')}
                </th>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '5%' }}>
                  {t('terminals.table.map', 'Карта')}
                </th>
                <th style={{ padding: '0.25rem', textAlign: 'center', color: '#fff', fontWeight: 600, width: '10%' }}>
                  {t('terminals.table.operations', 'Операции')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTerminals.map((terminal) => (
                <tr
                  key={terminal.id}
                  onClick={() => handleRowClick(terminal)}
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
                    {terminal.address || '-'}
                  </td>
                  <td style={{ padding: '0.25rem', textAlign: 'center', fontSize: '0.875rem' }}>
                    {terminal.mapUrl ? (
                      <a
                        href={terminal.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
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
                  <td style={{ padding: '0.25rem', textAlign: 'center', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                      <button
                        onClick={(e) => handleCollection(e, terminal)}
                        title={t('terminals.operations.collection', 'Выполнить инкассацию')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#4CAF50',
                          transition: 'all 0.2s',
                          borderRadius: '6px',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.15)';
                          e.currentTarget.style.transform = 'scale(1.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleRepair(e, terminal)}
                        title={t('terminals.operations.repair', 'Выполнить ремонт терминала')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FF9800',
                          transition: 'all 0.2s',
                          borderRadius: '6px',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 152, 0, 0.15)';
                          e.currentTarget.style.transform = 'scale(1.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleMonitoring(e, terminal)}
                        title={t('terminals.operations.monitoring', 'Мониторинг состояния')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2196F3',
                          transition: 'all 0.2s',
                          borderRadius: '6px',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(33, 150, 243, 0.15)';
                          e.currentTarget.style.transform = 'scale(1.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                          <path d="M7 8h10M7 12h10M7 16h4" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedTerminal && (
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
            padding: '1rem',
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
              <div style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #B19CD9' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {t('terminals.management.editTerminal', 'Редактирование терминала')} - {selectedTerminal.idTerminal}
                </h2>
              </div>
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
              <TerminalEditForm terminalId={selectedTerminal.id} onSave={handleCloseModal} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TerminalManagementPage;
