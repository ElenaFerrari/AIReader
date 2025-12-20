# AudioLibro AI

Un lettore di audiolibri intelligente che trasforma i tuoi ebook (ePub, PDF, Docx, TXT) in narrazioni naturali utilizzando Google Gemini.

## Come installare su GitHub e Android Studio

### 1. Caricare su GitHub
1. Scarica tutti i file di questo progetto.
2. Crea un nuovo repository su GitHub.
3. Carica i file (assicurati di includere `package.json`, `vite.config.ts` e tutti i file sorgente).

### 2. Preparazione per Android (Metodo Trusted Web Activity o Capacitor)

Questa è una Web App (React). Per farla diventare un'App Android, hai due strade principali:

#### Opzione A: Capacitor (Consigliata per principianti)
1. Assicurati di avere Node.js installato sul tuo PC.
2. Apri il terminale nella cartella del progetto.
3. Esegui:
   ```bash
   npm install
   npm run build
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init
   npx cap add android
   ```
4. Questo creerà una cartella `android/`.
5. Apri questa cartella con **Android Studio**.
6. Collega il telefono o usa l'emulatore e premi "Run" (il triangolo verde) per installare l'App (`.apk`).

#### Opzione B: Web View semplice
1. Esegui `npm run build` per creare la cartella `dist`.
2. Copia il contenuto della cartella `dist` dentro la cartella `assets` di un progetto Android standard e usa una WebView per caricarlo.

### Note Importanti
* **API Key**: L'applicazione richiede una API Key di Google Gemini. In produzione, non dovresti mai lasciare la chiave hardcoded nel codice (`process.env.API_KEY`). Per un'app Android reale, dovrai implementare un sistema di login o chiedere all'utente di inserire la propria chiave.
