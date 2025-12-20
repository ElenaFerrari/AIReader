# Architecture Decision Records (ADR)

In questo documento tracciamo le decisioni tecniche importanti e il motivo per cui sono state prese.

## ADR-001: Utilizzo di Google Gemini 2.5 Flash per il TTS
*   **Contesto:** Volevamo una qualità audio superiore alle voci robotiche standard, simile a un audiolibro narrato.
*   **Decisione:** Usare l'endpoint `gemini-2.5-flash-preview-tts`.
*   **Pro:** Intonazione, comprensione del contesto, gestione dei dialoghi.
*   **Contro:** Richiede internet, potenziali costi (mitigati dal Free Tier), latenza.

## ADR-002: Smart Chunking a ~1000 Caratteri
*   **Contesto:** Gli LLM hanno limiti di token e finestre di contesto. Mandare un libro intero è impossibile e costoso. Mandare frasi singole rende l'audio "scattoso".
*   **Decisione:** Dividere il testo in blocchi di circa 1000 caratteri (circa 40-60 secondi di audio).
*   **Motivazione:**
    1.  Rientra ampiamente nel limite di token per richiesta.
    2.  È abbastanza lungo da permettere all'AI di avere contesto ed espressività.
    3.  È abbastanza breve da permettere il download rapido del blocco successivo (buffer) senza interrompere la riproduzione.
    4.  Mantiene il consumo di API sotto le quote del Free Tier (max 15 richieste/minuto).

## ADR-003: Adozione del Sistema Ibrido (Offline Fallback)
*   **Contesto:** L'utente potrebbe voler leggere in aereo o non voler dipendere dalle quote Google.
*   **Decisione:** Implementare un'astrazione nel Player che supporta sia `AudioContext` (per l'AI) che `window.speechSynthesis` (per il locale).
*   **Conseguenze:** Il codice del Player è diventato leggermente più complesso per gestire i due stati asincroni diversi, ma l'app è ora utilizzabile al 100% gratuitamente e offline.

## ADR-004: LocalStorage per il Database
*   **Contesto:** Necessità di salvare i libri e i progressi senza implementare un backend complesso.
*   **Decisione:** Salvare tutto (testo incluso) nel `localStorage` del browser.
*   **Limiti:** Il LocalStorage ha limiti di spazio (solitamente 5-10MB).
*   **Futuro:** Se l'utente carica molti libri pesanti, dovremo migrare a `IndexedDB` (es. usando Dexie.js). Per ora, per 5-10 libri di testo, il LocalStorage è sufficiente e molto più veloce da implementare.

## ADR-005: Caching Audio tramite IndexedDB
*   **Contesto:** Rigenerare l'audio via AI ogni volta che l'utente riascolta un capitolo è inefficiente e spreca la quota API.
*   **Problema:** `localStorage` è troppo piccolo per salvare file audio.
*   **Decisione:** Usare **IndexedDB** per salvare i raw bytes (`Uint8Array`) ricevuti da Gemini.
*   **Implementazione:**
    1.  La chiave di cache è una composizione di `BookID + ChunkIndex + Voice + Speed` per garantire unicità.
    2.  Salviamo il file binario compresso (non l'AudioBuffer decodificato che occuperebbe troppa RAM/spazio).
    3.  Prima di chiamare l'API, controlliamo sempre se la chiave esiste nel DB.
*   **Risultato:** "Paghi" la richiesta API solo la prima volta che ascolti un paragrafo.
