/**
 * ARENAKORE — Sport Asset Mapping
 * Intelligent Sport → Hero Image fallback system.
 * RULE: NEVER show mismatched sport images. Each sport maps to visually coherent imagery.
 */

// ── SPORT HERO IMAGES ──
// Each sport maps to 3 high-quality, dark/moody images for the cross-fade hero banner.
// Images are categorized by sport groups to ensure visual coherence.

type SportHeroSet = [string, string, string];

const SPORT_HERO_MAP: Record<string, SportHeroSet> = {
  // ═══ FITNESS / STRENGTH ═══
  'Fitness': [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
    'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=60',
  ],
  'CrossFit': [
    'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
    'https://images.unsplash.com/photo-1614236224416-9a88c2e195e1?w=800&q=60',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
  ],
  'Bodybuilding': [
    'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=60',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
    'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
  ],
  'Calisthenics': [
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=60',
    'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
    'https://images.unsplash.com/photo-1614236224416-9a88c2e195e1?w=800&q=60',
  ],
  'Powerlifting': [
    'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=60',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
    'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
  ],
  'Weightlifting': [
    'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=60',
    'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=60',
  ],
  'Functional Training': [
    'https://images.unsplash.com/photo-1614236224416-9a88c2e195e1?w=800&q=60',
    'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
  ],
  'HIIT': [
    'https://images.unsplash.com/photo-1614236224416-9a88c2e195e1?w=800&q=60',
    'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=60',
  ],

  // ═══ GOLF ═══
  'Golf': [
    'https://images.unsplash.com/photo-1562070299-9932d68ca9c6?w=800&q=60',
    'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=60',
    'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=60',
  ],

  // ═══ RACQUET SPORTS ═══
  'Padel': [
    'https://images.unsplash.com/photo-1646651105426-e8c8ee9badde?w=800&q=60',
    'https://images.unsplash.com/photo-1661474974523-fc0c6b5ec8fd?w=800&q=60',
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=60',
  ],
  'Tennis': [
    'https://images.unsplash.com/photo-1646651105426-e8c8ee9badde?w=800&q=60',
    'https://images.unsplash.com/photo-1661474974523-fc0c6b5ec8fd?w=800&q=60',
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=60',
  ],

  // ═══ BALL SPORTS ═══
  'Basket': [
    'https://images.unsplash.com/photo-1569731683228-5e7850ae0034?w=800&q=60',
    'https://images.unsplash.com/photo-1587296101198-67dcc4fe72f8?w=800&q=60',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=60',
  ],
  'Calcio': [
    'https://images.unsplash.com/photo-1616514169928-a1e40c6f791c?w=800&q=60',
    'https://images.unsplash.com/photo-1612607696387-f139f76bdd6c?w=800&q=60',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=60',
  ],
  'Pallavolo': [
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=60',
    'https://images.unsplash.com/photo-1592656094267-764a45160876?w=800&q=60',
    'https://images.unsplash.com/photo-1553005746-9245ee440498?w=800&q=60',
  ],
  'Rugby': [
    'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=800&q=60',
    'https://images.unsplash.com/photo-1531837763904-5d3cb2632ea3?w=800&q=60',
    'https://images.unsplash.com/photo-1612607696387-f139f76bdd6c?w=800&q=60',
  ],
  'Cricket': [
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=60',
    'https://images.unsplash.com/photo-1612607696387-f139f76bdd6c?w=800&q=60',
    'https://images.unsplash.com/photo-1616514169928-a1e40c6f791c?w=800&q=60',
  ],
  'Baseball': [
    'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=60',
    'https://images.unsplash.com/photo-1616514169928-a1e40c6f791c?w=800&q=60',
    'https://images.unsplash.com/photo-1612607696387-f139f76bdd6c?w=800&q=60',
  ],
  'Hockey': [
    'https://images.unsplash.com/photo-1612607696387-f139f76bdd6c?w=800&q=60',
    'https://images.unsplash.com/photo-1616514169928-a1e40c6f791c?w=800&q=60',
    'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=800&q=60',
  ],

  // ═══ ENDURANCE ═══
  'Running': [
    'https://images.unsplash.com/photo-1589104666851-dffe3a15aace?w=800&q=60',
    'https://images.unsplash.com/photo-1602405384969-d8f9d3aff52b?w=800&q=60',
    'https://images.unsplash.com/photo-1461896836934-bd45ba8e6e64?w=800&q=60',
  ],
  'Trail Running': [
    'https://images.unsplash.com/photo-1589104666851-dffe3a15aace?w=800&q=60',
    'https://images.unsplash.com/photo-1602405384969-d8f9d3aff52b?w=800&q=60',
    'https://images.unsplash.com/photo-1461896836934-bd45ba8e6e64?w=800&q=60',
  ],
  'Ciclismo': [
    'https://images.unsplash.com/photo-1531578001713-f79d396f134f?w=800&q=60',
    'https://images.unsplash.com/photo-1643785876939-a19a4c543402?w=800&q=60',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=60',
  ],
  'Mountain Bike': [
    'https://images.unsplash.com/photo-1643785876939-a19a4c543402?w=800&q=60',
    'https://images.unsplash.com/photo-1531578001713-f79d396f134f?w=800&q=60',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=60',
  ],
  'Atletica Leggera': [
    'https://images.unsplash.com/photo-1589104666851-dffe3a15aace?w=800&q=60',
    'https://images.unsplash.com/photo-1602405384969-d8f9d3aff52b?w=800&q=60',
    'https://images.unsplash.com/photo-1461896836934-bd45ba8e6e64?w=800&q=60',
  ],
  'Triathlon': [
    'https://images.unsplash.com/photo-1589104666851-dffe3a15aace?w=800&q=60',
    'https://images.unsplash.com/photo-1604438893858-783650500626?w=800&q=60',
    'https://images.unsplash.com/photo-1531578001713-f79d396f134f?w=800&q=60',
  ],

  // ═══ WATER ═══
  'Nuoto': [
    'https://images.unsplash.com/photo-1604438893858-783650500626?w=800&q=60',
    'https://images.unsplash.com/photo-1565021973389-627830f2e776?w=800&q=60',
    'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=60',
  ],
  'Surf': [
    'https://images.unsplash.com/photo-1502680390548-bdbac40b0e9a?w=800&q=60',
    'https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=800&q=60',
    'https://images.unsplash.com/photo-1604438893858-783650500626?w=800&q=60',
  ],
  'Canottaggio': [
    'https://images.unsplash.com/photo-1604438893858-783650500626?w=800&q=60',
    'https://images.unsplash.com/photo-1565021973389-627830f2e776?w=800&q=60',
    'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=60',
  ],

  // ═══ MIND / BODY ═══
  'Yoga': [
    'https://images.unsplash.com/photo-1655362693203-e1f03d5fe7ef?w=800&q=60',
    'https://images.unsplash.com/photo-1524852939581-9575fa716402?w=800&q=60',
    'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&q=60',
  ],
  'Pilates': [
    'https://images.unsplash.com/photo-1655362693203-e1f03d5fe7ef?w=800&q=60',
    'https://images.unsplash.com/photo-1524852939581-9575fa716402?w=800&q=60',
    'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&q=60',
  ],

  // ═══ COMBAT ═══
  'Boxing': [
    'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
    'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
    'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
  ],
  'Kickboxing': [
    'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
    'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
    'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
  ],
  'MMA': [
    'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
    'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
    'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
  ],
  'Jiu-Jitsu': [
    'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
    'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
    'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
  ],
  'Karate': [
    'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
    'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
    'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
  ],
  'Taekwondo': [
    'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
    'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
    'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
  ],
  'Judo': [
    'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
    'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
    'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
  ],
  'Scherma': [
    'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=800&q=60',
    'https://images.unsplash.com/photo-1575747503976-5e6e96a13504?w=800&q=60',
    'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=60',
  ],

  // ═══ ADVENTURE / OUTDOOR ═══
  'Arrampicata': [
    'https://images.unsplash.com/photo-1628746402529-658090e3a3e8?w=800&q=60',
    'https://images.unsplash.com/photo-1628746404106-4d3843b231b3?w=800&q=60',
    'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=60',
  ],

  // ═══ WINTER ═══
  'Sci': [
    'https://images.unsplash.com/photo-1590457894211-78af681b480e?w=800&q=60',
    'https://images.unsplash.com/photo-1518467946652-b194dd6dd321?w=800&q=60',
    'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&q=60',
  ],
  'Snowboard': [
    'https://images.unsplash.com/photo-1518467946652-b194dd6dd321?w=800&q=60',
    'https://images.unsplash.com/photo-1590457894211-78af681b480e?w=800&q=60',
    'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&q=60',
  ],

  // ═══ URBAN ═══
  'Skateboard': [
    'https://images.unsplash.com/photo-1564277287253-934c868e54ea?w=800&q=60',
    'https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=800&q=60',
    'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
  ],

  // ═══ ELEGANCE ═══
  'Danza': [
    'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&q=60',
    'https://images.unsplash.com/photo-1655362693203-e1f03d5fe7ef?w=800&q=60',
    'https://images.unsplash.com/photo-1524852939581-9575fa716402?w=800&q=60',
  ],
  'Ginnastica': [
    'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&q=60',
    'https://images.unsplash.com/photo-1655362693203-e1f03d5fe7ef?w=800&q=60',
    'https://images.unsplash.com/photo-1524852939581-9575fa716402?w=800&q=60',
  ],

  // ═══ MISC ═══
  "Tiro con l'Arco": [
    'https://images.unsplash.com/photo-1628746402529-658090e3a3e8?w=800&q=60',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
    'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
  ],
  'Equitazione': [
    'https://images.unsplash.com/photo-1562070299-9932d68ca9c6?w=800&q=60',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
    'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
  ],
};

