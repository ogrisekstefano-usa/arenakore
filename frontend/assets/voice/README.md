# NEXUS VOICE ASSETS
## Voce Reale di Stefano Ogrisek

Posiziona qui i file mp3 registrati da Stefano.
Poi decommenta le righe `require()` corrispondenti in `/utils/VoiceController.ts`.

### File necessari:

| File | Chiave | Quando si attiva |
|------|--------|-----------------|
| `benvenuto.mp3` | WELCOME | Privacy modal auto-accept countdown |
| `posizionati.mp3` | POSITIONING | Camera attiva, atleta non ancora rilevato |
| `ti-ho-visto.mp3` | DETECTION_LOCK | Prima rilevazione (2s entry gate inizia) |
| `countdown.mp3` | COUNTDOWN | 2s di lock biometrico confermato → 3-2-1 |
| `esercizio_1.mp3` | BEAT_1 | Beat 1: Posa Neutrale |
| `esercizio_2.mp3` | BEAT_2 | Beat 2: Alza le Braccia |
| `esercizio_3.mp3` | BEAT_3 | Beat 3: T-Pose |
| `esercizio_4.mp3` | BEAT_4 | Beat 4: Squat |
| `esercizio_5.mp3` | BEAT_5 | Beat 5: DNA Generation |
| `dna-generato.mp3` | SUCCESS | Gold Flash — DNA confermato |
| `ripeti.mp3` | REPEAT_WARN | Atleta esce dal frame durante un esercizio |
| `nexus-attivo.mp3` | NEXUS_ACTIVE | MediaPipe pronto |

### Specs consigliati per la registrazione:
- Formato: MP3, 44.1kHz, 128kbps stereo
- Durata: 2-4 secondi per file
- Tono: autorevole, pacato — NON urlare
- Lingua: italiano (IT)
- Silenzio iniziale: 100ms (evita click)

### Come attivare un file:
1. Copia il file .mp3 in questa cartella
2. Apri `/utils/VoiceController.ts`
3. Decommenta la riga `require()` corrispondente
4. Il VoiceController userà automaticamente il file reale
   (con fallback TTS se il file non si carica)
