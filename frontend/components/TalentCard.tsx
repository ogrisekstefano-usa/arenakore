import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import Svg, { Polygon, Circle, Line } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { User, DNAStats } from '../contexts/AuthContext';
import { shareText } from '../utils/shareHelper';

const { width: SCREEN_W } = Dimensions.get('window');

const ATTRS: { key: string; label: string; fullLabel: string; ionicon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'velocita', label: 'VEL', fullLabel: 'Velocit\u00e0', ionicon: 'flash', color: '#00E5FF' },
  { key: 'forza', label: 'FOR', fullLabel: 'Forza', ionicon: 'barbell', color: '#FFFFFF' },
  { key: 'resistenza', label: 'RES', fullLabel: 'Resistenza', ionicon: 'heart', color: '#FF3B30' },
  { key: 'agilita', label: 'AGI', fullLabel: 'Agilit\u00e0', ionicon: 'walk', color: '#00E5FF' },
  { key: 'tecnica', label: 'TEC', fullLabel: 'Tecnica', ionicon: 'navigate-circle', color: '#FFFFFF' },
  { key: 'potenza', label: 'POT', fullLabel: 'Potenza', ionicon: 'flash-sharp', color: '#FFD700' },
];

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function MiniRadar({ stats, size = 120 }: { stats: DNAStats; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const n = ATTRS.length;

  const dataPoints = ATTRS.map((a, i) => {
    const val = (stats[a.key as keyof DNAStats] || 0) / 100;
    return polarToXY(cx, cy, maxR * val, (i * 360) / n);
  });
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const gridPolygon = ATTRS.map((_, i) =>
    polarToXY(cx, cy, maxR, (i * 360) / n)
  ).map(p => `${p.x},${p.y}`).join(' ');

  const axisEndpoints = ATTRS.map((_, i) => polarToXY(cx, cy, maxR, (i * 360) / n));

  return (
    <Svg width={size} height={size}>
      <Polygon points={gridPolygon} fill="none" stroke="#2A2A2A" strokeWidth={0.8} />
      {axisEndpoints.map((p, i) => (
        <Line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#2A2A2A" strokeWidth={0.5} />
      ))}
      <Polygon points={dataPolygon} fill="rgba(0,229,255,0.65)" stroke="#00E5FF" strokeWidth={1.5} />
      {dataPoints.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#00E5FF" />
      ))}
    </Svg>
  );
}

interface TalentCardProps {
  user: User;
  xpEarned?: number;
  recordsBroken?: string[];
  challengeTitle?: string;
  isFounder?: boolean;
}

