import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Image as ImageIcon, Gamepad2, Settings, Cloud, Loader2, Search, Sparkles, Database, FileArchive, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { processKernelIntent } from '../core/ai';

interface DownloaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshGames?: () => void;
  inWindowMode?: boolean;
}

interface DownloadTask {
  id: string;
  type: string;
  name: string;
  status: 'queued' | 'downloading' | 'hashing' | 'compressing' | 'completed' | 'error';
  progress: number;
  message: string;
}

// Elite Optimization: Task Item memoization
const TaskItem = React.memo(({ task }: { task: DownloadTask }) => (
  <div className="p-4 rounded-lg bg-[#2A2A2D] border border-zinc-800 flex flex-col gap-2 relative overflow-hidden shrink-0">
    <div 
      className={`absolute top-0 left-0 h-full opacity-10 transition-all duration-300 ${
        task.status === 'error' ? 'bg-red-500' :
        task.status === 'completed' ? 'bg-emerald-500' :
        task.status === 'hashing' ? 'bg-purple-500' :
        task.status === 'compressing' ? 'bg-orange-500' :
        'bg-indigo-500'
      }`} 
      style={{ width: `${task.progress}%` }} 
    />
    
    <div className="flex justify-between items-start relative z-10">
      <div>
        <h4 className="font-bold text-zinc-200 flex items-center gap-2">
          {task.type === 'iso' || task.type === 'roms' ? <FileArchive size={14} className="text-zinc-400"/> : <Download size={14} className="text-zinc-400"/>}
          {task.name}
        </h4>
        <p className="text-xs text-zinc-400 mt-1">{task.message}</p>
      </div>
      <div className="text-right">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            task.status === 'completed' ? 'text-emerald-400 bg-emerald-400/10' :
            task.status === 'error' ? 'text-red-400 bg-red-400/10' :
            task.status === 'queued' ? 'text-zinc-400 bg-zinc-400/10' :
            task.status === 'hashing' ? 'text-purple-400 bg-purple-400/10' :
            task.status === 'compressing' ? 'text-orange-400 bg-orange-400/10' :
            'text-indigo-400 bg-indigo-400/10'
        }`}>
          {task.status.toUpperCase()}
        </span>
        {(task.status === 'downloading' || task.status === 'compressing') && (
          <div className="text-xs text-zinc-300 mt-2 font-mono">
            {task.progress}%
          </div>
        )}
      </div>
    </div>
    
    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-1 relative z-10">
      <div 
        className={`h-full transition-all duration-300 ${
          task.status === 'error' ? 'bg-red-500' :
          task.status === 'completed' ? 'bg-emerald-500' :
          task.status === 'hashing' ? 'bg-purple-500 animate-pulse' :
          task.status === 'compressing' ? 'bg-orange-500' :
          'bg-indigo-500'
        }`} 
        style={{ width: `${task.progress}%` }} 
      />
    </div>
  </div>
));

export const DownloaderModal: React.FC<DownloaderModalProps> = ({ isOpen, onClose, onRefreshGames, inWindowMode }) => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  
  // NLP Search
  const [promptInput, setPromptInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Elite Optimization: Resilient SSE with auto-reconnect
  useEffect(() => {
    if (!isOpen) return;
    
    let isMounted = true;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: number;

    const connectSSE = () => {
      if (!isMounted) return;
      setConnectionStatus('connecting');
      eventSource = new EventSource('/api/download/status');
      
      eventSource.onopen = () => {
        if (isMounted) setConnectionStatus('connected');
      };
      
      eventSource.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          setTasks(data);
        } catch (err) {}
      };

      eventSource.onerror = () => {
        if (!isMounted) return;
        setConnectionStatus('error');
        eventSource?.close();
        reconnectTimeout = window.setTimeout(connectSSE, 5000); // 5s backoff
      };
    };

    connectSSE();

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      clearTimeout(reconnectTimeout);
    };
  }, [isOpen]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [tasks]);

  if (!isOpen && !inWindowMode) return null;

  const handleDownload = async (type: string, name?: string) => {
    try {
      fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name: name || type })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePromptSearch = async () => {
    if (!promptInput.trim()) return;
    setIsSearching(true);
    try {
      const result = await processKernelIntent(promptInput);
      if (result.acao === 'download') {
        const type = result.categoria || 'roms';
        const name = result.termo_busca || 'Unknown Asset';
        handleDownload(type, name);
        setPromptInput('');
      } else {
        alert(result.resumo_ia || "O catálogo não possui este recurso no momento.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao buscar.");
    } finally {
      setIsSearching(false);
    }
  };

  const content = (
      <div className={`flex flex-col h-full bg-[#1A1A1D] ${inWindowMode ? '' : 'border border-zinc-800 rounded-xl shadow-2xl max-w-3xl overflow-hidden max-h-[90vh] w-full relative'}`}>
          {/* Header */}
          {!inWindowMode && (
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-indigo-900/40 to-transparent border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                  <Cloud size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{t('downloader_title')}</h2>
                  <p className="text-sm text-zinc-400 flex items-center gap-2">
                    Threaded Scraper & Queue Manager
                    {connectionStatus === 'error' && <span className="text-red-400 flex items-center gap-1 mx-2"><AlertTriangle size={12}/> Offline</span>}
                    {connectionStatus === 'connecting' && <span className="text-amber-400 flex items-center gap-1 mx-2"><Loader2 size={12} className="animate-spin"/> Reconectando...</span>}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          )}

          <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">

            {/* AI Natural Language Search */}
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex flex-col gap-3 shrink-0 shadow-inner">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={14} /> {t('ai_search_title')}
              </label>
              <div className="flex gap-2">
                <input 
                   type="text" 
                   value={promptInput}
                   onChange={e => setPromptInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handlePromptSearch()}
                   placeholder={t('ai_search_placeholder')}
                   className="flex-1 bg-[#1A1A1D] border border-zinc-700/50 rounded-lg px-4 text-sm text-zinc-200 outline-none focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(79,70,229,0.2)] transition-shadow"
                />
                <button 
                   onClick={handlePromptSearch}
                   disabled={isSearching || !promptInput}
                   className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shrink-0 transition-colors shadow-lg shadow-indigo-600/20"
                >
                   {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                   {t('ai_search_btn')}
                </button>
              </div>
            </div>

            {/* Quick Actions */}
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
               {/* Covers Button */}
               <button onClick={() => handleDownload('covers', 'All Missing Covers')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-colors text-center shadow-lg group">
                 <ImageIcon size={24} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                 <span className="text-sm font-bold text-zinc-200">{t('dl_covers')}</span>
                 <span className="text-xs text-zinc-500 leading-tight">Scraper Engine</span>
               </button>

               {/* Emulators Button */}
               <button onClick={() => handleDownload('emulators', 'Missing Cores')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-orange-500/50 hover:bg-orange-500/10 transition-colors text-center shadow-lg group">
                 <Settings size={24} className="text-orange-400 group-hover:scale-110 transition-transform" />
                 <span className="text-sm font-bold text-zinc-200">{t('dl_emulators')}</span>
                 <span className="text-xs text-zinc-500 leading-tight">Libretro Cores</span>
               </button>

               {/* Public ROMs Button */}
               <button onClick={() => handleDownload('roms', 'Public Domain Hub')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-colors text-center shadow-lg group">
                 <Gamepad2 size={24} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                 <span className="text-sm font-bold text-zinc-200">Public ROMs</span>
                 <span className="text-xs text-zinc-500 leading-tight">Archive.org</span>
               </button>

               {/* Third Party Apps Button */}
               <button onClick={() => handleDownload('apps', 'Compatibility Layer Hub')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-violet-500/50 hover:bg-violet-500/10 transition-colors text-center shadow-lg group">
                 <Package size={24} className="text-violet-400 group-hover:scale-110 transition-transform" />
                 <span className="text-sm font-bold text-zinc-200">3rd Party Apps</span>
                 <span className="text-xs text-zinc-500 leading-tight">Wine/Flatpak</span>
               </button>
             </div>

             {/* Queue section */}
             <div className="space-y-3 shrink-0 flex-1 flex flex-col min-h-[150px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Database size={16} className="text-zinc-500" /> 
                    {t('dl_queue')} ({tasks.length})
                  </h3>
                  <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                     {connectionStatus !== 'connected' && <span className="text-amber-500 animate-pulse">Socket Offline</span>}
                     {tasks.filter(t => t.status === 'downloading').length} {t('dl_active_threads')}
                  </div>
                </div>
                
                {tasks.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-zinc-800 bg-black/20 rounded-xl text-zinc-500 text-sm flex-1 flex items-center justify-center">
                    {t('dl_empty')}
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto pr-2">
                    {tasks.map(task => (
                       <TaskItem key={task.id} task={task} />
                    ))}
                  </div>
                )}
             </div>

             {/* Live Terminal Log */}
             {tasks.length > 0 && (
                <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800 shrink-0">
                   <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                     <Settings size={14} /> {t('dl_global_log')}
                   </h3>
                   <div 
                     ref={logContainerRef}
                     className="h-32 bg-[#0A0A0C] border border-zinc-800/50 rounded-lg p-3 overflow-y-auto shadow-inner font-mono text-[11px] leading-relaxed text-zinc-400 space-y-0.5"
                   >
                      {tasks.slice().reverse().map((t, idx) => (
                         <div key={idx} className={`${t.status === 'error' ? 'text-red-400' : t.status === 'completed' ? 'text-emerald-400' : 'text-zinc-300'}`}>
                           <span className="text-zinc-600 opacity-60">[{new Date().toLocaleTimeString()}]</span> <span className="text-indigo-400">[{t.type}]</span> <span className="font-semibold text-white/80">{t.name}</span>: {t.message}
                         </div>
                      ))}
                      <div className="animate-pulse text-zinc-500 mt-1">_</div>
                   </div>
                </div>
             )}

          </div>
      </div>
  );

  if (inWindowMode) {
      return content;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative z-10 w-full max-w-3xl"
        >
          {content}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
