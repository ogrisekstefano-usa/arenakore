/**
 * ARENAKORE — K-FLUX MARKETPLACE (Build 38 · Prompt 6)
 * ═══════════════════════════════════════════════════════════════
 * Browse and redeem rewards with K-Flux. Brutalist Neon aesthetic.
 * 
 * Features:
 * - Category filter tabs
 * - Offer cards with cost/availability
 * - Redeem flow with burn breakdown preview
 * - Redemption code display on success
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl, StatusBar, Dimensions, Modal, Image, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

const { width: SW } = Dimensions.get('window');
const CYAN = '#00E5FF';
const GREEN = '#00FF87';
const GOLD = '#FFD700';
const AMBER = '#FF9500';
const PURPLE = '#BF5AF2';

interface Offer {
  id: string;
  title: string;
  description: string;
  category: string;
  category_label: string;
  category_icon: string;
  category_color: string;
  cost_flux: number;
  partner_name: string;
  image_url: string;
  max_redemptions: number;
  current_redemptions: number;
  is_active: boolean;
}

interface WalletInfo {
  green: number;
  cyan: number;
  amber: number;
  total_spendable: number;
}

// ═══════════════════════════════════════════════════════════════
// OFFER CARD COMPONENT
// ═══════════════════════════════════════════════════════════════
function OfferCard({ offer, wallet, index, onRedeem }: {
  offer: Offer; wallet: WalletInfo; index: number; onRedeem: (o: Offer) => void;
}) {
  const canAfford = wallet.total_spendable >= offer.cost_flux;
  const remaining = offer.max_redemptions - offer.current_redemptions;
  const isLow = remaining <= 5;

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 80)}>
      <TouchableOpacity
        style={oc.card}
        activeOpacity={0.85}
        onPress={() => onRedeem(offer)}
      >
        {/* Image */}
        {offer.image_url ? (
          <Image source={{ uri: offer.image_url }} style={oc.image} resizeMode="cover" />
        ) : (
          <View style={[oc.imagePlaceholder, { backgroundColor: offer.category_color + '15' }]}>
            <Ionicons name={offer.category_icon as any} size={32} color={offer.category_color} />
          </View>
        )}

        {/* Content */}
        <View style={oc.content}>
          {/* Category badge */}
          <View style={[oc.catBadge, { backgroundColor: offer.category_color + '15', borderColor: offer.category_color + '30' }]}>
            <Ionicons name={offer.category_icon as any} size={10} color={offer.category_color} />
            <Text style={[oc.catText, { color: offer.category_color }]}>{offer.category_label.toUpperCase()}</Text>
          </View>

          <Text style={oc.title} numberOfLines={2}>{offer.title}</Text>
          <Text style={oc.partner}>{offer.partner_name}</Text>

          {/* Bottom row: price + availability */}
          <View style={oc.bottomRow}>
            <View style={[oc.priceBadge, !canAfford && oc.priceDisabled]}>
              <Ionicons name="flash" size={14} color={canAfford ? GREEN : '#FF453A'} />
              <Text style={[oc.priceText, !canAfford && { color: '#FF453A' }]}>
                {offer.cost_flux.toLocaleString()}
              </Text>
            </View>
            {isLow && remaining > 0 && (
              <View style={oc.lowBadge}>
                <Text style={oc.lowText}>ULTIMI {remaining}</Text>
              </View>
            )}
            {remaining <= 0 && (
              <View style={[oc.lowBadge, { borderColor: 'rgba(255,59,48,0.3)', backgroundColor: 'rgba(255,59,48,0.08)' }]}>
                <Text style={[oc.lowText, { color: '#FF453A' }]}>ESAURITO</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const oc = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: '#0A0A0A', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 12,
  },
  image: { width: 110, height: 130 },
  imagePlaceholder: { width: 110, height: 130, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: 12, gap: 6, justifyContent: 'space-between' },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  catText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#FFF', fontSize: 14, fontWeight: '800', lineHeight: 18 },
  partner: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  priceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,255,135,0.08)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)',
  },
  priceDisabled: { backgroundColor: 'rgba(255,59,48,0.06)', borderColor: 'rgba(255,59,48,0.2)' },
  priceText: { color: GREEN, fontSize: 14, fontWeight: '900' },
  lowBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: 'rgba(255,215,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
  },
  lowText: { color: GOLD, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
});

