import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Cpu, HardDrive, Monitor, Gamepad2, Wrench, FolderOpen, Zap, Bell, Shield, Save, Globe, RefreshCcw, Settings } from 'lucide-react';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inWindowMode?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, inWindowMode }) => {
  const { language, setLanguage, t } = useLanguage();
  const { settings, updateSetting } = useSystemSettings();
  const [activeTab, setActiveTab] = useState('performance');
  
  const [lbPath, setLbPath] = useState(() => localStorage.getItem('fliper_lb_path') || 'C:\\LaunchBox');
  const [perfMode, setPerfMode] = useState(() => localStorage.getItem('fliper_perf_mode') || 'ultra');
  
  // Advanced Core Configuration State
  const [cores, setCores] = useState<Record<string, string>>(() => ({
    psx: localStorage.getItem('fliper_core_psx') || 'duckstation',
    ps2: localStorage.getItem('fliper_core_ps2') || 'pcsx2',
    arcade: localStorage.getItem('fliper_core_arcade') || 'mame',
    snes: localStorage.getItem('fliper_core_snes') || 'snes9x'
  }));

  useEffect(() => {
    localStorage.setItem('fliper_lb_path', lbPath);
    localStorage.setItem('fliper_perf_mode', perfMode);
    Object.entries(cores).forEach(([key, val]) => {
      localStorage.setItem(`fliper_core_${key}`, val as string);
    });
  }, [lbPath, perfMode, cores]);

  if (!isOpen && !inWindowMode) return null;

  const content = (
    <div className={`flex flex-col md:flex-row h-full bg-m3-surface text-m3-on-surface ${inWindowMode ? '' : 'rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden border border-m3-outline/10 max-w-5xl w-full relative'}`}>
      
      {/* Sidebar Navigation */}
      <div className="w-80 bg-m3-surface-variant/20 border-r border-m3-outline/10 flex flex-col z-10 shrink-0">
        <div className="p-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[16px] bg-m3-primary flex items-center justify-center shadow-lg">
               <Settings size={24} className="text-m3-on-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black text-m3-on-surface tracking-widest uppercase">System</h1>
              <p className="text-[10px] font-black text-m3-primary tracking-[0.2em] uppercase">V9 Console</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2 no-scrollbar">
          {[
            { id: 'performance', label: 'Performance', icon: Cpu, color: 'text-emerald-500' },
            { id: 'emulators', label: 'Emulators', icon: Gamepad2, color: 'text-m3-primary' },
            { id: 'video', label: 'Visual Engine', icon: Monitor, color: 'text-amber-500' },
            { id: 'input', label: 'Input Subsystem', icon: Zap, color: 'text-cyan-500' },
            { id: 'paths', label: 'Storage Nodes', icon: FolderOpen, color: 'text-m3-tertiary' },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`m3-navigation-item w-full ${activeTab === tab.id ? 'active' : ''}`}
            >
              <div className="flex items-center gap-4">
                <tab.icon size={20} className={tab.color} />
                <span className="text-sm font-black tracking-tight uppercase">{tab.label}</span>
              </div>
              {activeTab === tab.id && <ChevronRight size={16} className="text-m3-on-surface" />}
            </button>
          ))}
        </div>

        {!inWindowMode && (
          <div className="p-8 border-t border-m3-outline/10">
             <button onClick={onClose} className="m3-button-filled w-full py-4 text-xs tracking-widest">
                <Save size={16} /> Apply Changes
             </button>
          </div>
        )}
      </div>

      {/* Settings Grid Rendering */}
      <div className="flex-1 overflow-y-auto p-12 no-scrollbar">
         <motion.div 
           key={activeTab}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="space-y-12 max-w-3xl"
         >
            {activeTab === 'performance' && (
              <>
                 <section className="space-y-6">
                    <h3 className="text-sm font-black text-m3-outline uppercase tracking-[0.3em]">Runtime Localization</h3>
                    <div className="grid grid-cols-2 gap-4">
                       {[
                         { id: 'en', label: 'English (US)', flag: '🇺🇸' },
                         { id: 'pt-br', label: 'Português (BR)', flag: '🇧🇷' }
                       ].map(l => (
                         <button 
                           key={l.id} 
                           onClick={() => setLanguage(l.id as any)}
                           className={`m3-card !rounded-[24px] !p-5 transition-all text-left flex items-center justify-between ${language === l.id ? '!border-m3-primary !bg-m3-primary/10' : '!border-m3-outline/10 hover:!bg-m3-surface-variant/40'}`}
                         >
                            <span className="text-sm font-black uppercase tracking-tight text-m3-on-surface">{l.label}</span>
                            <span className="text-xl">{l.flag}</span>
                         </button>
                       ))}
                    </div>
                 </section>

                 <section className="space-y-6">
                    <h3 className="text-sm font-black text-m3-outline uppercase tracking-[0.3em]">Compute Priority</h3>
                    <div className="space-y-4">
                       {[
                         { id: 'ultra', label: 'Industrial Ultra', desc: 'Vulkan 1.3 / BGFX / 4K Upscale', color: 'bg-emerald-500' },
                         { id: 'lite', label: 'Embedded Lite', desc: 'SDL2 / ARMv7 / Zero-Lag', color: 'bg-m3-primary' }
                       ].map(mode => (
                         <button 
                            key={mode.id}
                            onClick={() => setPerfMode(mode.id)}
                            className={`m3-card w-full !p-6 text-left !rounded-[32px] transition-all relative overflow-hidden ${perfMode === mode.id ? '!border-m3-primary !bg-m3-primary/5' : '!border-m3-outline/10 hover:!bg-m3-surface-variant/40'}`}
                         >
                            <div className="flex items-center gap-4">
                               <div className={`w-3 h-3 rounded-full ${mode.color}`} />
                               <div>
                                  <p className="text-lg font-black text-m3-on-surface uppercase tracking-tighter">{mode.label}</p>
                                  <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest mt-1">{mode.desc}</p>
                               </div>
                            </div>
                         </button>
                       ))}
                    </div>
                 </section>

                 <section className="m3-card !p-8 !rounded-[32px] !bg-m3-surface-variant/20 !border-m3-outline/10 flex items-center gap-6">
                    <RefreshCcw size={32} className="text-m3-primary animate-spin" />
                    <div>
                       <p className="text-sm font-black text-m3-on-surface uppercase">Neural Auto-Tuning Active</p>
                       <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest mt-1">Adjusting thermal envelopes in real-time</p>
                    </div>
                 </section>
              </>
            )}

            {activeTab === 'emulators' && (
               <div className="space-y-10">
                  <header>
                     <h3 className="text-4xl font-black text-m3-on-surface tracking-tighter uppercase mb-4">Core Mapping</h3>
                     <p className="text-m3-on-surface-variant font-medium text-lg leading-relaxed">Bind specific hardware nodes to production-grade emulator binary branches.</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {[
                       { id: 'psx', label: 'PlayStation 1', options: ['DuckStation', 'Beetle PSX', 'SwanStation'] },
                       { id: 'ps2', label: 'PlayStation 2', options: ['PCSX2 (Qt)', 'Play!'] },
                       { id: 'arcade', label: 'Arcade Cluster', options: ['MAME (Current)', 'FinalBurn Neo', 'TeknoParrot'] },
                       { id: 'snes', label: 'Super Nintendo', options: ['Snes9x', 'bsnes', 'Mesen-S'] }
                     ].map(sys => (
                        <div key={sys.id} className="space-y-3">
                           <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em] px-4">{sys.label}</label>
                           <select className="m3-input w-full !bg-m3-surface-variant/40 !border-m3-outline/10 !rounded-[20px] !px-6 !py-4 text-sm font-black text-m3-on-surface outline-none ring-2 ring-transparent focus:ring-m3-primary/30 appearance-none">
                              {sys.options.map(opt => <option key={opt}>{opt}</option>)}
                           </select>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {activeTab === 'paths' && (
               <div className="space-y-10">
                  <header>
                     <h3 className="text-4xl font-black text-m3-on-surface tracking-tighter uppercase mb-4">Storage Matrix</h3>
                     <p className="text-m3-on-surface-variant font-medium text-lg leading-relaxed">Mount external hardware volumes and configure library ingestion paths.</p>
                  </header>

                  <div className="space-y-8">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em] px-4">Primary Ingestion Path</label>
                        <div className="flex gap-4">
                           <input 
                              type="text" 
                              value={lbPath}
                              onChange={(e) => setLbPath(e.target.value)}
                              className="m3-input flex-1 !bg-m3-surface-variant/40 !rounded-full !px-8 !py-5 text-sm font-black"
                           />
                           <button className="m3-button-tonal px-8 rounded-full">Explore</button>
                        </div>
                     </div>

                     <div className="space-y-4 opacity-50 grayscale pointer-events-none">
                        <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em] px-4">Kernel Storage Target (/roms)</label>
                        <div className="m3-card !p-6 !rounded-[24px] !bg-m3-surface-variant/10 !border-m3-outline/10 font-black text-m3-on-surface flex items-center justify-between">
                           <span>MAPPED: /mnt/storage/internal</span>
                           <Globe size={20} className="text-m3-primary" />
                        </div>
                     </div>
                  </div>
               </div>
            )}
         </motion.div>
      </div>

      {inWindowMode && (
         <div className="absolute right-8 bottom-8 flex items-center gap-4">
            <span className="text-[10px] font-black text-m3-outline uppercase tracking-[0.2em]">Build Protocol: v9.4.0-Stable</span>
            <button onClick={onClose} className="m3-button-filled shadow-xl shadow-m3-primary/20">Finalize Sync</button>
         </div>
      )}
    </div>
  );
};

const ChevronRight = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
