import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api';

interface Setting {
  key: string;
  value: string;
  description: string;
  valueType: string;
  updatedAt: string;
}

function AdminSettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/admin/settings');
      if (response.data.success) {
        setSettings(response.data.data.settings);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('admin.settings.error', 'Error loading settings'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleEdit = (setting: Setting) => {
    setEditingKey(setting.key);
    setEditValue(setting.value);
  };

  const handleSave = async (key: string) => {
    try {
      await apiClient.patch(`/admin/settings/${key}`, { value: editValue });
      setEditingKey(null);
      setSuccess(t('admin.settings.saved', 'Settings updated'));
      fetchSettings();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('admin.settings.saveError', 'Error updating setting'));
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const getInputType = (valueType: string) => {
    switch (valueType.toLowerCase()) {
      case 'boolean':
        return 'checkbox';
      case 'number':
        return 'number';
      case 'email':
        return 'email';
      default:
        return 'text';
    }
  };

  return (
    <div style={{ color: '#ffffff' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 600 }}>
        {t('admin.settings.title', 'Налаштування системи')}
      </h1>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#d32f2f', color: '#fff', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#4caf50', color: '#fff', borderRadius: '4px' }}>
          {success}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>{t('auth.loading')}</div>
      ) : (
        <div style={{ backgroundColor: '#2a2a2a', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#333', borderBottom: '1px solid #555' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.settings.key')}</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.settings.value')}</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.settings.description')}</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.settings.updated')}</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.users.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {settings.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                    {t('admin.settings.notFound')}
                  </td>
                </tr>
              ) : (
                settings.map((setting) => (
                  <tr key={setting.key} style={{ borderBottom: '1px solid #444' }}>
                    <td style={{ padding: '1rem', color: '#fff', fontFamily: 'monospace' }}>
                      {setting.key}
                    </td>
                    <td style={{ padding: '1rem', color: '#fff' }}>
                      {editingKey === setting.key ? (
                        <input
                          type={getInputType(setting.valueType)}
                          value={editValue}
                          onChange={(e) => {
                            if (setting.valueType.toLowerCase() === 'boolean') {
                              setEditValue(e.target.checked ? 'true' : 'false');
                            } else {
                              setEditValue(e.target.value);
                            }
                          }}
                          checked={setting.valueType.toLowerCase() === 'boolean' ? editValue === 'true' : undefined}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            backgroundColor: '#1a1a1a',
                            color: '#fff',
                            border: '1px solid #555',
                            borderRadius: '4px',
                          }}
                        />
                      ) : (
                        <span>{setting.value}</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: '#aaa', fontSize: '0.9rem' }}>
                      {setting.description}
                    </td>
                    <td style={{ padding: '1rem', color: '#aaa', fontSize: '0.85rem' }}>
                      {new Date(setting.updatedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {editingKey === setting.key ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleSave(setting.key)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#4caf50',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                            }}
                          >
                            {t('admin.settings.save')}
                          </button>
                          <button
                            onClick={handleCancel}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#555',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                            }}
                          >
                            {t('admin.settings.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(setting)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#B19CD9',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                          }}
                        >
                          {t('admin.settings.edit')}
                        </button>
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

export default AdminSettingsPage;
