/**
 * ARENAKORE — VOICE COMMAND ENGINE v1.0
 * ════════════════════════════════════════
 * Hands-free challenge control:
 * 
 * LISTENING (Speech Recognition):
 *   "PRONTO" → Activate NEXUS scanner
 *   "VIA"    → Start countdown (only if biometric lock active)
 *   "ESCI"   → Emergency exit, close challenge
 * 
 * SPEAKING (Text-to-Speech):
 *   Guided calibration: "Spostati indietro", "Pronto. Dì VIA per iniziare"
 * 
 * Platform: Web Speech API (Chrome/Edge/Safari)
 * Fallback: Silent degradation on unsupported browsers
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform } from 'react-native';

// ═══════════════════════════════════════════════
// VOICE COMMAND TYPE
// ═══════════════════════════════════════════════
export type VoiceCommand = 'PRONTO' | 'VIA' | 'ESCI' | null;

interface UseVoiceCommandsOptions {
  enabled: boolean;
  onCommand: (command: VoiceCommand) => void;
  language?: string;
}

// ═══════════════════════════════════════════════
// HOOK: useVoiceCommands (STT — Speech Recognition)
// ═══════════════════════════════════════════════
export function useVoiceCommands({ enabled, onCommand, language = 'it-IT' }: UseVoiceCommandsOptions) {
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const startListening = useCallback(() => {
    if (Platform.OS !== 'web') return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[VoiceCmd] SpeechRecognition not supported');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      if (!enabledRef.current) return;
      
      const results = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        const transcript = results[i][0].transcript.trim().toUpperCase();
        setLastHeard(transcript);

        // Match commands
        if (transcript.includes('PRONTO') || transcript.includes('READY')) {
          onCommand('PRONTO');
        } else if (transcript.includes('VIA') || transcript.includes('GO') || transcript.includes('START')) {
          onCommand('VIA');
        } else if (transcript.includes('ESCI') || transcript.includes('EXIT') || transcript.includes('STOP')) {
          onCommand('ESCI');
        }
      }
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if still enabled
      if (enabledRef.current) {
        setTimeout(() => {
          if (enabledRef.current) startListening();
        }, 300);
      }
    };
    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('[VoiceCmd] Error:', e.error);
      }
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('[VoiceCmd] Start failed:', err);
    }
  }, [language, onCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled]);

  return { isListening, lastHeard, startListening, stopListening };
}


// ═══════════════════════════════════════════════
// TTS COACH: speak() for guided calibration
// ═══════════════════════════════════════════════
let lastSpokenTime = 0;
const SPEAK_COOLDOWN_MS = 3000; // Don't spam — 3s minimum between speeches

export function speakCoach(text: string, lang: string = 'it-IT') {
  if (Platform.OS !== 'web') return;
  
  const now = Date.now();
  if (now - lastSpokenTime < SPEAK_COOLDOWN_MS) return;
  lastSpokenTime = now;

  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    
    // Cancel any ongoing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    // Try to use an Italian voice
    const voices = synth.getVoices();
    const italianVoice = voices.find(v => v.lang.startsWith('it'));
    if (italianVoice) utterance.voice = italianVoice;

    synth.speak(utterance);
  } catch (err) {
    console.warn('[TTS]', err);
  }
}

export function cancelCoachSpeech() {
  if (Platform.OS !== 'web') return;
  try {
    window.speechSynthesis?.cancel();
  } catch {}
}
