
export interface BookSettings {
  voice: string; // Nome voce (Gemini o Sistema)
  voiceStyle?: string; // Nuovo: Stile della voce (Narrative, Whisper, etc)
  speed: number;
  ambience?: string; // ID preset, URL custom o YouTube ID
  ambienceType?: 'preset' | 'custom' | 'youtube'; // Nuovo: Tipo di ambience
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
  isPremium: boolean; // Per simulare YouTube Premium / Credits
}

export type AudioEngine = 'gemini' | 'system';

export interface AmbiencePreset {
  id: string;
  name: string;
  src: string; // URL o YouTube ID
  type: 'custom' | 'youtube';
}

export interface AppSettings {
  fontSize: number;
  defaultVoice: string; 
  defaultSpeed: number;
  engine: AudioEngine; 
  backupProvider: 'google' | 'onedrive'; 
  customPresets: AmbiencePreset[]; // Nuovo: Playlist salvate dall'utente
}

export enum ViewState {
  LOGIN = 'LOGIN',
  LIBRARY = 'LIBRARY',
  PLAYER = 'PLAYER',
}
