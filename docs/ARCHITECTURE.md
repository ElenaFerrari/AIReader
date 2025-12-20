
# Architettura di AudioLibro AI

## Panoramica del Sistema

L'applicazione è una Single Page Application (SPA) costruita con React e TypeScript. La sua funzione principale è trasformare file di testo statici in flussi audio continui.

### Flusso dei Dati

1.  **Input:** L'utente carica un file (.txt, .docx, .epub).
2.  **Parsing (`services/parser.ts`):** Il file viene convertito in HTML grezzo.
3.  **Chunking:** Il testo viene diviso in "Chunk" (frammenti) intelligenti (~1100 caratteri).
4.  **Motore Audio (Hybrid Engine):** Gestisce sia chiamate AI Cloud che TTS Locale.

## Il Dual Audio Player (Aggiornato v1.6)

Dalla versione 1.6.0, il sistema di riproduzione è "Duale". Gestiamo due flussi audio paralleli che devono essere sincronizzati logicamente ma indipendenti tecnicamente.

### 1. Voce Narrante (Primary)
Gestita tramite **Web Audio API** (`AudioContext`).
*   Necessaria per decodificare i dati grezzi (`Uint8Array`) provenienti da IndexedDB o dall'API Gemini.
*   Gestisce la coda dei chunk, il preloading e gli eventi `onended` per passare al paragrafo successivo.

### 2. Atmosfera / Ambience (Secondary)
Gestita tramite un elemento **HTML5 `<audio>`** standard.
*   Utilizzata per file audio lunghi in loop (pioggia, rumore bianco, ecc.).
*   Supporta lo streaming diretto da URL remoti senza dover scaricare tutto il file in memoria.

### Sincronizzazione
La logica di sincronizzazione risiede in `App.tsx`:
*   **Play/Pause:** Quando la voce cambia stato (`isPlaying`), un `useEffect` intercetta il cambiamento e comanda play/pause corrispondente all'elemento Ambience.
*   **Cross-fading Logico:** Se l'utente cambia l'atmosfera mentre la voce sta parlando, l'Ambience player cambia la `src` al volo senza fermare il `AudioContext` della voce. Questo garantisce una transizione fluida senza interrompere la narrazione.

## Gestione dello Stato

Usiamo `React.useState` e `useRef` per la gestione locale.
*   **`books` (State):** Lista dei libri e metadati. Persistente su `localStorage`.
*   **`audioCache` (Ref - RAM):** Map temporanea per accesso immediato durante la sessione.
*   **`IndexedDB` (Disk):** Storage persistente per i file audio binari della voce.

## Servizi AI

*   **TTS:** `gemini-2.5-flash-preview-tts` per la generazione vocale.
*   **Vision:** `gemini-2.5-flash-image` per generare le copertine.
*   **Analysis:** `gemini-2.5-flash` (text-only) per la funzione `detectAmbience`, che analizza semanticamente il testo per classificare l'ambiente (es. "forest", "rain").
