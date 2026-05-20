import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Loader2, Maximize2, Settings, Zap, Terminal, Cpu } from 'lucide-react';
import { Game } from '../data/games';
import { audioEngine } from '../services/audioEngine';
import { CrtOverlay } from './CrtOverlay';

interface EmulatorOverlayProps {
  game: Game | null;
  onClose: () => void;
}

export const EmulatorOverlay: React.FC<EmulatorOverlayProps> = ({ game, onClose }) => {
  const [bootStage, setBootStage] = useState<'init' | 'loading' | 'active'>('init');
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (game) {
      audioEngine.play('launch');
      setBootStage('init');
      setBootLogs(["Initializing Kernel...", `Core: ${game.suggestedCore || 'mame'}`, "Mounting ROM segment...", "Checking BIOS integrity..."]);
      
      const timer = setTimeout(() => {
        setBootStage('loading');
        const interval = setInterval(() => {
          setProgress(p => {
             if (p >= 100) {
               clearInterval(interval);
               setTimeout(() => setBootStage('active'), 1000);
               return 100;
             }
             return p + 5;
          });
        }, 100);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [game]);

  useEffect(() => {
    if (!game) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game, onClose]);

  if (!game) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] bg-black overflow-hidden flex flex-col"
    >
      <CrtOverlay />
      
      {/* Emulator Header */}
      <div className="absolute top-0 w-full h-12 bg-black/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-50">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
               <Cpu size={16} className="text-indigo-400" />
            </div>
            <div>
               <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{game.platform} EMULATOR</h4>
               <p className="text-[10px] font-mono text-zinc-500">{game.title}</p>
            </div>
         </div>

         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900/50 rounded-full border border-white/5 text-[10px] font-mono text-emerald-400">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
               60.0 FPS
            </div>
            <button onClick={onClose} className="p-2 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg transition-all">
               <X size={18} />
            </button>
         </div>
      </div>

      {/* Main Screen Area */}
      <div className="flex-1 relative flex items-center justify-center bg-[#050505]">
         <AnimatePresence mode="wait">
            {bootStage !== 'active' ? (
               <motion.div 
                 key="boot"
                 initial={{ opacity: 1 }}
                 exit={{ opacity: 0, scale: 1.1 }}
                 className="max-w-xl w-full p-12 bg-zinc-950 border border-white/5 rounded-3xl shadow-2xl z-10 font-mono"
               >
                  <div className="flex items-center gap-4 mb-8">
                     <Terminal size={24} className="text-indigo-400" />
                     <h2 className="text-xl font-bold text-white tracking-tight">BOOTING SYSTEM...</h2>
                  </div>

                  <div className="space-y-2 mb-8 h-40 overflow-hidden flex flex-col justify-end">
                     {bootLogs.map((log, i) => (
                        <div key={i} className="text-xs text-zinc-500">
                           <span className="text-indigo-500 mr-2">{'>'}</span> {log}
                        </div>
                     ))}
                     {bootStage === 'loading' && (
                        <div className="text-xs text-emerald-400 animate-pulse">
                           <span className="text-indigo-500 mr-2">{'>'}</span> Loading Media Asset Data... {progress}%
                        </div>
                     )}
                  </div>

                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                     <motion.div 
                        className="h-full bg-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                     />
                  </div>
               </motion.div>
            ) : (
               <motion.div 
                 key="active"
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="relative w-full h-full max-w-6xl aspect-[4/3] bg-zinc-900 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center group"
               >
                  {/* Emulator Content Mockup - In a real app this would be a Canvas or Iframe for WASM */}
                  <img src={game.coverArt} alt={game.title} className="w-full h-full object-cover blur-2xl opacity-20" />
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                     <div className="w-24 h-24 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                        <Zap size={48} className="text-indigo-400 animate-pulse" />
                     </div>
                     <div className="text-center">
                        <h2 className="text-3xl font-black text-white uppercase tracking-[0.2em] mb-2">{game.title}</h2>
                        <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">Engine Live - Controller Connected</p>
                     </div>
                  </div>

                  {/* UI Controls Overlay for Real App Experience */}
                  <div className="absolute bottom-10 left-10 flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                     <button className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-xs font-bold hover:bg-black/90 transition-all">
                        <Settings size={14} /> CORE OPTIONS
                     </button>
                     <button className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-xs font-bold hover:bg-black/90 transition-all">
                        <Play size={14} /> SAVE STATE
                     </button>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Controller Mapping Info Bar */}
      <div className="h-10 bg-black border-t border-white/5 flex items-center justify-center gap-8 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
         <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[8px]">A</span> Confirm</div>
         <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[8px]">B</span> Back</div>
         <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[8px]">S</span> Settings</div>
      </div>
    </motion.div>
  );
};
