# Changelog

## [1.5.0] - Chapter Navigation & Management
### Aggiunto
- **Menu Capitoli (TOC):** Nuovo pannello laterale nel player che elenca tutti i capitoli rilevati.
- **Download Selettivo:** Dal menu capitoli è possibile avviare il download in background di qualsiasi capitolo specifico, non solo quello corrente.
- **Stato Download Dettagliato:** Il menu mostra lo stato di ogni capitolo (Disponibile Offline, Parziale, In Download, Da Scaricare).

## [1.4.0] - Cache Management & UI Feedback
### Aggiunto
- **Indicatore Visivo Cache:** I paragrafi già scaricati e disponibili offline ora mostrano una piccola icona verde o un badge "Saved". Questo conferma all'utente che l'audio è al sicuro sul dispositivo.
- **Scarica Capitolo:** Nuovo pulsante "Prepara Audio" che scarica in background tutti i segmenti del capitolo corrente. Questo elimina le attese di buffering durante l'ascolto e rende il capitolo totalmente offline.
- **Gestione Download:** Barra di progresso percentuale durante il download del capitolo.

## [1.3.0] - Audio Export
### Aggiunto
- **Esporta Capitolo:** È ora possibile scaricare il file audio (.wav) del capitolo corrente. L'app "incolla" automaticamente tutti i frammenti generati e salvati nella cache in un unico file audio continuo.
- **WAV Encoder:** Implementato un encoder WAV leggero lato client per generare file audio compatibili senza bisogno di server esterni.

## [1.2.0] - Persistence Layer
### Aggiunto
- **IndexedDB Caching:** Implementato un database locale che salva automaticamente ogni frammento audio generato dall'AI. Riascoltare un capitolo ora ha costo zero in termini di API e dati.
- **Gestione Cache:** Aggiunto pulsante nelle impostazioni per visualizzare il numero di file salvati e svuotare la cache se necessario.

### Modificato
- **Gemini Service:** Aggiornato per restituire dati grezzi (`Uint8Array`) ottimizzati per lo storage, invece di soli AudioBuffer decodificati.
- **Logica Player:** Il flusso di riproduzione ora controlla RAM -> Disco -> Cloud prima di generare nuovo audio.

## [1.1.0] - Hybrid Update
### Aggiunto
- **Supporto System TTS (Offline):** Aggiunto un nuovo motore audio che utilizza le voci native del dispositivo. Questo permette l'uso dell'app senza connessione internet e senza consumare quote API.
- **Selettore Motore:** Nelle impostazioni globali è ora possibile scegliere tra "AI Gemini" (Alta qualità) e "Dispositivo" (Offline).
- **Lista Voci Dinamica:** Il player ora mostra le voci disponibili in base al motore selezionato (Voci AI vs Voci di sistema installate).
- **Badge di Stato:** Aggiunte icone nel player per indicare se si sta usando la modalità Cloud o Offline.

### Modificato
- **Refactoring Player:** La logica di riproduzione è stata separata per gestire sia flussi basati su `AudioBuffer` (Gemini) che su eventi `SpeechSynthesis` (Sistema).
- **Gestione Errori:** Migliorata la gestione degli errori per il TTS locale.

## [1.0.0] - Initial Release
### Funzionalità
- Lettura file .txt, .epub, .docx.
- Integrazione con Google Gemini 2.5 Flash Preview TTS.
- Algoritmo di "Smart Chunking" per dividere il testo.
- Generazione copertine AI (Gemini Flash Image).
- Persistenza della libreria su LocalStorage.
