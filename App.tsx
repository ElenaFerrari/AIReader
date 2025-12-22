
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Library from './components/Library';
import Player from './components/Player';
import Login from './components/Login';
import { Book, ViewState, AudioState, AppSettings, User, BookSettings } from './types';
import { parseFile, chunkText } from './services/parser';
import { generateSpeechForChunk, generateCoverImage, detectAmbience } from './services/geminiService';
import { speakSystem, stopSystem } from './services/systemTTS';
import { saveAudioChunk, getAudioChunk, clearAudioCache, getAllStoredKeys, requestPersistentStorage } from './services/storage';
import { createWavFile } from './services/audioUtils';
import { Loader2, Palette, AlertCircle, X } from 'lucide-react';

const DEFAULT_GLOBAL_SETTINGS: AppSettings = {
  fontSize: 18,
  defaultVoice: 'Kore',
  defaultSpeed: 1.0,
  engine: 'gemini',
  backupProvider: 'google',
  customPresets: [] 
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
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.LOGIN);
  
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<AppSettings>(DEFAULT_GLOBAL_SETTINGS);
  
  const [cachedKeys, setCachedKeys] = useState<Set<string>>(new Set());
  const [isDownloadingChapter, setIsDownloadingChapter] = useState(false);
  const [downloadingRange, setDownloadingRange] = useState<{start: number, end: number} | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const [sleepTimer, setSleepTimer] = useState<{ type: 'time' | 'chapter', value: number } | null>(null);
  const sleepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    isLoading: false,
    currentChunkIndex: 0,
    error: null,
  });

  // NUOVO PLAYER NATIVO
  const voicePlayerRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  
  const playbackIdRef = useRef<number>(0);
  const fetchPromises = useRef<Map<string, Promise<Uint8Array>>>(new Map());
  
  const ambienceRef = useRef<HTMLAudioElement | null>(null);

  // --- PERSISTENZA E INIZIALIZZAZIONE ---
  useEffect(() => {
      const init = async () => {
          try {
              // 1. Richiedi persistenza dati al browser
              const persisted = await requestPersistentStorage().catch(() => false);
              if(persisted) console.log("Storage persistente attivato");
              
              // 2. Check API Key
              const savedKey = localStorage.getItem('gemini_api_key');
              if (savedKey) {
                  const localUser: User = {
                      id: 'local-user',
                      name: 'Lettore',
                      email: 'local@device',
                      avatar: 'https://ui-avatars.com/api/?name=Lettore&background=0D8ABC&color=fff',
                      isPremium: true
                  };
                  setUser(localUser);
                  setView(ViewState.LIBRARY);
              }
          } catch (e) {
              console.error("Errore inizializzazione:", e);
          }
      };
      init();
  }, []);

  const handleKeySetup = () => {
      const localUser: User = {
          id: 'local-user',
          name: 'Lettore',
          email: 'local@device',
          avatar: 'https://ui-avatars.com/api/?name=Lettore&background=0D8ABC&color=fff',
          isPremium: true
      };
      setUser(localUser);
      setView(ViewState.LIBRARY);
  };

  const handleLogout = () => {
      if(confirm("Vuoi rimuovere la chiave API salvata?")) {
          localStorage.removeItem('gemini_api_key');
          setUser(null);
          setView(ViewState.LOGIN);
      }
  };

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

  // --- SLEEP TIMER ---
  useEffect(() => {
      if (sleepTimeoutRef.current) clearTimeout(sleepTimeoutRef.current);
      if (sleepTimer && sleepTimer.type === 'time' && audioState.isPlaying) {
          sleepTimeoutRef.current = setTimeout(() => {
              stopAudio();
              setSleepTimer(null);
          }, sleepTimer.value * 60 * 1000);
      }
      return () => { if (sleepTimeoutRef.current) clearTimeout(sleepTimeoutRef.current); }
  }, [sleepTimer, audioState.isPlaying]);

  // --- LOGICA AMBIENCE IBRIDA (HTML5 Audio + YouTube) ---
  useEffect(() => {
    if (!activeBook) return;

    const type = activeBook.settings?.ambienceType || 'preset';
    const ambienceVal = activeBook.settings?.ambience || 'none';
    const volume = activeBook.settings?.ambienceVolume ?? 0.2;

    if (ambienceRef.current) {
        ambienceRef.current.volume = volume;
        
        if (type !== 'youtube') {
            const targetUrl = type === 'preset' ? (AMBIENCE_PRESETS[ambienceVal] || '') : ambienceVal;
            const currentSrc = ambienceRef.current.getAttribute('src');
            
            if (targetUrl && targetUrl !== currentSrc) {
                ambienceRef.current.src = targetUrl;
                ambienceRef.current.load();
                if (audioState.isPlaying && !audioState.isLoading) ambienceRef.current.play().catch(console.warn);
            } else if (!targetUrl) {
                ambienceRef.current.pause();
                ambienceRef.current.removeAttribute('src');
            } else if (targetUrl && audioState.isPlaying && !audioState.isLoading && ambienceRef.current.paused) {
                ambienceRef.current.play().catch(console.warn);
            } else if (!audioState.isPlaying) {
                ambienceRef.current.pause();
            }
        } else {
             ambienceRef.current.pause();
        }
    }
  }, [activeBook?.settings?.ambience, activeBook?.settings?.ambienceType, activeBook?.settings?.ambienceVolume, audioState.isPlaying, audioState.isLoading]);


  // --- MEDIA SESSION & LOCK SCREEN CONTROLS ---
  useEffect(() => {
    if ('mediaSession' in navigator && activeBook) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeBook.title,
        artist: activeBook.author,
        artwork: activeBook.coverUrl ? [{ src: activeBook.coverUrl, sizes: '512x512', type: 'image/png' }] : undefined
      });
      
      // I controlli chiamano le funzioni wrapper che gestiscono la logica
      navigator.mediaSession.setActionHandler('play', () => !audioState.isPlaying && playChunk(audioState.currentChunkIndex, activeBook));
      navigator.mediaSession.setActionHandler('pause', () => stopAudio());
      navigator.mediaSession.setActionHandler('previoustrack', () => {
          if (audioState.currentChunkIndex > 0) playChunk(audioState.currentChunkIndex - 1, activeBook);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
          if (audioState.currentChunkIndex < activeBook.chunks.length - 1) playChunk(audioState.currentChunkIndex + 1, activeBook);
      });
    }
    return () => {
        if ('mediaSession' in navigator) {
             ['play','pause','previoustrack','nexttrack'].forEach(a => navigator.mediaSession.setActionHandler(a as any, null));
        }
    }
  }, [activeBook, audioState.isPlaying, audioState.currentChunkIndex]);

  const stopAudio = useCallback(() => {
    playbackIdRef.current += 1; 
    
    // Ferma il player nativo
    if (voicePlayerRef.current) {
        voicePlayerRef.current.pause();
        // Non resettiamo src immediatamente per evitare glitch UI
    }
    stopSystem();
    setAudioState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
  }, []);

  // Recupera i RAW BYTES dell'audio (Uint8Array)
  const getOrFetchRawAudio = async (chunkHtml: string, key: string, voice: string, speed: number, style: string): Promise<Uint8Array> => {
    const cachedRaw = await getAudioChunk(key);
    if (cachedRaw) return cachedRaw;

    // Genera via API
    const result = await generateSpeechForChunk(chunkHtml, voice, speed, style);
    
    // Salva in cache
    await saveAudioChunk(key, result.rawData); 
    setCachedKeys(prev => new Set(prev).add(key));
    
    return result.rawData;
  };

  const preloadNextChunk = useCallback(async (index: number, book: Book) => {
    if (globalSettings.engine !== 'gemini') return;
    const nextIndex = index + 1;
    if (nextIndex >= book.chunks.length) return;
    const voice = book.settings?.voice || globalSettings.defaultVoice;
    const speed = book.settings?.speed || globalSettings.defaultSpeed;
    const style = book.settings?.voiceStyle || 'Narrative';
    const bookId = book.id;
    const key = `${bookId}_${nextIndex}_${voice}_${speed}_${style}`;

    if (!cachedKeys.has(key) && !fetchPromises.current.has(key)) {
      const promise = getOrFetchRawAudio(book.chunks[nextIndex], key, voice, speed, style);
      fetchPromises.current.set(key, promise);
      try { await promise; } catch (e) {} finally { fetchPromises.current.delete(key); }
    }
  }, [globalSettings, cachedKeys]);

  const handleDownloadChapter = async (startIndex: number, endIndex: number) => {
      if (!activeBook || globalSettings.engine !== 'gemini') return;
      if (isDownloadingChapter) return;

      setIsDownloadingChapter(true);
      setDownloadingRange({ start: startIndex, end: endIndex });
      setDownloadProgress(0);
      const total = endIndex - startIndex;
      const voice = activeBook.settings?.voice || globalSettings.defaultVoice;
      const speed = activeBook.settings?.speed || globalSettings.defaultSpeed;
      const style = activeBook.settings?.voiceStyle || 'Narrative';

      try {
          for (let i = startIndex; i < endIndex; i++) {
              if (!activeBook) break;
              const key = `${activeBook.id}_${i}_${voice}_${speed}_${style}`;
              if (cachedKeys.has(key)) {
                  setDownloadProgress(Math.round(((i - startIndex + 1) / total) * 100));
                  continue;
              }
              if (!fetchPromises.current.has(key)) {
                  const promise = getOrFetchRawAudio(activeBook.chunks[i], key, voice, speed, style);
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
        alert("Serve il motore Gemini.");
        return;
    }
    const currentText = activeBook.chunks[audioState.currentChunkIndex];
    const suggested = await detectAmbience(currentText);
    if (suggested && suggested !== 'none') {
        const currentSettings = activeBook.settings || {
             voice: globalSettings.defaultVoice,
             speed: globalSettings.defaultSpeed,
             voiceStyle: 'Narrative'
        };
        const updatedSettings: BookSettings = { 
             ...currentSettings, 
             ambience: suggested, 
             ambienceType: 'preset' 
        };
        const updated = { ...activeBook, settings: updatedSettings };
        setActiveBook(updated);
        setBooks(prev => prev.map(b => b.id === activeBook.id ? updated : b));
    } else {
        alert("Nessuna atmosfera rilevata.");
    }
  };

  const playChunk = async (index: number, targetBook?: Book) => {
    const book = targetBook || activeBook;
    if (!book) return;
    
    // Non chiamiamo stopAudio() completo per evitare di resettare l'UI, ma mettiamo in pausa il player
    playbackIdRef.current += 1;
    const currentPlaybackId = playbackIdRef.current;
    
    if (voicePlayerRef.current) voicePlayerRef.current.pause();

    setAudioState(prev => ({ ...prev, currentChunkIndex: index, isLoading: true, error: null, isPlaying: true }));
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";

    const currentEngine = globalSettings.engine;
    const voice = book.settings?.voice || globalSettings.defaultVoice;
    const speed = book.settings?.speed || globalSettings.defaultSpeed;
    const style = book.settings?.voiceStyle || 'Narrative';

    // SISTEMA TTS NATIVO
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

    // GEMINI AI (Player Nativo HTML5)
    try {
      const chunkHTML = book.chunks[index];
      const key = `${book.id}_${index}_${voice}_${speed}_${style}`;

      let rawData: Uint8Array;
      
      if (fetchPromises.current.has(key)) {
        rawData = await fetchPromises.current.get(key)!;
      } else {
        const promise = getOrFetchRawAudio(chunkHTML, key, voice, speed, style);
        fetchPromises.current.set(key, promise);
        rawData = await promise;
        fetchPromises.current.delete(key);
      }

      if (currentPlaybackId !== playbackIdRef.current) return;

      // Conversione RAW -> WAV -> Blob URL per il tag <audio>
      if (currentBlobUrlRef.current) URL.revokeObjectURL(currentBlobUrlRef.current);
      const wavBlob = createWavFile(rawData, 24000); // Assumiamo 24k come da API Gemini
      const blobUrl = URL.createObjectURL(wavBlob);
      currentBlobUrlRef.current = blobUrl;

      if (voicePlayerRef.current) {
          voicePlayerRef.current.src = blobUrl;
          // Importante per il background play
          voicePlayerRef.current.play()
            .then(() => {
                setAudioState(prev => ({ ...prev, isLoading: false }));
                setBooks(prev => prev.map(b => b.id === book.id ? { ...b, progressIndex: index } : b));
                preloadNextChunk(index, book);
            })
            .catch(e => {
                console.error("Play error", e);
                setAudioState(prev => ({ ...prev, isPlaying: false, error: "Impossibile riprodurre audio." }));
            });
      }

    } catch (err: any) {
      if (currentPlaybackId === playbackIdRef.current) {
        setAudioState(prev => ({ ...prev, isLoading: false, isPlaying: false, error: err.message || "Errore Audio/Rete." }));
        if (err?.message?.includes('429')) setTimeout(() => playChunk(index, book), 3500);
      }
    }
  };

  const handleNextChunk = useCallback(() => {
    if (!activeBook) return;
    
    setSleepTimer(prev => {
        if (prev && prev.type === 'chapter') {
            const currentIdx = audioState.currentChunkIndex;
            if (activeBook.chapterIndices.includes(currentIdx + 1)) {
                stopAudio();
                return null;
            }
        }
        return prev;
    });

    const nextIndex = audioState.currentChunkIndex + 1;
    if (nextIndex < activeBook.chunks.length) playChunk(nextIndex); else stopAudio();
  }, [activeBook, audioState.currentChunkIndex, globalSettings.engine]);

  const handleVoiceEnded = () => {
      // Evento onEnded del tag <audio>
      handleNextChunk();
  };

  const handleClearCache = async () => {
    if(confirm("Svuotare la cache audio?")) {
      await clearAudioCache();
      fetchPromises.current.clear();
      setCachedKeys(new Set());
    }
  };

  const handleRestoreBackup = (backupData: any) => {
    try {
      if (!backupData.books || !Array.isArray(backupData.books)) throw new Error("Formato non valido");
      
      if (confirm(`Trovati ${backupData.books.length} libri nel backup del ${backupData.date}. Vuoi sovrascrivere la libreria attuale?`)) {
        setBooks(backupData.books);
        if (backupData.settings) {
          setGlobalSettings(prev => ({...prev, ...backupData.settings}));
        }
        alert("Ripristino completato con successo!");
      }
    } catch (e) {
      alert("Errore nel file di backup.");
    }
  };

  if (view === ViewState.LOGIN) {
      return <Login onLogin={handleKeySetup} />;
  }

  return (
    <>
      {/* PLAYER NATIVO PER LA VOCE */}
      <audio 
        ref={voicePlayerRef} 
        onEnded={handleVoiceEnded}
        onError={(e) => console.error("Voice Error", e)}
        className="hidden" // Nascosto, ma presente nel DOM per gestione Lock Screen
      />
      
      {/* PLAYER AMBIENCE */}
      <audio ref={ambienceRef} loop crossOrigin="anonymous" className="hidden" onError={(e) => console.error("Ambience Error:", e.currentTarget.error)} />

      {view === ViewState.PLAYER && activeBook ? (
        <Player 
          book={activeBook}
          audioState={audioState}
          globalSettings={globalSettings}
          cachedKeys={cachedKeys}
          isDownloading={isDownloadingChapter}
          downloadingRange={downloadingRange}
          downloadProgress={downloadProgress}
          sleepTimer={sleepTimer}
          onSetSleepTimer={setSleepTimer}
          onDownloadChapter={handleDownloadChapter}
          onDetectAmbience={handleAutoDetectAmbience}
          onUpdateBookSettings={(s) => {
            const updated = { ...activeBook, settings: s };
            setActiveBook(updated);
            setBooks(prev => prev.map(b => b.id === activeBook.id ? updated : b));
            // Non cancelliamo la cache globale, solo le promesse in volo
            fetchPromises.current.clear();
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
          user={user}
          books={books}
          globalSettings={globalSettings}
          onUpdateGlobalSettings={setGlobalSettings}
          onLogout={handleLogout}
          onSelectBook={(b) => {
            stopAudio(); fetchPromises.current.clear();
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
                  voiceStyle: 'Narrative',
                  speed: globalSettings.defaultSpeed,
                  ambience: 'none',
                  ambienceType: 'preset',
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
          onRestoreBackup={handleRestoreBackup}
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
