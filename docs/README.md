
# AudioLibro AI 📚✨

Un lettore di audiolibri intelligente che trasforma ebook statici in esperienze narrative immersive grazie all'Intelligenza Artificiale.

**Versione Corrente:** 1.7.0 (Cloud & Customization Update)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## 🌟 Caratteristiche Principali

### 🗣️ Narrazione AI & "Voice Styles"
Utilizza **Google Gemini 2.5 Flash** per generare una voce umana. 
**Novità:** Non solo legge, ma *recita*. Puoi scegliere lo stile della voce:
*   **Narrativo:** Classico e bilanciato.
*   **Sussurrato:** Per thriller o scene notturne.
*   **Energico:** Per l'azione.
*   **Calmo:** Per rilassarsi.

### 🌧️ Atmosfera Sonora & YouTube Integration
AudioLibro AI crea un ambiente sonoro sincronizzato:
*   **Suoni Ambientali:** Pioggia, Fuoco, Foresta, Notte, Caffè...
*   **YouTube Background:** Incolla un link YouTube (es. Lofi, Jazz, Rain sounds) e l'app lo userà come colonna sonora, sincronizzando play/pausa con la voce.
*   **Playlist:** Salva i tuoi sottofondi preferiti nelle impostazioni.
*   **AI Director:** L'AI analizza il testo e sceglie automaticamente il suono perfetto.

### ☁️ Cloud & Sync (Preview)
*   **Profilo Utente:** Accesso simulato per gestire la libreria.
*   **Multi-Provider:** Supporto interfaccia per backup su **Google Drive** o **OneDrive**.

### ⚡ Motore Ibrido & Offline
*   **Cloud (Gemini):** Alta qualità online.
*   **Dispositivo (System TTS):** Lettura gratis e offline.
*   **Smart Caching:** L'audio generato viene salvato (IndexedDB) per non consumare dati o costi API se riascoltato.

### 🛠️ Strumenti Avanzati
*   **Supporto Formati:** .txt, .docx, .epub.
*   **Esporta Audio:** Scarica i capitoli come file `.wav`.
*   **Sleep Timer:** Timer spegnimento (tempo o fine capitolo).

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
*   **AI:** Google GenAI SDK (Gemini 2.5 Flash TTS & Vision).
*   **Audio:** Web Audio API + HTML5 Audio + YouTube Iframe API.
*   **UI:** Tailwind CSS, Lucide React.
*   **Storage:** IndexedDB (Audio Blob), LocalStorage (Meta).

## 📄 Licenza

Distribuito sotto licenza MIT.
