# ARENAKORE — PRD (Product Requirements Document) v9.0

## Overview
**ARENAKORE** è la piattaforma mobile d'élite per atleti con analisi biometrica in tempo reale, sistema XP/Level, battle competitive, crew sociali e leaderboard globali. Estetica "Nike Elite / Chic-Tech / Cinema". Zero emoji. Solo Ionicons.

**Stack Tecnico**: Expo React Native SDK 54 + FastAPI + MongoDB  
**Bundle ID**: `com.arenakore.app`  
**Data aggiornamento**: Marzo 2026  
**Versione**: 9.0 — SPRINT 15: LEGACY INITIATION + SECURITY RESET

---

## Architettura

### Backend (FastAPI)
- **Auth**: JWT (python-jose + passlib/bcrypt). `hash_password()` = bcrypt salted irreversibile. MD5 BANNED.
- **DB**: MongoDB (`arenakore`). Collections: `users`, `password_resets`
- **KORE #00001**: STEFANO OGRISEK (ogrisek.stefano@gmail.com / Founder@KORE2026!). Founder role = COSMETIC badge. System logic AGNOSTIC.
- **Endpoints**: `/api/auth/*`, `/api/wallet/*`, `/api/leaderboard`, `/api/nexus/*`, `/api/notifications`, `/api/dna/history`
- **Register**: Accepts height_cm, weight_kg, age, training_level (from Legacy Initiation Step 3)
- **ID Recovery**: /auth/forgot-password (OTP SHA256) → /auth/verify-otp (JWT 15min) → /auth/reset-password (bcrypt)

### Frontend (Expo Router v6)
- **Auth**: AsyncStorage JWT persistence
- **Navigation**: 5-Tab (ARENA, KORE, NEXUS, DNA, RANK) + `/onboarding/step1-4`, `/recover`, `/login`
- **LEGACY INITIATION** (4 step):
  - step1: NEXUS BIO-SCAN PROTOCOL (massive NEXUS/BIO-SCAN/PROTOCOL, spec list, INIZIA CALIBRAZIONE)
  - step2: Puppet-Motion-Deck SVG (17 punti, EMA α=0.12, hysteresis 3px, 3s → KORE IDENTIFICATO)
  - step3: DNA Profiling (height/weight/age + LEGACY/ELITE/KORE selector)
  - step4: KORE ID Creation (nickname 15chars, email, password → register → KORE tab)
- **START LEGACY**: index.tsx + login.tsx → /onboarding/step1
- **ID Recovery**: /recover (4-step OTP neon cyan flow)
- **Wallet**: Apple .pkpass mock + Google Wallet JWT mock (KORE tab)

---

## Design System

### Colori
- Background: `#050505` (dark mode assoluto)
- Accent Primario: `#00F2FF` (Cyan Neon)
- Accent Secondario: `#D4AF37` (Gold)
- Errore: `#FF3B30`
- Testo Secondario: `#3A3A3A`, `#555`

### Navigazione
- **Tab Bar**: Custom 5-tab con Gold ⚡ center button rialzato
- **TERMINOLOGIA BANS**: "Glory Wall" → sempre "HALL OF KORE"
- **Ordine Tab**: KORE, CREWS, NEXUS, DNA, RANK

---

## Features Implementate ✅

### Auth & Onboarding
- [x] Landing page "ARENAKORE" con START LEGACY + RESUME
- [x] Registrazione con username check, email regex, password strength
- [x] Login JWT persistito in AsyncStorage
- [x] Onboarding (Ruolo, Sport, +100 XP Welcome)

### Tab KORE (Home)
- [x] XP Bar animata (level progress)
- [x] HALL OF KORE banner con link al tab RANK
- [x] Battle Arena con LIVE/PROSSIMO/CONCLUSO cards
- [x] Pull-to-refresh

### Tab CREWS (La Tribù)
- [x] Lista crew con sport, membri, XP totali
- [x] UNISCITI/UNITO toggle
- [x] Inviti Pendenti con accept/decline