// ─── DEFAULT FALLBACK (Generic Athletic) ───
const DEFAULT_HERO: SportHeroSet = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60',
  'https://images.unsplash.com/photo-1576913105965-1d0b6a19a482?w=800&q=60',
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=60',
];

// English alias mappings for DB compatibility
const SPORT_ALIASES: Record<string, string> = {
  'ATHLETICS': 'Atletica Leggera',
  'Athletics': 'Atletica Leggera',
  'SWIMMING': 'Nuoto',
  'Swimming': 'Nuoto',
  'CYCLING': 'Ciclismo',
  'Cycling': 'Ciclismo',
  'SOCCER': 'Calcio',
  'Soccer': 'Calcio',
  'Football': 'Calcio',
  'FOOTBALL': 'Calcio',
  'BASKETBALL': 'Basket',
  'Basketball': 'Basket',
  'VOLLEYBALL': 'Pallavolo',
  'Volleyball': 'Pallavolo',
  'TENNIS': 'Tennis',
  'BOXING': 'Boxing',
  'CROSSFIT': 'CrossFit',
  'YOGA': 'Yoga',
  'MMA': 'MMA',
  'RUNNING': 'Running',
  'GOLF': 'Golf',
  'PADEL': 'Padel',
  'SURFING': 'Surf',
  'Surfing': 'Surf',
  'SKIING': 'Sci',
  'Skiing': 'Sci',
  'CLIMBING': 'Arrampicata',
  'Climbing': 'Arrampicata',
  'DANCE': 'Danza',
  'Dance': 'Danza',
  'FENCING': 'Scherma',
  'Fencing': 'Scherma',
  'GYMNASTICS': 'Ginnastica',
  'Gymnastics': 'Ginnastica',
  'ROWING': 'Canottaggio',
  'Rowing': 'Canottaggio',
  'RUGBY': 'Rugby',
  'HOCKEY': 'Hockey',
  'CRICKET': 'Cricket',
  'BASEBALL': 'Baseball',
};

