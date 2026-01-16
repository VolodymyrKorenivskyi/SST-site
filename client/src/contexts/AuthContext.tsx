import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/api';

export interface User {
  id: number;
  email: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  timezone: string;
  country?: string | null;
  language: string;
  is2FAEnabled: boolean;
  roles: string[];
  roleIds: number[];
  hasApprovedRole: boolean;
  pendingRequests: Array<{
    id: number;
    requestedRoleId: number;
    status: string;
    message?: string | null;
    createdAt: Date;
  }>;
  createdAt: Date;
  lastLoginAt?: Date | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  isGuest: () => boolean;
  isManager: () => boolean;
  isDirector: () => boolean;
  isAdministrator: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 AuthContext - Fetching user data...');
      
      // Додаємо timestamp для уникнення кешування
      const response = await apiClient.get('/users/me', {
        params: { _: Date.now() },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }
      });
      
      console.log('✅ AuthContext - Response received:', {
        success: response.data.success,
        hasData: !!response.data.data,
        data: response.data.data ? {
          id: response.data.data.id,
          email: response.data.data.email,
          roles: response.data.data.roles,
          hasApprovedRole: response.data.data.hasApprovedRole,
        } : null,
      });
      
      if (response.data.success && response.data.data) {
        console.log('✅ AuthContext - Setting user data:', response.data.data);
        setUser(response.data.data);
        setError(null);
      } else {
        console.warn('⚠️ AuthContext - Response missing data:', response.data);
        setUser(null);
        setError('Некоректна відповідь сервера');
      }
    } catch (err: any) {
      console.error('❌ AuthContext - Error loading user:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
      });
      if (err.response?.status === 401) {
        console.log('⚠️ User not authenticated, clearing user state');
        setUser(null);
        setError(null); // 401 - це нормально, не помилка
      } else {
        setError(err.message || 'Ошибка загрузки данных пользователя');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const hasRole = (roleName: string): boolean => {
    return user?.roles.includes(roleName) || false;
  };

  const hasAnyRole = (roleNames: string[]): boolean => {
    return roleNames.some((role) => hasRole(role));
  };

  const isGuest = (): boolean => {
    return user?.roles.length === 1 && user?.roles[0] === 'Guest';
  };

  const isManager = (): boolean => {
    return hasRole('Manager');
  };

  const isDirector = (): boolean => {
    return hasRole('Director');
  };

  const isAdministrator = (): boolean => {
    return hasRole('Administrator');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        refetch: fetchUser,
        hasRole,
        hasAnyRole,
        isGuest,
        isManager,
        isDirector,
        isAdministrator,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
