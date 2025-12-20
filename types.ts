
export interface BookSettings {
  voice: string; // Voce del narratore
  speed: number;
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

export interface AppSettings {
  fontSize: number;
  defaultVoice: string; 
  defaultSpeed: number;
}

export enum ViewState {
  LIBRARY = 'LIBRARY',
  PLAYER = 'PLAYER',
}
