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
        { id: 'dolphin', name: 'Dolphin', defaultVer: '5.0-19342', caps: ['Wii/GC Native', 'UHD Rendering'] },
        { id: 'ppsspp', name: 'PPSSPP', defaultVer: '1.16.6', caps: ['PSP Pro Rendering'] },
        { id: 'duckstation', name: 'DuckStation', defaultVer: '0.1-5991', caps: ['PS1 Overclock', 'PGXP'] }
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
      <div className="flex flex-col h-full bg-m3-surface rounded-[32px] overflow-hidden border border-m3-outline/10">
        <div className="bg-m3-surface-variant/30 p-2 flex items-center justify-between border-b border-m3-outline/10">
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setConfiguringEmu(null)}
                className="p-3 hover:bg-m3-surface-variant rounded-full text-m3-on-surface transition-all"
              >
                 <ChevronLeft size={20} />
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-m3-on-surface-variant">Global Engine Settings</span>
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
    <div className="flex flex-col h-full bg-m3-surface-variant/20 backdrop-blur-3xl rounded-[32px] border border-m3-outline/10 overflow-hidden">
      <header className="p-6 border-b border-m3-outline/10 flex items-center justify-between bg-m3-primary/5">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
               <Cpu size={20} />
            </div>
            <div>
               <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Core Engines</h3>
               <p className="text-[10px] font-black text-m3-outline uppercase tracking-widest italic">Consolidated Configuration Library</p>
            </div>
         </div>
         <button 
           onClick={scanEmulators}
           disabled={isLoading}
           className="p-3 text-m3-outline hover:text-white hover:bg-white/10 rounded-full transition-all"
         >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
         </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
         {emulators.map((emu) => (
            <motion.div 
               key={emu.id}
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               className="group relative rounded-[24px] bg-m3-surface/40 border border-m3-outline/10 p-5 hover:border-m3-primary/50 transition-all cursor-default"
            >
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${emu.status === 'installed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-m3-outline/10 text-m3-outline'}`}>
                        {emu.status === 'installed' ? <CheckCircle2 size={24} /> : <Terminal size={24} />}
                     </div>
                     <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tighter">{emu.name}</h4>
                        <div className="flex items-center gap-2">
                           <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${emu.status === 'installed' ? 'bg-emerald-500/20 text-emerald-400' : emu.status === 'configuring' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-m3-error/20 text-m3-error'}`}>
                              {emu.status}
                           </span>
                           <span className="text-[9px] font-black text-m3-outline/60 uppercase">v{emu.version}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     {emu.status === 'missing' && (
                        <button 
                          onClick={() => handleBootstrap(emu.id)}
                          className="m3-button-filled px-4 py-2 text-[10px] gap-2"
                        >
                           <Download size={14} /> Bootstrap
                        </button>
                     )}
                     {emu.status === 'installed' && (
                        <button 
                          onClick={() => setConfiguringEmu(emu.id)}
                          className="p-3 text-m3-outline hover:text-white bg-white/5 rounded-xl transition-all"
                        >
                           <Settings size={16} />
                        </button>
                     )}
                     {emu.status === 'configuring' && (
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl animate-pulse">
                           <Loader2 size={16} className="animate-spin" />
                        </div>
                     )}
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-2">
                  {emu.capabilities.map((cap, i) => (
                     <div key={i} className="px-2 py-1 bg-black/20 rounded-lg border border-white/5 text-[8px] font-black text-m3-outline uppercase text-center truncate">
                        {cap}
                     </div>
                  ))}
               </div>

               {emu.status === 'installed' && (
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <ShieldCheck size={12} className="text-emerald-400" />
                        <span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest">Signed & Verified</span>
                     </div>
                     <span className="text-[8px] font-black text-m3-outline uppercase">/database/emulators/{emu.id}</span>
                  </div>
               )}
            </motion.div>
         ))}
      </div>

      <footer className="p-4 bg-m3-surface-variant/30 border-t border-m3-outline/10 text-center">
         <p className="text-[8px] font-black text-m3-outline uppercase tracking-[0.3em]">Neural Core Engine v9.4.0</p>
      </footer>
    </div>
  );
};
