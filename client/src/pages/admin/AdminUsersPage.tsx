import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  status: string;
  isEmailVerified: boolean;
  is2FAEnabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface UserRole {
  id: number;
  name: string;
  description: string;
}

interface UserDetails extends Omit<User, 'roles'> {
  phone?: string | null;
  telegram?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  timezone: string;
  country?: string | null;
  language: string;
  roles: UserRole[];
  allRoles: UserRole[];
}

function AdminUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    telegram: '',
    companyName: '',
    jobTitle: '',
    timezone: '',
    country: '',
    language: '',
    status: '',
  });
  const [loadingUser, setLoadingUser] = useState(false);
  const limit = 20;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await apiClient.get(`/admin/users?${params.toString()}`);
      if (response.data.success) {
        setUsers(response.data.data.users);
        setTotal(response.data.data.pagination.total);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('admin.users.error', 'Error loading users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleViewUser = async (userId: number) => {
    try {
      setLoadingUser(true);
      setError(null);
      const response = await apiClient.get(`/admin/users/${userId}`);
      if (response.data.success) {
        const userData = response.data.data;
        setSelectedUser({
          ...userData.user,
          roles: userData.roles,
          allRoles: userData.roles, // Використаємо наявні ролі як всі доступні
        });
        setEditForm({
          firstName: userData.user.firstName || '',
          middleName: userData.user.middleName || '',
          lastName: userData.user.lastName || '',
          phone: userData.user.phone || '',
          telegram: userData.user.telegram || '',
          companyName: userData.user.companyName || '',
          jobTitle: userData.user.jobTitle || '',
          timezone: userData.user.timezone || '',
          country: userData.user.country || '',
          language: userData.user.language || '',
          status: userData.user.status || '',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Помилка завантаження даних користувача');
    } finally {
      setLoadingUser(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    try {
      setLoadingUser(true);
      setError(null);
      const response = await apiClient.patch(`/admin/users/${selectedUser.id}`, editForm);
      if (response.data.success) {
      setSuccess(t('admin.users.saved', 'User data updated'));
      setSelectedUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('admin.users.saveError', 'Error updating user data'));
    } finally {
      setLoadingUser(false);
    }
  };

  const handleAssignRole = async (roleId: number) => {
    if (!selectedUser) return;
    try {
      setError(null);
      await apiClient.post(`/admin/users/${selectedUser.id}/assign-role`, { roleId });
      setSuccess(t('admin.users.roleAssigned', 'Role assigned'));
      handleViewUser(selectedUser.id);
      fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('admin.users.assignRoleError', 'Error assigning role'));
    }
  };

  const handleRemoveRole = async (roleId: number) => {
    if (!selectedUser) return;
    try {
      setError(null);
      await apiClient.delete(`/admin/users/${selectedUser.id}/remove-role`, { data: { roleId } });
      setSuccess(t('admin.users.roleRemoved', 'Role removed'));
      handleViewUser(selectedUser.id);
      fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('admin.users.removeRoleError', 'Error removing role'));
    }
  };

  // Отримання доступних ролей
  const availableRoles = [
    { id: 1, name: 'Guest' },
    { id: 2, name: 'Manager' },
    { id: 3, name: 'Administrator' },
    { id: 4, name: 'Director' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4caf50';
      case 'blocked':
        return '#f44336';
      case 'deleted':
        return '#9e9e9e';
      default:
        return '#ff9800';
    }
  };

  return (
    <div style={{ color: '#ffffff' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 600 }}>
        {t('admin.users.title', 'Управление пользователями')}
      </h1>

      {/* Фільтри */}
      <form onSubmit={handleSearch} style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
              {t('admin.users.search')}:
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.users.searchPlaceholder')}
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
              {t('admin.users.role')}:
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#2a2a2a',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
              }}
            >
              <option value="">{t('admin.users.all')}</option>
              <option value="Guest">Guest</option>
              <option value="Manager">Manager</option>
              <option value="Director">Director</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
              {t('admin.users.status')}:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#2a2a2a',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
              }}
            >
              <option value="">{t('admin.users.all')}</option>
              <option value="active">{t('admin.users.active')}</option>
              <option value="blocked">{t('admin.users.blocked')}</option>
              <option value="deleted">{t('admin.users.deleted')}</option>
            </select>
          </div>
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#B19CD9',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {t('admin.users.search')}
          </button>
        </div>
      </form>

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
        <>
          {/* Таблиця користувачів */}
          <div style={{ backgroundColor: '#2a2a2a', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#333', borderBottom: '1px solid #555' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.users.table.id')}</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.users.table.email')}</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.users.table.name')}</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.users.table.roles')}</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.users.table.status')}</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>2FA</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.users.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                      {t('admin.users.notFound')}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #444' }}>
                      <td style={{ padding: '1rem', color: '#fff' }}>{user.id}</td>
                      <td style={{ padding: '1rem', color: '#fff' }}>{user.email}</td>
                      <td style={{ padding: '1rem', color: '#fff' }}>
                        {user.firstName} {user.lastName}
                      </td>
                      <td style={{ padding: '1rem', color: '#fff' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {user.roles.map((role) => (
                            <span
                              key={role}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#333',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                              }}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: getStatusColor(user.status),
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            color: '#fff',
                          }}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#fff' }}>
                        {user.is2FAEnabled ? '✓' : '✗'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <button
                          onClick={() => handleViewUser(user.id)}
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
                          {t('admin.users.edit.title')}
                        </button>
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

      {/* Модальне вікно редагування користувача */}
      {selectedUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '2rem',
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '1200px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              color: '#fff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '0.375rem' }}>{t('admin.users.edit.title')}: {selectedUser.email}</h2>

            {loadingUser ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>{t('auth.loading')}</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {/* Основні дані */}
                <div style={{ border: '1px solid #B19CD9', borderRadius: '4px', padding: '1rem' }}>
                  <h3 style={{ marginBottom: '0.25rem', fontSize: '1.2rem' }}>{t('admin.users.edit.basicInfo')}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.33fr 1.33fr 1.33fr 0.67fr 0.67fr', gap: '0.25rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                        {t('admin.users.edit.firstName')} {t('admin.users.edit.required')}
                      </label>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                        {t('admin.users.edit.middleName')}:
                      </label>
                      <input
                        type="text"
                        value={editForm.middleName}
                        onChange={(e) => setEditForm({ ...editForm, middleName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                        {t('admin.users.edit.lastName')} {t('admin.users.edit.required')}
                      </label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                        {t('admin.users.edit.phone')}:
                      </label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                        {t('admin.users.edit.telegram')}:
                      </label>
                      <input
                        type="text"
                        value={editForm.telegram}
                        onChange={(e) => setEditForm({ ...editForm, telegram: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Робота */}
                <div style={{ border: '1px solid #B19CD9', borderRadius: '4px', padding: '1rem' }}>
                  <h3 style={{ marginBottom: '0.25rem', fontSize: '1.2rem' }}>{t('admin.users.edit.work')}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.25rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                        {t('admin.users.edit.company')}:
                      </label>
                      <input
                        type="text"
                        value={editForm.companyName}
                        onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                        {t('admin.users.edit.jobTitle')}:
                      </label>
                      <input
                        type="text"
                        value={editForm.jobTitle}
                        onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Налаштування */}
                <div style={{ border: '1px solid #B19CD9', borderRadius: '4px', padding: '1rem' }}>
                  <h3 style={{ marginBottom: '0.25rem', fontSize: '1.2rem' }}>{t('admin.users.edit.settings')}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.25rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                        {t('admin.users.edit.timezone')}:
                      </label>
                      <input
                        type="text"
                        value={editForm.timezone}
                        onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                        {t('admin.users.edit.country')}:
                      </label>
                      <input
                        type="text"
                        value={editForm.country}
                        onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                        {t('admin.users.edit.language')}:
                      </label>
                      <select
                        value={editForm.language}
                        onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px',
                        }}
                      >
                        <option value="ru">{t('language.ru')}</option>
                        <option value="en">{t('language.en')}</option>
                        <option value="ky">{t('language.ky')}</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                        {t('admin.users.status')}:
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #555',
                          borderRadius: '4px',
                        }}
                      >
                        <option value="active">{t('admin.users.active')}</option>
                        <option value="blocked">{t('admin.users.blocked')}</option>
                        <option value="deleted">{t('admin.users.deleted')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Ролі */}
                <div style={{ border: '1px solid #B19CD9', borderRadius: '4px', padding: '1rem' }}>
                  <h3 style={{ marginBottom: '0.25rem', fontSize: '1.2rem' }}>{t('admin.users.edit.roles')}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {selectedUser.roles.map((role) => (
                      <div
                        key={role.id}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#333',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span>{role.name}</span>
                        {role.id !== 1 && (
                          <button
                            onClick={() => handleRemoveRole(role.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#f44336',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssignRole(parseInt(e.target.value));
                        e.target.value = '';
                      }
                    }}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#1a1a1a',
                      color: '#fff',
                      border: '1px solid #555',
                      borderRadius: '4px',
                      width: '200px',
                    }}
                  >
                    <option value="">{t('admin.users.edit.addRole')}</option>
                    {availableRoles
                      .filter((role) => !selectedUser.roles.find((r) => r.id === role.id))
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Кнопки */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => setSelectedUser(null)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#555',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {t('admin.users.edit.cancel')}
                  </button>
                  <button
                    onClick={handleSaveUser}
                    disabled={loadingUser}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#4caf50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loadingUser ? 'not-allowed' : 'pointer',
                      opacity: loadingUser ? 0.6 : 1,
                    }}
                  >
                    {loadingUser ? t('admin.users.edit.saving') : t('admin.users.edit.save')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsersPage;
