
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

/**
 * Genera l'audio per un frammento di testo usando una singola voce.
 */
export const generateSpeechForChunk = async (
  htmlContent: string, 
  voice: string = 'Kore',
  speed: number = 1.0
): Promise<AudioBuffer> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const text = doc.body.textContent || "";

  // Prompt semplificato per massimizzare la velocità e ridurre i token
  const prompt = `Sei un narratore di audiolibri esperto. Leggi il seguente testo in italiano con tono naturale, rispettando la punteggiatura: "${text}"`;

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

    const ctx = getAudioContext();
    return await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
  });
};

export const generateCoverImage = async (bookTitle: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  return apiCallWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Minimalist book cover art for "${bookTitle}", no text.` }] },
      config: { imageConfig: { aspectRatio: "3:4" } },
    });
    const data = response.candidates[0].content.parts.find(p => p.inlineData)?.inlineData?.data;
    return `data:image/png;base64,${data}`;
  });
};
