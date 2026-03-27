import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';

const TOKEN_KEY = '@arenakore_token';

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
  sport?: string;
  xp: number;
  level: number;
  onboarding_completed: boolean;
  dna?: DNAStats;
  avatar_color: string;
  is_admin?: boolean;
  is_founder?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
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

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        const userData = await api.me(savedToken);
        setToken(savedToken);
        setUser(userData);
      }
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    const result = await api.login({ email, password });
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  };

  const register = async (username: string, email: string, password: string): Promise<User> => {
    const result = await api.register({ username, email, password });
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
    setToken(null);
    setUser(null);
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
    <AuthContext.Provider value={{ user, token, isLoading, login, register, completeOnboarding, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
