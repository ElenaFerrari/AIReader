
# Guida all'Installazione sul Telefono 📱

Poiché l'app è ora una PWA (Progressive Web App), non hai bisogno di cavi o file APK. Devi semplicemente pubblicarla su internet (in modo privato o pubblico) e "installarla" dal browser.

## Metodo Rapido e Gratuito (Vercel)

Questo metodo richiede un account GitHub (gratuito).

### Passo 1: Carica il codice su GitHub
1.  Crea un nuovo repository su [GitHub.com](https://github.com).
2.  Carica tutti i file di questo progetto.

### Passo 2: Pubblica su Vercel
1.  Vai su [Vercel.com](https://vercel.com) e registrati (usa "Continue with GitHub").
2.  Clicca su **"Add New..."** -> **"Project"**.
3.  Seleziona il repository che hai appena creato.
4.  Vercel rileverà che è un progetto `Vite`.
5.  Clicca su **Deploy**.
6.  Attendi circa 1 minuto. Vercel ti darà un link (es. `https://audiolibro-ai-tuonome.vercel.app`).

### Passo 3: Installa sul Telefono
1.  Prendi il tuo telefono (Android o iPhone).
2.  Apri Chrome (Android) o Safari (iOS).
3.  Vai al link fornito da Vercel.
4.  **Android:** Premi i 3 puntini in alto a destra -> **"Aggiungi a schermata Home"** (o "Installa App").
5.  **iOS:** Premi il tasto Condividi (quadrato con freccia) -> Scorri giù -> **"Aggiungi alla schermata Home"**.

### Fatto! 🎉
Ora hai un'icona "AudioLibro" sul telefono. Quando la apri:
1.  Si aprirà a tutto schermo come un'app nativa.
2.  Ti chiederà la tua **API Key Gemini** (fallo una volta sola).
3.  I tuoi dati rimarranno salvati sul telefono.

---

## Nota sui Costi
*   **Vercel/GitHub:** Gratis per uso personale.
*   **Google Gemini API:** Gratis fino a un certo limite (molto alto), poi a pagamento. Controlla il piano su [Google AI Studio](https://aistudio.google.com).

## Aggiornamenti
Se modifichi il codice sul PC e fai "Push" su GitHub, Vercel aggiornerà automaticamente il sito. Sul telefono, chiudi e riapri l'app per vedere le novità.
