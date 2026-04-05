/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ARENAKORE — SPORT-TO-ASSET MAPPING (Single Source of Truth)   ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  REGOLA RIGIDA: Ogni sport DEVE avere un asset coerente.       ║
 * ║  È VIETATO mostrare un'immagine di uno sport diverso           ║
 * ║  da quello selezionato dall'utente.                            ║
 * ║  Se un nuovo sport viene aggiunto, DEVE essere mappato qui.    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * STRUCTURE:
 *  - SPORT_REGISTRY: Master registry — icon, auraColor, hero[3], avatar
 *  - SPORT_ALIASES:   EN/DB → IT display name resolution
 *  - Helper functions: getSportHeroImages, getSportAvatarPlaceholder,
 *                      getSportAuraColor, getSportIcon, getSportDisplayName
 *
 * USAGE:
 *  import { SPORTS_LIST, getSportHeroImages, getSportAvatarPlaceholder } from '../utils/sportAssets';
 */

// ═══════════════════════════════════════════════════════════════════
// ██  SPORT DEFINITION  ██
// ═══════════════════════════════════════════════════════════════════

export interface SportAsset {
  /** Emoji icon for this sport */
  icon: string;
  /** Neon aura / accent color (hex) */
  aura: string;
  /** 3 hero banner images for the cross-fade (800px wide, dark/moody) */
  hero: [string, string, string];
  /** Circular avatar placeholder (400x400 crop, sport-coherent) */
  avatar: string;
}

// ─────────────────────────────────────────────────────
// NEUTRAL FALLBACK — used when a sport has no mapping
// ─────────────────────────────────────────────────────
const NEUTRAL_HERO: [string, string, string] = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
  'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=60',
];
const NEUTRAL_AVATAR = 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=400&fit=crop&crop=center';
const NEUTRAL_AURA = '#00E5FF';

// ═══════════════════════════════════════════════════════════════════
// ██  MASTER SPORT REGISTRY — 45 Sport  ██
// ═══════════════════════════════════════════════════════════════════
// Ogni entry: { icon, aura, hero: [img1, img2, img3], avatar }

