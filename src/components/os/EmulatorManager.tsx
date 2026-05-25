import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Terminal, ShieldCheck, Download, Settings, RefreshCw, Layers, CheckCircle2, AlertCircle, Loader2, ChevronLeft } from 'lucide-react';
import { EmulatorShaderManager } from '../ui/EmulatorShaderManager';

interface Emulator {
  id: string;
  name: string;
  version: string;
  status: 'installed' | 'missing' | 'configuring';
  configPath?: string;
  capabilities: string[];
}

interface EmulatorManagerProps {
  activeShader: string;
  onShaderChange: (shader: string) => void;
  showShaderHud: boolean;
  onToggleHud: () => void;
  hudOpacity: number;
  onHudOpacityChange: (opacity: number) => void;
}

export const EmulatorManager: React.FC<EmulatorManagerProps> = ({ 
  activeShader, 
  onShaderChange,
  showShaderHud,
  onToggleHud,
  hudOpacity,
  onHudOpacityChange
}) => {
  const [emulators, setEmulators] = useState<Emulator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [configuringEmu, setConfiguringEmu] = useState<string | null>(null);

  const scanEmulators = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/system/files?path=emulators');
      const data = await res.json();
      
      const known = [
        { id: 'retroarch', name: 'RetroArch', defaultVer: '1.16.0', caps: ['Multi-Core', 'Shaders', 'Netplay'] },
        { id: 'pcsx2', name: 'PCSX2', defaultVer: '1.7.0', caps: ['PS2 Hardware Accel', 'High-Res'] },
        { id: 'dolphin', name: 'Dolphin', defaultVer: '5.0-19342', caps: ['WII/GC ENGINE', 'UHD RENDER'] },
        { id: 'ppsspp', name: 'PPSSPP', defaultVer: '1.16.6', caps: ['PSP PRO CORE'] },
        { id: 'duckstation', name: 'DuckStation', defaultVer: '0.1-5991', caps: ['PS1 OVERCLOCK'] }
      ];

      const scanned: Emulator[] = known.map(k => {
        const found = data.files?.find((f: any) => f.name.toLowerCase().includes(k.id));
        return {
          id: k.id,
          name: k.name,
          version: k.defaultVer,
          status: found ? 'installed' : 'missing',
          capabilities: k.caps
        };
      });

      setEmulators(scanned);
    } catch (e) {
      console.error("Scan failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scanEmulators();
  }, []);

  const handleBootstrap = async (emuId: string) => {
    setEmulators(prev => prev.map(e => e.id === emuId ? { ...e, status: 'configuring' } : e));
    try {
       await fetch('/api/system/setup/bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: emuId })
       });
       setTimeout(scanEmulators, 2000);
    } catch (e) {
       scanEmulators();
    }
  };

  if (configuringEmu === 'retroarch') {
    return (
      <div className="flex flex-col h-full bg-m3-surface-container rounded-[40px] overflow-hidden border border-m3-outline/10 shadow-m3-elevation-3">
        <div className="bg-m3-surface-container-high/60 backdrop-blur-md p-3 flex items-center justify-between border-b border-m3-outline/10">
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setConfiguringEmu(null)}
                className="w-12 h-12 hover:bg-m3-surface-variant flex items-center justify-center rounded-full text-m3-on-surface transition-all"
              >
                 <ChevronLeft size={22} />
              </button>
              <div>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-m3-primary italic leading-none">Global Matrix</span>
                 <p className="text-[9px] font-bold text-m3-on-surface-variant uppercase tracking-widest leading-none">Core Pipeline Settings</p>
              </div>
           </div>
        </div>

        {/* M3 Shader HUD Section */}
        <section className="px-6 py-6 border-b border-m3-outline/10 space-y-6">
           <div className="flex items-center justify-between">
              <div>
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-m3-primary italic">Shader HUD Architecture</h4>
                 <p className="text-[9px] font-black text-m3-on-surface-variant uppercase tracking-widest">Real-time Telemetry Visualization</p>
              </div>
              <div className="flex items-center gap-3">
                 <span className="text-[9px] font-black uppercase text-m3-on-surface-variant tracking-widest">{showShaderHud ? 'ENABLED' : 'DISABLED'}</span>
                 <button 
                   onClick={onToggleHud}
                   className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${showShaderHud ? 'bg-m3-primary shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]' : 'bg-m3-outline/20'}`}
                 >
                    <motion.div 
                      layout
                      initial={false}
                      animate={{ 
                        x: showShaderHud ? 26 : 4,
                        scale: showShaderHud ? 1 : 0.8
                      }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md z-10"
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none opacity-20">
                       <div className="w-1 h-1 rounded-full bg-white" />
                       <div className="w-1 h-1 rounded-full bg-white" />
                    </div>
                 </button>
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Layers size={14} className="text-m3-primary opacity-50" />
                    <label className="text-[9px] font-black uppercase text-m3-on-surface-variant tracking-widest italic leading-none">Inference Opacity</label>
                 </div>
                 <span className="text-[11px] font-mono text-m3-primary font-black bg-m3-primary/10 px-2 py-0.5 rounded italic">
                    {Math.round(hudOpacity * 100)}%
                 </span>
              </div>
              
              <div className="relative group px-1 flex items-center h-8">
                 <div className="absolute left-1 right-1 h-1.5 bg-m3-outline/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-m3-primary"
                      style={{ width: `${hudOpacity * 100}%` }}
                    />
                 </div>
                 <input 
                   type="range"
                   min="0.05"
                   max="1.0"
                   step="0.01"
                   value={hudOpacity}
                   onChange={(e) => onHudOpacityChange(parseFloat(e.target.value))}
                   className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                 />
                 <motion.div 
                    className="absolute w-5 h-5 bg-white rounded-full shadow-m3-elevation-2 border-2 border-m3-primary z-10 pointer-events-none"
                    animate={{ left: `calc(${hudOpacity * 100}% - 10px)` }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                 />
              </div>
              <div className="flex justify-between px-1">
                 <span className="text-[7px] font-black text-m3-on-surface-variant/40 uppercase tracking-widest">Minimal</span>
                 <span className="text-[7px] font-black text-m3-on-surface-variant/40 uppercase tracking-widest">Spectral</span>
                 <span className="text-[7px] font-black text-m3-on-primary/60 uppercase tracking-widest bg-m3-primary px-2 rounded-full">Absolute</span>
              </div>
           </div>
        </section>

        <div className="flex-1 overflow-hidden">
           <EmulatorShaderManager 
             currentShaderId={activeShader} 
             onShaderChange={onShaderChange}
           />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-m3-surface-container-low backdrop-blur-3xl rounded-[40px] border border-m3-outline/10 overflow-hidden shadow-m3-elevation-2">
      <header className="p-8 border-b border-m3-outline/10 flex items-center justify-between bg-m3-primary/5">
        <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-m3-primary/10 text-m3-primary rounded-[22px] flex items-center justify-center border border-m3-primary/20 shadow-inner group">
               <Cpu size={26} className="group-hover:scale-110 transition-transform" />
            </div>
            <div>
               <h3 className="text-xl font-display font-bold text-m3-on-surface tracking-tight">Core Engines</h3>
               <p className="text-[10px] font-black text-m3-primary uppercase tracking-[0.3em] italic">V9 Industrial Infrastructure</p>
            </div>
         </div>
         <button 
           onClick={scanEmulators}
           disabled={isLoading}
           className="w-12 h-12 flex items-center justify-center text-m3-outline hover:text-m3-primary hover:bg-m3-primary/10 rounded-full transition-all border border-transparent hover:border-m3-primary/20 disabled:opacity-50"
         >
            <RefreshCw size={22} className={isLoading ? 'animate-spin' : ''} />
         </button>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
         {emulators.map((emu) => (
            <motion.div 
               key={emu.id}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="group relative rounded-[32px] bg-m3-surface-container-high border border-m3-outline/10 p-6 hover:border-m3-primary/40 transition-all duration-300 shadow-sm hover:shadow-m3-elevation-2 cursor-pointer"
            >
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-5">
                     <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center transition-all ${emu.status === 'installed' ? 'bg-m3-primary/10 text-m3-primary' : 'bg-m3-outline/10 text-m3-outline'}`}>
                        {emu.status === 'installed' ? <CheckCircle2 size={32} /> : <Terminal size={32} />}
                     </div>
                     <div>
                        <h4 className="text-lg font-black text-m3-on-surface uppercase tracking-tighter leading-none mb-1">{emu.name}</h4>
                        <div className="flex items-center gap-3">
                           <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${emu.status === 'installed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : emu.status === 'configuring' ? 'bg-m3-primary/10 text-m3-primary border border-m3-primary/30' : 'bg-m3-error/10 text-m3-error border border-m3-error/20'}`}>
                              {emu.status}
                           </span>
                           <span className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-widest whitespace-nowrap">Engine v{emu.version}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     {emu.status === 'missing' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleBootstrap(emu.id); }}
                          className="m3-button-filled h-12 px-6 text-[10px] uppercase tracking-[0.2em] font-black gap-2 shadow-m3-elevation-2"
                        >
                           <Download size={18} /> INSTALL CORE
                        </button>
                     )}
                     {emu.status === 'installed' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setConfiguringEmu(emu.id); }}
                          className="w-12 h-12 flex items-center justify-center text-m3-outline hover:text-m3-primary bg-m3-surface-variant/20 rounded-[18px] transition-all border border-m3-outline/10 hover:border-m3-primary/30"
                        >
                           <Settings size={20} />
                        </button>
                     )}
                     {emu.status === 'configuring' && (
                        <div className="w-12 h-12 flex items-center justify-center bg-m3-primary/10 text-m3-primary rounded-[18px] animate-pulse">
                           <Loader2 size={20} className="animate-spin" />
                        </div>
                     )}
                  </div>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {emu.capabilities.map((cap, i) => (
                     <div key={i} className="px-3 py-2 bg-m3-surface-container/50 rounded-xl border border-m3-outline/5 text-[9px] font-black text-m3-on-surface-variant uppercase text-center tracking-widest truncate">
                        {cap}
                     </div>
                  ))}
               </div>

               {emu.status === 'installed' && (
                  <div className="mt-6 pt-5 border-t border-m3-outline/10 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <span className="text-[9px] font-black text-emerald-400 opacity-60 uppercase tracking-[0.2em] italic">Native Isolation Verified</span>
                     </div>
                     <span className="text-[9px] font-mono text-m3-outline uppercase tracking-widest bg-m3-surface-variant/20 px-2 py-0.5 rounded italic">fliper://core/{emu.id}</span>
                  </div>
               )}
            </motion.div>
         ))}
      </div>

      <footer className="p-6 bg-m3-surface-container-high border-t border-m3-outline/10 text-center">
         <p className="text-[9px] font-black text-m3-on-surface-variant/40 uppercase tracking-[0.4em] italic">Neural Core Engine Infrastructure v9.4.0</p>
      </footer>
    </div>
  );
};