// ═══════════════════════════════════════════════════════════════
// REDEEM MODAL
// ═══════════════════════════════════════════════════════════════
function RedeemModal({ visible, offer, wallet, onClose, onConfirm, redeeming }: {
  visible: boolean; offer: Offer | null; wallet: WalletInfo;
  onClose: () => void; onConfirm: () => void; redeeming: boolean;
}) {
  if (!offer) return null;
  const canAfford = wallet.total_spendable >= offer.cost_flux;

  // Calculate burn preview
  let greenBurn = 0, cyanBurn = 0, amberBurn = 0;
  let remaining = offer.cost_flux;
  greenBurn = Math.min(remaining, wallet.green);
  remaining -= greenBurn;
  cyanBurn = Math.min(remaining, wallet.cyan);
  remaining -= cyanBurn;
  amberBurn = Math.min(remaining, wallet.amber);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rm.overlay}>
        <Animated.View entering={FadeIn.duration(200)} style={rm.card}>
          {/* Header */}
          <View style={rm.header}>
            <Text style={rm.headerTitle}>RISCATTA PREMIO</Text>
            <TouchableOpacity onPress={onClose} style={rm.closeBtn}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          {/* Offer summary */}
          <View style={[rm.catBadge, { backgroundColor: offer.category_color + '15', borderColor: offer.category_color + '30' }]}>
            <Ionicons name={offer.category_icon as any} size={12} color={offer.category_color} />
            <Text style={[rm.catText, { color: offer.category_color }]}>{offer.category_label.toUpperCase()}</Text>
          </View>
          <Text style={rm.offerTitle}>{offer.title}</Text>
          <Text style={rm.offerPartner}>{offer.partner_name}</Text>

          {/* Burn Breakdown */}
          <View style={rm.burnSection}>
            <Text style={rm.burnTitle}>DETTAGLIO BURN</Text>
            <Text style={rm.burnSub}>Priorità: Verde → Ciano → Ambra</Text>

            <View style={rm.burnRow}>
              <View style={rm.burnItem}>
                <Ionicons name="heart" size={16} color={GREEN} />
                <Text style={[rm.burnVal, { color: GREEN }]}>-{greenBurn}</Text>
                <Text style={rm.burnLabel}>VERDE</Text>
              </View>
              <View style={rm.burnItem}>
                <Ionicons name="flash" size={16} color={CYAN} />
                <Text style={[rm.burnVal, { color: CYAN }]}>-{cyanBurn}</Text>
                <Text style={rm.burnLabel}>CIANO</Text>
              </View>
              <View style={rm.burnItem}>
                <Ionicons name="diamond" size={16} color={AMBER} />
                <Text style={[rm.burnVal, { color: AMBER }]}>-{amberBurn}</Text>
                <Text style={rm.burnLabel}>AMBRA</Text>
              </View>
            </View>

            <View style={rm.totalRow}>
              <Text style={rm.totalLabel}>COSTO TOTALE</Text>
              <Text style={rm.totalVal}>{offer.cost_flux.toLocaleString()} K-FLUX</Text>
            </View>

            <View style={rm.afterRow}>
              <Text style={rm.afterLabel}>SALDO RESIDUO</Text>
              <Text style={rm.afterVal}>{(wallet.total_spendable - offer.cost_flux).toLocaleString()} K-FLUX</Text>
            </View>
          </View>

          {/* Action */}
          {canAfford ? (
            <TouchableOpacity
              style={rm.confirmBtn}
              activeOpacity={0.85}
              onPress={onConfirm}
              disabled={redeeming}
            >
              {redeeming ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Ionicons name="flame" size={18} color="#000" />
                  <Text style={rm.confirmText}>BURN & RISCATTA</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={rm.cantAffordBox}>
              <Ionicons name="lock-closed" size={18} color="#FF453A" />
              <Text style={rm.cantAffordText}>
                K-Flux insufficienti. Servono {offer.cost_flux - wallet.total_spendable} in più.
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const rm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 400, backgroundColor: '#0A0A0A', borderRadius: 20, padding: 24,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', gap: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  catText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  offerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', lineHeight: 22 },
  offerPartner: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '700' },
  burnSection: {
    marginTop: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 16, gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  burnTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  burnSub: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '600' },
  burnRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 6 },
  burnItem: { alignItems: 'center', gap: 4 },
  burnVal: { fontSize: 18, fontWeight: '900' },
  burnLabel: { color: 'rgba(255,255,255,0.15)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 4 },
  totalLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  totalVal: { color: '#FF453A', fontSize: 14, fontWeight: '900' },
  afterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  afterLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '700' },
  afterVal: { color: GREEN, fontSize: 13, fontWeight: '900' },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, marginTop: 6,
  },
  confirmText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  cantAffordBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,59,48,0.06)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.15)',
  },
  cantAffordText: { color: '#FF453A', fontSize: 12, fontWeight: '700', flex: 1 },
});

