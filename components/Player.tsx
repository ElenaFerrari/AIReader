
import React, { useEffect, useRef, useState } from 'react';
import { Book as BookType, AudioState, AppSettings, BookSettings } from '../types';
import { getSystemVoices, SystemVoice } from '../services/systemTTS';
import { getAudioChunk } from '../services/storage';
import { concatenateBuffers, createWavFile } from '../services/audioUtils';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Loader2, Settings2, X, ChevronsLeft, ChevronsRight, Mic2, Smartphone, Wifi, Download, CheckCircle2, CloudLightning, Database, List, PlayCircle, DownloadCloud, CloudRain, Flame, Trees, Moon, Coffee, Volume2, VolumeX, Music, Sparkles, Link as LinkIcon, Save, Timer, BedDouble, Youtube, Mic, Wand2, ListMusic } from 'lucide-react';

interface PlayerProps {
  book: BookType;
  audioState: AudioState;
  globalSettings: AppSettings;
  cachedKeys: Set<string>;
  isDownloading: boolean;
  downloadingRange: { start: number, end: number } | null;
  downloadProgress: number;
  sleepTimer: { type: 'time' | 'chapter', value: number } | null;
  onSetSleepTimer: (timer: { type: 'time' | 'chapter', value: number } | null) => void;
  onDownloadChapter: (start: number, end: number) => void;
  onUpdateBookSettings: (settings: BookSettings) => void;
  onUpdateGlobalSettings: (settings: AppSettings) => void;
  onDetectAmbience: () => void;
  onBack: () => void;
  onPlayPause: () => void;
  onNextChunk: () => void;
  onPrevChunk: () => void;
  onSeekChunk: (index: number) => void;
}

const GEMINI_VOICES = [
  { id: 'Kore', name: 'Kore (F)' },
  { id: 'Zephyr', name: 'Zephyr (F)' },
  { id: 'Puck', name: 'Puck (M)' },
  { id: 'Fenrir', name: 'Fenrir (M)' },
  { id: 'Charon', name: 'Charon (N)' },
];

const VOICE_STYLES = [
  { id: 'Narrative', name: 'Narrativo (Default)' },
  { id: 'Whisper', name: 'Sussurrato (Mistero)' },
  { id: 'Energetic', name: 'Energico (Azione)' },
  { id: 'Calm', name: 'Calmo (Relax)' },
  { id: 'Deep', name: 'Profondo (Epico)' }
];

const AMBIENCE_TRACKS = [
    { id: 'none', name: 'Silenzio', icon: VolumeX },
    { id: 'rain', name: 'Pioggia', icon: CloudRain },
    { id: 'fire', name: 'Camino', icon: Flame },
    { id: 'forest', name: 'Natura', icon: Trees },
    { id: 'night', name: 'Notte', icon: Moon },
    { id: 'cafe', name: 'Caffè', icon: Coffee },
];

