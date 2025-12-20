
export interface BookSettings {
  voice: string; // Nome voce (Gemini o Sistema)
  speed: number;
  ambience?: string; // ID dell'audio ambientale (rain, fire, ecc)
  ambienceVolume?: number; // Volume da 0.0 a 1.0
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

export type AudioEngine = 'gemini' | 'system';

export interface AppSettings {
  fontSize: number;
  defaultVoice: string; 
  defaultSpeed: number;
  engine: AudioEngine; // Nuovo campo
}

export enum ViewState {
  LIBRARY = 'LIBRARY',
  PLAYER = 'PLAYER',
}
