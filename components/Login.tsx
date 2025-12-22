
import React from 'react';
import { Book, CheckCircle, Cloud, Youtube, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
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
                Trasforma i tuoi ebook in esperienze audio immersive con la potenza di Google Gemini.
            </p>
        </div>

        <div className="w-full bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4 text-left">
            <div className="flex items-center gap-3">
                <Cloud className="text-blue-500" size={20} />
                <span className="text-sm font-bold text-gray-700">Backup Cloud & Sync Dispositivi</span>
            </div>
            <div className="flex items-center gap-3">
                <Youtube className="text-red-500" size={20} />
                <span className="text-sm font-bold text-gray-700">YouTube Background & Premium</span>
            </div>
            <div className="flex items-center gap-3">
                <ShieldCheck className="text-green-500" size={20} />
                <span className="text-sm font-bold text-gray-700">Accesso Sicuro ai tuoi Crediti</span>
            </div>
        </div>

        <button 
            onClick={onLogin}
            className="w-full py-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 group"
        >
            <img src="https://www.google.com/favicon.ico" alt="G" className="w-6 h-6" />
            <span>Continua con Google</span>
        </button>

        <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
            Accedendo accetti i termini di servizio. L'app utilizzerà le API di Google Drive per il backup dei tuoi libri.
        </p>
      </div>
    </div>
  );
};

export default Login;