// ═══════════════════════════════════════════════════════════════
// SUCCESS MODAL
// ═══════════════════════════════════════════════════════════════
function SuccessModal({ visible, data, onClose }: {
  visible: boolean; data: any; onClose: () => void;
}) {
  if (!data) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rm.overlay}>
        <Animated.View entering={ZoomIn.duration(300)} style={[rm.card, { alignItems: 'center', gap: 16 }]}>
          <View style={sm.checkCircle}>
            <Ionicons name="checkmark" size={36} color="#000" />
          </View>
          <Text style={sm.title}>PREMIO RISCATTATO!</Text>
          <Text style={sm.offerName}>{data.offer_title}</Text>

          {/* Redemption Code */}
          <View style={sm.codeBox}>
            <Text style={sm.codeLabel}>IL TUO CODICE</Text>
            <Text style={sm.codeValue}>{data.redemption_code}</Text>
            <Text style={sm.codeSub}>Mostra questo codice al tuo Hub/Partner</Text>
          </View>

          {/* Burn summary */}
          <View style={sm.burnSummary}>
            <Text style={sm.burnSummaryText}>
              Bruciati: {data.total_burned} K-Flux (V:{data.breakdown?.green_burned || 0} C:{data.breakdown?.cyan_burned || 0} A:{data.breakdown?.amber_burned || 0})
            </Text>
          </View>

          <TouchableOpacity style={sm.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={sm.doneBtnText}>CHIUDI</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sm = StyleSheet.create({
  checkCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: GREEN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  title: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  offerName: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  codeBox: {
    backgroundColor: 'rgba(0,255,135,0.04)', borderRadius: 14, padding: 20, alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: 'rgba(0,255,135,0.2)', width: '100%',
  },
  codeLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  codeValue: { color: GREEN, fontSize: 24, fontWeight: '900', letterSpacing: 3 },
  codeSub: { color: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: '600' },
  burnSummary: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 10 },
  burnSummaryText: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  doneBtn: {
    backgroundColor: 'rgba(0,229,255,0.1)', borderRadius: 12, paddingHorizontal: 40, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)',
  },
  doneBtnText: { color: CYAN, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});

