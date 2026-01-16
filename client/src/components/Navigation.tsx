import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';

interface MenuItem {
  label: string;
  roles?: string[]; // Ролі, які мають доступ до цього пункту меню
  submenu?: Array<{
    label: string;
    path: string;
  }>;
}

function Navigation() {
  const { t } = useTranslation();
  const { user, hasAnyRole, loading } = useAuth();
  const navigate = useNavigate();
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  // Визначення меню з правами доступу
  const allMenuItems: MenuItem[] = [
    {
      label: t('nav.terminals'),
      roles: [], // Доступно всім, включаючи Guest (порожній масив = доступно всім)
      submenu: [
        { label: t('nav.terminalList'), path: '/terminals' },
        { label: t('nav.searchLocations'), path: '/terminals/search-locations' },
        { label: t('nav.terminalManagement'), path: '/terminals/management' },
      ],
    },
    {
      label: t('nav.transactions'),
      roles: ['Manager', 'Director', 'Administrator'], // Доступні Manager, Director, Admin
      submenu: [
        { label: t('nav.transactionHistory'), path: '/transactions' },
        { label: t('nav.cardTopup'), path: '/transactions/card-topup' },
        { label: t('nav.accountTopup'), path: '/transactions/account-topup' },
      ],
    },
    {
      label: t('nav.services'),
      roles: ['Director', 'Administrator'], // Доступні тільки Director, Admin
      submenu: [
        { label: t('nav.cards'), path: '/services/cards' },
        { label: t('nav.accounts'), path: '/services/accounts' },
        { label: t('nav.reports'), path: '/services/reports' },
      ],
    },
    {
      label: t('nav.admin'),
      roles: ['Administrator'], // Тільки для Admin
      submenu: [
        { label: t('nav.userManagement'), path: '/admin/users' },
        { label: t('nav.roleRequests'), path: '/admin/role-requests' },
        { label: t('nav.auditLogs'), path: '/admin/audit-logs' },
        { label: t('nav.settings'), path: '/admin/settings' },
      ],
    },
  ];

  // Фільтрація меню залежно від ролі користувача
  const menuItems = allMenuItems.filter((item) => {
    // Якщо завантаження - не показуємо меню
    if (loading) {
      return false;
    }
    // Якщо користувач не завантажений - не показуємо меню
    if (!user) {
      return false;
    }
    // Якщо ролі не вказані - доступно всім
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    // Перевірка чи користувач має хоча б одну з необхідних ролей
    const hasAccess = hasAnyRole(item.roles);
    
    // Діагностика (видаліть пізніше)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Menu item "${item.label}":`, {
        requiredRoles: item.roles,
        userRoles: user.roles,
        hasAccess,
      });
    }
    
    return hasAccess;
  });

  // Завантаження кількості очікуючих заявок для адміністратора
  useEffect(() => {
    if (user && hasAnyRole(['Administrator'])) {
      apiClient
        .get('/role-requests/count?status=pending')
        .then((response) => {
          if (response.data.success) {
            setPendingRequestsCount(response.data.data.count);
          }
        })
        .catch((error) => {
          console.error('Error loading pending requests count:', error);
        });
    } else {
      setPendingRequestsCount(0);
    }
  }, [user, hasAnyRole]);

  // Діагностика (видаліть пізніше)
  useEffect(() => {
    console.log('🔍 Navigation useEffect:', {
      loading,
      user: user ? { id: user.id, email: user.email, roles: user.roles } : null,
      hasApprovedRole: user?.hasApprovedRole,
      menuItemsCount: menuItems.length,
      menuItems: menuItems.map(item => item.label),
    });
  }, [user, loading, menuItems.length]);

  // Не показуємо навігацію, якщо завантаження
  if (loading) {
    return null;
  }

  // Не показуємо навігацію, якщо користувач не авторизований
  if (!user) {
    return null;
  }

  // Не показуємо навігацію, якщо немає доступних пунктів меню
  // (наприклад, для Guest користувачів без затверджених ролей)
  if (menuItems.length === 0) {
    // Діагностика (видаліть пізніше)
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Navigation - No menu items available', {
        userRoles: user?.roles,
        allMenuItems: allMenuItems.map(item => ({ label: item.label, roles: item.roles })),
      });
    }
    return null;
  }

  // Закриваємо меню при кліку поза ним
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setHoveredMenu(null);
      }
    };

    if (hoveredMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [hoveredMenu]);

  return (
    <nav 
      ref={navRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        height: '100%'
      }}
    >
      {menuItems.map((item) => (
        <div
          key={item.label}
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            alignItems: 'center'
          }}
          onMouseEnter={() => setHoveredMenu(item.label)}
          onMouseLeave={() => setHoveredMenu(null)}
        >
          <button
            onClick={() => {
              // При кліку на "Терминалы" автоматично переходимо на перший підпункт
              if (item.label === t('nav.terminals') && item.submenu && item.submenu.length > 0) {
                navigate(item.submenu[0].path);
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '0.5rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'color 0.2s',
              height: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#B19CD9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#ffffff';
            }}
          >
            <span>{item.label}</span>
            {item.label === t('nav.admin') && pendingRequestsCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 6px',
                  backgroundColor: '#ff9800',
                  color: '#fff',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  marginLeft: '0.5rem',
                }}
              >
                {pendingRequestsCount}
              </span>
            )}
            <span
              style={{
                fontSize: '0.7rem',
                transition: 'transform 0.2s',
                transform: hoveredMenu === item.label ? 'rotate(180deg)' : 'rotate(0deg)',
                display: 'inline-block'
              }}
            >
              ▼
            </span>
          </button>

          {item.submenu && hoveredMenu === item.label && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                paddingTop: '0.5rem',
                backgroundColor: 'transparent',
                zIndex: 1000,
              }}
              onMouseEnter={() => setHoveredMenu(item.label)}
              onMouseLeave={() => setHoveredMenu(null)}
            >
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  minWidth: '200px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  padding: '0.5rem 0',
                  animation: 'fadeIn 0.2s ease-in-out'
                }}
              >
              {item.submenu.map((subItem) => (
                <Link
                  key={subItem.path}
                  to={subItem.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1.5rem',
                    color: '#1a1a1a',
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    transition: 'background-color 0.2s, color 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                    e.currentTarget.style.color = '#B19CD9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#1a1a1a';
                  }}
                >
                  <span>{subItem.label}</span>
                  {subItem.path === '/admin/role-requests' && pendingRequestsCount > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '18px',
                        height: '18px',
                        padding: '0 5px',
                        backgroundColor: '#ff9800',
                        color: '#fff',
                        borderRadius: '9px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        marginLeft: '0.5rem',
                      }}
                    >
                      {pendingRequestsCount}
                    </span>
                  )}
                </Link>
              ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

export default Navigation;
