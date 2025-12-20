
import React, { useEffect, useRef, useState } from 'react';
import { Book as BookType, AudioState, AppSettings, BookSettings } from '../types';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Loader2, Settings2, X, ChevronsLeft, ChevronsRight, Mic2 } from 'lucide-react';

interface PlayerProps {
  book: BookType;
  audioState: AudioState;
  globalSettings: AppSettings;
  onUpdateBookSettings: (settings: BookSettings) => void;
  onUpdateGlobalSettings: (settings: AppSettings) => void;
  onBack: () => void;
  onPlayPause: () => void;
  onNextChunk: () => void;
  onPrevChunk: () => void;
  onSeekChunk: (index: number) => void;
}

const VOICES = [
  { id: 'Kore', name: 'Kore (F)' },
  { id: 'Zephyr', name: 'Zephyr (F)' },
  { id: 'Puck', name: 'Puck (M)' },
  { id: 'Fenrir', name: 'Fenrir (M)' },
  { id: 'Charon', name: 'Charon (N)' },
];

const Player: React.FC<PlayerProps> = ({ 
  book, audioState, globalSettings, onUpdateBookSettings, onBack, onPlayPause, onNextChunk, onPrevChunk, onSeekChunk 
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeChunkRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (activeChunkRef.current && scrollContainerRef.current) {
      activeChunkRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [audioState.currentChunkIndex]);

  return (
    <div className="flex flex-col h-full bg-[#fdfaf6] relative overflow-hidden">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-white/90 backdrop-blur-md z-30 sticky top-0">
        <button onClick={onBack} className="p-2 text-gray-600"><ArrowLeft size={24} /></button>
        <div className="flex-1 text-center truncate px-4"><h2 className="font-bold text-gray-900 truncate text-sm">{book.title}</h2></div>
        <button onClick={() => setShowSettings(true)} className="p-2 text-gray-600"><Settings2 size={24} /></button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scroll-smooth">
        {book.chunks.map((chunk, index) => (
          <div key={index} ref={index === audioState.currentChunkIndex ? activeChunkRef : null} onClick={() => onSeekChunk(index)} style={{ fontSize: `${globalSettings.fontSize}px` }}
            className={`book-content transition-all duration-500 p-5 rounded-[2rem] cursor-pointer ${index === audioState.currentChunkIndex ? 'bg-white shadow-xl border-l-4 border-primary scale-[1.02]' : 'opacity-20'}`}
            dangerouslySetInnerHTML={{ __html: chunk }} />
        ))}
        <div className="h-64" />
      </div>

      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end" onClick={() => setShowSettings(false)}>
          <div className="w-full max-w-sm bg-white h-full p-8 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black">Impostazioni Voce</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-gray-100 rounded-full"><X /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              <section className="bg-gray-50 p-6 rounded-[2.5rem]">
                <div className="flex items-center gap-2 mb-4">
                  <Mic2 size={16} className="text-primary" />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seleziona Voce</label>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {VOICES.map(v => (
                    <button 
                      key={v.id} 
                      onClick={() => onUpdateBookSettings({...book.settings!, voice: v.id})}
                      className={`w-full p-4 rounded-xl font-bold text-left transition-all ${ (book.settings?.voice || globalSettings.defaultVoice) === v.id ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </section>

              <section className="bg-gray-50 p-6 rounded-[2.5rem]">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Velocità ({book.settings?.speed || globalSettings.defaultSpeed}x)</label>
                <input 
                  type="range" min="0.5" max="2.0" step="0.1" 
                  value={book.settings?.speed || globalSettings.defaultSpeed} 
                  onChange={(e) => onUpdateBookSettings({...book.settings!, speed: parseFloat(e.target.value)})}
                  className="w-full accent-primary"
                />
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 px-6 py-8 pb-10 rounded-t-[3rem] shadow-2xl z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => {
            const prev = book.chapterIndices?.filter(idx => idx < audioState.currentChunkIndex);
            onSeekChunk(prev && prev.length > 0 ? prev[prev.length - 1] : 0);
          }} className="p-3 text-gray-200 hover:text-gray-400 active:scale-90 transition-all"><ChevronsLeft size={28} /></button>
          
          <button onClick={onPrevChunk} className="p-3 text-gray-200 hover:text-gray-900 active:scale-90 transition-all"><SkipBack size={32} fill="currentColor" /></button>

          <button onClick={onPlayPause} disabled={audioState.isLoading} className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all disabled:opacity-50">
            {audioState.isLoading ? <Loader2 className="animate-spin" /> : audioState.isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
          </button>

          <button onClick={onNextChunk} className="p-3 text-gray-200 hover:text-gray-900 active:scale-90 transition-all"><SkipForward size={32} fill="currentColor" /></button>

          <button onClick={() => {
            const next = book.chapterIndices?.find(idx => idx > audioState.currentChunkIndex);
            if (next !== undefined) onSeekChunk(next);
          }} className="p-3 text-gray-200 hover:text-gray-400 active:scale-90 transition-all"><ChevronsRight size={28} /></button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .book-content { font-family: 'Merriweather', serif; line-height: 2.2; color: #2d3436; text-align: left; }
        .book-content h1, .book-content h2, .book-content h3 { font-weight: 900; color: #1d3557; margin-top: 2rem; margin-bottom: 1rem; line-height: 1.2; }
      `}} />
    </div>
  );
};

export default Player;