// ═══════════════════════════════════════════════════════════════
// MAIN MARKETPLACE SCREEN
// ═══════════════════════════════════════════════════════════════
export default function MarketplaceScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [wallet, setWallet] = useState<WalletInfo>({ green: 0, cyan: 0, amber: 0, total_spendable: 0 });
  const [categories, setCategories] = useState<Record<string, any>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redeem state
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redeemResult, setRedeemResult] = useState<any>(null);
  const [redeeming, setRedeeming] = useState(false);

  const loadOffers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.getMarketplaceOffers(token, activeCategory || undefined);
      if (res && !res._error) {
        setOffers(res.offers || []);
        setWallet(res.wallet || { green: 0, cyan: 0, amber: 0, total_spendable: 0 });
        if (res.categories) setCategories(res.categories);
      }
    } catch (err) {
      console.warn('[Marketplace] Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, activeCategory]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const handleRedeem = (offer: Offer) => {
    setSelectedOffer(offer);
    setShowRedeemModal(true);
  };

  const confirmRedeem = async () => {
    if (!selectedOffer || !token || redeeming) return;
    setRedeeming(true);
    try {
      const res = await api.redeemOffer(selectedOffer.id, token);
      if (res && res.success) {
        setRedeemResult(res);
        setShowRedeemModal(false);
        setShowSuccessModal(true);
        // Refresh offers and wallet
        loadOffers();
      } else {
        // Error
        console.warn('[Marketplace] Redeem failed:', res);
      }
    } catch (err: any) {
      console.warn('[Marketplace] Redeem error:', err);
    } finally {
      setRedeeming(false);
    }
  };

  const categoryKeys = Object.keys(categories);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>K-FLUX MARKET</Text>
          <Text style={s.headerSub}>RISCATTA I TUOI PUNTI</Text>
        </View>
        <View style={s.walletBadge}>
          <Ionicons name="flash" size={14} color={GREEN} />
          <Text style={s.walletText}>{wallet.total_spendable.toLocaleString()}</Text>
        </View>
      </View>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catContent}>
        <TouchableOpacity
          style={[s.catTab, !activeCategory && s.catTabActive]}
          onPress={() => setActiveCategory(null)}
          activeOpacity={0.7}
        >
          <Text style={[s.catTabText, !activeCategory && s.catTabTextActive]}>TUTTI</Text>
        </TouchableOpacity>
        {categoryKeys.map((key) => {
          const cat = categories[key];
          const isActive = activeCategory === key;
          return (
            <TouchableOpacity
              key={key}
              style={[s.catTab, isActive && { backgroundColor: cat.color + '15', borderColor: cat.color + '40' }]}
              onPress={() => setActiveCategory(key)}
              activeOpacity={0.7}
            >
              <Ionicons name={cat.icon as any} size={12} color={isActive ? cat.color : 'rgba(255,255,255,0.2)'} />
              <Text style={[s.catTabText, isActive && { color: cat.color }]}>{cat.label.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Wallet Summary Strip */}
      <Animated.View entering={FadeIn.duration(300)} style={s.walletStrip}>
        <View style={s.walletItem}>
          <View style={[s.walletDot, { backgroundColor: GREEN }]} />
          <Text style={[s.walletItemVal, { color: GREEN }]}>{wallet.green.toLocaleString()}</Text>
          <Text style={s.walletItemLabel}>VERDE</Text>
        </View>
        <View style={s.walletDivider} />
        <View style={s.walletItem}>
          <View style={[s.walletDot, { backgroundColor: CYAN }]} />
          <Text style={[s.walletItemVal, { color: CYAN }]}>{wallet.cyan.toLocaleString()}</Text>
          <Text style={s.walletItemLabel}>CIANO</Text>
        </View>
        <View style={s.walletDivider} />
        <View style={s.walletItem}>
          <View style={[s.walletDot, { backgroundColor: AMBER }]} />
          <Text style={[s.walletItemVal, { color: AMBER }]}>{wallet.amber.toLocaleString()}</Text>
          <Text style={s.walletItemLabel}>AMBRA</Text>
        </View>
      </Animated.View>

      {/* Offers List */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOffers(); }} tintColor={GREEN} />}
      >
        {loading ? (
          <View style={s.centerBox}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={s.loadingText}>CARICAMENTO OFFERTE...</Text>
          </View>
        ) : offers.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="storefront-outline" size={48} color="rgba(255,255,255,0.08)" />
            <Text style={s.emptyTitle}>NESSUNA OFFERTA</Text>
            <Text style={s.emptyDesc}>Nuove offerte in arrivo. Continua ad allenarti!</Text>
          </View>
        ) : (
          offers.map((offer, i) => (
            <OfferCard key={offer.id} offer={offer} wallet={wallet} index={i} onRedeem={handleRedeem} />
          ))
        )}
      </ScrollView>

      {/* Modals */}
      <RedeemModal
        visible={showRedeemModal}
        offer={selectedOffer}
        wallet={wallet}
        onClose={() => setShowRedeemModal(false)}
        onConfirm={confirmRedeem}
        redeeming={redeeming}
      />
      <SuccessModal
        visible={showSuccessModal}
        data={redeemResult}
        onClose={() => { setShowSuccessModal(false); setRedeemResult(null); }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  headerSub: { color: 'rgba(0,255,135,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 1 },
  walletBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,255,135,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)',
  },
  walletText: { color: GREEN, fontSize: 14, fontWeight: '900' },

  // Categories
  catScroll: { maxHeight: 44 },
  catContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingVertical: 8 },
  catTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  catTabActive: { backgroundColor: 'rgba(0,255,135,0.08)', borderColor: 'rgba(0,255,135,0.25)' },
  catTabText: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  catTabTextActive: { color: GREEN },

  // Wallet Strip
  walletStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 10, marginHorizontal: 16, marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  walletItem: { alignItems: 'center', gap: 3 },
  walletDot: { width: 8, height: 8, borderRadius: 4 },
  walletItemVal: { fontSize: 16, fontWeight: '900' },
  walletItemLabel: { color: 'rgba(255,255,255,0.12)', fontSize: 7, fontWeight: '900', letterSpacing: 2 },
  walletDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.04)' },

  // Scroll
  scroll: { flex: 1 },
  content: { padding: 16, gap: 0 },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  emptyBox: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  emptyTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  emptyDesc: { color: 'rgba(255,255,255,0.15)', fontSize: 12, textAlign: 'center' },
});