/**
 * Get hero images for a sport. Returns [img1, img2, img3] for cross-fade.
 * RULE: NEVER returns images from a different sport.
 * Handles both Italian names and English DB aliases.
 */
export function getSportHeroImages(sport?: string | null): SportHeroSet {
  if (!sport) return DEFAULT_HERO;
  // Direct match
  if (SPORT_HERO_MAP[sport]) return SPORT_HERO_MAP[sport];
  // Alias match
  const aliased = SPORT_ALIASES[sport];
  if (aliased && SPORT_HERO_MAP[aliased]) return SPORT_HERO_MAP[aliased];
  return DEFAULT_HERO;
}

// ── Sport Aura Colors ──
const SPORT_AURA_COLORS: Record<string, string> = {
  // Fitness
  'Fitness': '#FF3B30', 'CrossFit': '#FF6347', 'Bodybuilding': '#FF9500',
  'Calisthenics': '#FF6EC7', 'Powerlifting': '#FF3B30', 'Weightlifting': '#FF9500',
  'Functional Training': '#FF6347', 'HIIT': '#FF6347',
  // Golf
  'Golf': '#00FF87',
  // Racquet
  'Padel': '#00E5FF', 'Tennis': '#00E5FF',
  // Ball
  'Basket': '#FFD700', 'Calcio': '#32D74B', 'Pallavolo': '#A855F7',
  'Rugby': '#FF9500', 'Cricket': '#00FF87', 'Baseball': '#FF3B30', 'Hockey': '#00E5FF',
  // Endurance
  'Running': '#FF6EC7', 'Trail Running': '#FF9500', 'Ciclismo': '#FFD700',
  'Mountain Bike': '#FF6347', 'Atletica Leggera': '#FF3B30', 'Triathlon': '#00E5FF',
  // Water
  'Nuoto': '#00E5FF', 'Surf': '#00E5FF', 'Canottaggio': '#00E5FF',
  // Mind/Body
  'Yoga': '#A855F7', 'Pilates': '#A855F7',
  // Combat
  'Boxing': '#FF3B30', 'Kickboxing': '#FF3B30', 'MMA': '#FF3B30',
  'Jiu-Jitsu': '#FF6347', 'Karate': '#FFD700', 'Taekwondo': '#00E5FF',
  'Judo': '#FFD700', 'Scherma': '#FFFFFF',
  // Adventure
  'Arrampicata': '#FF9500',
  // Winter
  'Sci': '#00E5FF', 'Snowboard': '#A855F7',
  // Urban
  'Skateboard': '#FF6EC7',
  // Elegance
  'Danza': '#A855F7', 'Ginnastica': '#FF6EC7',
  // Misc
  "Tiro con l'Arco": '#00FF87', 'Equitazione': '#FFD700',
};

