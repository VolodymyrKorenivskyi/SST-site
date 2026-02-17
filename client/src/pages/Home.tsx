import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../services/api';
import { useAuth } from '../hooks/useAuth';

function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading, refetch } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    twoFactorCode: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Якщо користувач вже авторизований - показуємо звичайний контент
  if (authLoading) {
    return <div style={{ color: '#ffffff', textAlign: 'center', padding: '2rem' }}>{t('auth.loading')}</div>;
  }

  if (user) {
    return (
      <div style={{ color: '#ffffff' }}>
        <h2 style={{ 
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#ffffff',
          marginBottom: '1.5rem'
        }}>
          {t('home.title')}
        </h2>
        <div style={{ marginTop: '2rem' }}>
          <p style={{ color: '#ffffff', fontSize: '1rem', lineHeight: '1.6' }}>
            {t('home.description')}
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Валідація email на клієнті
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      setErrors([t('auth.validation.invalidEmail', 'Invalid email address')]);
      return;
    }

    if (!formData.password) {
      setErrors([t('auth.validation.passwordRequired', 'Password is required')]);
      return;
    }

    setLoading(true);

    try {
      if (requires2FA && tempToken) {
        // Другий крок - підтвердження 2FA
        const response = await apiClient.post('/auth/login/verify-2fa', {
          tempToken,
          code: formData.twoFactorCode,
        });

        if (response.data.success) {
          // Оновлюємо дані користувача
          await refetch();
          navigate('/');
        }
      } else {
        // Перший крок - логін
        const response = await apiClient.post('/auth/login', {
          email: formData.email,
          password: formData.password,
        });

        if (response.data.requires2FA) {
          setRequires2FA(true);
          setTempToken(response.data.tempToken);
        } else if (response.data.success) {
          // Оновлюємо дані користувача
          console.log('✅ Login successful, refreshing user data...');
          console.log('✅ Response data:', response.data);
          // Затримка перед оновленням, щоб сесія точно збереглася в cookie
          await new Promise(resolve => setTimeout(resolve, 500));
          try {
            await refetch();
            console.log('✅ User data refreshed after login');
            // Після успішного оновлення даних - сторінка автоматично перерендериться
            // через React, оскільки user зміниться в useAuth
          } catch (refetchError) {
            console.error('❌ Error refetching user:', refetchError);
            // Якщо помилка - показуємо повідомлення, але не перезавантажуємо
            setErrors([t('auth.errorLoadingUser')]);
          }
        }
      }
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = errorCode ? t(`auth.errors.${errorCode}`, error.response?.data?.error?.message) : (error.response?.data?.error?.message || t('auth.errors.INTERNAL_ERROR'));
      setErrors([errorMessage]);

      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        setShowResendVerification(true);
      } else {
        setShowResendVerification(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      setErrors([t('auth.validation.emailRequired', 'Email is required')]);
      return;
    }

    setResendLoading(true);
    setResendSuccess(false);
    setErrors([]);

    try {
      const response = await apiClient.post('/auth/resend-verification', {
        email: formData.email,
      });

      if (response.data.success) {
        setResendSuccess(true);
        setShowResendVerification(false);

        // В dev режиме сервер может вернуть код
        if (response.data.developmentCode) {
          setErrors([`🔐 КОД ПОДТВЕРЖДЕНИЯ (для разработки): ${response.data.developmentCode}`]);
        }

        setTimeout(() => {
          setResendSuccess(false);
        }, 10000);
      }
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = errorCode
        ? t(`auth.errors.${errorCode}`, error.response?.data?.error?.message)
        : (error.response?.data?.error?.message || t('auth.errors.INTERNAL_ERROR'));
      setErrors([errorMessage]);
    } finally {
      setResendLoading(false);
    }
  };

  // Форма входу для неавторизованих користувачів
  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '2rem auto', 
      padding: '2rem',
      backgroundColor: '#2a2a2a',
      borderRadius: '8px'
    }}>
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#fff', textAlign: 'center' }}>
        {t('auth.login')}
      </h2>

      {resendSuccess && !errors.some(e => e.includes('КОД ПОДТВЕРЖДЕНИЯ')) && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#2e7d32',
          color: '#fff',
          borderRadius: '4px',
        }}>
          {t('auth.verificationCodeSent', 'Verification code sent to your email')}
        </div>
      )}

      {errors.length > 0 && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#d32f2f',
          color: '#fff',
          borderRadius: '4px',
        }}>
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
          {showResendVerification && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '0.9rem',
                  backgroundColor: resendLoading ? '#555' : '#B19CD9',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: resendLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {resendLoading ? t('auth.loading') : t('auth.resendVerification', 'Resend verification code')}
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {!requires2FA ? (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: '#fff',
                fontWeight: 'bold'
              }}>
                Email:
              </label>
              <input
                type="text"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  backgroundColor: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: '#fff',
                fontWeight: 'bold'
              }}>
                {t('auth.password', 'Пароль')}:
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  backgroundColor: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </>
        ) : (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: '#fff',
              fontWeight: 'bold'
            }}>
              {t('auth.2faCode', 'Код з Google Authenticator')}:
            </label>
              <input
                type="text"
                value={formData.twoFactorCode}
                onChange={(e) => setFormData({ ...formData, twoFactorCode: e.target.value })}
              placeholder="000000"
              maxLength={6}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                backgroundColor: '#1a1a1a',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            backgroundColor: loading ? '#555' : '#B19CD9',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '1rem',
          }}
        >
          {loading ? t('auth.loading', 'Завантаження...') : requires2FA ? t('auth.verify', 'Підтвердити') : t('auth.login')}
        </button>

        {!requires2FA && (
          <div style={{ textAlign: 'center', color: '#888' }}>
            <p style={{ margin: 0 }}>
              {t('auth.noAccount', 'Немає облікового запису?')}{' '}
              <Link to="/register" style={{ color: '#B19CD9', textDecoration: 'none' }}>
                {t('auth.register')}
              </Link>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}

export default Home;
