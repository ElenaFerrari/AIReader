# Architettura di AudioLibro AI

## Panoramica del Sistema

L'applicazione è una Single Page Application (SPA) costruita con React e TypeScript. La sua funzione principale è trasformare file di testo statici in flussi audio continui.

### Flusso dei Dati

1.  **Input:** L'utente carica un file (.txt, .docx, .epub).
2.  **Parsing (`services/parser.ts`):** Il file viene convertito in HTML grezzo.
3.  **Chunking:** Il testo viene diviso in "Chunk" (frammenti) intelligenti.
    *   *Logica:* Tagliamo a ~1100 caratteri cercando la fine di frasi o paragrafi per evitare di tagliare parole a metà.
    *   *Rilevamento Capitoli:* Identifichiamo pattern come "Capitolo X" per creare indici di navigazione.
4.  **Motore Audio (Hybrid Engine):**
    *   Se **Gemini AI**:
        1.  **Check Cache:** Controlla se l'audio esiste in RAM o IndexedDB.
        2.  **API Call:** Se manca, richiede audio a Gemini.
        3.  **Persistenza:** Salva il risultato in IndexedDB per il futuro.
        4.  **Playback:** Riproduce tramite Web Audio API.
    *   Se **System TTS**: Il testo viene passato all'API `window.speechSynthesis` del browser/Android.

## Gestione dello Stato

Usiamo `React.useState` e `useRef` per la gestione locale.
*   **`books` (State):** Lista dei libri e metadati. Persistente su `localStorage`.
*   **`audioCache` (Ref - RAM):** Map temporanea per accesso immediato durante la sessione.
*   **`IndexedDB` (Disk):** Storage persistente per i file audio binari.

## Il Player Audio

Il player gestisce due logiche diverse a seconda del motore:

### 1. Gemini (Buffer-based)
Utilizza `AudioContext`.
*   **Preloading:** Mentre riproduce il Chunk N, scarica silenziosamente il Chunk N+1 (da DB o API).
*   **Code:** Non usiamo una coda FIFO classica, ma una catena di promise gestita tramite eventi `onended` del buffer corrente.

### 2. System TTS (Event-based)
Utilizza `SpeechSynthesisUtterance`.
*   Non c'è buffer o preloading (la generazione è istantanea locale).
*   Si basa sugli eventi `onend` dell'oggetto utterance.

## Diagramma delle Cartelle

*   `/components`: UI (Libreria, Player).
*   `/services`: Logica di business pura (API call, TTS locale, Parser file, Storage DB).
*   `/docs`: Questa documentazione.
