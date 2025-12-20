# AudioLibro AI 📚🤖

Un lettore di audiolibri intelligente progettato per trasformare ebook in narrazioni naturali.

**Versione Corrente:** 1.1.0 (Hybrid Engine)

## Caratteristiche Principali

*   **Supporto Multi-Formato:** Legge file `.txt`, `.docx`, `.epub`.
*   **Motore Ibrido (Novità v1.1):**
    *   ☁️ **AI Cloud (Gemini 2.5):** Qualità vocale umana, espressiva e contestuale. Richiede connessione internet.
    *   📱 **Dispositivo (Offline):** Utilizza le voci native del telefono. Gratuito, illimitato e funziona senza internet.
*   **Smart Chunking:** Algoritmo intelligente che divide il testo rispettando la punteggiatura e i capitoli per ottimizzare le richieste API.
*   **Persistenza:** Salva automaticamente il punto in cui sei arrivato per ogni libro.

## Documentazione Tecnica

Per sviluppatori o per chi vuole capire come funziona il progetto:

*   [🏛 Architettura del Sistema](docs/ARCHITECTURE.md) - Come gestiamo l'audio, i buffer e il parsing.
*   [🧠 Decisioni Tecniche (ADR)](docs/DECISIONS.md) - Perché abbiamo fatto certe scelte (es. limiti API, gestione memoria).
*   [📝 Changelog](docs/CHANGELOG.md) - Cronologia delle modifiche.

## Installazione e Sviluppo

1.  **Clona il repo**:
    ```bash
    git clone [url-repo]
    cd audiolibro-ai
    ```

2.  **Installa le dipendenze**:
    ```bash
    npm install
    ```

3.  **Imposta l'API Key (Per il motore AI)**:
    Crea un file `.env` o imposta la variabile d'ambiente `API_KEY` con la tua chiave Google Gemini.

4.  **Avvia**:
    ```bash
    npm run dev
    ```

## Stack Tecnologico

*   **Frontend:** React 18, Vite, TypeScript.
*   **UI:** Tailwind CSS, Lucide React.
*   **AI:** Google GenAI SDK (Gemini 2.5 Flash).
*   **Parsing:** Mammoth (.docx), Epub.js (.epub).
