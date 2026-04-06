import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';

const TOKEN_KEY = '@arenakore_token';
const ROLE_KEY = '@arenakore_active_role';

// ========== MULTI-ROLE SYSTEM ==========
export type UserRole = 'ADMIN' | 'GYM_OWNER' | 'COACH' | 'ATHLETE';

export const ROLE_CONFIG: Record<UserRole, { label: string; ionicon: string; color: string; description: string }> = {
  ADMIN: { label: 'ADMIN', ionicon: 'shield-checkmark', color: '#FF3B30', description: 'Full system access' },
  GYM_OWNER: { label: 'GYM OWNER', ionicon: 'business', color: '#FFD700', description: 'Gym & Coach management' },
  COACH: { label: 'COACH', ionicon: 'fitness', color: '#00E5FF', description: 'Studio & Template control' },
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
  first_name?: string;
  last_name?: string;
  role?: string;
  is_nexus_certified?: boolean;
  scout_visible?: boolean;
  baseline_scanned_at?: string | null;
  gym_id?: string | null;
  ak_credits?: number;
  unlocked_tools?: string[];
  sport?: string;
  preferred_sport?: string;
  xp: number;
  flux?: number;
  level: number;
  total_scans?: number;
  onboarding_completed: boolean;
  dna?: DNAStats;
  avatar_color: string;
  is_admin?: boolean;
  is_founder?: boolean;
  founder_number?: number;
  ghost_mode?: boolean;
  camera_enabled?: boolean;
  mic_enabled?: boolean;
  city?: string;
  weight_kg?: number;
  height_cm?: number;
  age?: number;
  gender?: string;
  profile_picture?: string | null;
  bmi?: number;
  bio_coefficient?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  login: (email: string, password: string) => Promise<User>;
  loginWithToken: (token: string, user: User) => void;
  register: (username: string, email: string, password: string, extra?: {
    height_cm?: number; weight_kg?: number; age?: number;
    training_level?: string; gender?: string;
  }) => Promise<void>;
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

  // ═══ LOGIN WITH TOKEN — Used by Mobile-to-Web OTP Bridge ═══
  const loginWithToken = async (jwtToken: string, userData: User) => {
    await AsyncStorage.setItem(TOKEN_KEY, jwtToken);
    setToken(jwtToken);
    setUser(userData);
    if (userData.is_admin) {
      setActiveRoleState('ADMIN');
      await AsyncStorage.setItem(ROLE_KEY, 'ADMIN');
    } else if (userData.role === 'GYM_OWNER') {
      setActiveRoleState('GYM_OWNER');
      await AsyncStorage.setItem(ROLE_KEY, 'GYM_OWNER');
    } else if (userData.role === 'COACH') {
      setActiveRoleState('COACH');
      await AsyncStorage.setItem(ROLE_KEY, 'COACH');
    }
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
    <AuthContext.Provider value={{ user, token, isLoading, activeRole, setActiveRole, login, loginWithToken, register, completeOnboarding, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
