import React, { useState, useEffect } from 'react';
import { DesktopMode } from './components/DesktopMode';
import { FliperMode } from './components/FliperMode';
import { games } from './data/games';
import { AnimatePresence, motion } from 'motion/react';
import { Terminal } from 'lucide-react';
import { TelemetryWidget } from './components/TelemetryWidget';
import { TaskMonitor } from './components/ui/TaskMonitor';

type AppMode = 'boot' | 'desktop' | 'fliper';

export default function App() {
  const [mode, setMode] = useState<AppMode>('boot');
  const [cocktailMode, setCocktailMode] = useState(false);
  const [gamesList, setGamesList] = useState(games);

  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [bootProgress, setBootProgress] = useState(0);

  useEffect(() => {
    if (mode === 'boot') {
      const logs = [
        "Fliper kernel initializing...",
        "CPU: Zen 4 Architecture detected",
        "VRAM: 24GB GDDR6X optimized for LLM",
        "Mounting /dev/nvme0n1p3 as arcade root",
        "Loading LaunchBox Bridge v4.2...",
        "Checking backend availability...",
        "FliperOS Shell starting..."
      ];
      
      let currentIdx = 0;
      const interval = setInterval(() => {
        if (currentIdx < logs.length) {
          setBootLogs(prev => [...prev, logs[currentIdx]]);
          setBootProgress(Math.min(100, Math.floor((currentIdx / logs.length) * 100)));
          currentIdx++;
        } else {
          clearInterval(interval);
          checkHealthAndBoot();
        }
      }, 400);

      const checkHealthAndBoot = async () => {
        try {
          const res = await fetch('/api/health');
          if (res.ok) {
            setTimeout(() => setMode('fliper'), 800);
          } else {
            setBootLogs(prev => [...prev, "[ ERROR ] Backend unresponsive. Retrying..."]);
            setTimeout(checkHealthAndBoot, 2000);
          }
        } catch (e) {
          setBootLogs(prev => [...prev, "[ FAIL ] Network connection failure."]);
          setTimeout(checkHealthAndBoot, 5000);
        }
      };

      return () => clearInterval(interval);
    }
  }, [mode]);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setCocktailMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  return (
    <div className={`w-full h-screen bg-[#050505] overflow-hidden font-sans transition-all duration-1000 ${cocktailMode ? 'rotate-180' : ''}`}>
      <div className="absolute inset-0 arcade-grid pointer-events-none opacity-20" />
      <div className="absolute inset-0 kernel-gradient pointer-events-none" />
      <div className="scanline absolute inset-0 opacity-10" />

      <AnimatePresence mode="wait">
        {mode === 'boot' ? (
           <motion.div
              key="boot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full flex flex-col items-center justify-center p-8 font-mono text-xs text-zinc-400 z-50 relative"
           >
              <div className="max-w-md w-full glass-panel p-8 glow-emerald rounded-2xl">
                <div className="flex items-center gap-3 mb-6 text-emerald-500 font-display font-bold tracking-widest uppercase">
                   <Terminal size={18} className="animate-pulse" />
                   <span>FliperOS Unified Desktop</span>
                </div>
                
                <div className="space-y-1.5 h-48 overflow-hidden mb-6 flex flex-col justify-end">
                   {bootLogs.map((log, i) => (
                     <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }}
                        className={(log && typeof log === 'string' && log.startsWith('[')) ? 'text-rose-400' : ''}
                      >
                       <span className="text-zinc-600 mr-2">{'>'}</span>{log}
                     </motion.div>
                   ))}
                </div>

                <div className="relative w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                   <motion.div 
                      className="absolute top-0 left-0 h-full bg-emerald-500" 
                      initial={{ width: 0 }}
                      animate={{ width: `${bootProgress}%` }}
                   />
                </div>
                <div className="flex justify-between items-center mt-3 text-[10px] text-zinc-500 font-bold tracking-widest uppercase">
                   <span>Kernel v6.8.zen1</span>
                   <span>{bootProgress}%</span>
                </div>
              </div>
              
              <div className="mt-12 flex items-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                 <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-black tracking-widest uppercase">Powered by</span>
                    <div className="text-sm font-display font-bold">FLIPEROS ARCH</div>
                 </div>
              </div>
           </motion.div>
        ) : mode === 'desktop' ? (
          <motion.div
            key="desktop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            <DesktopMode games={gamesList} onGamesUpdate={setGamesList} onSwitchMode={() => setMode('fliper')} />
          </motion.div>
        ) : (
          <motion.div
            key="fliper"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full h-full"
          >
            <FliperMode games={gamesList} onGamesUpdate={setGamesList} onExit={() => setMode('desktop')} />
          </motion.div>
        )}
      </AnimatePresence>
      <TelemetryWidget />
      <TaskMonitor />
    </div>
  );
}
