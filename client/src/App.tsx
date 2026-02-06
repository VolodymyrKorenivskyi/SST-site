import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from './components/Layout';
import Home from './pages/Home';
import StatusPage from './pages/StatusPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminRoleRequestsPage from './pages/admin/AdminRoleRequestsPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import TerminalsPage from './pages/terminals/TerminalsPage';
import TerminalManagementPage from './pages/terminals/TerminalManagementPage';
import SearchLocationsPage from './pages/terminals/SearchLocationsPage';
import { useAuth } from './hooks/useAuth';

function App() {
  const { t } = useTranslation();
  const { user, loading, isGuest, error } = useAuth();

  // Діагностика (видаліть пізніше)
  console.log('🔍 App render:', { loading, user: user ? { id: user.id, email: user.email, roles: user.roles } : null, error });

  // Показуємо завантаження поки дані завантажуються
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: '#ffffff'
      }}>
        <div>{t('auth.loading')}</div>
      </div>
    );
  }

  // Показуємо сторінку статусу для Guest без затвердженої ролі
  if (user && isGuest() && !user.hasApprovedRole) {
    return (
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/terminals" replace />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/home" element={<Home />} />
          <Route path="/terminals" element={<TerminalsPage />} />
          <Route path="*" element={<Navigate to="/terminals" replace />} />
        </Routes>
      </Layout>
    );
  }

  // Якщо є помилка - показуємо повідомлення
  if (error) {
    console.error('❌ App error:', error);
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/terminals" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        {/* Admin routes */}
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/role-requests" element={<AdminRoleRequestsPage />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        {/* Terminals routes */}
        <Route path="/terminals" element={<TerminalsPage />} />
        <Route path="/terminals/search-locations" element={<SearchLocationsPage />} />
        <Route path="/terminals/management" element={<TerminalManagementPage />} />
        {/* TODO: Додати інші маршрути для Manager, Director */}
        <Route path="*" element={<Navigate to="/terminals" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
