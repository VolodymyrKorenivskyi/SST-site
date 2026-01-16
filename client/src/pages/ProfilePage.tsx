import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';

interface Session {
  id: string;
  isCurrent: boolean;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

function ProfilePage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await apiClient.get('/users/me/sessions');
      setSessions(response.data.data.sessions);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Ви впевнені, що хочете видалити цю сесію?')) {
      return;
    }

    try {
      await apiClient.delete(`/users/me/sessions/${sessionId}`);
      await loadSessions(); // Перезавантажити список
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Помилка видалення сесії');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceInfo = (userAgent: string) => {
    if (!userAgent) return 'Невідомо';
    
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS') || userAgent.includes('iPhone')) return 'iOS';
    
    return 'Інший пристрій';
  };

  if (loading) {
    return <div>{t('auth.loading')}</div>;
  }

  if (!user) {
    return <div>{t('profile.userNotFound')}</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>{t('profile.title')}</h2>

      {/* Інформація про користувача */}
      <div style={{ 
        backgroundColor: '#2a2a2a', 
        padding: '1.5rem', 
        borderRadius: '8px', 
        marginBottom: '2rem' 
      }}>
        <h3 style={{ marginTop: 0 }}>{t('profile.personalInfo')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          <div>
            <strong>Ім'я:</strong> {user.firstName} {user.middleName || ''} {user.lastName}
          </div>
          {user.phone && (
            <div>
              <strong>Телефон:</strong> {user.phone}
            </div>
          )}
          {user.companyName && (
            <div>
              <strong>Компанія:</strong> {user.companyName}
            </div>
          )}
          {user.jobTitle && (
            <div>
              <strong>Посада:</strong> {user.jobTitle}
            </div>
          )}
          <div>
            <strong>Ролі:</strong> {user.roles.join(', ')}
          </div>
        </div>
      </div>

      {/* Активні сесії */}
      <div style={{ 
        backgroundColor: '#2a2a2a', 
        padding: '1.5rem', 
        borderRadius: '8px' 
      }}>
        <h3 style={{ marginTop: 0 }}>{t('profile.activeSessions')}</h3>
        
        {loadingSessions ? (
          <div>{t('profile.loadingSessions')}</div>
        ) : sessions.length === 0 ? (
          <div>{t('profile.noSessions')}</div>
        ) : (
          <div>
            <p style={{ color: '#888', marginBottom: '1rem' }}>
              Всього активних сесій: {sessions.length}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #555', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Пристрій</th>
                  <th style={{ padding: '0.75rem' }}>IP адреса</th>
                  <th style={{ padding: '0.75rem' }}>Остання активність</th>
                  <th style={{ padding: '0.75rem' }}>Статус</th>
                  <th style={{ padding: '0.75rem' }}>Дії</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr 
                    key={session.id} 
                    style={{ 
                      borderBottom: '1px solid #444',
                      backgroundColor: session.isCurrent ? '#333' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      {getDeviceInfo(session.userAgent)}
                      {session.isCurrent && (
                        <span style={{ 
                          marginLeft: '0.5rem', 
                          color: '#B19CD9',
                          fontWeight: 'bold'
                        }}>
                          (Поточна)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{session.ipAddress}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatDate(session.lastActivityAt)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {session.isCurrent ? (
                        <span style={{ color: '#B19CD9' }}>Активна</span>
                      ) : (
                        <span style={{ color: '#888' }}>Інша сесія</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {!session.isCurrent && (
                        <button
                          onClick={() => deleteSession(session.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#d32f2f',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                          }}
                        >
                          Видалити
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
