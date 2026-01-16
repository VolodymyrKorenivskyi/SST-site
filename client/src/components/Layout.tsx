import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import Navigation from './Navigation';

interface LayoutProps {
  children: ReactNode;
}

// Компонент кнопок авторизації або профілю
function AuthButtons() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  
  // Діагностика (видаліть пізніше)
  console.log('🔍 AuthButtons render:', { 
    loading, 
    user: user ? { id: user.id, email: user.email, roles: user.roles } : null 
  });
  
  if (loading) {
    return null;
  }

  if (user) {
    // Якщо користувач авторизований - показуємо посилання на профіль
    return (
      <Link
        to="/profile"
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#333',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          transition: 'background-color 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#444';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#333';
        }}
      >
        👤 {user.firstName} {user.lastName}
      </Link>
    );
  }

  // Якщо користувач не авторизований - показуємо кнопки логіну та реєстрації
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Link
        to="/login"
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#333',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#444';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#333';
        }}
      >
        {t('auth.login')}
      </Link>
      <Link
        to="/register"
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#B19CD9',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#C4B5FD';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#B19CD9';
        }}
      >
        {t('auth.register')}
      </Link>
    </div>
  );
}

function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const languages = [
    { code: 'ru', label: 'RU' },
    { code: 'en', label: 'EN' },
    { code: 'ky', label: 'KY' },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setShowLanguageMenu(false);
  };

  const toggleLanguageMenu = () => {
    setShowLanguageMenu(!showLanguageMenu);
  };

  // Діагностика (видаліть пізніше)
  console.log('🔍 Layout render:', { children: !!children });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        padding: '1rem 2rem', 
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #333',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        position: 'relative',
        color: '#ffffff',
        gap: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '2rem',
            fontWeight: 600,
            color: '#ffffff',
            letterSpacing: '0.5px'
          }}>
            {t('common.title')}
          </h1>
          <img 
            src="/lion.png" 
            alt="Lion" 
            style={{ 
              height: '40px', 
              width: '60px',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Navigation />
        </div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
          {/* Посилання на профіль, якщо користувач авторизований, інакше кнопки логіну/реєстрації */}
          <AuthButtons />
          <button
            onClick={toggleLanguageMenu}
            style={{
              padding: '0.5rem 0.5rem',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              minWidth: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#444'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#333'}
          >
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{currentLanguage.label}</span>
            <span style={{ 
              fontSize: '0.7rem',
              
              color: '#aaa',
              transition: 'transform 0.2s',
              transform: showLanguageMenu ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </span>
          </button>
          {showLanguageMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.25rem',
              backgroundColor: '#2a2a2a',
              border: '1px solid #555',
              borderRadius: '4px',
      
              minWidth: '40px',
              zIndex: 1000,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
            }}>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.5rem 0.5rem',
                    backgroundColor: i18n.language === lang.code ? '#B19CD9' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (i18n.language !== lang.code) {
                      e.currentTarget.style.backgroundColor = '#3a3a3a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (i18n.language !== lang.code) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      <main style={{ flex: 1, padding: '2rem' }}>
        {children}
      </main>
      <footer style={{ 
        padding: '1rem 2rem', 
        backgroundColor: '#1a1a1a',
        borderTop: '1px solid #333',
        textAlign: 'center',
        color: '#888'
      }}>
        {t('common.footer')}
      </footer>
      {showLanguageMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowLanguageMenu(false)}
        />
      )}
    </div>
  );
}

export default Layout;
