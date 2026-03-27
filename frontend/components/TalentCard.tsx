import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert, Dimensions } from 'react-native';
import Svg, { Polygon, Circle, Line } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { User, DNAStats } from '../contexts/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');

const ATTRS = [
  { key: 'velocita', label: 'VEL', fullLabel: 'Velocità', icon: '⚡' },
  { key: 'forza', label: 'FOR', fullLabel: 'Forza', icon: '💪' },
  { key: 'resistenza', label: 'RES', fullLabel: 'Resistenza', icon: '🫀' },
  { key: 'agilita', label: 'AGI', fullLabel: 'Agilità', icon: '🏃' },
  { key: 'tecnica', label: 'TEC', fullLabel: 'Tecnica', icon: '🎯' },
  { key: 'potenza', label: 'POT', fullLabel: 'Potenza', icon: '💥' },
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
      <Polygon points={dataPolygon} fill="rgba(0,242,255,0.15)" stroke="#00F2FF" strokeWidth={1.5} />
      {dataPoints.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#00F2FF" />
      ))}
    </Svg>
  );
}

interface TalentCardProps {
  user: User;
  xpEarned?: number;
  recordsBroken?: string[];
  challengeTitle?: string;
}

export function TalentCard({ user, xpEarned, recordsBroken = [], challengeTitle }: TalentCardProps) {
  const dna = user.dna;
  const qrData = `arenakore://athlete/${user.id}`;
  const avgStat = dna
    ? Math.round(
        (dna.velocita + dna.forza + dna.resistenza + dna.agilita + dna.tecnica + dna.potenza) / 6
      )
    : 0;

  const handleShare = async () => {
    const statsText = dna
      ? ATTRS.map(a => `${a.fullLabel}: ${dna[a.key as keyof DNAStats]}`).join(' · ')
      : '';
    const recordText = recordsBroken.length > 0
      ? `\n🏆 Record: ${recordsBroken.join(', ').toUpperCase()}`
      : '';
    const xpText = xpEarned ? `\n⚡ +${xpEarned} XP guadagnati!` : '';

    try {
      await Share.share({
        message: `🏟️ ARENAKORE TALENT CARD\n━━━━━━━━━━━━━━━\n👤 ${user.username?.toUpperCase()}\n🏅 LVL ${user.level} | ${user.xp} XP\n🎯 ${user.sport?.toUpperCase() || 'ATLETA'}${xpText}${recordText}\n\n${statsText}\n\nOVR: ${avgStat}/100\n━━━━━━━━━━━━━━━\n#ArenaKore #${user.sport} #Performance`,
        title: `${user.username} - ArenaKore Talent Card`,
      });
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
        <View style={[styles.avatar, { backgroundColor: user.avatar_color || '#00F2FF' }]}>
          <Text style={styles.avatarText}>{user.username?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.username}>{user.username?.toUpperCase()}</Text>
          <Text style={styles.sport}>{user.sport?.toUpperCase() || 'ATLETA'}</Text>
          <View style={styles.levelRow}>
            <Text style={styles.levelBadge}>LVL {user.level}</Text>
            <Text style={styles.xpBadge}>{user.xp} XP</Text>
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
          {xpEarned && <Text style={styles.challengeXP}>+{xpEarned} XP</Text>}
        </View>
      )}

      {/* Records */}
      {recordsBroken.length > 0 && (
        <View style={styles.recordRow}>
          <Text style={styles.recordIcon}>🏆</Text>
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
                color="#00F2FF"
              />
            </View>
          </View>
        </View>
      )}

      {/* Share button */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} testID="talent-card-share">
        <Text style={styles.shareBtnText}>↑ CONDIVIDI GLORY SHOT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0,242,255,0.15)',
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardBrand: { flexDirection: 'row', gap: 4 },
  brandArena: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: -0.5 },
  brandDare: { color: '#D4AF37', fontSize: 14, fontWeight: '900', letterSpacing: -0.5 },
  cardType: { color: '#00F2FF', fontSize: 9, fontWeight: '800', letterSpacing: 3 },
  divider: { height: 1, backgroundColor: '#1E1E1E' },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#050505', fontSize: 20, fontWeight: '900' },
  profileInfo: { flex: 1, gap: 2 },
  username: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  sport: { color: '#00F2FF', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  levelRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  levelBadge: { color: '#D4AF37', fontSize: 10, fontWeight: '800' },
  xpBadge: { color: '#888', fontSize: 10, fontWeight: '700' },
  ovrCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,242,255,0.08)',
    borderWidth: 2, borderColor: '#00F2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  ovrVal: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  ovrLabel: { color: '#00F2FF', fontSize: 7, fontWeight: '800', letterSpacing: 2 },

  challengeRow: {
    backgroundColor: 'rgba(212,175,55,0.06)',
    borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)',
  },
  challengeLabel: { color: '#888', fontSize: 8, fontWeight: '700', letterSpacing: 2 },
  challengeTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: 2 },
  challengeXP: { color: '#D4AF37', fontSize: 12, fontWeight: '800', marginTop: 2 },

  recordRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderRadius: 6, padding: 8,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  recordIcon: { fontSize: 16 },
  recordText: { color: '#D4AF37', fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  dataRow: { flexDirection: 'row', gap: 12 },
  statsCol: { flex: 1, gap: 6, justifyContent: 'center' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { color: '#555', fontSize: 9, fontWeight: '700', width: 28 },
  statLabelBroken: { color: '#D4AF37' },
  statBarOuter: { flex: 1, height: 3, backgroundColor: '#1A1A1A', borderRadius: 2, overflow: 'hidden' },
  statBarInner: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  statBarBroken: { backgroundColor: '#D4AF37' },
  statVal: { color: '#888', fontSize: 10, fontWeight: '800', width: 24, textAlign: 'right' },
  statValBroken: { color: '#D4AF37' },

  visualCol: { alignItems: 'center', gap: 8 },
  qrContainer: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,242,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,242,255,0.1)',
  },

  shareBtn: {
    backgroundColor: 'rgba(0,242,255,0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,242,255,0.3)',
  },
  shareBtnText: { color: '#00F2FF', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
});
