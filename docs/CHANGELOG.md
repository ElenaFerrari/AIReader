
# Changelog

## [1.6.0] - Immersive Ambience Update
### Aggiunto
- **Atmosfera Sonora (Ambience):** È ora possibile riprodurre suoni di sottofondo in loop (Pioggia, Fuoco, Foresta, ecc.) durante la lettura.
- **AI Ambience Detection:** Nuova funzione "Magic Wand" che utilizza Gemini Flash (Text-only) per analizzare il contenuto del capitolo e suggerire automaticamente l'atmosfera più adatta.
- **Custom URL Support:** Possibilità di incollare link diretti a file MP3/OGG esterni per utilizzare suoni personalizzati come ambience.
- **Mixer Audio:** Controllo volume indipendente per l'ambiente rispetto alla voce narrante.
- **Sync Intelligente:** L'ambiente parte e si ferma automaticamente insieme alla voce, ma cambiare ambiente non interrompe la narrazione in corso.

### Modificato
- **Player UI:** Ridisegnato il pannello impostazioni per accomodare i controlli dell'atmosfera.
- **Gestione Errori:** Migliorata la resilienza del player nel caso di URL audio non validi o problemi di CORS.

## [1.5.0] - Chapter Navigation & Management
### Aggiunto
- **Menu Capitoli (TOC):** Nuovo pannello laterale nel player che elenca tutti i capitoli rilevati.
- **Download Selettivo:** Dal menu capitoli è possibile avviare il download in background di qualsiasi capitolo specifico.
- **Stato Download Dettagliato:** Il menu mostra lo stato di ogni capitolo (Disponibile Offline, Parziale, In Download, Da Scaricare).

## [1.4.0] - Cache Management & UI Feedback
### Aggiunto
- **Indicatore Visivo Cache:** Icone e badge per indicare i paragrafi salvati offline.
- **Scarica Capitolo:** Pulsante per scaricare massivamente tutti i chunk di un capitolo.
- **Gestione Download:** Barra di progresso percentuale.

## [1.3.0] - Audio Export
### Aggiunto
- **Esporta Capitolo:** Funzione per scaricare il file audio (.wav) del capitolo corrente unendo i chunk.
- **WAV Encoder:** Encoder WAV client-side leggero.

## [1.2.0] - Persistence Layer
### Aggiunto
- **IndexedDB Caching:** Storage locale per i file audio binari per risparmiare API.
- **Gestione Cache:** Strumenti per monitorare e svuotare lo spazio occupato.

## [1.1.0] - Hybrid Update
### Aggiunto
- **Supporto System TTS (Offline):** Integrazione con le voci native del dispositivo come fallback gratuito.
- **Selettore Motore:** Scelta tra AI Cloud e TTS Locale.

## [1.0.0] - Initial Release
- Prima versione con supporto .txt, .epub, .docx e Gemini TTS.
