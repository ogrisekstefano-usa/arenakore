# ARENAKORE v1.0 — Native Store Ready

> **"Where Athletes Become Legends"**
> The Elite Performance Platform. Born in Chicago.

---

## 🏟️ OVERVIEW

ARENAKORE è la piattaforma d'élite per atleti che vogliono dominare. Non è un'app fitness.
È un ecosistema competitivo dove ogni ripetizione conta, ogni sessione ti avvicina alla HALL OF KORE,
e i primi 100 membri portano il badge ORO dei Fondatori per sempre.

**Estetica**: Chic-Tech / Cinema — Dark Mode (#050505), Cyan Neon (#00F2FF), Gold (#D4AF37)

---

## 📱 MODULI PRINCIPALI

### ⚔️ KORE (Battles)
Sfide competitive in tempo reale. Sprint, Boxe, CrossFit, Nuoto e 50+ sport.
Ogni battle completata genera XP e aggiorna il tuo DNA atletico.

### 🛡️ CREWS (La Tribù)
Crea la tua Crew, invita atleti, competi come squadra.
Il DNA della Crew è una media ponderata delle statistiche di tutti i membri.
Il fondatore porta il badge Coach Gold.

### 🔬 NEXUS SYNC (Biometric Tracking)
Tracking biomeccanico in tempo reale.
- **Native (iOS/Android)**: Accelerometro via `expo-sensors` a 30Hz
- **Web**: Camera + Motion Detection con skeleton Cyan/Gold overlay
- Esercizi: Deep Squat (🏋️) + Explosive Punch (🥊)
- Haptic Feedback differenziato: Heavy per Punch, Medium per Squat

### 🧬 DNA (Stats Radar)
6 statistiche atletiche: Velocità, Forza, Resistenza, Agilità, Tecnica, Potenza.
Aggiornate in tempo reale dopo ogni sessione Nexus e ogni Battle completata.

### 🏆 HALL OF KORE (Classifiche Globali)
Classifica globale con 3 tab: GLOBAL, PER SPORT, CREWS.
I Top 3 hanno carte giganti con animazione shimmer e glow pulsante.
I Fondatori (primi 100 utenti) portano il badge ORO permanente.

---

## 🏆 THE FOUNDER PROTOCOL

I primi **100 utenti** registrati su ARENAKORE ricevono automaticamente:
- Badge ORO permanente (`is_founder: true`)
- Visibilità nella HALL OF KORE con tag "FOUNDER"
- Numero di fondatore univoco (#1 - #100)

*Questa è una feature esclusiva per il lancio Chicago. Non resettabile.*

---

## 🛠️ TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | React Native / Expo SDK 54 / Expo Router |
| Backend | FastAPI (Python) + Motor (MongoDB async) |
| Database | MongoDB |
| Auth | JWT (jose) + bcrypt |
| Animations | react-native-reanimated |
| Sensors | expo-sensors (Native) / MediaDevices API (Web) |
| Haptics | expo-haptics (ImpactFeedbackStyle.Heavy/Medium) |
| Sound | expo-av |

---

## 📦 BUILD & DEPLOY

### Bundle Configuration
```
Bundle ID (iOS): com.arenakore.app
Package (Android): com.arenakore.app
Version: 1.0.0
Orientation: Portrait only
Dark Mode: Forced
```

### Asset Upload Script
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Required Environment Variables
```env
MONGO_URL=<mongodb-connection-string>
DB_NAME=arenakore
SECRET_KEY=<jwt-secret-key>
EXPO_PUBLIC_BACKEND_URL=<api-base-url>
```

---

## 🔐 ADMIN CREDENTIALS

```
Email:    admin@arenadare.com
Password: Admin2026!
Username: ArenaBoss
Role:     Admin / Founder #1
```

### Test User
```
Email:    chicago@arena.com
Password: testpassword123
Role:     Atleta
```

---

## 📋 PERMESSI RICHIESTI

### iOS (Info.plist)
- `NSCameraUsageDescription`: "Analizza la tua biomeccanica in tempo reale"
- `NSMicrophoneUsageDescription`: "Registra audio durante le sessioni Nexus"
- `NSMotionUsageDescription`: "Traccia i movimenti per contare le ripetizioni"

### Android (AndroidManifest)
- `CAMERA` — Nexus Sync vision tracking
- `VIBRATE` — Haptic feedback sulle ripetizioni
- `HIGH_SAMPLING_RATE_SENSORS` — Accelerometro 30Hz
- `POST_NOTIFICATIONS` — Battle alerts

---

## 🎯 API ENDPOINTS PRINCIPALI

| Method | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrazione + Founder Protocol |
| POST | `/api/auth/login` | Login JWT |
| GET | `/api/auth/me` | Profilo utente corrente |
| GET | `/api/leaderboard?type=global` | Hall of KORE |
| POST | `/api/nexus/session/start` | Avvia sessione Nexus |
| POST | `/api/nexus/session/{id}/complete` | Completa sessione con XP |
| POST | `/api/crews/create` | Crea una Crew |
| GET | `/api/crews/{id}` | Dettaglio Crew con DNA medio |

---

## 🎬 SENSORY DESIGN

- **Tab Switch**: Deep Woosh sound
- **Challenge Accept**: Metallic Ping
- **Record Broken**: Impact sound
- **Rep Counted (Native)**: 
  - Punch → `Haptics.ImpactFeedbackStyle.Heavy`
  - Squat → `Haptics.ImpactFeedbackStyle.Medium`
- **Skeleton Flash (Web)**: Cyan → Gold per 400ms su movimento rilevato

---

## 🇮🇹 LAUNCH: CHICAGO, 2026

### 📱 Locandina WhatsApp — Elite Copy

> **ARENAKORE**
> *"Benvenuto nell'Élite. La tua eredità inizia ora."*
>
> 🏆 Hall of Kore — Classifica Globale
> ⚡ Nexus Sync — Tracking Biomeccanico Real-Time
> 🧬 DNA Atletico — 6 Stats, 1 Radar
> 🛡️ Crews — La Tribù dei Campioni
>
> I primi 100 portano il Badge Oro per sempre.
> Scarica ARENAKORE. Diventa Leggenda.

---

*ARENAKORE — Dove gli atleti diventano leggende.*

---

© 2026 ARENAKORE. All rights reserved.
