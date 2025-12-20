
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Library from './components/Library';
import Player from './components/Player';
import { Book, ViewState, AudioState, AppSettings, BookSettings } from './types';
import { parseFile, chunkText } from './services/parser';
import { generateSpeechForChunk, getAudioContext, generateCoverImage, detectAmbience } from './services/geminiService';
import { speakSystem, stopSystem } from './services/systemTTS';
import { saveAudioChunk, getAudioChunk, clearAudioCache, getAllStoredKeys } from './services/storage';
import { decodeAudioData } from './services/audioUtils';
import { Loader2, Palette, AlertCircle, X } from 'lucide-react';

const DEFAULT_GLOBAL_SETTINGS: AppSettings = {
  fontSize: 18,
  defaultVoice: 'Kore',
  defaultSpeed: 1.0,
  engine: 'gemini' 
};

// Mappa URL suoni predefiniti
const AMBIENCE_PRESETS: Record<string, string> = {
    'rain': 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
    'fire': 'https://actions.google.com/sounds/v1/ambiences/fireplace.ogg',
    'forest': 'https://actions.google.com/sounds/v1/water/creek_and_birds.ogg',
    'night': 'https://actions.google.com/sounds/v1/nature/crickets_chirping.ogg',
    'cafe': 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    'none': ''
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LIBRARY);
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<AppSettings>(DEFAULT_GLOBAL_SETTINGS);
  
  // Cache Tracking
  const [cachedKeys, setCachedKeys] = useState<Set<string>>(new Set());
  const [isDownloadingChapter, setIsDownloadingChapter] = useState(false);
  const [downloadingRange, setDownloadingRange] = useState<{start: number, end: number} | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    currentChunkIndex: 0,
    error: null,
  });

  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackIdRef = useRef<number>(0);
  const audioCache = useRef<Map<string, AudioBuffer>>(new Map());
  const fetchPromises = useRef<Map<string, Promise<AudioBuffer>>>(new Map());
  
  // Ambience Player Ref
  const ambienceRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const savedBooks = localStorage.getItem('audiolibro_books');
    if (savedBooks) setBooks(JSON.parse(savedBooks));
    const savedSettings = localStorage.getItem('audiolibro_settings');
    if (savedSettings) setGlobalSettings({ ...DEFAULT_GLOBAL_SETTINGS, ...JSON.parse(savedSettings) });
    refreshCachedKeys();
  }, []);

  const refreshCachedKeys = async () => {
      const keys = await getAllStoredKeys();
      setCachedKeys(keys);
  };

  useEffect(() => { localStorage.setItem('audiolibro_books', JSON.stringify(books)); }, [books]);
  useEffect(() => { localStorage.setItem('audiolibro_settings', JSON.stringify(globalSettings)); }, [globalSettings]);

  // --- LOGICA AMBIENCE SINCRONIZZATA ---
  useEffect(() => {
    if (!ambienceRef.current || !activeBook) return;

    const ambienceSetting = activeBook.settings?.ambience || 'none';
    
    // Se è una chiave preset usa quella, altrimenti usa la stringa come URL diretto
    const targetUrl = AMBIENCE_PRESETS[ambienceSetting] !== undefined 
        ? AMBIENCE_PRESETS[ambienceSetting] 
        : ambienceSetting;

    const ambienceVol = activeBook.settings?.ambienceVolume ?? 0.2; // Default volume un po' più alto

    // 1. Aggiorna Volume
    ambienceRef.current.volume = ambienceVol;

    // 2. Cambio Traccia
    const currentSrc = ambienceRef.current.getAttribute('src');
    
    // Logica per determinare se cambiare:
    // Se targetUrl è vuoto ('none' preset) -> stop
    // Se targetUrl è diverso da quello attuale -> cambia
    const shouldChangeTrack = targetUrl !== currentSrc && !(targetUrl === '' && !currentSrc);

    if (shouldChangeTrack) {
        if (targetUrl) {
            ambienceRef.current.src = targetUrl;
            ambienceRef.current.load(); // Importante per ricaricare se cambia URL custom
            if (audioState.isPlaying && !audioState.isLoading) {
                 const playPromise = ambienceRef.current.play();
                 if (playPromise !== undefined) playPromise.catch((e) => console.warn("Ambience play failed", e));
            }
        } else {
            ambienceRef.current.pause();
            ambienceRef.current.removeAttribute('src'); // Pulisce src
        }
    }

    // 3. Sincronizzazione Play/Pausa
    if (ambienceRef.current.getAttribute('src')) {
        if (audioState.isPlaying && !audioState.isLoading) {
             const playPromise = ambienceRef.current.play();
             if (playPromise !== undefined) playPromise.catch((e) => console.warn("Ambience sync play failed", e));
        } else {
            ambienceRef.current.pause();
        }
    }
  }, [activeBook?.settings?.ambience, activeBook?.settings?.ambienceVolume, audioState.isPlaying, audioState.isLoading]);


  const stopAudio = useCallback(() => {
    playbackIdRef.current += 1; 
    
    if (audioSourceRef.current) {
      try { audioSourceRef.current.onended = null; audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current = null;
    }
    stopSystem();
    setAudioState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
  }, []);

  const getOrFetchAudio = async (chunkHtml: string, key: string, voice: string, speed: number): Promise<AudioBuffer> => {
    if (audioCache.current.has(key)) return audioCache.current.get(key)!;
    
    const cachedRaw = await getAudioChunk(key);
    if (cachedRaw) {
       const ctx = getAudioContext();
       const buffer = await decodeAudioData(cachedRaw, ctx, 24000, 1);
       audioCache.current.set(key, buffer); 
       return buffer;
    }

    const result = await generateSpeechForChunk(chunkHtml, voice, speed);
    await saveAudioChunk(key, result.rawData); 
    setCachedKeys(prev => new Set(prev).add(key));
    audioCache.current.set(key, result.audioBuffer);
    return result.audioBuffer;
  };

  const preloadNextChunk = useCallback(async (index: number, book: Book) => {
    if (globalSettings.engine !== 'gemini') return;

    const nextIndex = index + 1;
    if (nextIndex >= book.chunks.length) return;

    const voice = book.settings?.voice || globalSettings.defaultVoice;
    const speed = book.settings?.speed || globalSettings.defaultSpeed;
    const bookId = book.id;
    const key = `${bookId}_${nextIndex}_${voice}_${speed}`;

    if (!audioCache.current.has(key) && !fetchPromises.current.has(key)) {
      const promise = getOrFetchAudio(book.chunks[nextIndex], key, voice, speed);
      fetchPromises.current.set(key, promise);
      try { await promise; } catch (e) {} finally { fetchPromises.current.delete(key); }
    }
  }, [globalSettings]);

  const handleDownloadChapter = async (startIndex: number, endIndex: number) => {
      if (!activeBook || globalSettings.engine !== 'gemini') return;
      if (isDownloadingChapter) return;

      setIsDownloadingChapter(true);
      setDownloadingRange({ start: startIndex, end: endIndex });
      setDownloadProgress(0);
      const total = endIndex - startIndex;
      const voice = activeBook.settings?.voice || globalSettings.defaultVoice;
      const speed = activeBook.settings?.speed || globalSettings.defaultSpeed;

      try {
          for (let i = startIndex; i < endIndex; i++) {
              if (!activeBook) break;
              const key = `${activeBook.id}_${i}_${voice}_${speed}`;
              if (cachedKeys.has(key)) {
                  setDownloadProgress(Math.round(((i - startIndex + 1) / total) * 100));
                  continue;
              }
              if (!fetchPromises.current.has(key)) {
                  const promise = getOrFetchAudio(activeBook.chunks[i], key, voice, speed);
                  fetchPromises.current.set(key, promise);
                  await promise;
                  fetchPromises.current.delete(key);
              } else {
                  await fetchPromises.current.get(key);
              }
              setDownloadProgress(Math.round(((i - startIndex + 1) / total) * 100));
              await new Promise(r => setTimeout(r, 500)); 
          }
      } catch (e) {
          alert("Errore download capitolo.");
      } finally {
          setIsDownloadingChapter(false);
          setDownloadingRange(null);
          setDownloadProgress(0);
      }
  };

  const handleAutoDetectAmbience = async () => {
    if (!activeBook || globalSettings.engine !== 'gemini') {
        alert("Serve il motore Gemini per rilevare l'atmosfera.");
        return;
    }
    const currentText = activeBook.chunks[audioState.currentChunkIndex];
    const suggested = await detectAmbience(currentText);
    if (suggested && suggested !== 'none') {
        const updated = { ...activeBook, settings: { ...activeBook.settings!, ambience: suggested } };
        setActiveBook(updated);
        setBooks(prev => prev.map(b => b.id === activeBook.id ? updated : b));
    } else {
        alert("Nessuna atmosfera specifica rilevata.");
    }
  };

  const playChunk = async (index: number, targetBook?: Book) => {
    const book = targetBook || activeBook;
    if (!book) return;
    
    stopAudio(); 
    const currentPlaybackId = playbackIdRef.current;
    
    setAudioState(prev => ({ ...prev, currentChunkIndex: index, isLoading: true, error: null, isPlaying: true }));
    const currentEngine = globalSettings.engine;
    const voice = book.settings?.voice || globalSettings.defaultVoice;
    const speed = book.settings?.speed || globalSettings.defaultSpeed;

    if (currentEngine === 'system') {
      try {
        setAudioState(prev => ({ ...prev, isLoading: false }));
        setBooks(prev => prev.map(b => b.id === book.id ? { ...b, progressIndex: index } : b));
        speakSystem(
          book.chunks[index],
          voice,
          speed,
          () => { if (currentPlaybackId === playbackIdRef.current) handleNextChunk(); },
          (e) => { if (currentPlaybackId === playbackIdRef.current) setAudioState(prev => ({ ...prev, isPlaying: false, error: "Errore TTS." })); }
        );
      } catch (err) { setAudioState(prev => ({ ...prev, isPlaying: false, error: "Errore imprevisto." })); }
      return;
    }

    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      
      const chunkHTML = book.chunks[index];
      const key = `${book.id}_${index}_${voice}_${speed}`;

      if (currentPlaybackId !== playbackIdRef.current) return;

      let audioBuffer: AudioBuffer;
      if (fetchPromises.current.has(key)) {
        audioBuffer = await fetchPromises.current.get(key)!;
      } else {
        const promise = getOrFetchAudio(chunkHTML, key, voice, speed);
        fetchPromises.current.set(key, promise);
        audioBuffer = await promise;
        fetchPromises.current.delete(key);
      }

      if (currentPlaybackId !== playbackIdRef.current) return;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => { if (currentPlaybackId === playbackIdRef.current) handleNextChunk(); };
      audioSourceRef.current = source;
      source.start(0);
      
      setAudioState(prev => ({ ...prev, isLoading: false }));
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, progressIndex: index } : b));
      preloadNextChunk(index, book);

    } catch (err: any) {
      if (currentPlaybackId === playbackIdRef.current) {
        setAudioState(prev => ({ ...prev, isLoading: false, isPlaying: false, error: "Errore Audio/Rete." }));
        if (err?.message?.includes('429')) setTimeout(() => playChunk(index, book), 3500);
      }
    }
  };

  const handleNextChunk = useCallback(() => {
    if (!activeBook) return;
    const nextIndex = audioState.currentChunkIndex + 1;
    if (nextIndex < activeBook.chunks.length) playChunk(nextIndex); else stopAudio();
  }, [activeBook, audioState.currentChunkIndex, globalSettings.engine]);

  const handleClearCache = async () => {
    if(confirm("Svuotare la cache audio?")) {
      await clearAudioCache();
      audioCache.current.clear();
      setCachedKeys(new Set());
    }
  };

  return (
    <>
      <audio 
        ref={ambienceRef} 
        loop 
        crossOrigin="anonymous" 
        className="hidden" 
        onError={(e) => console.error("Ambience Error:", e.currentTarget.error)}
      />

      {view === ViewState.PLAYER && activeBook ? (
        <Player 
          book={activeBook}
          audioState={audioState}
          globalSettings={globalSettings}
          cachedKeys={cachedKeys}
          isDownloading={isDownloadingChapter}
          downloadingRange={downloadingRange}
          downloadProgress={downloadProgress}
          onDownloadChapter={handleDownloadChapter}
          onDetectAmbience={handleAutoDetectAmbience}
          onUpdateBookSettings={(s) => {
            const updated = { ...activeBook, settings: s };
            setActiveBook(updated);
            setBooks(prev => prev.map(b => b.id === activeBook.id ? updated : b));
            if (globalSettings.engine === 'gemini') audioCache.current.clear();
          }}
          onUpdateGlobalSettings={setGlobalSettings}
          onBack={() => { stopAudio(); setView(ViewState.LIBRARY); }}
          onPlayPause={() => audioState.isPlaying ? stopAudio() : playChunk(audioState.currentChunkIndex)}
          onNextChunk={() => audioState.currentChunkIndex < activeBook.chunks.length - 1 && playChunk(audioState.currentChunkIndex + 1)}
          onPrevChunk={() => audioState.currentChunkIndex > 0 && playChunk(audioState.currentChunkIndex - 1)}
          onSeekChunk={(idx) => playChunk(idx)}
        />
      ) : (
        <Library 
          books={books}
          globalSettings={globalSettings}
          onUpdateGlobalSettings={setGlobalSettings}
          onSelectBook={(b) => {
            stopAudio(); audioCache.current.clear(); fetchPromises.current.clear();
            setActiveBook(b); 
            setAudioState({ isPlaying: false, isLoading: false, currentChunkIndex: b.progressIndex, error: null });
            refreshCachedKeys();
            setView(ViewState.PLAYER);
          }}
          onImportBook={async (file) => {
            setIsProcessingFile(true);
            try {
              const { title, content } = await parseFile(file);
              const { chunks, chapterIndices } = chunkText(content);
              setBooks(prev => [{ 
                id: Date.now().toString(), title, author: 'Sconosciuto', content, chunks, chapterIndices, progressIndex: 0, lastAccessed: Date.now(), 
                settings: { 
                  voice: globalSettings.defaultVoice, 
                  speed: globalSettings.defaultSpeed,
                  ambience: 'none',
                  ambienceVolume: 0.2
                } 
              }, ...prev]);
            } catch (e) { alert("Errore file."); } finally { setIsProcessingFile(false); }
          }}
          onDeleteBook={(id) => setBooks(prev => prev.filter(b => b.id !== id))}
          onChangeCover={async (book, file, auto) => {
            if (auto && globalSettings.engine === 'gemini') {
              setIsGeneratingCover(true);
              try {
                const url = await generateCoverImage(book.title);
                setBooks(prev => prev.map(b => b.id === book.id ? { ...b, coverUrl: url } : b));
              } catch (e) { alert("Errore API."); } finally { setIsGeneratingCover(false); }
            } else if (file) {
              const r = new FileReader();
              r.onload = (e) => setBooks(prev => prev.map(b => b.id === book.id ? { ...b, coverUrl: e.target?.result as string } : b));
              r.readAsDataURL(file);
            }
          }}
          isProcessing={isProcessingFile}
          onClearCache={handleClearCache}
        />
      )}

      {audioState.error && (
        <div className="fixed top-20 left-6 right-6 z-[100] bg-secondary/90 backdrop-blur-md text-white p-4 rounded-3xl shadow-2xl flex items-center gap-3">
          <AlertCircle size={20} className="text-primary animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-widest">{audioState.error}</p>
          <button onClick={() => setAudioState(p => ({...p, error: null}))} className="ml-auto p-1 bg-white/10 rounded-full"><X size={14}/></button>
        </div>
      )}

      {isGeneratingCover && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 flex flex-col items-center gap-6 shadow-2xl">
            <Palette size={64} className="text-amber-500 animate-pulse" />
            <h3 className="text-2xl font-black">Creo Copertina...</h3>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
