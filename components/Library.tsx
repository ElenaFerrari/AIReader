
import React, { useRef, useState, useEffect } from 'react';
import { Book as BookType, AppSettings, User, AmbiencePreset } from '../types';
import { Book, Plus, FileText, Trash2, Sparkles, Settings, X, Wifi, Smartphone, Check, Database, LogOut, Cloud, RefreshCw, HardDrive, Music, Link as LinkIcon, Youtube, ListMusic, Key, Save, FolderUp, Download, Upload } from 'lucide-react';
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

const GEMINI_VOICES = [
  { id: 'Kore', name: 'Kore (F)' },
  { id: 'Zephyr', name: 'Zephyr (F)' },
  { id: 'Puck', name: 'Puck (M)' },
  { id: 'Fenrir', name: 'Fenrir (M)' },
  { id: 'Charon', name: 'Charon (N)' },
];

const Library: React.FC<LibraryProps> = ({ user, books, globalSettings, onUpdateGlobalSettings, onLogout, onSelectBook, onImportBook, onDeleteBook, onChangeCover, isProcessing, onClearCache, onRestoreBackup }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<string>("Calcolo...");
  
  // Stato per la modifica della API Key dentro le impostazioni
  const [tempApiKey, setTempApiKey] = useState("");

  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetSrc, setNewPresetSrc] = useState("");
  const [newPresetType, setNewPresetType] = useState<'custom' | 'youtube'>('custom');

  useEffect(() => {
    if (showGlobalSettings) {
        getCacheSizeInfo().then(setCacheInfo);
        setTempApiKey(localStorage.getItem('gemini_api_key') || "");
    }
  }, [showGlobalSettings]);

  const handleUpdateKey = () => {
      if(tempApiKey.trim().length > 10) {
          localStorage.setItem('gemini_api_key', tempApiKey.trim());
          alert("Chiave API aggiornata.");
      }
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddPreset = () => {
      if (!newPresetName.trim() || !newPresetSrc.trim()) {
          alert("Inserisci nome e link validi.");
          return;
      }
      
      let finalSrc = newPresetSrc;
      if (newPresetType === 'youtube') {
          const id = extractYoutubeId(newPresetSrc);
          if (!id) {
              alert("Link YouTube non valido.");
              return;
          }
          finalSrc = id;
      }

      const newPreset: AmbiencePreset = {
          id: Date.now().toString(),
          name: newPresetName,
          src: finalSrc,
          type: newPresetType
      };

      const updatedPresets = [...(globalSettings.customPresets || []), newPreset];
      onUpdateGlobalSettings({ ...globalSettings, customPresets: updatedPresets });
      setNewPresetName("");
      setNewPresetSrc("");
  };

  const handleDeletePreset = (id: string) => {
      const updatedPresets = globalSettings.customPresets.filter(p => p.id !== id);
      onUpdateGlobalSettings({ ...globalSettings, customPresets: updatedPresets });
  };

  const handleExportData = () => {
      const backupData = {
          version: 1,
          date: new Date().toISOString(),
          settings: globalSettings,
          books: books
      };
      
      const dataStr = JSON.stringify(backupData);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `audiolibro-backup-${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              onRestoreBackup(json);
          } catch (err) {
              alert("Il file non è valido.");
          }
      };
      reader.readAsText(file);
      // Reset input
      if (backupInputRef.current) backupInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20 overflow-hidden relative">
      <header className="px-6 pt-12 pb-6 bg-white shadow-sm flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Libreria</h1>
          {user ? (
              <div className="flex items-center gap-2 mt-1">
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-200">
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover"/>
                  </div>
                  <p className="text-gray-500 text-xs font-medium truncate max-w-[150px]">Pronto a leggere</p>
              </div>
          ) : (
            <p className="text-gray-500 text-xs font-medium">I tuoi audiolibri AI</p>
          )}
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowGlobalSettings(true)} className="p-3 bg-gray-100 rounded-full text-gray-600 active:scale-90 transition-transform">
                <Settings size={22} />
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {books.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-300">
            <Book size={64} className="mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest">Carica il tuo primo libro</p>
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
              <div className="mt-3 h-1 bg-gray-100 rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${(book.progressIndex/(book.chunks.length||1))*100}%` }} /></div>
            </div>
            <div className="flex flex-col gap-2">
               <button onClick={(e) => { e.stopPropagation(); onChangeCover(book, undefined, true); }} className={`p-2 ${globalSettings.engine === 'gemini' ? 'text-amber-500' : 'text-gray-300'}`}><Sparkles size={18} /></button>
               <button onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }} className="p-2 text-red-300"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        <div className="h-24" />
      </div>

      {showGlobalSettings && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end">
          <div className="w-full bg-white rounded-t-[3rem] p-8 animate-in slide-in-from-bottom duration-300 h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-8 shrink-0">
              <h2 className="text-2xl font-black">Impostazioni App</h2>
              <button onClick={() => setShowGlobalSettings(false)} className="p-2 bg-gray-100 rounded-full"><X /></button>
            </div>

            <div className="space-y-8 pb-10 overflow-y-auto flex-1">

              <section className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                  <div className="flex items-center gap-2 mb-2 text-amber-700">
                      <Save size={16}/>
                      <h4 className="font-bold text-xs uppercase tracking-widest">Dati & Backup Locale</h4>
                  </div>
                  <p className="text-[10px] text-amber-600/80 mb-4 leading-relaxed">
                      L'app salva i dati nella cache del browser, che potrebbe essere cancellata automaticamente dal telefono. 
                      Per sicurezza, scarica un backup periodico.
                  </p>
                  <div className="flex gap-2">
                      <button onClick={handleExportData} className="flex-1 py-3 bg-white border border-amber-200 text-amber-600 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2">
                          <Download size={14} /> Salva Backup
                      </button>
                      <button onClick={() => backupInputRef.current?.click()} className="flex-1 py-3 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2">
                          <Upload size={14} /> Ripristina
                      </button>
                      <input type="file" ref={backupInputRef} onChange={handleImportData} accept=".json" className="hidden" />
                  </div>
              </section>

              <section className="bg-gray-50 p-6 rounded-3xl">
                  <div className="flex items-center gap-2 mb-4 text-gray-500">
                      <Key size={16}/>
                      <h4 className="font-bold text-xs uppercase tracking-widest">Configurazione API</h4>
                  </div>
                  <div className="flex gap-2">
                      <input 
                          type="password" 
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          placeholder="Gemini API Key"
                          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary font-mono"
                      />
                      <button onClick={handleUpdateKey} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-primary">Salva</button>
                  </div>
              </section>
              
              <section className="bg-gray-50 p-6 rounded-3xl">
                  <div className="flex items-center gap-3 mb-4">
                      <ListMusic className="text-primary" size={20} />
                      <h4 className="font-bold text-gray-700">Le Tue Playlist Atmosfera</h4>
                  </div>
                  
                  <div className="mb-4 space-y-2">
                     <input 
                        type="text" 
                        placeholder="Nome Playlist (es. Jazz Notturno)" 
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary"
                     />
                     <div className="flex gap-2">
                         <div className="flex bg-white rounded-xl border border-gray-200 p-1">
                             <button onClick={() => setNewPresetType('custom')} className={`p-2 rounded-lg ${newPresetType === 'custom' ? 'bg-primary text-white' : 'text-gray-400'}`}><LinkIcon size={16}/></button>
                             <button onClick={() => setNewPresetType('youtube')} className={`p-2 rounded-lg ${newPresetType === 'youtube' ? 'bg-red-500 text-white' : 'text-gray-400'}`}><Youtube size={16}/></button>
                         </div>
                         <input 
                            type="text" 
                            placeholder={newPresetType === 'youtube' ? "Link YouTube" : "Link MP3/Stream"} 
                            value={newPresetSrc}
                            onChange={(e) => setNewPresetSrc(e.target.value)}
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary"
                         />
                         <button onClick={handleAddPreset} className="p-2 bg-primary text-white rounded-xl"><Plus/></button>
                     </div>
                  </div>

                  <div className="space-y-2">
                      {globalSettings.customPresets?.length > 0 ? globalSettings.customPresets.map(preset => (
                          <div key={preset.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100">
                              <div className="flex items-center gap-2 overflow-hidden">
                                  {preset.type === 'youtube' ? <Youtube size={14} className="text-red-500 shrink-0"/> : <Music size={14} className="text-blue-500 shrink-0"/>}
                                  <span className="text-sm font-bold text-gray-700 truncate">{preset.name}</span>
                              </div>
                              <button onClick={() => handleDeletePreset(preset.id)} className="text-gray-300 hover:text-red-400"><Trash2 size={16}/></button>
                          </div>
                      )) : <p className="text-xs text-gray-400 text-center py-2">Nessuna playlist salvata.</p>}
                  </div>
              </section>

              {user && (
                  <section className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                      <button onClick={onLogout} className="w-full py-2 bg-white text-gray-600 font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2">
                          <LogOut size={14}/> Rimuovi Chiave API
                      </button>
                  </section>
              )}

              <section>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Motore Audio</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => onUpdateGlobalSettings({...globalSettings, engine: 'gemini'})}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 ${globalSettings.engine === 'gemini' ? 'border-primary bg-red-50 text-primary ring-2 ring-primary ring-offset-2' : 'border-gray-200 text-gray-500'}`}
                  >
                    <Wifi size={24} />
                    <span className="text-xs font-bold">AI Gemini</span>
                    <span className="text-[10px] opacity-70">Alta Qualità</span>
                  </button>
                  <button 
                    onClick={() => onUpdateGlobalSettings({...globalSettings, engine: 'system'})}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 ${globalSettings.engine === 'system' ? 'border-primary bg-red-50 text-primary ring-2 ring-primary ring-offset-2' : 'border-gray-200 text-gray-500'}`}
                  >
                    <Smartphone size={24} />
                    <span className="text-xs font-bold">Dispositivo</span>
                    <span className="text-[10px] opacity-70">Gratis & Offline</span>
                  </button>
                </div>
              </section>

              {globalSettings.engine === 'gemini' && (
                <section>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Voce AI Predefinita</label>
                  <div className="grid grid-cols-3 gap-2">
                    {GEMINI_VOICES.map(v => (
                      <button key={v.id} onClick={() => onUpdateGlobalSettings({...globalSettings, defaultVoice: v.id})} className={`p-3 rounded-2xl border text-[10px] font-bold ${globalSettings.defaultVoice === v.id ? 'border-primary bg-red-50 text-primary' : 'border-gray-100 text-gray-400'}`}>{v.name}</button>
                    ))}
                  </div>
                </section>
              )}
              
              <section>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Dimensione Testo ({globalSettings.fontSize}px)</label>
                <input 
                  type="range" min="14" max="32" step="1" 
                  value={globalSettings.fontSize} 
                  onChange={(e) => onUpdateGlobalSettings({...globalSettings, fontSize: parseInt(e.target.value)})}
                  className="w-full accent-primary"
                />
              </section>

              <section className="bg-gray-50 p-6 rounded-3xl">
                <div className="flex items-center gap-3 mb-2">
                    <Database className="text-gray-400" size={20} />
                    <h4 className="font-bold text-gray-700">Archiviazione Cache</h4>
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    L'app salva l'audio generato per non consumare dati se riascolti lo stesso pezzo.
                    <br/><strong className="text-primary">{cacheInfo}</strong>
                </p>
                <button onClick={onClearCache} className="w-full py-3 bg-white border border-red-100 text-red-500 font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-transform">
                    Svuota Cache Audio
                </button>
              </section>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 right-6 z-20">
        <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all">
          <Plus size={32} />
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.docx,.epub" onChange={(e) => e.target.files?.[0] && onImportBook(e.target.files[0])} />
      </div>
    </div>
  );
};

export default Library;
