import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';

const TOKEN_KEY = '@arenakore_token';
const ROLE_KEY = '@arenakore_active_role';

// ========== MULTI-ROLE SYSTEM ==========
export type UserRole = 'ADMIN' | 'GYM_OWNER' | 'COACH' | 'ATHLETE';

export const ROLE_CONFIG: Record<UserRole, { label: string; ionicon: string; color: string; description: string }> = {
  ADMIN: { label: 'ADMIN', ionicon: 'shield-checkmark', color: '#FF453A', description: 'Full system access' },
  GYM_OWNER: { label: 'GYM OWNER', ionicon: 'business', color: '#D4AF37', description: 'Gym & Coach management' },
  COACH: { label: 'COACH', ionicon: 'fitness', color: '#00F2FF', description: 'Studio & Template control' },
  ATHLETE: { label: 'ATHLETE', ionicon: 'person', color: '#32D74B', description: 'Standard experience' },
};

export interface DNAStats {
  velocita: number;
  forza: number;
  resistenza: number;
  agilita: number;
  tecnica: number;
  potenza: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  gym_id?: string | null;
  ak_credits?: number;
  unlocked_tools?: string[];
  sport?: string;
  xp: number;
  level: number;
  onboarding_completed: boolean;
  dna?: DNAStats;
  avatar_color: string;
  is_admin?: boolean;
  is_founder?: boolean;
  founder_number?: number;
  ghost_mode?: boolean;        // Privacy: hide real name in public rankings
  camera_enabled?: boolean;
  mic_enabled?: boolean;
  city?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string, extra?: {
    height_cm?: number; weight_kg?: number; age?: number; training_level?: string;
  }) => Promise<User>;
  completeOnboarding: (role: string, sport: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<UserRole>('ATHLETE');

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const savedRole = await AsyncStorage.getItem(ROLE_KEY);
      if (savedToken) {
        const userData = await api.me(savedToken);
        setToken(savedToken);
        setUser(userData);
        // Restore saved active role, or derive from user data
        if (savedRole && ['ADMIN', 'GYM_OWNER', 'COACH', 'ATHLETE'].includes(savedRole)) {
          setActiveRoleState(savedRole as UserRole);
        } else if (userData.is_admin) {
          setActiveRoleState('ADMIN');
        }
      }
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveRole = async (role: UserRole) => {
    setActiveRoleState(role);
    await AsyncStorage.setItem(ROLE_KEY, role);
  };

  const login = async (email: string, password: string): Promise<User> => {
    const result = await api.login({ email, password });
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
    // Auto-detect role on login
    if (result.user.is_admin) {
      setActiveRoleState('ADMIN');
      await AsyncStorage.setItem(ROLE_KEY, 'ADMIN');
    }
    return result.user;
  };

  const register = async (
    username: string, email: string, password: string,
    extra?: { height_cm?: number; weight_kg?: number; age?: number; training_level?: string },
  ): Promise<User> => {
    const result = await api.register({ username, email, password, ...extra });
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  };

  const completeOnboarding = async (role: string, sport: string, category?: string, isVersatile?: boolean) => {
    if (!token) throw new Error('Non autenticato');
    const updatedUser = await api.completeOnboarding({
      role,
      sport,
      category,
      is_versatile: isVersatile,
    }, token);
    setUser(updatedUser);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(ROLE_KEY);
    setToken(null);
    setUser(null);
    setActiveRoleState('ATHLETE');
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const userData = await api.me(token);
      setUser(userData);
    } catch {
      // Failed to refresh user — silenced for production
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, activeRole, setActiveRole, login, register, completeOnboarding, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