const SPORT_REGISTRY: Record<string, SportAsset> = {

  // ╔═══════════════════════════════╗
  // ║  FITNESS / STRENGTH (8)       ║
  // ╚═══════════════════════════════╝
  'Fitness': {
    icon: '🏋️', aura: '#FF3B30',
    hero: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
      'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop&crop=faces',
  },
  'CrossFit': {
    icon: '💪', aura: '#FF6347',
    hero: [
      'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
      'https://images.unsplash.com/photo-1614236224416-9a88c2e195e1?w=800&q=60',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&h=400&fit=crop&crop=center',
  },
  'Bodybuilding': {
    icon: '🏋️', aura: '#FF9500',
    hero: [
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=60',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
      'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=400&fit=crop&crop=center',
  },
  'Calisthenics': {
    icon: '🤸', aura: '#FF6EC7',
    hero: [
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=60',
      'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
      'https://images.unsplash.com/photo-1614236224416-9a88c2e195e1?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400&h=400&fit=crop&crop=center',
  },
  'Powerlifting': {
    icon: '🏋️', aura: '#FF3B30',
    hero: [
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=60',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
      'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=400&fit=crop&crop=center',
  },
  'Weightlifting': {
    icon: '🏋️', aura: '#FF9500',
    hero: [
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=60',
      'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=400&fit=crop&crop=center',
  },
  'Functional Training': {
    icon: '⚡', aura: '#FF6347',
    hero: [
      'https://images.unsplash.com/photo-1614236224416-9a88c2e195e1?w=800&q=60',
      'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop&crop=center',
  },
  'HIIT': {
    icon: '⚡', aura: '#FF6347',
    hero: [
      'https://images.unsplash.com/photo-1614236224416-9a88c2e195e1?w=800&q=60',
      'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=400&h=400&fit=crop&crop=center',
  },

  // ╔═══════════════════════════════╗
  // ║  GOLF (1)                     ║
  // ╚═══════════════════════════════╝
  'Golf': {
    icon: '⛳', aura: '#00FF87',
    hero: [
      'https://images.unsplash.com/photo-1562070299-9932d68ca9c6?w=800&q=60',
      'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=60',
      'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop&crop=center',
  },

  // ╔═══════════════════════════════╗
  // ║  RACQUET SPORTS (2)           ║
  // ╚═══════════════════════════════╝
  'Padel': {
    icon: '🏓', aura: '#00E5FF',
    hero: [
      'https://images.unsplash.com/photo-1646651105426-e8c8ee9badde?w=800&q=60',
      'https://images.unsplash.com/photo-1661474974523-fc0c6b5ec8fd?w=800&q=60',
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=400&fit=crop&crop=center',
  },
  'Tennis': {
    icon: '🎾', aura: '#00E5FF',
    hero: [
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=60',
      'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&q=60',
      'https://images.unsplash.com/photo-1646651105426-e8c8ee9badde?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400&h=400&fit=crop&crop=center',
  },

  // ╔═══════════════════════════════╗
  // ║  BALL SPORTS (7)              ║
  // ╚═══════════════════════════════╝
  'Basket': {
    icon: '🏀', aura: '#FFD700',
    hero: [
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=60',
      'https://images.unsplash.com/photo-1569731683228-5e7850ae0034?w=800&q=60',
      'https://images.unsplash.com/photo-1587296101198-67dcc4fe72f8?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=400&fit=crop&crop=center',
  },
  'Calcio': {
    icon: '⚽', aura: '#32D74B',
    hero: [
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=60',
      'https://images.unsplash.com/photo-1616514169928-a1e40c6f791c?w=800&q=60',
      'https://images.unsplash.com/photo-1612607696387-f139f76bdd6c?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=400&fit=crop&crop=center',
  },
  'Pallavolo': {
    icon: '🏐', aura: '#A855F7',
    hero: [
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=60',
      'https://images.unsplash.com/photo-1592656094267-764a45160876?w=800&q=60',
      'https://images.unsplash.com/photo-1553005746-9245ee440498?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&h=400&fit=crop&crop=center',
  },
  'Rugby': {
    icon: '🏉', aura: '#FF9500',
    hero: [
      'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=800&q=60',
      'https://images.unsplash.com/photo-1531837763904-5d3cb2632ea3?w=800&q=60',
      'https://images.unsplash.com/photo-1612607696387-f139f76bdd6c?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400&h=400&fit=crop&crop=center',
  },
  'Cricket': {
    icon: '🏏', aura: '#00FF87',
    hero: [
      'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=60',
      'https://images.unsplash.com/photo-1612607696387-f139f76bdd6c?w=800&q=60',
      'https://images.unsplash.com/photo-1616514169928-a1e40c6f791c?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=400&fit=crop&crop=center',
  },
  'Baseball': {
    icon: '⚾', aura: '#FF3B30',
    hero: [
      'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=60',
      'https://images.unsplash.com/photo-1616514169928-a1e40c6f791c?w=800&q=60',
      'https://images.unsplash.com/photo-1612607696387-f139f76bdd6c?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=400&fit=crop&crop=center',
  },
  'Hockey': {
    icon: '🏒', aura: '#00E5FF',
    hero: [
      'https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=800&q=60',
      'https://images.unsplash.com/photo-1612607696387-f139f76bdd6c?w=800&q=60',
      'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=400&h=400&fit=crop&crop=center',
  },

  // ╔═══════════════════════════════╗
  // ║  ENDURANCE / RUNNING (6)      ║
  // ╚═══════════════════════════════╝
  'Running': {
    icon: '🏃', aura: '#FF6EC7',
    hero: [
      'https://images.unsplash.com/photo-1461896836934-bd45ba8e6e64?w=800&q=60',
      'https://images.unsplash.com/photo-1589104666851-dffe3a15aace?w=800&q=60',
      'https://images.unsplash.com/photo-1602405384969-d8f9d3aff52b?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1461896836934-bd45ba8e6e64?w=400&h=400&fit=crop&crop=center',
  },
  'Trail Running': {
    icon: '🏔️', aura: '#FF9500',
    hero: [
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=60',
      'https://images.unsplash.com/photo-1589104666851-dffe3a15aace?w=800&q=60',
      'https://images.unsplash.com/photo-1602405384969-d8f9d3aff52b?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop&crop=center',
  },
  'Ciclismo': {
    icon: '🚴', aura: '#FFD700',
    hero: [
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=60',
      'https://images.unsplash.com/photo-1531578001713-f79d396f134f?w=800&q=60',
      'https://images.unsplash.com/photo-1643785876939-a19a4c543402?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=400&fit=crop&crop=center',
  },
  'Mountain Bike': {
    icon: '🚵', aura: '#FF6347',
    hero: [
      'https://images.unsplash.com/photo-1643785876939-a19a4c543402?w=800&q=60',
      'https://images.unsplash.com/photo-1544191696-102dbdaeeaa0?w=800&q=60',
      'https://images.unsplash.com/photo-1531578001713-f79d396f134f?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1544191696-102dbdaeeaa0?w=400&h=400&fit=crop&crop=center',
  },
  'Atletica Leggera': {
    icon: '🏃', aura: '#FF3B30',
    hero: [
      'https://images.unsplash.com/photo-1461896836934-bd45ba8e6e64?w=800&q=60',
      'https://images.unsplash.com/photo-1589104666851-dffe3a15aace?w=800&q=60',
      'https://images.unsplash.com/photo-1602405384969-d8f9d3aff52b?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1461896836934-bd45ba8e6e64?w=400&h=400&fit=crop&crop=center',
  },
  'Triathlon': {
    icon: '🏊', aura: '#00E5FF',
    hero: [
      'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=60',
      'https://images.unsplash.com/photo-1589104666851-dffe3a15aace?w=800&q=60',
      'https://images.unsplash.com/photo-1531578001713-f79d396f134f?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=400&fit=crop&crop=center',
  },

  // ╔═══════════════════════════════╗
  // ║  WATER SPORTS (3)             ║
  // ╚═══════════════════════════════╝
  'Nuoto': {
    icon: '🏊', aura: '#00E5FF',
    hero: [
      'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=60',
      'https://images.unsplash.com/photo-1604438893858-783650500626?w=800&q=60',
      'https://images.unsplash.com/photo-1565021973389-627830f2e776?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=400&fit=crop&crop=center',
  },
  'Surf': {
    icon: '🏄', aura: '#00E5FF',
    hero: [
      'https://images.unsplash.com/photo-1502680390548-bdbac40b0e9a?w=800&q=60',
      'https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=800&q=60',
      'https://images.unsplash.com/photo-1604438893858-783650500626?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1502680390548-bdbac40b0e9a?w=400&h=400&fit=crop&crop=center',
  },
  'Canottaggio': {
    icon: '🚣', aura: '#00E5FF',
    hero: [
      'https://images.unsplash.com/photo-1604438893858-783650500626?w=800&q=60',
      'https://images.unsplash.com/photo-1565021973389-627830f2e776?w=800&q=60',
      'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=400&fit=crop&crop=center',
  },

  // ╔═══════════════════════════════╗
  // ║  MIND & BODY (2)              ║
  // ╚═══════════════════════════════╝
  'Yoga': {
    icon: '🧘', aura: '#A855F7',
    hero: [
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=60',
      'https://images.unsplash.com/photo-1655362693203-e1f03d5fe7ef?w=800&q=60',
      'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop&crop=center',
  },
  'Pilates': {
    icon: '🧘', aura: '#A855F7',
    hero: [
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=60',
      'https://images.unsplash.com/photo-1655362693203-e1f03d5fe7ef?w=800&q=60',
      'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop&crop=center',
  },

  // ╔═══════════════════════════════╗
  // ║  COMBAT SPORTS (7)            ║
  // ╚═══════════════════════════════╝
  'Boxing': {
    icon: '🥊', aura: '#FF3B30',
    hero: [
      'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
      'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
      'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=400&fit=crop&crop=center',
  },
  'Kickboxing': {
    icon: '🥊', aura: '#FF3B30',
    hero: [
      'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
      'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
      'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=400&fit=crop&crop=center',
  },
  'MMA': {
    icon: '🥋', aura: '#FF3B30',
    hero: [
      'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
      'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
      'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=400&h=400&fit=crop&crop=center',
  },
  'Jiu-Jitsu': {
    icon: '🥋', aura: '#FF6347',
    hero: [
      'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
      'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
      'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=400&fit=crop&crop=center',
  },
  'Karate': {
    icon: '🥋', aura: '#FFD700',
    hero: [
      'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
      'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
      'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=400&h=400&fit=crop&crop=center',
  },
  'Taekwondo': {
    icon: '🥋', aura: '#00E5FF',
    hero: [
      'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
      'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
      'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=400&h=400&fit=crop&crop=center',
  },
  'Judo': {
    icon: '🥋', aura: '#FFD700',
    hero: [
      'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
      'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
      'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=400&h=400&fit=crop&crop=center',
  },
  'Scherma': {
    icon: '🤺', aura: '#FFFFFF',
    hero: [
      'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
      'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
      'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=400&h=400&fit=crop&crop=center',
  },

  // ╔═══════════════════════════════╗
  // ║  ADVENTURE / OUTDOOR (1)      ║
  // ╚═══════════════════════════════╝
  'Arrampicata': {
    icon: '🧗', aura: '#FF9500',
    hero: [
      'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=60',
      'https://images.unsplash.com/photo-1628746402529-658090e3a3e8?w=800&q=60',
      'https://images.unsplash.com/photo-1628746404106-4d3843b231b3?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&h=400&fit=crop&crop=center',
  },

  // ╔═══════════════════════════════╗
  // ║  WINTER SPORTS (2)            ║
  // ╚═══════════════════════════════╝
  'Sci': {
    icon: '⛷️', aura: '#00E5FF',
    hero: [
      'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&q=60',
      'https://images.unsplash.com/photo-1590457894211-78af681b480e?w=800&q=60',
      'https://images.unsplash.com/photo-1518467946652-b194dd6dd321?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=400&h=400&fit=crop&crop=center',
  },
  'Snowboard': {
    icon: '🏂', aura: '#A855F7',
    hero: [
      'https://images.unsplash.com/photo-1518467946652-b194dd6dd321?w=800&q=60',
      'https://images.unsplash.com/photo-1590457894211-78af681b480e?w=800&q=60',
      'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1518467946652-b194dd6dd321?w=400&h=400&fit=crop&crop=center',
  },

  // ╔═══════════════════════════════╗
  // ║  URBAN (1)                    ║
  // ╚═══════════════════════════════╝
  'Skateboard': {
    icon: '🛹', aura: '#FF6EC7',
    hero: [
      'https://images.unsplash.com/photo-1564277287253-934c868e54ea?w=800&q=60',
      'https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=800&q=60',
      'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1564277287253-934c868e54ea?w=400&h=400&fit=crop&crop=center',
  },

  // ╔═══════════════════════════════╗
  // ║  ELEGANCE / DANCE (2)         ║
  // ╚═══════════════════════════════╝
  'Danza': {
    icon: '💃', aura: '#A855F7',
    hero: [
      'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&q=60',
      'https://images.unsplash.com/photo-1655362693203-e1f03d5fe7ef?w=800&q=60',
      'https://images.unsplash.com/photo-1524852939581-9575fa716402?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=400&h=400&fit=crop&crop=center',
  },
  'Ginnastica': {
    icon: '🤸', aura: '#FF6EC7',
    hero: [
      'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&q=60',
      'https://images.unsplash.com/photo-1524852939581-9575fa716402?w=800&q=60',
      'https://images.unsplash.com/photo-1655362693203-e1f03d5fe7ef?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=400&h=400&fit=crop&crop=center',
  },

  // ╔═══════════════════════════════╗
  // ║  PRECISION / MISC (2)         ║
  // ╚═══════════════════════════════╝
  "Tiro con l'Arco": {
    icon: '🎯', aura: '#00FF87',
    hero: [
      'https://images.unsplash.com/photo-1510925758641-869d353cecc7?w=800&q=60',
      'https://images.unsplash.com/photo-1628746402529-658090e3a3e8?w=800&q=60',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1510925758641-869d353cecc7?w=400&h=400&fit=crop&crop=center',
  },
  'Equitazione': {
    icon: '🐎', aura: '#FFD700',
    hero: [
      'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&q=60',
      'https://images.unsplash.com/photo-1562070299-9932d68ca9c6?w=800&q=60',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
    ],
    avatar: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400&h=400&fit=crop&crop=center',
  },
};

// ═══════════════════════════════════════════════════════════════════
// ██  MASTER SPORT LIST (exported for dropdown / UI)  ██
// ═══════════════════════════════════════════════════════════════════
/** Ordered list of all 45 sports — use this in Settings dropdown. */
export const SPORTS_LIST: string[] = Object.keys(SPORT_REGISTRY);

// ═══════════════════════════════════════════════════════════════════
// ██  ENGLISH / DB ALIAS RESOLVER  ██
// ═══════════════════════════════════════════════════════════════════
const SPORT_ALIASES: Record<string, string> = {
  'ATHLETICS': 'Atletica Leggera', 'Athletics': 'Atletica Leggera',
  'SWIMMING': 'Nuoto', 'Swimming': 'Nuoto',
  'CYCLING': 'Ciclismo', 'Cycling': 'Ciclismo',
  'SOCCER': 'Calcio', 'Soccer': 'Calcio', 'Football': 'Calcio', 'FOOTBALL': 'Calcio',
  'BASKETBALL': 'Basket', 'Basketball': 'Basket',
  'VOLLEYBALL': 'Pallavolo', 'Volleyball': 'Pallavolo',
  'TENNIS': 'Tennis', 'BOXING': 'Boxing', 'CROSSFIT': 'CrossFit',
  'YOGA': 'Yoga', 'MMA': 'MMA', 'RUNNING': 'Running', 'GOLF': 'Golf', 'PADEL': 'Padel',
  'SURFING': 'Surf', 'Surfing': 'Surf',
  'SKIING': 'Sci', 'Skiing': 'Sci',
  'CLIMBING': 'Arrampicata', 'Climbing': 'Arrampicata',
  'DANCE': 'Danza', 'Dance': 'Danza',
  'FENCING': 'Scherma', 'Fencing': 'Scherma',
  'GYMNASTICS': 'Ginnastica', 'Gymnastics': 'Ginnastica',
  'ROWING': 'Canottaggio', 'Rowing': 'Canottaggio',
  'RUGBY': 'Rugby', 'HOCKEY': 'Hockey', 'CRICKET': 'Cricket', 'BASEBALL': 'Baseball',
};

/** Resolve an alias to its canonical sport name. */
function resolve(sport: string): string {
  return SPORT_ALIASES[sport] || sport;
}

/** Get the full SportAsset for a sport (with alias resolution). */
function getAsset(sport?: string | null): SportAsset | null {
  if (!sport) return null;
  return SPORT_REGISTRY[sport] || SPORT_REGISTRY[resolve(sport)] || null;
}

// ═══════════════════════════════════════════════════════════════════
// ██  PUBLIC API  ██
// ═══════════════════════════════════════════════════════════════════

/** Hero images for the KORE banner (3 images, sport-coherent). */
export function getSportHeroImages(sport?: string | null): [string, string, string] {
  return getAsset(sport)?.hero || NEUTRAL_HERO;
}

/** Circular avatar placeholder image (400x400, sport-coherent). */
export function getSportAvatarPlaceholder(sport?: string | null): string {
  return getAsset(sport)?.avatar || NEUTRAL_AVATAR;
}

/** Aura / accent color for this sport. */
export function getSportAuraColor(sport?: string | null): string {
  return getAsset(sport)?.aura || NEUTRAL_AURA;
}

/** Emoji icon for this sport. */
export function getSportIcon(sport?: string | null): string {
  return getAsset(sport)?.icon || '🏅';
}

/** Display name (Italian canonical). Resolves DB aliases. */
export function getSportDisplayName(sport?: string | null): string {
  if (!sport) return 'Fitness';
  if (SPORT_REGISTRY[sport]) return sport;
  const aliased = resolve(sport);
  return SPORT_REGISTRY[aliased] ? aliased : sport;
}
