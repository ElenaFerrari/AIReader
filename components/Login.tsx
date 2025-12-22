
import React, { useState } from 'react';
import { Book, Key, ExternalLink, ChevronRight, Check } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSaveKey = () => {
    if (apiKey.trim().length < 20) {
        alert("Inserisci una chiave API valida.");
        return;
    }
    setIsValidating(true);
    // Salvataggio locale
    localStorage.setItem('gemini_api_key', apiKey.trim());
    
    // Simuliamo un check rapido (o potremmo fare una chiamata reale di test)
    setTimeout(() => {
        setIsValidating(false);
        onLogin();
    }, 800);
  };

  return (
    <div className="h-full w-full bg-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl" />

      <div className="z-10 flex flex-col items-center max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="w-24 h-24 bg-primary text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/30 mb-4 rotate-3">
          <Book size={48} strokeWidth={2.5} />
        </div>

        <div>
            <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">AudioLibro AI</h1>
            <p className="text-gray-500 text-lg leading-relaxed">
                Il tuo lettore personale. Per iniziare, configura la tua chiave di accesso.
            </p>
        </div>

        <div className="w-full bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4 text-left">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Google Gemini API Key</label>
            <div className="relative">
                <Key className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                    type="password"
                    placeholder="Incolla qui la tua API Key..." 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary font-mono text-sm"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                />
            </div>
            
            <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary text-xs font-bold hover:underline"
            >
                <ExternalLink size={12} />
                Ottieni una chiave gratuita su Google AI Studio
            </a>
        </div>

        <button 
            onClick={handleSaveKey}
            disabled={isValidating}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
        >
            {isValidating ? (
                <span>Verifica in corso...</span>
            ) : (
                <>
                    <span>Inizia ad Ascoltare</span>
                    <ChevronRight size={20} />
                </>
            )}
        </button>

        <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
            La tua chiave viene salvata solo sul tuo dispositivo e utilizzata per generare l'audio tramite le API di Google.
        </p>
      </div>
    </div>
  );
};

export default Login;