export function getSportAuraColor(sport?: string | null): string {
  if (!sport) return '#00E5FF';
  if (SPORT_AURA_COLORS[sport]) return SPORT_AURA_COLORS[sport];
  const aliased = SPORT_ALIASES[sport];
  if (aliased && SPORT_AURA_COLORS[aliased]) return SPORT_AURA_COLORS[aliased];
  return '#00E5FF';
}

// ── Sport Emoji Icons ──
export const SPORT_ICONS: Record<string, string> = {
  'Fitness': '🏋️', 'CrossFit': '💪', 'Bodybuilding': '🏋️', 'Calisthenics': '🤸', 'Powerlifting': '🏋️',
  'Weightlifting': '🏋️', 'Functional Training': '⚡', 'HIIT': '⚡',
  'Golf': '⛳', 'Padel': '🏓', 'Tennis': '🎾',
  'Basket': '🏀', 'Calcio': '⚽', 'Pallavolo': '🏐', 'Rugby': '🏉', 'Cricket': '🏏',
  'Baseball': '⚾', 'Hockey': '🏒',
  'Running': '🏃', 'Trail Running': '🏔️', 'Ciclismo': '🚴', 'Mountain Bike': '🚵',
  'Atletica Leggera': '🏃', 'Triathlon': '🏊',
  'Nuoto': '🏊', 'Surf': '🏄', 'Canottaggio': '🚣',
  'Yoga': '🧘', 'Pilates': '🧘',
  'Boxing': '🥊', 'Kickboxing': '🥊', 'MMA': '🥋', 'Jiu-Jitsu': '🥋',
  'Karate': '🥋', 'Taekwondo': '🥋', 'Judo': '🥋', 'Scherma': '🤺',
  'Arrampicata': '🧗', 'Sci': '⛷️', 'Snowboard': '🏂', 'Skateboard': '🛹',
  'Danza': '💃', 'Ginnastica': '🤸',
  "Tiro con l'Arco": '🎯', 'Equitazione': '🐎',
};

/**
 * Get sport icon emoji with alias support.
 */
export function getSportIcon(sport?: string | null): string {
  if (!sport) return '🏅';
  if (SPORT_ICONS[sport]) return SPORT_ICONS[sport];
  const aliased = SPORT_ALIASES[sport];
  if (aliased && SPORT_ICONS[aliased]) return SPORT_ICONS[aliased];
  return '🏅';
}

/**
 * Get the display name of a sport (resolved from alias if needed).
 */
export function getSportDisplayName(sport?: string | null): string {
  if (!sport) return 'Fitness';
  // If it exists in SPORT_HERO_MAP, it's already a display name
  if (SPORT_HERO_MAP[sport]) return sport;
  // Otherwise try alias resolution
  const aliased = SPORT_ALIASES[sport];
  return aliased || sport;
}

