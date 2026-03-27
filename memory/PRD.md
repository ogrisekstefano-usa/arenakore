# ArenaDare — PRD (Product Requirements Document)

## Overview
**ArenaDare** è una piattaforma mobile di performance sportiva con analisi biometrica, sistema XP/Level, battle competitive e crew sociali.

**Stack Tecnico**: Expo React Native + FastAPI + MongoDB  
**Data creazione**: Marzo 2026

---

## Architettura

### Backend (FastAPI)
- **Auth**: JWT (python-jose + passlib/bcrypt), token 7 giorni
- **DB**: MongoDB via Motor (async)
- **Endpoints**: `/api/auth/*`, `/api/battles`, `/api/disciplines`, `/api/crews`

### Frontend (Expo Router v6)
- **Auth**: AsyncStorage per JWT persistence
- **Navigation**: Expo Router con Stack + Tabs
- **Animazioni**: React Native Reanimated v4
- **Charts**: react-native-svg (Radar Chart biometrico)

---

## Utenti Target
- **Atleti** (16-35 anni): competizione, tracking performance
- **Coach**: creazione discipline, analisi atleti
- **Palestre**: gestione struttura e membri

---

## Features Implementate ✅

### Auth & Onboarding (v1 - Marzo 2026)
- [x] Landing page "ARENADARE" con START LEGACY + RESUME
- [x] Registrazione: username check live (debounced), email regex, password strength bar, T&C checkbox
- [x] Login: email + password con show/hide
- [x] JWT token persistito in AsyncStorage
- [x] Onboarding Step 1: Selezione Ruolo (Atleta/Coach/Palestra)
- [x] Onboarding Step 2: Selezione Sport (12 discipline)
- [x] Onboarding Step 3: Animazione +100 XP Welcome bonus

### Core Navigation
- [x] Atomic Tab Bar custom (5 tab): CORE, CREWS, ⚡ NEXUS (gold floating), DNA, NEXUS
- [x] Gold floating ⚡ button rialzato con shadow glow
- [x] Header universale con Avatar (L) e Hamburger Menu (R)
- [x] Settings Drawer slide-in: Account, Abbonamento, Logout

### Tab CORE
- [x] XP Bar animata (level progress)
- [x] Battle Live Feed con badge: ● LIVE, ◆ PROSSIMO, ✓ CONCLUSO
- [x] Sezione Medaglie (Oro, Argento, Bronzo, Onore)
- [x] Pull-to-refresh

### Tab CREWS
- [x] Lista crew con sport, membri, XP totali
- [x] Bottone UNISCITI / UNITO (toggle)

### Tab DNA (Biometrico)
- [x] Radar Chart SVG hexagonale con 6 assi: Velocità, Forza, Resistenza, Agilità, Tecnica, Potenza
- [x] Stat Cards per ogni attributo con barra di progresso
- [x] Talent Card (Username, Disciplina, Ruolo, Level, XP)
- [x] Role Badge colorato (Cyan=Atleta, Gold=Coach, Purple=Palestra)

### Tab NEXUS (Libreria Discipline)
- [x] Filter pills per categoria
- [x] Discipline Cards con icona, nome, descrizione
- [x] Badge COACH per discipline riservate
- [x] Discipline Forge sezione (Coach only): bottone "+ CREA DISCIPLINA"

### Tab NEXUS TRIGGER
- [x] Placeholder schermata con feature list (MediaPipe coming soon)

### Design System
- [x] Dark Mode: Background #050505, Card #111111
- [x] Cyan Neon: #00E5FF (primary accent)
- [x] Gold: #FFD700 (XP, coach, floating button)
- [x] Scale-down animations su tutti i bottoni (Reanimated)
- [x] iPhone/iOS optimized con safe area insets

---

## Dati Seeded
- 5 Battle (2 live, 2 upcoming, 1 completed)
- 8 Discipline (5 pubbliche, 3 coach-only)
- 5 Crew

---

## Backlog Prioritizzato

### P0 — Prossima Sessione
- [ ] Nexus Sync: Attivazione camera reale con expo-camera
- [ ] Battle participation (join/leave battle con XP reward)
- [ ] Real-time battle updates (WebSocket o polling)
- [ ] Profilo atleta completo (modifica avatar, sport, bio)

### P1 — Feature Medie
- [ ] Crew creation e management (crea, invita membri)
- [ ] Leaderboard globale per XP e sport
- [ ] DNA history: progressione nel tempo del radar chart
- [ ] Notifiche push per battle live
- [ ] Discipline Forge: form completo per coach

### P2 — Feature Avanzate
- [ ] Nexus Sync: Analisi biometrica real-time con MediaPipe
- [ ] Buffer circolare 3s @15fps, export Parquet su S3
- [ ] Sistema Level-up con rewards
- [ ] Chat in-app per crew
- [ ] Subscription/Premium tier
- [ ] Apple/Google social login
