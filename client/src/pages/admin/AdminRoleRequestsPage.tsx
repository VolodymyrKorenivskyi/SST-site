import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api';

interface RoleRequest {
  id: number;
  userId: number;
  requestedRoleId: number;
  status: string;
  message?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: number;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
  requestedRole?: {
    id: number;
    name: string;
  };
  reviewer?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
}

function AdminRoleRequestsPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [selectedRequest, setSelectedRequest] = useState<RoleRequest | null>(null);
  const [reviewMessage, setReviewMessage] = useState('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const response = await apiClient.get(`/role-requests${params}`);
      if (response.data.success) {
        setRequests(response.data.data.requests);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('admin.roleRequests.error', 'Error loading requests'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleReview = async (requestId: number, status: 'approved' | 'rejected') => {
    try {
      await apiClient.post(`/role-requests/${requestId}/review`, {
        status,
        message: reviewMessage || undefined,
      });
      setSelectedRequest(null);
      setReviewMessage('');
      fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('admin.roleRequests.reviewError', 'Error reviewing request'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#4caf50';
      case 'rejected':
        return '#f44336';
      case 'pending':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <div style={{ color: '#ffffff' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 600 }}>
        {t('admin.roleRequests.title', 'Заявки на ролі')}
      </h1>

      {/* Фільтр */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
          {t('admin.users.status')}:
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{
            padding: '0.75rem',
            backgroundColor: '#2a2a2a',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px',
            minWidth: '200px',
          }}
        >
          <option value="">{t('admin.users.all')}</option>
          <option value="pending">{t('admin.roleRequests.pending')}</option>
          <option value="approved">{t('admin.roleRequests.approved')}</option>
          <option value="rejected">{t('admin.roleRequests.rejected')}</option>
        </select>
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#d32f2f', color: '#fff', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>{t('auth.loading')}</div>
      ) : (
        <div style={{ backgroundColor: '#2a2a2a', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#333', borderBottom: '1px solid #555' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.users.table.id')}</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.auditLogs.table.user')}</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.roleRequests.review.requestedRole')}</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.users.status')}</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.auditLogs.table.date')}</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#fff' }}>{t('admin.users.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                    {t('admin.roleRequests.notFound')}
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} style={{ borderBottom: '1px solid #444' }}>
                    <td style={{ padding: '1rem', color: '#fff' }}>{request.id}</td>
                    <td style={{ padding: '1rem', color: '#fff' }}>
                      {request.user ? (
                        <div>
                          <div>{request.user.firstName} {request.user.lastName}</div>
                          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{request.user.email}</div>
                        </div>
                      ) : (
                        t('admin.roleRequests.unknown', 'Unknown')
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: '#fff' }}>
                      {request.requestedRole?.name || t('admin.roleRequests.unknownRole', 'Unknown role')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: getStatusColor(request.status),
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          color: '#fff',
                        }}
                      >
                        {request.status === 'pending' ? t('admin.roleRequests.pending') : request.status === 'approved' ? t('admin.roleRequests.approved') : t('admin.roleRequests.rejected')}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#fff' }}>
                      {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {request.status === 'pending' && (
                        <button
                          onClick={() => setSelectedRequest(request)}
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
                          {t('admin.roleRequests.review.title')}
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

      {/* Модальне вікно для розгляду */}
      {selectedRequest && (
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
          }}
          onClick={() => setSelectedRequest(null)}
        >
          <div
            style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              color: '#fff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>{t('admin.roleRequests.review.title')}</h2>
            <p>
              <strong>{t('admin.roleRequests.review.user')}:</strong> {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}
            </p>
            <p>
              <strong>{t('admin.roleRequests.review.email')}:</strong> {selectedRequest.user?.email}
            </p>
            <p>
              <strong>{t('admin.roleRequests.review.requestedRole')}:</strong> {selectedRequest.requestedRole?.name}
            </p>
            {selectedRequest.message && (
              <p>
                <strong>{t('admin.roleRequests.review.message')}:</strong> {selectedRequest.message}
              </p>
            )}
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                {t('admin.roleRequests.review.comment')}:
              </label>
              <textarea
                value={reviewMessage}
                onChange={(e) => setReviewMessage(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.75rem',
                  backgroundColor: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setReviewMessage('');
                }}
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
                onClick={() => handleReview(selectedRequest.id, 'rejected')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f44336',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {t('admin.roleRequests.review.reject')}
              </button>
              <button
                onClick={() => handleReview(selectedRequest.id, 'approved')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {t('admin.roleRequests.review.approve')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRoleRequestsPage;
