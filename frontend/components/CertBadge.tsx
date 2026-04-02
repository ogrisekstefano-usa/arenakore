/**
 * NÈXUS CERTIFIED Badge + FLUX Wallet (mobile)
 * Riutilizzabile in tutta l'app.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FluxIcon, FluxPulse } from './FluxIcon';

// ── CertBadge ─────────────────────────────────────────────────────────────────
export function CertBadge({ certified, size = 'sm' }: {
  certified: boolean;
  size?: 'xs' | 'sm' | 'md';
}) {
  const cfg = SIZE_CFG[size];
  if (certified) {
    return (
      <View style={[cb$.badge, cb$.certBadge, { paddingHorizontal: cfg.px, paddingVertical: cfg.py }]}>
        <Ionicons name="shield-checkmark" size={cfg.icon} color="#00E5FF" />
        {size !== 'xs' && <Text style={[cb$.certText, { fontSize: cfg.text }]}>NÈXUS CERTIFIED</Text>}
      </View>
    );
  }
  return (
    <View style={[cb$.badge, cb$.uncertBadge, { paddingHorizontal: cfg.px, paddingVertical: cfg.py }]}>
      <Ionicons name="lock-closed" size={cfg.icon} color="rgba(255,255,255,0.3)" />
      {size !== 'xs' && <Text style={[cb$.uncertText, { fontSize: cfg.text }]}>UNCERTIFIED</Text>}
    </View>
  );
}

const SIZE_CFG = {
  xs: { px: 4, py: 1, icon: 8,  text: 7  },
  sm: { px: 7, py: 2, icon: 9,  text: 8  },
  md: { px: 10, py: 4, icon: 12, text: 10 },
};

const cb$ = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, borderWidth: 1 },
  certBadge: { backgroundColor: 'rgba(0,229,255,0.09)', borderColor: '#00E5FF44' },
  uncertBadge: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)' },
  certText: { color: '#00E5FF', fontWeight: '900', letterSpacing: 1.5 },
  uncertText: { color: 'rgba(255,255,255,0.30)', fontWeight: '700', letterSpacing: 1.5 },
});

// ── FLUX Wallet Widget ────────────────────────────────────────────────────

export function AKDropsWallet({ user }: { user: any }) {
  const router = useRouter();
  const isCertified = !!(user?.onboarding_completed && user?.dna);
  const drops = user?.ak_credits ?? 0;

  if (!isCertified) {
    return (
      <View style={dw$.lockedCard}>
        <View style={dw$.lockedIcon}>
          <Ionicons name="lock-closed" size={22} color="#FFD700" />
        </View>
        <View style={dw$.lockedInfo}>
          <Text style={dw$.lockedTitle}>FLUX BLOCCATI</Text>
          <Text style={dw$.lockedSub}>
            Completa la certificazione NÈXUS per guadagnare flux di sudore.
          </Text>
        </View>
        <TouchableOpacity
          style={dw$.certBtn}
          onPress={() => router.push('/onboarding/step1')}
          activeOpacity={0.85}
        >
          <Text style={dw$.certBtnText}>CERTIFICA</Text>
          <Ionicons name="scan" size={12} color="#000" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={dw$.card}>
      <View style={dw$.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FluxPulse active={drops > 0} color="#00E5FF">
            <FluxIcon size={18} color="#00E5FF" />
          </FluxPulse>
          <Text style={dw$.headerTitle}>FLUX</Text>
        </View>
        <CertBadge certified size="xs" />
      </View>
      <View style={dw$.balanceRow}>
        <Text style={dw$.balance}>{drops.toLocaleString()}</Text>
        <Text style={dw$.balanceUnit}>FLUX</Text>
      </View>
      <Text style={dw$.earnHint}>Genera FLUX superando la tua media storica</Text>
      <View style={dw$.ruleRow}>
        {[
          { label: 'Scan migliorato', val: '+10 FLUX' },
          { label: 'Vittoria PvP', val: '+50 FLUX' },
          { label: 'Crew Battle', val: '+100 FLUX' },
        ].map(r => (
          <View key={r.label} style={dw$.ruleItem}>
            <Text style={dw$.ruleLabel}>{r.label}</Text>
            <Text style={dw$.ruleVal}>{r.val}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const dw$ = StyleSheet.create({
  // Locked state
  lockedCard: {
    marginHorizontal: 24, marginBottom: 10,
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  lockedIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,215,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  lockedInfo: { flex: 1, gap: 4 },
  lockedTitle: { color: '#FFD700', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  lockedSub: { color: '#AAAAAA', fontSize: 11, fontWeight: '300', lineHeight: 16 },
  certBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFD700', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  certBtnText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  // Active wallet
  card: {
    marginHorizontal: 24, marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  balance: { color: '#00E5FF', fontSize: 36, fontWeight: '900', letterSpacing: 1 },
  balanceUnit: { color: '#00E5FF22', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  earnHint: { color: 'rgba(255,255,255,0.30)', fontSize: 11, fontWeight: '300' },
  ruleRow: { flexDirection: 'row', gap: 8 },
  ruleItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 8, gap: 3, alignItems: 'center' },
  ruleLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '400', textAlign: 'center' },
  ruleVal: { color: '#00E5FF', fontSize: 12, fontWeight: '900' },
});
