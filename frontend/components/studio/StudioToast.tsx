/**
 * STUDIO TOAST — Elegant notification system for Coach Studio
 * Context + Container. Slides in from top-right, auto-dismisses.
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInRight, FadeOutRight, useSharedValue, withTiming
} from 'react-native-reanimated';

type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
}

interface ToastCtx {
  addToast: (message: string, type?: ToastType, title?: string) => void;
}

const ToastContext = createContext<ToastCtx>({ addToast: () => {} });

export function useToast() { return useContext(ToastContext); }

const TOAST_CFG: Record<ToastType, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { color: '#00FF87', bg: 'rgba(0,255,135,0.12)',  icon: 'checkmark-circle' },
  warning: { color: '#FF9500', bg: 'rgba(255,149,0,0.12)',  icon: 'warning' },
  error:   { color: '#FF3B30', bg: 'rgba(255,59,48,0.12)',  icon: 'alert-circle' },
  info:    { color: '#00E5FF', bg: 'rgba(0,229,255,0.10)',  icon: 'information-circle' }
};

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const cfg = TOAST_CFG[toast.type] || TOAST_CFG.info;
  React.useEffect(() => {
    const t = setTimeout(onDone, 4200);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      entering={FadeInRight.duration(300)}
      exiting={FadeOutRight.duration(250)}
      style={[t$.toast, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}
    >
      <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      <View style={t$.body}>
        {toast.title && <Text style={[t$.title, { color: cfg.color }]}>{toast.title}</Text>}
        <Text style={t$.msg}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

export function StudioToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = `toast-${++counter.current}`;
    setToasts(prev => [...prev.slice(-3), { id, message, type, title }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {Platform.OS === 'web' && (
        <View style={t$.container} pointerEvents="none">
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onDone={() => removeToast(toast.id)} />
          ))}
        </View>
      )}
    </ToastContext.Provider>
  );
}

const t$ = StyleSheet.create({
  container: {
    position: 'absolute', top: 20, right: 16, zIndex: 9999,
    gap: 8, alignItems: 'flex-end'
  },
  toast: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    maxWidth: 340, borderRadius: 12, padding: 12,
    borderWidth: 1
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  msg: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '300', lineHeight: 17 }
});