export function TalentCard({ user, xpEarned, recordsBroken = [], challengeTitle, isFounder }: TalentCardProps) {
  const dna = user.dna;
  const qrData = `arenakore://athlete/${user.id}`;
  const avgStat = dna
    ? Math.round(
        ((dna.velocita||0) + (dna.forza||0) + (dna.resistenza||0) + (dna.agilita||0) + (dna.tecnica||0) + (dna.potenza||0)) / 6
      )
    : 0;
  const showFounder = isFounder || user.is_admin;

  const handleShare = async () => {
    const statsText = dna
      ? ATTRS.map(a => `${a.fullLabel}: ${dna[a.key as keyof DNAStats]}`).join(' · ')
      : '';
    const recordText = recordsBroken.length > 0
      ? `\nRecord: ${recordsBroken.join(', ').toUpperCase()}`
      : '';
    const xpText = xpEarned ? `\n+${xpEarned} FLUX guadagnati!` : '';

    try {
      await shareText(`ARENAKORE TALENT CARD\n${'━'.repeat(15)}\n${user.username?.toUpperCase()}\nLVL ${user.level} | ${user.ak_credits || 0} FLUX\n${user.sport?.toUpperCase() || 'KORE'}${xpText}${recordText}\n\n${statsText}\n\nOVR: ${avgStat}/100\n${'━'.repeat(15)}\n#ArenaKore #${user.sport} #Performance`, `${user.username} - ArenaKore Talent Card`);
    } catch (e) {
      Alert.alert('Condivisione non disponibile');
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardBrand}>
          <Text style={styles.brandArena}>ARENA</Text>
          <Text style={styles.brandDare}>KORE</Text>
        </View>
        <Text style={styles.cardType}>TALENT CARD</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Profile row */}
      <View style={styles.profileRow}>
        <View style={[styles.avatar, { backgroundColor: user.avatar_color || '#00E5FF' }]}>
          <Text style={styles.avatarText}>{user.username?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{user.username?.toUpperCase()}</Text>
            {showFounder && (
              <View style={styles.founderBadge}>
                <Text style={styles.founderText}>FOUNDER</Text>
              </View>
            )}
          </View>
          <Text style={styles.sport}>{user.sport?.toUpperCase() || 'KORE'}</Text>
          <View style={styles.levelRow}>
            <Text style={styles.levelBadge}>LVL {user.level}</Text>
            <Text style={styles.xpBadge}>{user.ak_credits || 0} FLUX</Text>
          </View>
        </View>
        <View style={styles.ovrCircle}>
          <Text style={styles.ovrVal}>{avgStat}</Text>
          <Text style={styles.ovrLabel}>OVR</Text>
        </View>
      </View>

      {/* Challenge result if present */}
      {challengeTitle && (
        <View style={styles.challengeRow}>
          <Text style={styles.challengeLabel}>ULTIMA SFIDA</Text>
          <Text style={styles.challengeTitle}>{challengeTitle}</Text>
          {xpEarned && <Text style={styles.challengeXP}>+{xpEarned} FLUX</Text>}
        </View>
      )}

      {/* Records */}
      {recordsBroken.length > 0 && (
        <View style={styles.recordRow}>
          <Ionicons name="trophy" size={16} color="#FFD700" />
          <Text style={styles.recordText}>
            {recordsBroken.map(r => r.toUpperCase()).join(' · ')}
          </Text>
        </View>
      )}

      {/* Stats + Mini Radar + QR */}
      {dna && (
        <View style={styles.dataRow}>
          {/* Stats list */}
          <View style={styles.statsCol}>
            {ATTRS.map(a => {
              const val = dna[a.key as keyof DNAStats] || 0;
              const broken = recordsBroken.includes(a.key);
              return (
                <View key={a.key} style={styles.statRow}>
                  <Text style={[styles.statLabel, broken && styles.statLabelBroken]}>
                    {a.label}
                  </Text>
                  <View style={styles.statBarOuter}>
                    <View style={[
                      styles.statBarInner,
                      { width: `${val}%` as any },
                      broken && styles.statBarBroken,
                    ]} />
                  </View>
                  <Text style={[styles.statVal, broken && styles.statValBroken]}>
                    {val}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Mini radar + QR */}
          <View style={styles.visualCol}>
            <MiniRadar stats={dna} size={100} />
            <View style={styles.qrContainer}>
              <QRCode
                value={qrData}
                size={60}
                backgroundColor="transparent"
                color="#00E5FF"
              />
            </View>
          </View>
        </View>
      )}

      {/* Share button */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} testID="talent-card-share">
        <Text style={styles.shareBtnText}>↑ CONDIVIDI KORE ID</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.88)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.22)',
    gap: 12,
    elevation: 6
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  cardBrand: { flexDirection: 'row', gap: 4 },
  brandArena: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  brandDare: { color: '#FFD700', fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  cardType: { color: '#00E5FF', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center'
  },
  avatarText: { color: '#000000', fontSize: 22, fontWeight: '900' },
  profileInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  username: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  founderBadge: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)'
  },
  founderText: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  sport: { color: '#00E5FF', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  levelRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  levelBadge: { color: '#FFD700', fontSize: 15, fontWeight: '800' },
  xpBadge: { color: '#888', fontSize: 15, fontWeight: '700' },
  ovrCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 2, borderColor: '#00E5FF44',
    alignItems: 'center', justifyContent: 'center'
  },
  ovrVal: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  ovrLabel: { color: '#00E5FF', fontSize: 12, fontWeight: '800', letterSpacing: 2 },

  challengeRow: {
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)'
  },
  challengeLabel: { color: '#888', fontSize: 13, fontWeight: '400', letterSpacing: 2 },
  challengeTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '400', marginTop: 2 },
  challengeXP: { color: '#FFD700', fontSize: 17, fontWeight: '800', marginTop: 2 },

  recordRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 6, padding: 8,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)'
  },
  recordIcon: { fontSize: 18 },
  recordText: { color: '#FFD700', fontSize: 16, fontWeight: '700', letterSpacing: 1 },

  dataRow: { flexDirection: 'row', gap: 12 },
  statsCol: { flex: 1, gap: 6, justifyContent: 'center' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '400', width: 28 },
  statLabelBroken: { color: '#FFD700' },
  statBarOuter: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  statBarInner: { height: '100%', backgroundColor: '#00E5FF', borderRadius: 2 },
  statBarBroken: { backgroundColor: '#FFD700' },
  statVal: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '800', width: 24, textAlign: 'right' },
  statValBroken: { color: '#FFD700' },

  visualCol: { alignItems: 'center', gap: 8 },
  qrContainer: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#00E5FF22'
  },

  shareBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  shareBtnText: { color: '#00E5FF', fontSize: 16, fontWeight: '800', letterSpacing: 2 }
});
