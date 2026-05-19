import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Loader2, CheckCircle2, AlertCircle, Cpu, Zap, ShieldCheck, RefreshCw, Search } from 'lucide-react';

interface Task {
  id: string;
  type: string;
  name: string;
  status: 'queued' | 'downloading' | 'hashing' | 'compressing' | 'completed' | 'error';
  progress: number;
  message: string;
}

export const TaskMonitor: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const handleRetry = async (task: Task) => {
    try {
      await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'redownload', name: task.name })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchAlternatives = (name: string) => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(name + " rom download redump no-intro")}`, '_blank');
  };

  useEffect(() => {
    let isMounted = true;
    const eventSource = new EventSource('/api/system/download/status');
    
    eventSource.onmessage = (event) => {
      if (!isMounted) return;
      try {
        const data = JSON.parse(event.data);
        setTasks(data);
        if (data.length > 0) setIsVisible(true);
      } catch (err) {
        // ignore
      }
    };

    eventSource.onerror = () => {
      // Allow native reconnection
    };

    return () => {
      isMounted = false;
      eventSource.close();
    };
  }, []);

  if (!isVisible || tasks.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
      <AnimatePresence>
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className={`pointer-events-auto bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-xl p-4 shadow-2xl overflow-hidden ${
              task.status === 'completed' ? 'border-emerald-500/30' : 
              task.status === 'error' ? 'border-red-500/30' : ''
            }`}
          >
            {/* Background progress bar */}
            <div className="absolute bottom-0 left-0 h-1 bg-zinc-800 w-full" />
            <motion.div 
              className={`absolute bottom-0 left-0 h-1 transition-all duration-300 ${
                task.status === 'completed' ? 'bg-emerald-500' :
                task.status === 'error' ? 'bg-red-500' : 
                task.type.includes('compression') ? 'bg-indigo-500' : 'bg-blue-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
            />

            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${
                task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                task.status === 'error' ? 'bg-red-500/10 text-red-500' : 
                task.type === 'rom_validation' ? 'bg-emerald-500/10 text-emerald-400' :
                'bg-zinc-800 text-zinc-400'
              }`}>
                {task.status === 'completed' ? <CheckCircle2 size={16} /> :
                 task.status === 'error' ? <AlertCircle size={16} /> :
                 task.type === 'rom_validation' ? <ShieldCheck size={16} className="animate-pulse" /> :
                 task.type.includes('compression') ? <Cpu size={16} className="animate-pulse" /> : 
                 <Download size={16} className={task.status === 'downloading' ? 'animate-bounce' : ''} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-xs font-bold text-white truncate uppercase tracking-wider">{task.name}</h4>
                  <span className="text-[10px] font-bold text-zinc-500">{task.progress}%</span>
                </div>
                
                <p className={`text-[10px] truncate mb-2 ${task.message.includes('BAD DUMP') ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>
                  {task.message}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="px-1.5 py-0.5 rounded-sm bg-zinc-800 text-[8px] font-black uppercase text-zinc-500 tracking-tighter">
                        {task.type.replace('_', ' ')}
                    </div>
                  </div>

                  {task.message.includes('BAD DUMP') && (
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => handleRetry(task)}
                         className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                         title="Redownload"
                       >
                         <RefreshCw size={10} />
                       </button>
                       <button 
                         onClick={() => handleSearchAlternatives(task.name)}
                         className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                         title="Search Alternatives"
                       >
                         <Search size={10} />
                       </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
