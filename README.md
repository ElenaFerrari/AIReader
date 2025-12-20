
# AudioLibro AI 📚✨

Un lettore di audiolibri intelligente che trasforma ebook statici in esperienze narrative immersive grazie all'Intelligenza Artificiale.

**Versione Corrente:** 1.6.0 (Immersive Edition)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## 🌟 Caratteristiche Principali

### 🗣️ Narrazione AI di Nuova Generazione
Utilizza **Google Gemini 2.5 Flash** per generare una voce umana, espressiva e contestuale. Non è il solito robot: l'AI capisce se una scena è triste, felice o concitata e adatta il tono.

### 🌧️ Atmosfera Sonora (Novità!)
AudioLibro AI non si limita a leggere, crea un ambiente:
*   **Suoni Ambientali:** Pioggia, Fuoco, Foresta, Notte, Caffè...
*   **AI Director:** Clicca sulla bacchetta magica (✨) e l'AI analizzerà il testo del capitolo per scegliere automaticamente il suono di sottofondo perfetto.
*   **Custom Audio:** Incolla qualsiasi URL di file audio (MP3/OGG) per usare la tua colonna sonora.
*   **Mixer:** Regola il volume dell'ambiente indipendentemente dalla voce.

### ⚡ Motore Ibrido & Offline
*   **Cloud (Gemini):** Per la massima qualità quando sei online.
*   **Dispositivo (System TTS):** Usa le voci native del telefono per leggere **gratis** e **senza internet**.
*   **Smart Caching:** L'audio generato dall'AI viene salvato sul dispositivo. Riascoltare un libro non consuma dati né quota API.

### 🛠️ Strumenti Avanzati
*   **Supporto Formati:** .txt, .docx, .epub.
*   **Esporta Audio:** Scarica i capitoli come file `.wav` per ascoltarli su altri player.
*   **Download in Background:** Scarica interi capitoli mentre ascolti altro.

## 🚀 Installazione e Sviluppo

1.  **Clona il repo**:
    ```bash
    git clone https://github.com/tuo-username/audiolibro-ai.git
    cd audiolibro-ai
    ```

2.  **Installa le dipendenze**:
    ```bash
    npm install
    ```

3.  **Configurazione API Key**:
    L'app richiede una API Key di Google Gemini.
    Crea un file `.env` nella root:
    ```env
    API_KEY=tua_chiave_gemini_qui
    ```

4.  **Avvia in locale**:
    ```bash
    npm run dev
    ```

## 🏗️ Stack Tecnologico

*   **Core:** React 19, TypeScript, Vite.
*   **AI & Logic:** Google GenAI SDK, Web Audio API.
*   **UI/UX:** Tailwind CSS, Lucide React.
*   **Storage:** IndexedDB (per i file audio), LocalStorage (per i metadati).

## 🤝 Contribuire

Le Pull Request sono benvenute! Per modifiche importanti, apri prima una issue per discutere cosa vorresti cambiare.

## 📄 Licenza

Distribuito sotto licenza MIT. Vedere `LICENSE` per maggiori informazioni.
