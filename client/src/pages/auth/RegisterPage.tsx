import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api';

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    companyName: '',
    jobTitle: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    // Валідація обов'язкових полів
    const validationErrors: string[] = [];

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      validationErrors.push(t('auth.validation.emailRequired', 'Email is required'));
    } else if (!emailRegex.test(formData.email)) {
      validationErrors.push(t('auth.validation.invalidEmail', 'Invalid email address'));
    }

    // Password
    if (!formData.password) {
      validationErrors.push(t('auth.validation.passwordRequired', 'Password is required'));
    } else {
      if (formData.password.length < 8) {
        validationErrors.push(t('auth.validation.passwordMinLength', 'Password must contain at least 8 characters'));
      }
      if (!/[a-z]/.test(formData.password)) {
        validationErrors.push(t('auth.validation.passwordLowercase', 'Password must contain at least one lowercase letter'));
      }
      if (!/[A-Z]/.test(formData.password)) {
        validationErrors.push(t('auth.validation.passwordUppercase', 'Password must contain at least one uppercase letter'));
      }
      if (!/\d/.test(formData.password)) {
        validationErrors.push(t('auth.validation.passwordDigit', 'Password must contain at least one digit'));
      }
      if (!/[@$!%*?&]/.test(formData.password)) {
        validationErrors.push(t('auth.validation.passwordSpecial', 'Password must contain at least one special character (@$!%*?&)'));
      }
    }

    // Confirm Password
    if (!formData.confirmPassword) {
      validationErrors.push(t('auth.validation.confirmPasswordRequired', 'Please confirm your password'));
    } else if (formData.password !== formData.confirmPassword) {
      validationErrors.push(t('auth.validation.passwordsDoNotMatch', 'Passwords do not match'));
    }

    // First Name
    if (!formData.firstName) {
      validationErrors.push(t('auth.validation.firstNameRequired', 'First name is required'));
    }

    // Last Name
    if (!formData.lastName) {
      validationErrors.push(t('auth.validation.lastNameRequired', 'Last name is required'));
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        middleName: formData.middleName || undefined,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        companyName: formData.companyName || undefined,
        jobTitle: formData.jobTitle || undefined,
      });

      if (response.data.success) {
        setSuccess(true);
        // Перенаправлення на сторінку статусу через 2 секунди
        setTimeout(() => {
          navigate('/status');
        }, 2000);
      }
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code;
      const errorDetails = error.response?.data?.error?.details;
      
      // Якщо є деталі валідації, показуємо їх
      if (errorCode === 'VALIDATION_ERROR' && errorDetails && Array.isArray(errorDetails)) {
        const detailMessages = errorDetails.map((detail: any) => {
          // Перекладаємо повідомлення про помилки валідації
          const fieldName = detail.field || '';
          const message = detail.message || '';
          
          // Спробуємо знайти переклад для конкретного поля
          const translationKey = `auth.validation.${fieldName}`;
          const translated = t(translationKey, message);
          
          return translated !== translationKey ? translated : message;
        });
        setErrors(detailMessages);
      } else {
        const errorMessage = errorCode ? t(`auth.errors.${errorCode}`, error.response?.data?.error?.message) : (error.response?.data?.error?.message || t('auth.errors.INTERNAL_ERROR'));
        setErrors([errorMessage]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ 
        maxWidth: '400px', 
        margin: '2rem auto', 
        padding: '2rem',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        textAlign: 'center',
        color: '#fff'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#B19CD9' }}>
          ✅ {t('auth.registerSuccess', 'Registration successful!')}
        </h2>
        <p>{t('auth.registerEmailSent', 'A confirmation email has been sent to your email address.')}</p>
        <p>{t('auth.registerCheckEmail', 'Please check your email and follow the link to activate your account.')}</p>
        <p style={{ marginTop: '1rem', color: '#888' }}>
          {t('auth.redirecting', 'Redirecting to status page...')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '500px', 
      margin: '2rem auto', 
      padding: '2rem',
      backgroundColor: '#2a2a2a',
      borderRadius: '8px'
    }}>
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#fff' }}>
        {t('auth.register')}
      </h2>

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
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            color: '#fff',
            fontWeight: 'bold'
          }}>
            Email <span style={{ color: '#d32f2f' }}>*</span>:
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

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            color: '#fff',
            fontWeight: 'bold'
          }}>
            {t('auth.password')} <span style={{ color: '#d32f2f' }}>*</span>:
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

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            color: '#fff',
            fontWeight: 'bold'
          }}>
            {t('auth.confirmPassword', 'Confirm Password')} <span style={{ color: '#d32f2f' }}>*</span>:
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            color: '#fff',
            fontWeight: 'bold'
          }}>
            {t('auth.firstName', 'First Name')} <span style={{ color: '#d32f2f' }}>*</span>:
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            color: '#fff',
            fontWeight: 'bold'
          }}>
            {t('auth.middleName', 'Middle Name')}:
          </label>
          <input
            type="text"
            value={formData.middleName}
            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
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

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            color: '#fff',
            fontWeight: 'bold'
          }}>
            {t('auth.lastName', 'Last Name')} <span style={{ color: '#d32f2f' }}>*</span>:
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            color: '#fff',
            fontWeight: 'bold'
          }}>
            {t('auth.phone', 'Phone')}:
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            color: '#fff',
            fontWeight: 'bold'
          }}>
            {t('auth.companyName', 'Company')}:
          </label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
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
            {t('auth.jobTitle', 'Job Title')}:
          </label>
          <input
            type="text"
            value={formData.jobTitle}
            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
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
          {loading ? t('auth.loading') : t('auth.register')}
        </button>

        <div style={{ textAlign: 'center', color: '#888' }}>
          <p style={{ margin: 0 }}>
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" style={{ color: '#B19CD9', textDecoration: 'none' }}>
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default RegisterPage;
