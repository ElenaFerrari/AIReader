
# Architecture Decision Records (ADR)

In questo documento tracciamo le decisioni tecniche importanti e il motivo per cui sono state prese.

## ADR-001: Utilizzo di Google Gemini 2.5 Flash per il TTS
*   **Decisione:** Usare l'endpoint `gemini-2.5-flash-preview-tts`.
*   **Motivazione:** Qualità narrativa superiore, intonazione contestuale.

## ADR-002: Smart Chunking a ~1000 Caratteri
*   **Decisione:** Dividere il testo in blocchi di circa 1000 caratteri.
*   **Motivazione:** Rispetta i limiti di token, permette bufferizzazione rapida, mantiene costi bassi.

## ADR-003: Adozione del Sistema Ibrido (Offline Fallback)
*   **Decisione:** Supportare sia `AudioContext` (AI) che `window.speechSynthesis` (Sistema).
*   **Motivazione:** Garantire funzionalità offline e gratuita.

## ADR-004: LocalStorage per il Database
*   **Decisione:** Salvare i metadati e il testo dei libri in `localStorage`.
*   **Motivazione:** Semplicità di implementazione rispetto a un DB relazionale completo client-side.

## ADR-005: Caching Audio tramite IndexedDB
*   **Decisione:** Usare **IndexedDB** per salvare i raw bytes (`Uint8Array`) dell'audio voce.
*   **Motivazione:** `localStorage` è troppo piccolo per l'audio. IndexedDB permette di salvare Blob/ArrayBuffer di grandi dimensioni in modo persistente.

## ADR-006: Elemento HTML5 Audio separato per Ambience
*   **Contesto:** Necessità di riprodurre suoni di sottofondo in loop (Ambience) contemporaneamente alla voce generata (BufferSource).
*   **Opzioni:**
    1.  Mixare tutto dentro `AudioContext` (caricare l'ambience come buffer, creare gain node, mixare).
    2.  Usare un tag `<audio>` separato gestito da React.
*   **Decisione:** Opzione 2 (Tag `<audio>` separato).
*   **Motivazione:**
    *   **Gestione URL:** L'elemento `<audio>` gestisce nativamente lo streaming da URL remoti (es. Google Sounds, Custom URL) senza dover gestire manualmente scaricamento, decodifica e CORS complessi come richiesto da `AudioContext`.
    *   **Looping:** L'attributo `loop` nativo è molto affidabile.
    *   **Indipendenza:** Permette di cambiare la traccia di sottofondo senza dover fermare o ricreare il grafo audio della voce narrante.