### Tab NEXUS (Nexus Sync)
- [x] **Bio-Scan Initialization**: Laser sweep, Rising Hum audio, progress %, phase text
- [x] **Bio-Signature Typewriter**: Nome utente + status (FOUNDER/KORE ATHLETE) con scramble effect
- [x] **Challenge Forge** (Nike-Style): 3 cards con athlete photos + dark LinearGradient
  - Personal Training (Focus DNA)
  - Points Battle (Hall of Kore XP)
  - Live Duel (Tempo reale)
- [x] **Exercise Selection**: Deep Squat / Explosive Punch
- [x] **3-2-1 Countdown** con haptic feedback
- [x] **Digital Shadow Skeleton**: 17-point SVG skeleton, "posa plastica" in standby, motion-reactive
- [x] **Camera Motion Detection** (Web): Frame differencing per attivare il Digital Shadow
- [x] **Rep Counter + Quality Score** in tempo reale
- [x] **Haptic Punch**: Heavy/Medium vibration per rep
- [x] **Gold Flash**: Effetto dorato per rep di alta qualità
- [x] **Mini DNA Radar**: Aggiornamento in tempo reale
- [x] **Tactical Burger Menu**: CONTROL CENTER con:
  - BackdropBlur intenso (CSS backdrop-filter per web)
  - Bio-Signature Scan, Settings, Founders Club, Supporto
  - Founder Pride quote (Gold)
  - Pulse Ticker live (notizie scrolling)
  - ARENAKORE v2.1 · NEXUS SYNC footer
- [x] **Cinema Results**: Quality score, XP earned, reps, multiplier, DNA update
  - Founder Badge con shimmer 1.5s
  - SHARE GLORY SHOT card

### Tab DNA (Bio-Scan)
- [x] Radar Chart SVG hexagonale (6 assi)
- [x] Stat Cards con barre progresso
- [x] Talent Card condivisibile

### Tab RANK (Hall of Kore)
- [x] Leaderboard Globale con Top 3 "THE GIANTS"
- [x] Per Sport / Per Crews filtri
- [x] FOUNDER badge su utenti fondatori
- [x] Shimmer animation su nomi Top 3
- [x] Your Rank banner in basso

### Sistema Founder Protocol
- [x] Primi 100 utenti = FOUNDER (badge Gold permanente)
- [x] Retroactive: utenti esistenti vengono marchiati come Founder
- [x] Badge Founder visibile in: Leaderboard, Burger Menu, Cinema Results

### Audio/Haptics
- [x] Tab Switch: Deep Woosh (sub-bass sweep)
- [x] Accept Ping: Metallic harmonic shimmer
- [x] Bio-Scan Hum: Rising sawtooth drone
- [x] Bio-Match Ping: Sharp cyber confirmation
- [x] Record Broken: Double haptic burst
- [x] Haptic Punch: Heavy (punch) / Medium (squat) per rep

---

## Backlog Prioritizzato

### P0 — Prossima Sessione
- [x] Deep-Link QR-Core Implementation (expo-linking, /join/[code].tsx)
- [x] GymHub Visual Upgrade (LinearGradient immersive cards)
- [x] Refactoring nexus-trigger.tsx (1287 → ~400 lines + sub-components)
- [x] Refactoring crews.tsx (971 → ~200 lines + sub-components)
- [ ] Test su dispositivo fisico (Expo Go) per haptics, BlurView, camera
- [ ] Battle participation (join/leave con XP reward)

### P1 — Feature Medie
- [ ] Real-time battle updates (WebSocket/polling)
- [ ] Profilo atleta (modifica avatar, sport, bio)
- [ ] DNA history (progressione nel tempo)
- [ ] Notifiche push per battle live

### P2 — Feature Avanzate
- [ ] Nexus Sync: Analisi biometrica con MediaPipe
- [ ] Chat in-app per crew
- [ ] Subscription/Premium tier
- [ ] Apple/Google social login
