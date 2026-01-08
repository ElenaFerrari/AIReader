
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { decodeBase64, decodeAudioData } from "./audioUtils";

// --- DEBUG SYSTEM START ---
type DebugStats = { requests: number; totalTokens: number; lastCost: number };
let stats: DebugStats = { requests: 0, totalTokens: 0, lastCost: 0 };
type Listener = (s: DebugStats) => void;
const listeners: Set<Listener> = new Set();

export const subscribeToDebugStats = (fn: Listener) => {
  listeners.add(fn);
  fn(stats); // Initial call
  return () => listeners.delete(fn);
};

const updateStats = (tokens: number = 0) => {
  stats = {
    requests: stats.requests + 1,
    totalTokens: stats.totalTokens + tokens,
    lastCost: tokens
  };
  listeners.forEach(fn => fn(stats));
};
// --- DEBUG SYSTEM END ---

// Correct Method: The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

let audioContext: AudioContext | null = null;

export const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000, 
    });
  }
  return audioContext;
};

async function apiCallWithRetry<T>(fn: () => Promise<T>, retries = 1, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Gestione specifica Errore Quota (429) o Resource Exhausted
    const isQuotaError = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Resource has been exhausted');
    
    if (isQuotaError) {
      // NON RITENTARE se i crediti sono finiti, spreca solo tempo e risorse.
      throw new Error("QUOTA_EXCEEDED");
    }

    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiCallWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export interface GeneratedAudio {
  audioBuffer: AudioBuffer;
  rawData: Uint8Array;
}

// Semplice funzione di hashing per il contenuto del testo
export function getTextHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export const generateSpeechForChunk = async (
  htmlContent: string, 
  voice: string = 'Kore',
  speed: number = 1.0,
  style: string = 'Narrative' 
): Promise<GeneratedAudio> => {
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const text = doc.body.textContent?.trim() || "";

  // Ottimizzazione: Se il testo è vuoto, non chiamare l'API
  if (!text) throw new Error("Testo vuoto");

  const styleMap: Record<string, string> = {
    'Narrative': 'narrativo',
    'Whisper': 'sussurrato',
    'Energetic': 'energico',
    'Calm': 'calmo',
    'Deep': 'profondo'
  };

  // Prompt ultra-compatto per risparmiare token di input
  const prompt = `Leggi. Stile: ${styleMap[style] || 'naturale'}. Testo: "${text}"`;

  return apiCallWithRetry(async () => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    // Update debug stats
    const tokens = response.usageMetadata?.totalTokenCount || 0;
    updateStats(tokens);

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio mancante nella risposta API.");

    const rawData = decodeBase64(base64Audio);
    const ctx = getAudioContext();
    const audioBuffer = await decodeAudioData(rawData, ctx, 24000, 1);

    return { audioBuffer, rawData };
  });
};

export const generateCoverImage = async (bookTitle: string): Promise<string> => {
  return apiCallWithRetry(async () => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Minimalist book cover: "${bookTitle}"` }] },
      config: { imageConfig: { aspectRatio: "3:4" } },
    });
    
    // Update debug stats
    const tokens = response.usageMetadata?.totalTokenCount || 0;
    updateStats(tokens);

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const data = part?.inlineData?.data;
    if (!data) throw new Error("Errore immagine");
    return `data:image/png;base64,${data}`;
  });
};

export const detectAmbience = async (htmlContent: string): Promise<string> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const text = (doc.body.textContent || "").substring(0, 500); // Riduciamo a 500 char per risparmiare

  const prompt = `Ambience one word (rain, fire, forest, night, cafe, none): "${text}"`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    // Update debug stats
    const tokens = response.usageMetadata?.totalTokenCount || 0;
    updateStats(tokens);

    const result = response.text?.trim().toLowerCase() || 'none';
    const allowed = ['rain', 'fire', 'forest', 'night', 'cafe', 'none'];
    return allowed.includes(result) ? result : 'none';
  } catch (e) {
    return 'none';
  }
};
