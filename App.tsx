
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Library from './components/Library';
import Player from './components/Player';
import Login from './components/Login';
import { Book, ViewState, AudioState, AppSettings, User, BookSettings } from './types';
import { parseFile, chunkText } from './services/parser';
import { generateSpeechForChunk, generateCoverImage, detectAmbience, getTextHash } from './services/geminiService';
import { speakSystem, stopSystem } from './services/systemTTS';
import { saveAudioChunk, getAudioChunk, clearAudioCache, getAllStoredKeys, requestPersistentStorage } from './services/storage';
import { createWavFile } from './services/audioUtils';
import { Loader2, Palette, AlertCircle, X, WifiOff } from 'lucide-react';

const DEFAULT_GLOBAL_SETTINGS: AppSettings = {
  fontSize: 18,
  defaultVoice: 'Kore',
  defaultSpeed: 1.0,
  engine: 'gemini',
  backupProvider: 'google',
  customPresets: [],
  ecoMode: true,
  ecoThreshold: 80 // Aumentato threshold per risparmiare più chiamate su frasi brevi
};

const AMBIENCE_PRESETS: Record<string, string> = {
    'rain': 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
    'fire': 'https://actions.google.com/sounds/v1/ambiences/fireplace.ogg',
    'forest': 'https://actions.google.com/sounds/v1/water/creek_and_birds.ogg',
    'night': 'https://actions.google.com/sounds/v1/nature/crickets_chirping.ogg',
    'cafe': 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    'none': ''
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>({ id: 'local', name: 'Lettore', email: 'local@device', avatar: 'https://ui-avatars.com/api/?name=L', isPremium: true });
  const [view, setView] = useState<ViewState>(ViewState.LIBRARY);
  
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

  const voicePlayerRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const playbackIdRef = useRef<number>(0);
  const fetchPromises = useRef<Map<string, Promise<Uint8Array>>>(new Map());
  const ambienceRef = useRef<HTMLAudioElement | null>(null);

  // --- PERSISTENZA E INIZIALIZZAZIONE ---
  useEffect(() => {
      const init = async () => {
          try {
              await requestPersistentStorage();
          } catch (e) { console.error(e); }
      };
      init();
  }, []);

  const handleLogout = () => {
      if(confirm("Vuoi uscire?")) {
          setBooks([]);
          setActiveBook(null);
          setView(ViewState.LIBRARY);
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

  // --- LOGICA AMBIENCE IBRIDA ---
  useEffect(() => {
    if (!activeBook) return;
    const type = activeBook.settings?.ambienceType || 'preset';
    const ambienceVal = activeBook.settings?.ambience || 'none';
    const volume = activeBook.settings?.ambienceVolume ?? 0.2;

    if (ambienceRef.current) {
        ambienceRef.current.volume = volume;
        if (type !== 'youtube') {
            const targetUrl = type === 'preset' ? (AMBIENCE_PRESETS[ambienceVal] || '') : ambienceVal;
            if (targetUrl && targetUrl !== ambienceRef.current.src) {
                ambienceRef.current.src = targetUrl;
                ambienceRef.current.load();
                if (audioState.isPlaying && !audioState.isLoading) ambienceRef.current.play().catch(() => {});
            } else if (!targetUrl) ambienceRef.current.pause();
            else if (targetUrl && audioState.isPlaying && !audioState.isLoading && ambienceRef.current.paused) ambienceRef.current.play().catch(() => {});
            else if (!audioState.isPlaying) ambienceRef.current.pause();
        } else ambienceRef.current.pause();
    }
  }, [activeBook?.settings?.ambience, activeBook?.settings?.ambienceType, activeBook?.settings?.ambienceVolume, audioState.isPlaying, audioState.isLoading]);

  const stopAudio = useCallback(() => {
    playbackIdRef.current += 1; 
    if (voicePlayerRef.current) voicePlayerRef.current.pause();
    stopSystem();
    setAudioState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
  }, []);

  const getChunkKey = (bookId: string, chunkHtml: string, voice: string, speed: number, style: string) => {
      const text = new DOMParser().parseFromString(chunkHtml, 'text/html').body.textContent || "";
      const hash = getTextHash(text);
      return `v2_${hash}_${voice}_${speed}_${style}`;
  };

  const getOrFetchRawAudio = async (chunkHtml: string, key: string, voice: string, speed: number, style: string): Promise<Uint8Array> => {
    const cachedRaw = await getAudioChunk(key);
    if (cachedRaw) return cachedRaw;
    const result = await generateSpeechForChunk(chunkHtml, voice, speed, style);
    await saveAudioChunk(key, result.rawData); 
    setCachedKeys(prev => new Set(prev).add(key));
    return result.rawData;
  };

  const handleDownloadChapter = async (startIndex: number, endIndex: number) => {
      if (!activeBook || globalSettings.engine !== 'gemini') return;
      setIsDownloadingChapter(true);
      setDownloadingRange({ start: startIndex, end: endIndex });
      const total = endIndex - startIndex;
      const voice = activeBook.settings?.voice || globalSettings.defaultVoice;
      const speed = activeBook.settings?.speed || globalSettings.defaultSpeed;
      const style = activeBook.settings?.voiceStyle || 'Narrative';

      try {
          for (let i = startIndex; i < endIndex; i++) {
              if (!activeBook) break;
              const text = new DOMParser().parseFromString(activeBook.chunks[i], 'text/html').body.textContent || "";
              
              if (globalSettings.ecoMode && text.length < globalSettings.ecoThreshold) {
                  setDownloadProgress(Math.round(((i - startIndex + 1) / total) * 100));
                  continue;
              }

              const key = getChunkKey(activeBook.id, activeBook.chunks[i], voice, speed, style);
              if (cachedKeys.has(key)) {
                  setDownloadProgress(Math.round(((i - startIndex + 1) / total) * 100));
                  continue;
              }
              const promise = getOrFetchRawAudio(activeBook.chunks[i], key, voice, speed, style);
              fetchPromises.current.set(key, promise);
              await promise;
              fetchPromises.current.delete(key);
              setDownloadProgress(Math.round(((i - startIndex + 1) / total) * 100));
              // AUMENTATO A 1000ms per evitare Rate Limiting (RPM) durante i download massivi
              await new Promise(r => setTimeout(r, 1000)); 
          }
      } catch (e: any) { 
          if(e.message === 'QUOTA_EXCEEDED') {
              alert("Crediti esauriti durante il download. Riprova domani.");
          } else {
              alert("Errore download: " + e.message);
          }
      } finally {
          setIsDownloadingChapter(false);
          setDownloadingRange(null);
          setDownloadProgress(0);
      }
  };

  const playChunk = async (index: number, targetBook?: Book) => {
    const book = targetBook || activeBook;
    if (!book) return;
    
    playbackIdRef.current += 1;
    const currentPlaybackId = playbackIdRef.current;
    if (voicePlayerRef.current) voicePlayerRef.current.pause();

    setAudioState(prev => ({ ...prev, currentChunkIndex: index, isLoading: true, error: null, isPlaying: true }));
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";

    const voice = book.settings?.voice || globalSettings.defaultVoice;
    const speed = book.settings?.speed || globalSettings.defaultSpeed;
    const style = book.settings?.voiceStyle || 'Narrative';
    const chunkHTML = book.chunks[index];
    const text = new DOMParser().parseFromString(chunkHTML, 'text/html').body.textContent || "";

    const useSystemForThis = globalSettings.engine === 'system' || 
                             (globalSettings.engine === 'gemini' && globalSettings.ecoMode && text.length < globalSettings.ecoThreshold);

    if (useSystemForThis) {
      try {
        setAudioState(prev => ({ ...prev, isLoading: false }));
        setBooks(prev => prev.map(b => b.id === book.id ? { ...b, progressIndex: index } : b));
        speakSystem(chunkHTML, voice, speed, 
          () => { if (currentPlaybackId === playbackIdRef.current) handleNextChunk(); },
          () => { if (currentPlaybackId === playbackIdRef.current) setAudioState(prev => ({ ...prev, isPlaying: false, error: "Errore TTS Sistema" })); }
        );
      } catch (err) { setAudioState(prev => ({ ...prev, isPlaying: false })); }
      return;
    }

    try {
      const key = getChunkKey(book.id, chunkHTML, voice, speed, style);
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

      if (currentBlobUrlRef.current) URL.revokeObjectURL(currentBlobUrlRef.current);
      const wavBlob = createWavFile(rawData, 24000);
      const blobUrl = URL.createObjectURL(wavBlob);
      currentBlobUrlRef.current = blobUrl;

      if (voicePlayerRef.current) {
          voicePlayerRef.current.src = blobUrl;
          voicePlayerRef.current.play()
            .then(() => {
                setAudioState(prev => ({ ...prev, isLoading: false }));
                setBooks(prev => prev.map(b => b.id === book.id ? { ...b, progressIndex: index } : b));
            })
            .catch(() => setAudioState(prev => ({ ...prev, isPlaying: false })));
      }
    } catch (err: any) {
      if (currentPlaybackId === playbackIdRef.current) {
        let errorMsg = "Errore generico";
        if (err.message === "QUOTA_EXCEEDED") {
            errorMsg = "Crediti API esauriti. Passa al motore 'Offline' nelle impostazioni.";
        } else if (err.message.includes("Failed to fetch")) {
            errorMsg = "Problema di connessione.";
        }
        setAudioState(prev => ({ ...prev, isLoading: false, isPlaying: false, error: errorMsg }));
      }
    }
  };

  const handleNextChunk = useCallback(() => {
    if (!activeBook) return;
    const nextIndex = audioState.currentChunkIndex + 1;
    if (nextIndex < activeBook.chunks.length) playChunk(nextIndex); else stopAudio();
  }, [activeBook, audioState.currentChunkIndex]);

  return (
    <>
      <audio ref={voicePlayerRef} onEnded={handleNextChunk} className="hidden" />
      <audio ref={ambienceRef} loop crossOrigin="anonymous" className="hidden" />

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
          onDetectAmbience={async () => {
              const currentText = activeBook.chunks[audioState.currentChunkIndex];
              const suggested = await detectAmbience(currentText);
              if (suggested !== 'none') {
                  const updated = { ...activeBook, settings: { ...activeBook.settings!, ambience: suggested, ambienceType: 'preset' as const } };
                  setActiveBook(updated);
                  setBooks(prev => prev.map(b => b.id === activeBook.id ? updated : b));
              }
          }}
          onUpdateBookSettings={(s) => {
            const updated = { ...activeBook, settings: s };
            setActiveBook(updated);
            setBooks(prev => prev.map(b => b.id === activeBook.id ? updated : b));
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
            // Reset state - NON parte automaticamente
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
                settings: { voice: globalSettings.defaultVoice, voiceStyle: 'Narrative', speed: globalSettings.defaultSpeed, ambience: 'none', ambienceType: 'preset', ambienceVolume: 0.2 } 
              }, ...prev]);
            } catch (e) { alert("Errore."); } finally { setIsProcessingFile(false); }
          }}
          onDeleteBook={(id) => setBooks(prev => prev.filter(b => b.id !== id))}
          onChangeCover={async (book, file, auto) => {
            if (auto) {
              setIsGeneratingCover(true);
              try {
                const url = await generateCoverImage(book.title);
                setBooks(prev => prev.map(b => b.id === book.id ? { ...b, coverUrl: url } : b));
              } catch (e) { alert("Errore."); } finally { setIsGeneratingCover(false); }
            } else if (file) {
              const r = new FileReader();
              r.onload = (e) => setBooks(prev => prev.map(b => b.id === book.id ? { ...b, coverUrl: e.target?.result as string } : b));
              r.readAsDataURL(file);
            }
          }}
          isProcessing={isProcessingFile}
          onClearCache={async () => { await clearAudioCache(); setCachedKeys(new Set()); }}
          onRestoreBackup={(d) => { setBooks(d.books); setGlobalSettings(prev => ({...prev, ...d.settings})); }}
        />
      )}

      {audioState.error && (
        <div className={`fixed top-20 left-6 right-6 z-[100] backdrop-blur-md p-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 ${audioState.error.includes("Crediti") ? 'bg-amber-900/90 text-amber-50' : 'bg-red-900/90 text-red-50'}`}>
          {audioState.error.includes("Crediti") ? <WifiOff size={24} className="text-amber-300" /> : <AlertCircle size={24} className="text-red-300" />}
          <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5">Attenzione</p>
              <p className="text-xs font-bold leading-tight">{audioState.error}</p>
          </div>
          <button onClick={() => setAudioState(p => ({...p, error: null}))} className="p-2 bg-white/10 rounded-full"><X size={14}/></button>
        </div>
      )}

      {isGeneratingCover && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 text-white">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-bold">Generazione Copertina...</p>
        </div>
      )}
    </>
  );
};

export default App;
