
export interface BookSettings {
  voice: string; 
  voiceStyle?: string; 
  speed: number;
  ambience?: string; 
  ambienceType?: 'preset' | 'custom' | 'youtube'; 
  ambienceVolume?: number; 
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  content: string;
  chunks: string[];
  chapterIndices: number[];
  progressIndex: number;
  lastAccessed: number;
  settings?: BookSettings;
}

export interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentChunkIndex: number;
  error: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isPremium: boolean; 
}

export type AudioEngine = 'gemini' | 'system';

export interface AmbiencePreset {
  id: string;
  name: string;
  src: string; 
  type: 'custom' | 'youtube';
}

export interface AppSettings {
  fontSize: number;
  defaultVoice: string; 
  defaultSpeed: number;
  engine: AudioEngine; 
  backupProvider: 'google' | 'onedrive'; 
  customPresets: AmbiencePreset[]; 
  // Nuove opzioni Risparmio
  ecoMode: boolean; // Usa TTS sistema per testi brevi
  ecoThreshold: number; // Lunghezza max testo per ecoMode (es. 50 caratteri)
}

export enum ViewState {
  LOGIN = 'LOGIN',
  LIBRARY = 'LIBRARY',
  PLAYER = 'PLAYER',
}
