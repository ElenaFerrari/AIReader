
import React, { useRef, useState } from 'react';
import { Book as BookType, AppSettings } from '../types';
import { Book, Plus, FileText, Trash2, Sparkles, Settings, X } from 'lucide-react';

interface LibraryProps {
  books: BookType[];
  globalSettings: AppSettings;
  onUpdateGlobalSettings: (s: AppSettings) => void;
  onSelectBook: (book: BookType) => void;
  onImportBook: (file: File) => void;
  onDeleteBook: (id: string) => void;
  onChangeCover: (book: BookType, file?: File, autoGenerate?: boolean) => void;
  isProcessing: boolean;
}

const VOICES = [
  { id: 'Kore', name: 'Kore (F)' },
  { id: 'Zephyr', name: 'Zephyr (F)' },
  { id: 'Puck', name: 'Puck (M)' },
  { id: 'Fenrir', name: 'Fenrir (M)' },
  { id: 'Charon', name: 'Charon (N)' },
];

const Library: React.FC<LibraryProps> = ({ books, globalSettings, onUpdateGlobalSettings, onSelectBook, onImportBook, onDeleteBook, onChangeCover, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20 overflow-hidden relative">
      <header className="px-6 pt-12 pb-6 bg-white shadow-sm flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Libreria</h1>
          <p className="text-gray-500 text-xs font-medium">I tuoi audiolibri AI</p>
        </div>
        <button onClick={() => setShowGlobalSettings(true)} className="p-3 bg-gray-100 rounded-full text-gray-600 active:scale-90 transition-transform">
          <Settings size={22} />
        </button>
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
               <button onClick={(e) => { e.stopPropagation(); onChangeCover(book, undefined, true); }} className="p-2 text-amber-500"><Sparkles size={18} /></button>
               <button onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }} className="p-2 text-red-300"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        <div className="h-24" />
      </div>

      {showGlobalSettings && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end">
          <div className="w-full bg-white rounded-t-[3rem] p-8 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black">Impostazioni App</h2>
              <button onClick={() => setShowGlobalSettings(false)} className="p-2 bg-gray-100 rounded-full"><X /></button>
            </div>

            <div className="space-y-8 pb-10">
              <section>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Voce Narrante Predefinita</label>
                <div className="grid grid-cols-3 gap-2">
                  {VOICES.map(v => (
                    <button key={v.id} onClick={() => onUpdateGlobalSettings({...globalSettings, defaultVoice: v.id})} className={`p-3 rounded-2xl border text-[10px] font-bold ${globalSettings.defaultVoice === v.id ? 'border-primary bg-red-50 text-primary' : 'border-gray-100 text-gray-400'}`}>{v.name}</button>
                  ))}
                </div>
              </section>
              
              <section>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Dimensione Testo ({globalSettings.fontSize}px)</label>
                <input 
                  type="range" min="14" max="32" step="1" 
                  value={globalSettings.fontSize} 
                  onChange={(e) => onUpdateGlobalSettings({...globalSettings, fontSize: parseInt(e.target.value)})}
                  className="w-full accent-primary"
                />
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
