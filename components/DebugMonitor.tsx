
import React, { useEffect, useState } from 'react';
import { subscribeToDebugStats } from '../services/geminiService';
import { Activity, X } from 'lucide-react';

const DebugMonitor: React.FC = () => {
  const [stats, setStats] = useState({ requests: 0, totalTokens: 0, lastCost: 0 });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    return subscribeToDebugStats(setStats);
  }, []);

  if (!visible) return (
      <button onClick={() => setVisible(true)} className="fixed bottom-24 left-4 z-[9999] p-2 bg-black/80 text-green-400 rounded-full shadow-lg border border-green-900">
          <Activity size={16} />
      </button>
  );

  return (
    <div className="fixed bottom-24 left-4 z-[9999] bg-black/90 backdrop-blur-md border border-green-900/50 p-3 rounded-xl shadow-2xl w-48 font-mono text-[10px] text-green-400">
      <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1">
        <span className="font-bold flex items-center gap-1"><Activity size={10} /> API MONITOR</span>
        <button onClick={() => setVisible(false)}><X size={10} className="text-gray-500 hover:text-white" /></button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Requests:</span>
          <span className="font-bold text-white">{stats.requests}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Total Tokens:</span>
          <span className="font-bold text-yellow-400">{stats.totalTokens}</span>
        </div>
        {stats.lastCost > 0 && (
            <div className="flex justify-between animate-pulse">
            <span className="text-gray-500">Last Call:</span>
            <span className="font-bold text-green-500">+{stats.lastCost} tok</span>
            </div>
        )}
      </div>
      <div className="mt-2 text-[8px] text-gray-600 leading-tight">
          *Token usage determines your daily quota.
      </div>
    </div>
  );
};

export default DebugMonitor;
