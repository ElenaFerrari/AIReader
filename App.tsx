
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Library from './components/Library';
import Player from './components/Player';
import { Book, ViewState, AudioState, AppSettings, BookSettings } from './types';
import { parseFile, chunkText } from './services/parser';
import { generateSpeechForChunk, getAudioContext, generateCoverImage } from './services/geminiService';
import { Loader2, Palette, AlertCircle, X } from 'lucide-react';

const DEFAULT_GLOBAL_SETTINGS: AppSettings = {
  fontSize: 18,
  defaultVoice: 'Kore',
  defaultSpeed: 1.0
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LIBRARY);
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<AppSettings>(DEFAULT_GLOBAL_SETTINGS);

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

  useEffect(() => {
    const savedBooks = localStorage.getItem('audiolibro_books');
    if (savedBooks) setBooks(JSON.parse(savedBooks));
    const savedSettings = localStorage.getItem('audiolibro_settings');
    if (savedSettings) setGlobalSettings({ ...DEFAULT_GLOBAL_SETTINGS, ...JSON.parse(savedSettings) });
  }, []);

  useEffect(() => { localStorage.setItem('audiolibro_books', JSON.stringify(books)); }, [books]);
  useEffect(() => { localStorage.setItem('audiolibro_settings', JSON.stringify(globalSettings)); }, [globalSettings]);

  const stopAudio = useCallback(() => {
    playbackIdRef.current += 1; 
    if (audioSourceRef.current) {
      try { audioSourceRef.current.onended = null; audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current = null;
    }
    setAudioState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
  }, []);

  const preloadNextChunk = useCallback(async (index: number, book: Book) => {
    const nextIndex = index + 1;
    if (nextIndex >= book.chunks.length) return;

    const voice = book.settings?.voice || globalSettings.defaultVoice;
    const speed = book.settings?.speed || globalSettings.defaultSpeed;
    const key = `${nextIndex}_${voice}_${speed}`;

    if (!audioCache.current.has(key) && !fetchPromises.current.has(key)) {
      const promise = generateSpeechForChunk(book.chunks[nextIndex], voice, speed);
      fetchPromises.current.set(key, promise);
      try {
        const buffer = await promise;
        audioCache.current.set(key, buffer);
      } catch (e) {
      } finally {
        fetchPromises.current.delete(key);
      }
    }
  }, [globalSettings]);

  const playChunk = async (index: number, targetBook?: Book) => {
    const book = targetBook || activeBook;
    if (!book) return;

    stopAudio(); 
    const currentPlaybackId = playbackIdRef.current;
    
    setAudioState(prev => ({ ...prev, currentChunkIndex: index, isLoading: true, error: null, isPlaying: true }));

    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      
      const chunkHTML = book.chunks[index];
      const voice = book.settings?.voice || globalSettings.defaultVoice;
      const speed = book.settings?.speed || globalSettings.defaultSpeed;
      const key = `${index}_${voice}_${speed}`;

      if (currentPlaybackId !== playbackIdRef.current) return;

      let audioBuffer: AudioBuffer;
      if (audioCache.current.has(key)) {
        audioBuffer = audioCache.current.get(key)!;
      } else {
        const promise = generateSpeechForChunk(chunkHTML, voice, speed);
        fetchPromises.current.set(key, promise);
        audioBuffer = await promise;
        if (currentPlaybackId !== playbackIdRef.current) return;
        audioCache.current.set(key, audioBuffer);
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
        setAudioState(prev => ({ ...prev, isLoading: false, isPlaying: false, error: "Connessione API lenta. Riprovo..." }));
        if (err?.message?.includes('429')) setTimeout(() => playChunk(index, book), 3500);
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
      {view === ViewState.PLAYER && activeBook ? (
        <Player 
          book={activeBook}
          audioState={audioState}
          globalSettings={globalSettings}
          onUpdateBookSettings={(s) => {
            const updated = { ...activeBook, settings: s };
            setActiveBook(updated);
            setBooks(prev => prev.map(b => b.id === activeBook.id ? updated : b));
            audioCache.current.clear();
            if (audioState.isPlaying) playChunk(audioState.currentChunkIndex, updated);
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
                  speed: globalSettings.defaultSpeed 
                } 
              }, ...prev]);
            } catch (e) { alert("Errore caricamento."); } finally { setIsProcessingFile(false); }
          }}
          onDeleteBook={(id) => setBooks(prev => prev.filter(b => b.id !== id))}
          onChangeCover={async (book, file, auto) => {
            if (auto) {
              setIsGeneratingCover(true);
              try {
                const url = await generateCoverImage(book.title);
                setBooks(prev => prev.map(b => b.id === book.id ? { ...b, coverUrl: url } : b));
              } catch (e) { alert("Errore immagine."); } finally { setIsGeneratingCover(false); }
            } else if (file) {
              const r = new FileReader();
              r.onload = (e) => setBooks(prev => prev.map(b => b.id === book.id ? { ...b, coverUrl: e.target?.result as string } : b));
              r.readAsDataURL(file);
            }
          }}
          isProcessing={isProcessingFile}
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
            <h3 className="text-2xl font-black">Sto dipingendo...</h3>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
