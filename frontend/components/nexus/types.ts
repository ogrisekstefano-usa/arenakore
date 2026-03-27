/**
 * ARENAKORE — Nexus Shared Types & Constants
 */
import { Dimensions } from 'react-native';

export const { width: SW, height: SH } = Dimensions.get('window');

export type ForgeMode = 'personal' | 'battle' | 'duel';
export type ExerciseType = 'squat' | 'punch';

// Nike-style dramatic athlete images
export const FORGE_IMAGES = {
  personal: 'https://images.unsplash.com/photo-1710736460914-4a7f22d736c4?w=800&q=60',
  battle: 'https://images.unsplash.com/photo-1709315957145-a4bad1feef28?w=800&q=60',
  duel: 'https://images.pexels.com/photos/1075935/pexels-photo-1075935.jpeg?w=800&q=60',
};

// Console button dramatic images
export const CONSOLE_IMAGES = {
  scan: 'https://images.unsplash.com/photo-1710736460914-4a7f22d736c4?w=800&q=60',
  forge: 'https://images.unsplash.com/photo-1698788067684-2053c651bfed?w=800&q=60',
  hall: 'https://images.unsplash.com/photo-1590285372176-c3ff4d8c9399?w=800&q=60',
  dna: 'https://images.pexels.com/photos/7479526/pexels-photo-7479526.jpeg?w=800&q=60',
};