const Player: React.FC<PlayerProps> = ({ 
  book, audioState, globalSettings, cachedKeys, isDownloading, downloadingRange, downloadProgress, 
  sleepTimer, onSetSleepTimer,
  onDownloadChapter, onUpdateBookSettings, onDetectAmbience, onBack, onPlayPause, onNextChunk, onPrevChunk, onSeekChunk 
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeChunkRef = useRef<HTMLDivElement>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [systemVoices, setSystemVoices] = useState<SystemVoice[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  
  // Custom Ambience State
  const [customAmbienceUrl, setCustomAmbienceUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showCustomAmbienceInput, setShowCustomAmbienceInput] = useState(false);

  useEffect(() => {
    if (activeChunkRef.current && scrollContainerRef.current) {
      activeChunkRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [audioState.currentChunkIndex]);

  useEffect(() => {
    if (showSettings && globalSettings.engine === 'system') {
      getSystemVoices().then(setSystemVoices);
    }
  }, [showSettings, globalSettings.engine]);

  // YouTube Sync Logic
  useEffect(() => {
    if (book.settings?.ambienceType === 'youtube' && youtubeIframeRef.current) {
         const iframe = youtubeIframeRef.current;
         if (audioState.isPlaying && !audioState.isLoading) {
             iframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
         } else {
             iframe.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
         }
    }
  }, [audioState.isPlaying, audioState.isLoading, book.settings?.ambienceType]);

  const currentVoiceId = book.settings?.voice || globalSettings.defaultVoice;
  const currentSpeed = book.settings?.speed || globalSettings.defaultSpeed;
  const currentStyle = book.settings?.voiceStyle || 'Narrative';
  
  const currentAmbience = book.settings?.ambience || 'none';
  const ambienceType = book.settings?.ambienceType || 'preset';
  const currentAmbienceVol = book.settings?.ambienceVolume ?? 0.2;

  const extractYoutubeId = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSaveYoutube = () => {
      const id = extractYoutubeId(youtubeUrl);
      if (id) {
          onUpdateBookSettings({...book.settings!, ambience: id, ambienceType: 'youtube'});
      } else {
          alert("URL YouTube non valido");
      }
  };

  const isChunkCached = (index: number) => {
      if (globalSettings.engine !== 'gemini') return false;
      const key = `${book.id}_${index}_${currentVoiceId}_${currentSpeed}_${currentStyle}`;
      return cachedKeys.has(key);
  };

  const getCurrentChapterRange = () => {
    const currentIdx = audioState.currentChunkIndex;
    const chapters = book.chapterIndices;
    let startIdx = 0;
    for (let i = 0; i < chapters.length; i++) {
        if (chapters[i] <= currentIdx) startIdx = chapters[i];
        else break;
    }
    let endIdx = book.chunks.length;
    for (let i = 0; i < chapters.length; i++) {
        if (chapters[i] > currentIdx) {
            endIdx = chapters[i];
            break;
        }
    }
    return { start: startIdx, end: endIdx };
  };

  const getChapterTitle = (index: number) => {
      const html = book.chunks[index];
      const doc = new DOMParser().parseFromString(html, 'text/html');
      let text = doc.body.textContent?.trim() || "";
      if (text.length > 40) text = text.substring(0, 40) + "...";
      return text || `Capitolo ${index + 1}`;
  }

  const handleExportChapter = async () => {
    if (globalSettings.engine !== 'gemini') {
        alert("Disponibile solo con motore Gemini.");
        return;
    }
    setIsExporting(true);
    try {
        const { start, end } = getCurrentChapterRange();
        const chunksToMerge: Uint8Array[] = [];
        const voice = currentVoiceId;
        const speed = currentSpeed;
        const style = currentStyle;
        
        let missingChunks = 0;
        for (let i = start; i < end; i++) {
            const key = `${book.id}_${i}_${voice}_${speed}_${style}`;
            const chunkData = await getAudioChunk(key);
            if (chunkData) chunksToMerge.push(chunkData); else missingChunks++;
        }

        if (chunksToMerge.length === 0) {
            alert("Nessun audio generato. Scarica prima il capitolo.");
            setIsExporting(false); return;
        }
        if (missingChunks > 0 && !confirm(`Mancano ${missingChunks} parti. Scaricare comunque?`)) {
             setIsExporting(false); return;
        }

        const mergedAudio = concatenateBuffers(chunksToMerge);
        const wavBlob = createWavFile(mergedAudio, 24000); 
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${book.title}_Capitolo_${start}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) { alert("Errore export."); } finally { setIsExporting(false); }
  };

  const handleDetectAmbienceClick = async () => {
    setIsDetecting(true);
    await onDetectAmbience();
    setIsDetecting(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#fdfaf6] relative overflow-hidden">
      {/* Hidden YouTube Player for Audio */}
      {book.settings?.ambienceType === 'youtube' && book.settings.ambience && (
          <div className="fixed top-0 left-0 w-1 h-1 opacity-0 pointer-events-none z-0">
             <iframe 
                ref={youtubeIframeRef}
                width="200" height="200" 
                src={`https://www.youtube.com/embed/${book.settings.ambience}?enablejsapi=1&controls=0&disablekb=1&loop=1&playlist=${book.settings.ambience}`} 
                title="Ambience"
                allow="autoplay; encrypted-media"
            />
          </div>
      )}

      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-white/90 backdrop-blur-md z-30 sticky top-0">
        <button onClick={onBack} className="p-2 text-gray-600"><ArrowLeft size={24} /></button>
        <div className="flex-1 text-center truncate px-4">
            <h2 className="font-bold text-gray-900 truncate text-sm">{book.title}</h2>
            <div className="flex justify-center items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                {globalSettings.engine === 'gemini' ? <Wifi size={10} /> : <Smartphone size={10} />}
                {globalSettings.engine === 'gemini' ? 'AI Cloud' : 'Offline'}
                {sleepTimer && <span className="flex items-center gap-1 text-primary ml-2"><Timer size={10} /> ON</span>}
            </div>
        </div>
        <div className="flex gap-1">
            <button onClick={() => setShowSleepTimer(true)} className={`p-2 relative ${sleepTimer ? 'text-primary' : 'text-gray-600'}`}>
                <Timer size={24} />
            </button>
            <button onClick={() => setShowChapters(true)} className="p-2 text-gray-600"><List size={24} /></button>
            <button onClick={() => setShowSettings(true)} className="p-2 text-gray-600 relative">
                <Settings2 size={24} />
                {currentAmbience !== 'none' && <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full border border-white" />}
            </button>
        </div>
      </div>

      {globalSettings.engine === 'gemini' && (
          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-100">
             <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-2">Capitolo Corrente</span>
             <div className="flex gap-2">
                <button 
                    onClick={() => {
                        const {start, end} = getCurrentChapterRange();
                        onDownloadChapter(start, end);
                    }}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm text-xs font-bold text-primary active:scale-95 transition-all disabled:opacity-50"
                >
                    {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <CloudLightning size={12} />}
                    {isDownloading ? `${downloadProgress}%` : "Prepara Audio"}
                </button>
                <button onClick={handleExportChapter} disabled={isExporting} className="p-1.5 text-gray-400 hover:text-primary transition-colors">
                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                </button>
             </div>
          </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scroll-smooth">
        {book.chunks.map((chunk, index) => {
          const cached = isChunkCached(index);
          const active = index === audioState.currentChunkIndex;
          
          return (
          <div key={index} ref={active ? activeChunkRef : null} onClick={() => onSeekChunk(index)} style={{ fontSize: `${globalSettings.fontSize}px` }}
            className={`book-content relative transition-all duration-500 p-5 rounded-[2rem] cursor-pointer border-l-4 
            ${active ? 'bg-white shadow-xl border-primary scale-[1.02]' : 'opacity-40 hover:opacity-70 border-transparent'}`}
          >
            {cached && !active && <div className="absolute top-4 right-4 text-green-500/50"><CheckCircle2 size={16} /></div>}
             {cached && active && <div className="absolute top-4 right-4 text-green-500 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full"><Database size={12} /><span className="text-[9px] font-black uppercase tracking-wider">Saved</span></div>}
            <div dangerouslySetInnerHTML={{ __html: chunk }} />
          </div>
        )})}
        <div className="h-64" />
      </div>

      {showSleepTimer && (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-center items-center" onClick={() => setShowSleepTimer(false)}>
              <div className="bg-white rounded-[2rem] p-6 w-full max-w-xs shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                        <BedDouble className="text-primary" />
                        <h3 className="text-xl font-black text-gray-800">Sleep Timer</h3>
                      </div>
                      <button onClick={() => setShowSleepTimer(false)} className="p-2 bg-gray-100 rounded-full"><X size={18} /></button>
                  </div>
                  <div className="space-y-2">
                      <button onClick={() => { onSetSleepTimer({type: 'time', value: 15}); setShowSleepTimer(false); }} className={`w-full p-4 rounded-xl font-bold text-left ${sleepTimer?.value === 15 ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'}`}>15 Minuti</button>
                      <button onClick={() => { onSetSleepTimer({type: 'time', value: 30}); setShowSleepTimer(false); }} className={`w-full p-4 rounded-xl font-bold text-left ${sleepTimer?.value === 30 ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'}`}>30 Minuti</button>
                      <button onClick={() => { onSetSleepTimer({type: 'time', value: 60}); setShowSleepTimer(false); }} className={`w-full p-4 rounded-xl font-bold text-left ${sleepTimer?.value === 60 ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'}`}>60 Minuti</button>
                      <button onClick={() => { onSetSleepTimer({type: 'chapter', value: 0}); setShowSleepTimer(false); }} className={`w-full p-4 rounded-xl font-bold text-left ${sleepTimer?.type === 'chapter' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'}`}>Fine Capitolo</button>
                      {sleepTimer && (
                           <button onClick={() => { onSetSleepTimer(null); setShowSleepTimer(false); }} className="w-full p-4 rounded-xl font-bold text-center text-red-500 border border-red-100 mt-4">Disattiva Timer</button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showChapters && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-start" onClick={() => setShowChapters(false)}>
            <div className="w-full max-w-sm bg-white h-full p-6 flex flex-col animate-in slide-in-from-left duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-gray-800">Indice</h3>
                    <button onClick={() => setShowChapters(false)} className="p-2 bg-gray-100 rounded-full"><X /></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3">
                    {book.chapterIndices.map((startIndex, i) => {
                        const endIndex = book.chapterIndices[i+1] || book.chunks.length;
                        const title = getChapterTitle(startIndex);
                        const isCurrent = audioState.currentChunkIndex >= startIndex && audioState.currentChunkIndex < endIndex;
                        let savedCount = 0;
                        const total = endIndex - startIndex;
                        const chunkKeySuffix = `_${currentVoiceId}_${currentSpeed}_${currentStyle}`;
                        
                        for(let k=startIndex; k<endIndex; k++) {
                            if(cachedKeys.has(`${book.id}_${k}${chunkKeySuffix}`)) savedCount++;
                        }
                        const isFullyCached = savedCount === total;
                        const isPartial = savedCount > 0 && !isFullyCached;
                        const isDownloadingThis = isDownloading && downloadingRange?.start === startIndex;

                        return (
                            <div key={i} className={`p-4 rounded-xl border flex items-center justify-between ${isCurrent ? 'border-primary bg-red-50' : 'border-gray-100'}`}>
                                <div className="flex-1 min-w-0 mr-4" onClick={() => { onSeekChunk(startIndex); setShowChapters(false); }}>
                                    <h4 className={`font-bold text-sm truncate ${isCurrent ? 'text-primary' : 'text-gray-700'}`}>{title}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                        {isDownloadingThis ? <span className="text-amber-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Scaricamento... {downloadProgress}%</span> : isFullyCached ? <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={10} /> Disponibile Offline</span> : isPartial ? <span className="text-orange-400">Parzialmente salvato</span> : <span>Da scaricare</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {globalSettings.engine === 'gemini' && !isFullyCached && !isDownloadingThis && (
                                        <button onClick={(e) => { e.stopPropagation(); onDownloadChapter(startIndex, endIndex); }} className="p-2 text-gray-400 hover:text-primary bg-gray-50 rounded-full"><DownloadCloud size={18} /></button>
                                    )}
                                    <button onClick={() => { onSeekChunk(startIndex); setShowChapters(false); }} className={`p-2 rounded-full ${isCurrent ? 'text-white bg-primary' : 'text-gray-400 bg-gray-50'}`}><PlayCircle size={18} /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end" onClick={() => setShowSettings(false)}>
          <div className="w-full max-w-sm bg-white h-full p-8 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black">Impostazioni</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-gray-100 rounded-full"><X /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              
              <section className="bg-gray-50 p-6 rounded-[2rem]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Music size={16} className="text-primary" />
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Atmosfera</label>
                  </div>
                  {globalSettings.engine === 'gemini' && (
                      <button onClick={handleDetectAmbienceClick} disabled={isDetecting} className="flex items-center gap-1 px-3 py-1 bg-white border border-amber-200 text-amber-600 rounded-full text-[10px] font-bold shadow-sm active:scale-95 disabled:opacity-50">
                          {isDetecting ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                          AI Detect
                      </button>
                  )}
                </div>
                
                <div className="flex gap-2 mb-4 text-[10px] font-bold p-1 bg-white rounded-xl border border-gray-100 w-fit">
                    <button onClick={() => {}} className={`px-3 py-1.5 rounded-lg ${ambienceType !== 'youtube' ? 'bg-primary text-white shadow-sm' : 'text-gray-400'}`}>Suoni</button>
                    <button onClick={() => onUpdateBookSettings({...book.settings!, ambienceType: 'youtube'})} className={`px-3 py-1.5 rounded-lg ${ambienceType === 'youtube' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400'}`}>YouTube</button>
                </div>

                {ambienceType !== 'youtube' ? (
                <>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {AMBIENCE_TRACKS.map(track => {
                            const Icon = track.icon;
                            const isSelected = (currentAmbience === track.id && ambienceType === 'preset');
                            return (
                                <button
                                    key={track.id}
                                    onClick={() => {
                                        onUpdateBookSettings({...book.settings!, ambience: track.id, ambienceType: 'preset'});
                                        setShowCustomAmbienceInput(false);
                                    }}
                                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${isSelected ? 'border-primary bg-white shadow-md text-primary' : 'border-transparent hover:bg-gray-200/50 text-gray-400'}`}
                                >
                                    <Icon size={20} />
                                    <span className="text-[10px] font-bold">{track.name}</span>
                                </button>
                            )
                        })}
                        
                        {/* Custom Presets Rendered Here */}
                        {globalSettings.customPresets?.map(preset => (
                             <button
                                key={preset.id}
                                onClick={() => {
                                    onUpdateBookSettings({
                                        ...book.settings!, 
                                        ambience: preset.src, 
                                        ambienceType: preset.type // 'custom' or 'youtube'
                                    });
                                }}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${book.settings?.ambience === preset.src ? 'border-primary bg-white shadow-md text-primary' : 'border-transparent hover:bg-gray-200/50 text-gray-400'}`}
                            >
                                {preset.type === 'youtube' ? <Youtube size={20}/> : <ListMusic size={20} />}
                                <span className="text-[10px] font-bold truncate w-full text-center">{preset.name}</span>
                            </button>
                        ))}

                        <button
                            onClick={() => setShowCustomAmbienceInput(true)}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${ambienceType === 'custom' && !globalSettings.customPresets?.find(p => p.src === currentAmbience) ? 'border-primary bg-white shadow-md text-primary' : 'border-transparent hover:bg-gray-200/50 text-gray-400'}`}
                        >
                            <LinkIcon size={20} />
                            <span className="text-[10px] font-bold">Link</span>
                        </button>
                    </div>
                    {showCustomAmbienceInput && (
                        <div className="mb-4 flex gap-2 animate-in fade-in slide-in-from-top-2">
                            <input 
                                type="text" 
                                placeholder="Incolla URL mp3..." 
                                value={customAmbienceUrl}
                                onChange={(e) => setCustomAmbienceUrl(e.target.value)}
                                className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-primary"
                            />
                            <button onClick={() => {
                                onUpdateBookSettings({...book.settings!, ambience: customAmbienceUrl, ambienceType: 'custom'});
                                setShowCustomAmbienceInput(false);
                            }} className="p-2 bg-primary text-white rounded-lg"><Save size={16} /></button>
                        </div>
                    )}
                </>
                ) : (
                    <div className="mb-4">
                        <div className="flex gap-2 mb-2">
                             <input 
                                type="text" 
                                placeholder="Incolla link YouTube..." 
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-red-500"
                            />
                            <button onClick={handleSaveYoutube} className="p-2 bg-red-500 text-white rounded-lg"><Save size={16} /></button>
                        </div>
                        {book.settings?.ambience && (
                            <div className="text-[10px] text-gray-500 bg-gray-100 p-2 rounded-lg flex items-center gap-2">
                                <Youtube size={12} className="text-red-500"/>
                                Video ID: {book.settings.ambience}
                            </div>
                        )}
                        <p className="text-[9px] text-gray-400 mt-2">Nota: Il video deve permettere l'incorporamento. Alcuni video musicali potrebbero non funzionare a schermo spento.</p>
                    </div>
                )}

                {(currentAmbience && currentAmbience !== 'none' && ambienceType !== 'youtube') && (
                    <div className="flex items-center gap-3">
                        <Volume2 size={16} className="text-gray-400" />
                        <input type="range" min="0" max="1" step="0.05" value={currentAmbienceVol} onChange={(e) => onUpdateBookSettings({...book.settings!, ambienceVolume: parseFloat(e.target.value)})} className="w-full accent-primary h-1 bg-gray-200 rounded-full appearance-none"/>
                    </div>
                )}
              </section>

              <section className="bg-gray-50 p-6 rounded-[2rem]">
                <div className="flex items-center gap-2 mb-4">
                  <Mic2 size={16} className="text-primary" />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {globalSettings.engine === 'gemini' ? 'Voce Narrante' : 'Voce Sistema'}
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {globalSettings.engine === 'gemini' ? (
                    <>
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                        {VOICE_STYLES.map(style => (
                             <button 
                                key={style.id}
                                onClick={() => onUpdateBookSettings({...book.settings!, voiceStyle: style.id})}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${currentStyle === style.id ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
                             >
                                 {style.name}
                             </button>
                        ))}
                    </div>
                    {GEMINI_VOICES.map(v => (
                        <button key={v.id} onClick={() => onUpdateBookSettings({...book.settings!, voice: v.id})} className={`w-full p-4 rounded-xl font-bold text-left transition-all ${ currentVoiceId === v.id ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{v.name}</button>
                    ))}
                    </>
                  ) : (
                    systemVoices.length > 0 ? systemVoices.map(v => (
                        <button key={v.name} onClick={() => onUpdateBookSettings({...book.settings!, voice: v.name})} className={`w-full p-4 rounded-xl font-bold text-left transition-all truncate ${ currentVoiceId === v.name ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}><span className="block text-xs opacity-70 mb-1">{v.lang}</span>{v.name}</button>
                    )) : <p className="text-gray-400 text-xs p-4">Nessuna voce trovata.</p>
                  )}
                </div>
              </section>

              <section className="bg-gray-50 p-6 rounded-[2rem]">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Velocità ({book.settings?.speed || globalSettings.defaultSpeed}x)</label>
                <input type="range" min="0.5" max="2.0" step="0.1" value={book.settings?.speed || globalSettings.defaultSpeed} onChange={(e) => onUpdateBookSettings({...book.settings!, speed: parseFloat(e.target.value)})} className="w-full accent-primary" />
              </section>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 px-6 py-8 pb-10 rounded-t-[3rem] shadow-2xl z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => { const prev = book.chapterIndices?.filter(idx => idx < audioState.currentChunkIndex); onSeekChunk(prev && prev.length > 0 ? prev[prev.length - 1] : 0); }} className="p-3 text-gray-200 hover:text-gray-400 active:scale-90 transition-all"><ChevronsLeft size={28} /></button>
          <button onClick={onPrevChunk} className="p-3 text-gray-200 hover:text-gray-900 active:scale-90 transition-all"><SkipBack size={32} fill="currentColor" /></button>
          <button onClick={onPlayPause} disabled={audioState.isLoading} className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all disabled:opacity-50">
            {audioState.isLoading ? <Loader2 className="animate-spin" /> : audioState.isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
          </button>
          <button onClick={onNextChunk} className="p-3 text-gray-200 hover:text-gray-900 active:scale-90 transition-all"><SkipForward size={32} fill="currentColor" /></button>
          <button onClick={() => { const next = book.chapterIndices?.find(idx => idx > audioState.currentChunkIndex); if (next !== undefined) onSeekChunk(next); }} className="p-3 text-gray-200 hover:text-gray-400 active:scale-90 transition-all"><ChevronsRight size={28} /></button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `.book-content { font-family: 'Merriweather', serif; line-height: 2.2; color: #2d3436; text-align: left; } .book-content h1, .book-content h2, .book-content h3 { font-weight: 900; color: #1d3557; margin-top: 2rem; margin-bottom: 1rem; line-height: 1.2; }`}} />
    </div>
  );
};

export default Player;
