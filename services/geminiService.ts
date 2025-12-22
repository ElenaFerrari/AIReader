import { GoogleGenAI, Modality, Type } from "@google/genai";
import { decodeBase64, decodeAudioData } from "./audioUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let audioContext: AudioContext | null = null;

export const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000, 
    });
  }
  return audioContext;
};

async function apiCallWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.status === 429;
    if (retries > 0 && isQuotaError) {
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

/**
 * Genera l'audio per un frammento di testo usando una singola voce e uno stile.
 */
export const generateSpeechForChunk = async (
  htmlContent: string, 
  voice: string = 'Kore',
  speed: number = 1.0,
  style: string = 'Narrative' // Default style
): Promise<GeneratedAudio> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const text = doc.body.textContent || "";

  // Mapping degli stili in istruzioni per il prompt
  const styleInstructions: Record<string, string> = {
    'Narrative': 'Tono naturale, equilibrato e professionale da audiolibro classico.',
    'Whisper': 'Tono basso, quasi sussurrato, intimo e misterioso. Perfetto per scene di tensione o notturne.',
    'Energetic': 'Tono vivace, rapido e dinamico. Enfatizza l\'azione e l\'avventura.',
    'Calm': 'Tono molto lento, profondo, rilassante e rassicurante. Quasi meditativo, ideale per addormentarsi.',
    'Deep': 'Tono autorevole, profondo e solenne.'
  };

  const selectedStyleInstruction = styleInstructions[style] || styleInstructions['Narrative'];

  // Prompt ottimizzato con supporto stile
  const prompt = `
    Sei un narratore di audiolibri italiano di altissimo livello.
    
    Il tuo compito è leggere il seguente testo.
    
    STILE RICHIESTO: **${style}**
    Istruzione Stile: ${selectedStyleInstruction}
    
    LINEE GUIDA GENERALI:
    1. **Ritmo e Pause:** Rispetta la punteggiatura. Pause naturali.
    2. **Dizione:** Impeccabile e chiara.
    3. **Nomi:** Pronuncia corretta dei nomi stranieri.
    
    Leggi questo testo:
    "${text}"
  `;

  return apiCallWithRetry(async () => {
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

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio non generato.");

    const rawData = decodeBase64(base64Audio);
    const ctx = getAudioContext();
    const audioBuffer = await decodeAudioData(rawData, ctx, 24000, 1);

    return { audioBuffer, rawData };
  });
};

export const generateCoverImage = async (bookTitle: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  return apiCallWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `High quality book cover art for "${bookTitle}", artistic, minimal text, 4k.` }] },
      config: { imageConfig: { aspectRatio: "3:4" } },
    });
    const data = response.candidates[0].content.parts.find(p => p.inlineData)?.inlineData?.data;
    return `data:image/png;base64,${data}`;
  });
};

export const detectAmbience = async (htmlContent: string): Promise<string> => {
  if (!process.env.API_KEY) return 'none';
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const text = (doc.body.textContent || "").substring(0, 2000); 

  const prompt = `
    Analizza brevemente il testo seguente e determina l'ambientazione sonora dominante.
    
    Testo: "${text}"
    
    Scegli ESATTAMENTE UNA delle seguenti opzioni:
    - rain
    - fire
    - forest
    - night
    - cafe
    - none
    
    Risposta (solo parola chiave):
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    const result = response.text?.trim().toLowerCase() || 'none';
    const allowed = ['rain', 'fire', 'forest', 'night', 'cafe', 'none'];
    return allowed.includes(result) ? result : 'none';
  } catch (e) {
    return 'none';
  }
};