// ═══ SPORT AVATAR PLACEHOLDERS ═══
// Tightly cropped, abstract/symbolic images that look great in circular frames.
// RULE: Must UNMISTAKABLY represent the sport. NEVER show another sport.
const SPORT_AVATAR_MAP: Record<string, string> = {
  // Fitness / Strength
  'Fitness':            'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop&crop=faces',
  'CrossFit':           'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&h=400&fit=crop&crop=center',
  'Bodybuilding':       'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=400&fit=crop&crop=center',
  'Calisthenics':       'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400&h=400&fit=crop&crop=center',
  'Powerlifting':       'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=400&fit=crop&crop=center',
  'Weightlifting':      'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=400&fit=crop&crop=center',
  'Functional Training':'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop&crop=center',
  'HIIT':               'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=400&h=400&fit=crop&crop=center',
  // Golf
  'Golf':               'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop&crop=center',
  // Racquet
  'Padel':              'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=400&fit=crop&crop=center',
  'Tennis':             'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400&h=400&fit=crop&crop=center',
  // Ball
  'Basket':             'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=400&fit=crop&crop=center',
  'Calcio':             'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=400&fit=crop&crop=center',
  'Pallavolo':          'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&h=400&fit=crop&crop=center',
  'Rugby':              'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400&h=400&fit=crop&crop=center',
  'Baseball':           'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=400&fit=crop&crop=center',
  'Hockey':             'https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=400&h=400&fit=crop&crop=center',
  'Cricket':            'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=400&fit=crop&crop=center',
  // Endurance
  'Running':            'https://images.unsplash.com/photo-1461896836934-bd45ba8e6e64?w=400&h=400&fit=crop&crop=center',
  'Trail Running':      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop&crop=center',
  'Ciclismo':           'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=400&fit=crop&crop=center',
  'Mountain Bike':      'https://images.unsplash.com/photo-1544191696-102dbdaeeaa0?w=400&h=400&fit=crop&crop=center',
  'Atletica Leggera':   'https://images.unsplash.com/photo-1461896836934-bd45ba8e6e64?w=400&h=400&fit=crop&crop=center',
  'Triathlon':          'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=400&fit=crop&crop=center',
  // Water
  'Nuoto':              'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=400&fit=crop&crop=center',
  'Surf':               'https://images.unsplash.com/photo-1502680390548-bdbac40b0e9a?w=400&h=400&fit=crop&crop=center',
  'Canottaggio':        'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=400&fit=crop&crop=center',
  // Mind/Body
  'Yoga':               'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop&crop=center',
  'Pilates':            'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop&crop=center',
  // Combat
  'Boxing':             'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=400&fit=crop&crop=center',
  'Kickboxing':         'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=400&fit=crop&crop=center',
  'MMA':                'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=400&fit=crop&crop=center',
  'Jiu-Jitsu':          'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=400&fit=crop&crop=center',
  'Karate':             'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=400&h=400&fit=crop&crop=center',
  'Taekwondo':          'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=400&h=400&fit=crop&crop=center',
  'Judo':               'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=400&h=400&fit=crop&crop=center',
  'Scherma':            'https://images.unsplash.com/photo-1555430961-0255de69f8f2?w=400&h=400&fit=crop&crop=center',
  // Adventure / Outdoor
  'Arrampicata':        'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&h=400&fit=crop&crop=center',
  // Winter
  'Sci':                'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=400&h=400&fit=crop&crop=center',
  'Snowboard':          'https://images.unsplash.com/photo-1518467946652-b194dd6dd321?w=400&h=400&fit=crop&crop=center',
  // Urban
  'Skateboard':         'https://images.unsplash.com/photo-1564277287253-934c868e54ea?w=400&h=400&fit=crop&crop=center',
  // Elegance
  'Danza':              'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=400&h=400&fit=crop&crop=center',
  'Ginnastica':         'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=400&h=400&fit=crop&crop=center',
  // Misc
  "Tiro con l'Arco":    'https://images.unsplash.com/photo-1510925758641-869d353cecc7?w=400&h=400&fit=crop&crop=center',
  'Equitazione':        'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400&h=400&fit=crop&crop=center',
};

// Abstract neutral fallback (dark athletic silhouette)
const DEFAULT_AVATAR_PLACEHOLDER = 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=400&fit=crop&crop=center';

/**
 * Get circular avatar placeholder for a sport.
 * Returns a URL for a tightly cropped, visually coherent sport image.
 * RULE: NEVER returns an image from a different sport.
 */
export function getSportAvatarPlaceholder(sport?: string | null): string {
  if (!sport) return DEFAULT_AVATAR_PLACEHOLDER;
  if (SPORT_AVATAR_MAP[sport]) return SPORT_AVATAR_MAP[sport];
  const aliased = SPORT_ALIASES[sport];
  if (aliased && SPORT_AVATAR_MAP[aliased]) return SPORT_AVATAR_MAP[aliased];
  return DEFAULT_AVATAR_PLACEHOLDER;
}
