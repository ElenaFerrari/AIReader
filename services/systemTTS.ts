
// Servizio per la gestione del TTS nativo del browser/Android

export interface SystemVoice {
  name: string;
  lang: string;
  uri: string;
  default: boolean;
}

export const getSystemVoices = (): Promise<SystemVoice[]> => {
  return new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(formatVoices(voices));
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(formatVoices(voices));
    };
  });
};

const formatVoices = (voices: SpeechSynthesisVoice[]): SystemVoice[] => {
  // Filtra per voci italiane o inglesi se non c'è italiano, preferendo Google/Android
  return voices
    .filter(v => v.lang.startsWith('it') || v.lang.startsWith('en'))
    .map(v => ({
      name: v.name,
      lang: v.lang,
      uri: v.voiceURI,
      default: v.default
    }))
    .sort((a, b) => (a.lang.startsWith('it') ? -1 : 1));
};

export const speakSystem = (
  text: string, 
  voiceName: string, 
  speed: number, 
  onEnd: () => void,
  onError: (e: any) => void
) => {
  // Cancella eventuali audio precedenti
  window.speechSynthesis.cancel();

  // Rimuovi tag HTML per la lettura di sistema
  const cleanText = new DOMParser().parseFromString(text, 'text/html').body.textContent || "";
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = voices.find(v => v.name === voiceName) || voices.find(v => v.lang.startsWith('it'));
  
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.rate = speed;
  utterance.pitch = 1.0;

  utterance.onend = () => onEnd();
  utterance.onerror = (e) => onError(e);

  window.speechSynthesis.speak(utterance);
};

export const stopSystem = () => {
  window.speechSynthesis.cancel();
};
