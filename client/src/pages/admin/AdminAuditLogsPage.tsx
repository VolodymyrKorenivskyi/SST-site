import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api';

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  details: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

function AdminAuditLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const limit = 50;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (actionFilter) params.append('action', actionFilter);
      if (userIdFilter) params.append('userId', userIdFilter);

      const response = await apiClient.get(`/admin/audit-logs?${params.toString()}`);
      if (response.data.success) {
        setLogs(response.data.data.logs);
        setTotal(response.data.data.pagination.total);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('admin.auditLogs.error', 'Error loading logs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, userIdFilter]);

  const getActionColor = (action: string) => {
    if (action.includes('login')) return '#4caf50';
    if (action.includes('block') || action.includes('delete')) return '#f44336';
    if (action.includes('create') || action.includes('assign')) return '#2196f3';
    return '#ff9800';
  };

  const handleClearLogs = async () => {
    try {
      setClearing(true);
      setError(null);
      await apiClient.delete('/admin/audit-logs');
      setShowClearConfirm(false);
      setPage(1);
      fetchLogs();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('admin.auditLogs.clearLogsError', 'Ошибка удаления логов'));
    } finally {
      setClearing(false);
    }
  };

  return (
    <div style={{ color: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 600 }}>
          {t('admin.auditLogs.title', 'Логи аудиту')}
        </h1>
        <button
          onClick={() => setShowClearConfirm(true)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {t('admin.auditLogs.clearLogs', 'Очистить лог')}
        </button>
      </div>

      {/* Фільтри */}
      <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
            {t('admin.auditLogs.action')}:
          </label>
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder={t('admin.auditLogs.actionPlaceholder')}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#2a2a2a',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
            {t('admin.auditLogs.userId')}:
          </label>
          <input
            type="number"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            placeholder={t('admin.auditLogs.userId') + ': 1, 2, 3...'}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#2a2a2a',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
            }}
          />
        </div>
        <button
          onClick={() => {
            setPage(1);
            fetchLogs();
          }}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#B19CD9',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            height: 'fit-content',
          }}
        >
          {t('admin.auditLogs.filter')}
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#d32f2f', color: '#fff', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>{t('auth.loading')}</div>
      ) : (
        <>
          <div style={{ backgroundColor: '#2a2a2a', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#333', borderBottom: '1px solid #555' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.auditLogs.table.id')}</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.auditLogs.table.user')}</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.auditLogs.table.action')}</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.auditLogs.table.entityType')}</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.auditLogs.table.ip')}</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.auditLogs.table.date')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                      {t('admin.auditLogs.notFound')}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #444' }}>
                      <td style={{ padding: '1rem', color: '#fff' }}>{log.id}</td>
                      <td style={{ padding: '1rem', color: '#fff' }}>
                        {log.userName ? (
                          <div>
                            <div>{log.userName}</div>
                            <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{log.userEmail}</div>
                          </div>
                        ) : log.userId ? (
                          `ID: ${log.userId}`
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: getActionColor(log.action),
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            color: '#fff',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#fff' }}>
                        {log.entityType || '-'} {log.entityId ? `#${log.entityId}` : ''}
                      </td>
                      <td style={{ padding: '1rem', color: '#fff', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {log.ipAddress || '-'}
                      </td>
                      <td style={{ padding: '1rem', color: '#fff', fontSize: '0.9rem' }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Пагінація */}
          {total > limit && (
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: page === 1 ? '#555' : '#B19CD9',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                {t('common.pagination.back', 'Back')}
              </button>
              <span style={{ color: '#fff' }}>
                {t('common.pagination.page', 'Page')} {page} {t('common.pagination.of', 'of')} {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
                disabled={page >= Math.ceil(total / limit)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: page >= Math.ceil(total / limit) ? '#555' : '#B19CD9',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: page >= Math.ceil(total / limit) ? 'not-allowed' : 'pointer',
                }}
              >
                {t('common.pagination.next', 'Next')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Модальне вікно підтвердження */}
      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              border: '1px solid #555',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#fff', fontSize: '1.5rem' }}>
              {t('admin.auditLogs.clearLogsConfirm', 'Вы уверены, что хотите удалить весь журнал с логами?')}
            </h2>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#555',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: clearing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {t('admin.auditLogs.no', 'Нет')}
              </button>
              <button
                onClick={handleClearLogs}
                disabled={clearing}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f44336',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: clearing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {clearing ? t('auth.loading') : t('admin.auditLogs.yes', 'Да')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAuditLogsPage;
