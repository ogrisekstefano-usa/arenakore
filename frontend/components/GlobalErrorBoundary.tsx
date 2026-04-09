/**
 * ARENAKORE — Global Error Boundary
 * Catches JS-level crashes and shows a diagnostic screen instead of white crash.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console for debugging
    console.error('[ARENAKORE CRASH]', error.message, errorInfo.componentStack);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;

      return (
        <View style={eb$.root}>
          <View style={eb$.container}>
            {/* Header */}
            <View style={eb$.header}>
              <Text style={eb$.brand}>ARENA<Text style={eb$.brandAccent}>KORE</Text></Text>
              <Text style={eb$.crashTitle}>⚠️ CRASH REPORT</Text>
            </View>

            {/* Error Info */}
            <ScrollView style={eb$.scroll} showsVerticalScrollIndicator={false}>
              <View style={eb$.section}>
                <Text style={eb$.label}>ERRORE</Text>
                <Text style={eb$.errorText}>{error?.message || 'Errore sconosciuto'}</Text>
              </View>

              <View style={eb$.section}>
                <Text style={eb$.label}>NOME</Text>
                <Text style={eb$.errorText}>{error?.name || 'Error'}</Text>
              </View>

              {errorInfo?.componentStack && (
                <View style={eb$.section}>
                  <Text style={eb$.label}>COMPONENT STACK</Text>
                  <Text style={eb$.stackText}>
                    {errorInfo.componentStack.slice(0, 500)}
                  </Text>
                </View>
              )}

              <View style={eb$.section}>
                <Text style={eb$.label}>PIATTAFORMA</Text>
                <Text style={eb$.errorText}>{Platform.OS} · {Platform.Version}</Text>
              </View>

              <View style={eb$.section}>
                <Text style={eb$.label}>TIMESTAMP</Text>
                <Text style={eb$.errorText}>{new Date().toISOString()}</Text>
              </View>
            </ScrollView>

            {/* Restart Button */}
            <TouchableOpacity style={eb$.restartBtn} onPress={this.handleRestart} activeOpacity={0.8}>
              <Text style={eb$.restartText}>⚡ RIAVVIA APP</Text>
            </TouchableOpacity>

            <Text style={eb$.footerText}>
              Invia questo screenshot al team ARENAKORE per il debug
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const eb$ = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    gap: 8,
    marginBottom: 20,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandAccent: {
    color: '#00E5FF',
  },
  crashTitle: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  scroll: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  label: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  stackText: {
    color: '#AAAAAA',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  restartBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  restartText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.5,
  },
});
