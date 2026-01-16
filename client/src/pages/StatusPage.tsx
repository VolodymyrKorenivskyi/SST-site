import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';

function StatusPage() {
  const { t } = useTranslation();
  const { user, loading, refetch } = useAuth();
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient
      .get('/users/roles')
      .then((response) => {
        const roles = response.data.data.roles;
        setAvailableRoles(roles);
        // Діагностика (видалити пізніше)
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Roles loaded:', roles.map((r: any) => ({ id: r.id, name: r.name })));
        }
      })
      .catch((error) => {
        console.error('Error loading roles:', error);
      });
  }, []);

  const handleSubmitRequest = async () => {
    if (!selectedRoleId) {
      alert(t('status.selectRole'));
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/role-requests', {
        requestedRoleId: selectedRoleId,
        message: message || undefined,
      });
      alert(t('status.requestSubmitted'));
      setMessage('');
      setSelectedRoleId(null);
      refetch();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || t('status.requestError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>{t('auth.loading')}</div>;
  }

  if (user && user.hasApprovedRole) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>✅ {t('status.accountActivated')}</h2>
        <p>{t('status.accessGranted')}</p>
        <p>{t('status.yourRoles')}: {user.roles.join(', ')}</p>
      </div>
    );
  }

  if (user && user.pendingRequests && user.pendingRequests.length > 0) {
    const pendingRequest = user.pendingRequests[0];
    // Знаходимо роль в доступних ролях
    const role = availableRoles.find((r) => r.id === pendingRequest.requestedRoleId);
    
    // Діагностика (видалити пізніше)
    if (process.env.NODE_ENV === 'development') {
      if (!role) {
        console.log('⚠️ Role not found:', {
          requestedRoleId: pendingRequest.requestedRoleId,
          availableRoles: availableRoles.map(r => ({ id: r.id, name: r.name })),
        });
      } else {
        console.log('✅ Role found:', { id: role.id, name: role.name });
      }
    }

    return (
      <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h2>⏳ {t('status.requestPending')}</h2>
        <p>{t('status.requestReviewing', { role: role?.name || t('admin.roleRequests.unknownRole') })}</p>
        <p>{t('status.willNotify')}</p>
        {pendingRequest.message && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
            <strong>{t('status.yourMessage')}:</strong>
            <p>{pendingRequest.message}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h2>{t('status.requestTitle')}</h2>
      <p style={{ marginBottom: '2rem', color: '#888' }}>
        {t('status.requestDescription')}
      </p>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          {t('status.selectAccessLevel')}:
        </label>
        <select
          value={selectedRoleId || ''}
          onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            backgroundColor: '#2a2a2a',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px',
          }}
        >
          <option value="">-- {t('status.selectRole')} --</option>
          {availableRoles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name} {role.description ? `- ${role.description}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          {t('status.message')}:
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('status.messagePlaceholder')}
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            backgroundColor: '#2a2a2a',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <button
        onClick={handleSubmitRequest}
        disabled={!selectedRoleId || submitting}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          fontWeight: 'bold',
          backgroundColor: selectedRoleId && !submitting ? '#B19CD9' : '#555',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: selectedRoleId && !submitting ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? t('status.submitting') : t('status.submitRequest')}
      </button>
    </div>
  );
}

export default StatusPage;
