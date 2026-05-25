import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Loader2, Maximize2, Settings, Zap, Terminal, Cpu, RotateCcw, Cloud } from 'lucide-react';
import { Game } from '../data/games';
import { audioEngine } from '../services/audioEngine';
import { CrtOverlay } from './CrtOverlay';
import { SaveStatePanel, captureCanvasToDataURL } from './os/SaveStatePanel';
import { EmulatorManager } from './os/EmulatorManager';
import { SHADER_LIBRARY } from './ui/EmulatorShaderManager';

interface EmulatorOverlayProps {
  game: Game | null;
  onClose: () => void;
}

export const EmulatorOverlay: React.FC<EmulatorOverlayProps> = ({ game, onClose }) => {
  const [bootStage, setBootStage] = useState<'init' | 'loading' | 'active'>('init');
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isStatesOpen, setIsStatesOpen] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'states' | 'emulators'>('states');
  const [activeShaderId, setActiveShaderId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fliperos_active_shader') || 'crt-royale';
    }
    return 'crt-royale';
  });
  const [showShaderHud, setShowShaderHud] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fliperos_show_shader_hud');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });
  const [hudOpacity, setHudOpacity] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fliperos_hud_opacity');
      return stored !== null ? parseFloat(stored) : 1;
    }
    return 1;
  });

  useEffect(() => {
    localStorage.setItem('fliperos_active_shader', activeShaderId);
  }, [activeShaderId]);

  useEffect(() => {
    localStorage.setItem('fliperos_show_shader_hud', showShaderHud.toString());
  }, [showShaderHud]);

  useEffect(() => {
    localStorage.setItem('fliperos_hud_opacity', hudOpacity.toString());
  }, [hudOpacity]);

  const activeShader = SHADER_LIBRARY.find(s => s.id === activeShaderId) || SHADER_LIBRARY[0];

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

  const [isSyncActive, setIsSyncActive] = useState(true);

  useEffect(() => {
    const fetchSync = async () => {
      try {
        const res = await fetch('/api/system/config/sync');
        const data = await res.json();
        setIsSyncActive(!!data.enabled);
      } catch (e) { /* silent */ }
    };
    fetchSync();
    const interval = setInterval(fetchSync, 10000);
    return () => clearInterval(interval);
  }, []);

  const isCapturingRef = React.useRef(false);

  const handleCapture = useCallback(async (previewUrl?: string) => {
    if (!game || isCapturingRef.current) return;
    isCapturingRef.current = true;
    try {
      const finalPreviewUrl = previewUrl || await captureCanvasToDataURL();
      await fetch('/api/system/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, type: 'state', previewUrl: finalPreviewUrl })
      });
      audioEngine.play('click');
    } catch (e) { console.error("Save Error", e); }
    setTimeout(() => { isCapturingRef.current = false; }, 1000); // 1s cooldown
  }, [game]);

  const handleRestore = useCallback(async (stateId: string) => {
    if (!game) return;
    try {
      await fetch('/api/system/files/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, stateId })
      });
      setIsStatesOpen(false);
      audioEngine.play('launch');
    } catch (e) { console.error("Restore Error", e); }
  }, [game]);

  const handleDelete = useCallback(async (stateId: string) => {
    try {
      await fetch(`/api/system/files?path=states/${game?.id}/${stateId}`, {
        method: 'DELETE'
      });
    } catch (e) { console.error("Delete Error", e); }
  }, [game]);

  useEffect(() => {
    if (!game) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isStatesOpen) setIsStatesOpen(false);
        else onClose();
      }
      if (e.key === 'F2') handleCapture();
      if (e.key === 'F4') handleRestore('quick');
      if (e.key === 'F5') setIsStatesOpen(prev => !prev);
    };

    const pollGamepad = () => {
       const gamepads = navigator.getGamepads();
       for (const gp of gamepads) {
          if (!gp) continue;
          // L3: 10, R3: 11
          if (gp.buttons[10].pressed) handleRestore('quick');
          if (gp.buttons[11].pressed) handleCapture();
       }
    };

    const gamepadInterval = setInterval(pollGamepad, 100);

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(gamepadInterval);
    };
  }, [game, onClose, isStatesOpen, handleCapture, handleRestore]);

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
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex items-center gap-2 px-3 py-1 bg-zinc-900/50 rounded-full border border-white/5 text-[10px] font-mono"
            >
               <Cloud size={10} className={isSyncActive ? "text-indigo-400" : "text-zinc-600"} />
               <span className="text-zinc-500 uppercase tracking-tighter">Sync:</span>
               <span className={isSyncActive ? "text-indigo-400" : "text-zinc-600"}>{isSyncActive ? 'Active' : 'Offline'}</span>
            </motion.div>
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
      <div className="flex-1 relative flex items-center justify-center bg-[#050505] overflow-hidden">
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
               <div className="flex w-full h-full items-center justify-center p-12 gap-8 relative">
                <motion.div 
                  key="active"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`emulator-viewport relative h-full transition-all duration-500 overflow-hidden flex items-center justify-center group bg-[#0A080C] shadow-m3-elevation-5 rounded-[32px] border border-m3-outline/10 ${isStatesOpen ? 'w-2/3' : 'w-full max-w-6xl aspect-[4/3]'}`}
                >
                    {/* Shader HUD Overlay */}
                    <AnimatePresence mode="wait">
                      {showShaderHud && (
                        <motion.div 
                          key={`hud-${activeShader.id}`}
                          initial={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                          transition={{ type: 'spring', damping: 25, stiffness: 250, duration: 0.4 }}
                          className="absolute top-6 left-6 z-40 pointer-events-none"
                          style={{ opacity: hudOpacity }}
                        >
                           <div 
                             className="bg-m3-surface-variant/90 backdrop-blur-3xl border border-m3-outline-variant/40 rounded-[28px] p-5 flex items-center gap-5 shadow-m3-elevation-4 transition-all duration-500"
                           >
                              <div 
                                className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 bg-m3-primary/10 text-m3-primary border-m3-primary/20 shadow-inner"
                              >
                                 <Zap size={24} className="animate-pulse" />
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-m3-on-surface-variant/70">Active Pipeline</span>
                                 <span className="text-base font-black uppercase tracking-tight text-m3-on-surface">{activeShader.name}</span>
                                 <div className="flex items-center gap-3 mt-1">
                                    <span className={`w-2 h-2 rounded-full transition-colors duration-500 shadow-sm ${
                                      activeShader.complexity === 'High' ? 'bg-m3-error shadow-m3-error/50' : 
                                      activeShader.complexity === 'Med' ? 'bg-orange-400 shadow-orange-400/50' : 'bg-emerald-400 shadow-emerald-400/50'
                                    }`} />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-m3-on-surface-variant/60">{activeShader.complexity} Load Architecture</span>
                                 </div>
                              </div>
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Emulator Content Mockup */}
                    <img src={game.coverArt} alt="emulator-viewport" className={`w-full h-full object-cover blur-2xl opacity-20 ${activeShader.previewClass}`} />
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                       <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                          <Zap size={32} className="text-indigo-400 animate-pulse" />
                       </div>
                       <div className="text-center px-6">
                          <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-[0.2em] mb-2">{game.title}</h2>
                          <p className="text-zinc-500 font-mono text-[10px] md:text-xs tracking-widest uppercase">Engine Live - Controller Connected</p>
                       </div>
                    </div>

                    {/* UI Controls Overlay */}
                    <div className="absolute bottom-10 left-10 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all z-50">
                       <div className="flex gap-4">
                          <button 
                             onClick={() => {
                               setActiveSideTab('emulators');
                               setIsStatesOpen(true);
                             }}
                             className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold hover:bg-black/90 transition-all uppercase tracking-widest text-white"
                          >
                             <Settings size={14} /> Options
                          </button>
                          <button 
                            onClick={() => setIsStatesOpen(!isStatesOpen)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-widest ${isStatesOpen ? 'bg-m3-primary text-m3-on-primary border-transparent' : 'bg-black/60 backdrop-blur-md border-white/10 hover:bg-black/90 text-white'}`}
                          >
                             <RotateCcw size={14} /> Snapshots
                          </button>
                       </div>
                    </div>
                </motion.div>

                <AnimatePresence>
                   {isStatesOpen && (
                     <motion.div 
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="w-1/3 h-full max-w-md flex flex-col gap-4"
                     >
                        <div className="flex bg-zinc-900/50 rounded-2xl p-1 border border-white/5">
                           <button 
                             onClick={() => setActiveSideTab('states')}
                             className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSideTab === 'states' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                           >
                            Snapshots
                           </button>
                           <button 
                             onClick={() => setActiveSideTab('emulators')}
                             className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSideTab === 'emulators' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                           >
                            Engines
                           </button>
                        </div>
                        {activeSideTab === 'states' ? (
                          <SaveStatePanel 
                            gameId={game.id}
                            onCapture={handleCapture}
                            onRestore={handleRestore}
                            onDelete={handleDelete}
                          />
                        ) : (
                          <EmulatorManager 
                            activeShader={activeShaderId}
                            onShaderChange={setActiveShaderId}
                            showShaderHud={showShaderHud}
                            onToggleHud={() => setShowShaderHud(!showShaderHud)}
                            hudOpacity={hudOpacity}
                            onHudOpacityChange={setHudOpacity}
                          />
                        )}
                     </motion.div>
                   )}
                </AnimatePresence>
               </div>
            )}
         </AnimatePresence>
      </div>

      {/* Controller Mapping Info Bar */}
      <div className="h-10 bg-black border-t border-white/5 flex items-center justify-center gap-8 text-[10px] font-bold text-zinc-600 uppercase tracking-widest z-50">
         <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[7px]">F2 / L3</span> Save
         </div>
         <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[7px]">F4 / R3</span> Quick Restore
         </div>
         <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[7px]">F5</span> Snapshots
         </div>
         <div className="hidden md:flex items-center gap-2">
            <span className="px-2 py-1 bg-zinc-800 text-white rounded text-[7px] leading-none">ESC</span> Exit
         </div>
      </div>
    </motion.div>
  );
};

