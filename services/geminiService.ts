
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
 * Genera l'audio per un frammento di testo usando una singola voce.
 */
export const generateSpeechForChunk = async (
  htmlContent: string, 
  voice: string = 'Kore',
  speed: number = 1.0
): Promise<GeneratedAudio> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const text = doc.body.textContent || "";

  // Prompt ottimizzato per Narrazione Pura ed Espressiva
  const prompt = `
    Sei un narratore di audiolibri italiano di altissimo livello.
    
    Il tuo compito è leggere il seguente testo con intonazione naturale, calda e coinvolgente.
    
    LINEE GUIDA PER L'INTERPRETAZIONE:
    1. **Ritmo e Pause:** Rispetta scrupolosamente la punteggiatura. Fai pause naturali per dare respiro alla narrazione, specialmente tra i paragrafi.
    2. **Tono ed Emozione:** Adatta il tono all'atmosfera del testo. Se la scena è triste, rallenta leggermente ed sii più delicato. Se è concitata, aumenta leggermente il ritmo.
    3. **Dialoghi Naturali:** Non cercare di imitare voci diverse o grottesche per i personaggi. Limitati a una leggera variazione di intonazione per far capire che è un dialogo, mantenendo la tua voce narrante come base solida.
    4. **Chiarezza:** La dizione deve essere impeccabile.
    5. **Nomi Stranieri e Fantasy:** Fai molta attenzione ai nomi propri non italiani. NON pronunciarli foneticamente all'italiana (es. "Michael" non deve suonare "Mikael" ma "Maicol"). Usa la pronuncia corretta della lingua originale o quella anglofona standard per i nomi fantasy, mantenendo però la cadenza italiana della frase.
    
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
      contents: { parts: [{ text: `Minimalist book cover art for "${bookTitle}", no text.` }] },
      config: { imageConfig: { aspectRatio: "3:4" } },
    });
    const data = response.candidates[0].content.parts.find(p => p.inlineData)?.inlineData?.data;
    return `data:image/png;base64,${data}`;
  });
};

/**
 * Analizza il testo per suggerire l'ambience migliore.
 */
export const detectAmbience = async (htmlContent: string): Promise<string> => {
  if (!process.env.API_KEY) return 'none';
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const text = (doc.body.textContent || "").substring(0, 2000); // Analizza solo i primi 2000 caratteri per velocità

  const prompt = `
    Analizza brevemente il testo seguente e determina l'ambientazione sonora dominante.
    
    Testo: "${text}"
    
    Scegli ESATTAMENTE UNA delle seguenti opzioni (restituisci SOLO la parola chiave):
    - rain (se piove, c'è temporale o acqua scrosciante)
    - fire (se c'è un camino, fuoco, o atmosfera domestica calda/invernale)
    - forest (se si svolge nella natura, bosco, giardino, uccellini)
    - night (se è notte, silenzio, grilli, atmosfera misteriosa)
    - cafe (se è un luogo pubblico, urbano, folla, bar)
    - none (se non c'è un'ambientazione chiara o è un saggio/astratto)
    
    Risposta (solo una parola):
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Modello testuale veloce
      contents: prompt,
    });
    const result = response.text?.trim().toLowerCase() || 'none';
    const allowed = ['rain', 'fire', 'forest', 'night', 'cafe', 'none'];
    return allowed.includes(result) ? result : 'none';
  } catch (e) {
    console.error("Ambience detection failed", e);
    return 'none';
  }
};
