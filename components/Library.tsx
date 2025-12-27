
import React, { useRef, useState, useEffect } from 'react';
import { Book as BookType, AppSettings, User, AmbiencePreset } from '../types';
import { Book, Plus, FileText, Trash2, Sparkles, Settings, X, Wifi, Smartphone, Database, LogOut, Music, Link as LinkIcon, Youtube, ListMusic, Key, Save, Download, Upload, Zap, Loader2 } from 'lucide-react';
import { getCacheSizeInfo } from '../services/storage';

interface LibraryProps {
  user: User | null;
  books: BookType[];
  globalSettings: AppSettings;
  onUpdateGlobalSettings: (s: AppSettings) => void;
  onLogout: () => void;
  onSelectBook: (book: BookType) => void;
  onImportBook: (file: File) => void;
  onDeleteBook: (id: string) => void;
  onChangeCover: (book: BookType, file?: File, autoGenerate?: boolean) => void;
  isProcessing: boolean;
  onClearCache: () => void;
  onRestoreBackup: (data: any) => void;
}

const Library: React.FC<LibraryProps> = ({ user, books, globalSettings, onUpdateGlobalSettings, onLogout, onSelectBook, onImportBook, onDeleteBook, onChangeCover, isProcessing, onClearCache, onRestoreBackup }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<string>("Calcolo...");

  useEffect(() => {
    if (showGlobalSettings) {
        getCacheSizeInfo().then(setCacheInfo);
    }
  }, [showGlobalSettings]);

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20 overflow-hidden relative">
      <header className="px-6 pt-12 pb-6 bg-white shadow-sm flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Libreria</h1>
          {user && <p className="text-gray-500 text-xs font-medium">Bentornato, {user.name}</p>}
        </div>
        <button onClick={() => setShowGlobalSettings(true)} className="p-3 bg-gray-100 rounded-full text-gray-600 active:scale-90 transition-transform">
            <Settings size={22} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {books.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-300">
            < Book size={64} className="mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest text-center">Tocca il tasto + per<br/>aggiungere un libro</p>
          </div>
        )}
        
        {isProcessing && (
           <div className="bg-white rounded-3xl p-8 shadow-sm flex flex-col items-center gap-4">
               {/* Fixed: Added missing Loader2 import from lucide-react */}
               <Loader2 className="animate-spin text-primary" size={32} />
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Analisi file in corso...</p>
           </div>
        )}

        {books.map((book) => (
          <div key={book.id} onClick={() => onSelectBook(book)} className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-all">
            <div className="w-16 h-24 bg-gray-50 rounded-2xl overflow-hidden shadow-inner flex-shrink-0">
               {book.coverUrl ? <img src={book.coverUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><FileText /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{book.title}</h3>
              <p className="text-[10px] text-gray-400 uppercase font-black">{book.author}</p>
              <div className="mt-3 h-1 bg-gray-100 rounded-full"><div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(book.progressIndex/(book.chunks.length||1))*100}%` }} /></div>
            </div>
            <div className="flex flex-col gap-2">
               <button onClick={(e) => { e.stopPropagation(); onChangeCover(book, undefined, true); }} className="p-2 text-amber-500"><Sparkles size={18} /></button>
               <button onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }} className="p-2 text-red-300"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {showGlobalSettings && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end">
          <div className="w-full bg-white rounded-t-[3rem] p-8 animate-in slide-in-from-bottom duration-300 h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-8 shrink-0">
              <h2 className="text-2xl font-black">Impostazioni</h2>
              <button onClick={() => setShowGlobalSettings(false)} className="p-2 bg-gray-100 rounded-full"><X /></button>
            </div>

            <div className="space-y-8 pb-10 overflow-y-auto flex-1 pr-2">

              <section className="bg-green-50 p-6 rounded-[2rem] border border-green-100">
                  <div className="flex items-center gap-2 mb-4 text-green-700">
                      <Zap size={18}/>
                      <h4 className="font-black text-xs uppercase tracking-widest">Risparmio Crediti API</h4>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex-1 pr-4">
                          <p className="font-bold text-sm text-green-800">Modalità Eco</p>
                          <p className="text-[10px] text-green-600/80 leading-relaxed">Usa il TTS del telefono per titoli e paragrafi brevi. Risparmia fino al 30% della quota API.</p>
                      </div>
                      <button 
                        onClick={() => onUpdateGlobalSettings({...globalSettings, ecoMode: !globalSettings.ecoMode})}
                        className={`w-12 h-6 rounded-full relative transition-colors ${globalSettings.ecoMode ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${globalSettings.ecoMode ? 'right-1' : 'left-1'}`} />
                      </button>
                  </div>
                  {globalSettings.ecoMode && (
                      <div>
                        <div className="flex justify-between text-[10px] font-black uppercase text-green-700 mb-2">
                            <span>Soglia Testo Breve</span>
                            <span>{globalSettings.ecoThreshold} char</span>
                        </div>
                        <input 
                            type="range" min="20" max="150" step="10" 
                            value={globalSettings.ecoThreshold} 
                            onChange={(e) => onUpdateGlobalSettings({...globalSettings, ecoThreshold: parseInt(e.target.value)})}
                            className="w-full accent-green-600"
                        />
                      </div>
                  )}
              </section>

              <section className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                  <div className="flex items-center gap-2 mb-2 text-amber-700">
                      <Save size={16}/>
                      <h4 className="font-bold text-xs uppercase tracking-widest">Dati & Backup</h4>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => {
                           const data = { version: 2, date: new Date().toISOString(), settings: globalSettings, books: books };
                           const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
                           const url = URL.createObjectURL(blob);
                           const a = document.createElement('a');
                           a.href = url; a.download = `backup.json`; a.click();
                      }} className="flex-1 py-3 bg-white border border-amber-200 text-amber-600 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2">
                          <Download size={14} /> Backup
                      </button>
                      <button onClick={() => backupInputRef.current?.click()} className="flex-1 py-3 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2">
                          <Upload size={14} /> Ripristina
                      </button>
                      <input type="file" ref={backupInputRef} onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const r = new FileReader();
                          r.onload = (ev) => onRestoreBackup(JSON.parse(ev.target?.result as string));
                          r.readAsText(file);
                      }} accept=".json" className="hidden" />
                  </div>
              </section>

              {/* Removed API Configuration section as per guidelines - API key is handled via process.env.API_KEY */}

              <section>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Motore Audio</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => onUpdateGlobalSettings({...globalSettings, engine: 'gemini'})} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 ${globalSettings.engine === 'gemini' ? 'border-primary bg-red-50 text-primary ring-2 ring-primary ring-offset-2' : 'border-gray-200 text-gray-500'}`}>
                    <Wifi size={24} />
                    <span className="text-xs font-bold">Cloud AI</span>
                  </button>
                  <button onClick={() => onUpdateGlobalSettings({...globalSettings, engine: 'system'})} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 ${globalSettings.engine === 'system' ? 'border-primary bg-red-50 text-primary ring-2 ring-primary ring-offset-2' : 'border-gray-200 text-gray-500'}`}>
                    <Smartphone size={24} />
                    <span className="text-xs font-bold">Offline TTS</span>
                  </button>
                </div>
              </section>

              <section className="bg-gray-50 p-6 rounded-[2rem]">
                <div className="flex items-center gap-3 mb-2">
                    <Database className="text-gray-400" size={20} />
                    <h4 className="font-bold text-gray-700">Cache</h4>
                </div>
                <p className="text-xs text-gray-500 mb-4">{cacheInfo}</p>
                <button onClick={onClearCache} className="w-full py-3 bg-white border border-red-100 text-red-500 font-bold text-xs rounded-xl shadow-sm">
                    Svuota Cache
                </button>
              </section>

              <button onClick={onLogout} className="w-full py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl flex items-center justify-center gap-2">
                  <LogOut size={18} /> Esci
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 right-6 z-20">
        <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all border-4 border-white">
          <Plus size={32} />
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.docx,.epub" onChange={(e) => e.target.files?.[0] && onImportBook(e.target.files[0])} />
      </div>
    </div>
  );
};

export default Library;
