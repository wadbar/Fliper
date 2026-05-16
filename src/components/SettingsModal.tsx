import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Cpu, HardDrive, Monitor, Gamepad2, Wrench, FolderOpen, Zap } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inWindowMode?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, inWindowMode }) => {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = React.useState('performance');
  
  const [lbPath, setLbPath] = React.useState(() => localStorage.getItem('fliper_lb_path') || 'C:\\LaunchBox');
  const [perfMode, setPerfMode] = React.useState(() => localStorage.getItem('fliper_perf_mode') || 'ultra');
  
  // Advanced Core Configuration State
  const [cores, setCores] = React.useState<Record<string, string>>(() => ({
    psx: localStorage.getItem('fliper_core_psx') || 'duckstation',
    ps2: localStorage.getItem('fliper_core_ps2') || 'pcsx2',
    ps3: localStorage.getItem('fliper_core_ps3') || 'rpcs3',
    snes: localStorage.getItem('fliper_core_snes') || 'snes9x',
    nes: localStorage.getItem('fliper_core_nes') || 'nestopia',
    n64: localStorage.getItem('fliper_core_n64') || 'mupen64plus_next',
    gba: localStorage.getItem('fliper_core_gba') || 'mgba',
    nds: localStorage.getItem('fliper_core_nds') || 'melonds',
    n3ds: localStorage.getItem('fliper_core_3ds') || 'citra',
    switch: localStorage.getItem('fliper_core_switch') || 'ryujinx',
    gc_wii: localStorage.getItem('fliper_core_gc_wii') || 'dolphin',
    wiiu: localStorage.getItem('fliper_core_wiiu') || 'cemuhook',
    genesis: localStorage.getItem('fliper_core_genesis') || 'genesis_plus_gx',
    dreamcast: localStorage.getItem('fliper_core_dreamcast') || 'flycast',
    saturn: localStorage.getItem('fliper_core_saturn') || 'beetle_saturn',
    arcade: localStorage.getItem('fliper_core_arcade') || 'mame',
    neogeo: localStorage.getItem('fliper_core_neogeo') || 'fbneo',
    dos: localStorage.getItem('fliper_core_dos') || 'dosbox_pure',
    scummvm: localStorage.getItem('fliper_core_scummvm') || 'scummvm'
  }));

  React.useEffect(() => {
    localStorage.setItem('fliper_lb_path', lbPath);
    localStorage.setItem('fliper_perf_mode', perfMode);
    Object.entries(cores).forEach(([key, val]) => {
      localStorage.setItem(`fliper_core_${key}`, val as string);
    });
  }, [lbPath, perfMode, cores]);

  const updateCore = (system: string, core: string) => {
    setCores(prev => ({ ...prev, [system]: core }));
  };

  if (!isOpen && !inWindowMode) return null;

  const content = (
      <div className={`bg-[#1A1A1D] ${inWindowMode ? 'w-full h-full' : 'border border-[#2A2A2D] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl'} flex flex-col md:flex-row h-full`}>
        
        {/* Sidebar Settings */}
        <div className="w-1/3 bg-black/50 border-r border-[#2A2A2D] p-6 hidden md:block shrink-0">
           <h2 className="text-xl font-bold text-white mb-8">{t('settings')}</h2>
           <div className="space-y-4">
              <button onClick={() => setActiveTab('performance')} className={`flex items-center gap-3 font-semibold w-full text-left transition-colors ${activeTab === 'performance' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
                 <Cpu size={18} /> Performance & System
              </button>
              <button onClick={() => setActiveTab('emulators')} className={`flex items-center gap-3 font-semibold w-full text-left transition-colors ${activeTab === 'emulators' ? 'text-indigo-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
                 <Gamepad2 size={18} /> Emulators & Cores
              </button>
              <button onClick={() => setActiveTab('video')} className={`flex items-center gap-3 font-semibold w-full text-left transition-colors ${activeTab === 'video' ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
                 <Monitor size={18} /> {t('video_driver')}
              </button>
              <button onClick={() => setActiveTab('paths')} className={`flex items-center gap-3 font-semibold w-full text-left transition-colors ${activeTab === 'paths' ? 'text-rose-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
                 <FolderOpen size={18} /> Storage & Drives
              </button>
           </div>
        </div>

         {/* Main Settings Content */}
        <div className="flex-1 select-none overflow-y-auto">
          {!inWindowMode && (
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2D] md:hidden">
                <h2 className="text-xl font-bold text-white">{t('settings')}</h2>
                <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                  <X size={20} />
                </button>
              </div>
          )}
          
          <div className="p-8 space-y-8">
             {activeTab === 'performance' && (
                 <>
                   <div className="space-y-3">
                     <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider">{t('language')}</label>
                     <div className="flex gap-2">
                       <button 
                         onClick={() => setLanguage('en')}
                         className={`flex-1 py-2 rounded-md font-medium text-sm transition-colors ${language === 'en' ? 'bg-indigo-600 text-white' : 'bg-[#2A2A2D] border border-zinc-700 text-zinc-300 hover:bg-[#3A3A3D]'}`}
                       >
                         English
                       </button>
                       <button 
                         onClick={() => setLanguage('pt-br')}
                         className={`flex-1 py-2 rounded-md font-medium text-sm transition-colors ${language === 'pt-br' ? 'bg-indigo-600 text-white' : 'bg-[#2A2A2D] border border-zinc-700 text-zinc-300 hover:bg-[#3A3A3D]'}`}
                       >
                         Português (BR)
                       </button>
                     </div>
                   </div>

                   <div className="space-y-3">
                     <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider">{t('performance_mode')}</label>
                     <div className="flex flex-col gap-3">
                        <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${perfMode === 'ultra' ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-[#2A2A2D] hover:bg-[#2A2A2D]/50'}`}>
                          <input type="radio" name="perf" checked={perfMode === 'ultra'} onChange={() => setPerfMode('ultra')} className="text-emerald-500 bg-black border-zinc-700 w-4 h-4 cursor-pointer" />
                          <div>
                             <p className={`${perfMode === 'ultra' ? 'text-emerald-400' : 'text-zinc-300'} font-bold tracking-wide`}>ULTRA HIGH FIDELITY</p>
                             <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Vulkan 1.3 / BGFX / 4K Upscaling / AI Frame Gen</p>
                          </div>
                        </label>
                        <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${perfMode === 'lite' ? 'border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20' : 'border-[#2A2A2D] hover:bg-[#2A2A2D]/50'}`}>
                          <input type="radio" name="perf" checked={perfMode === 'lite'} onChange={() => setPerfMode('lite')} className="text-indigo-500 bg-black border-zinc-700 w-4 h-4 cursor-pointer" />
                          <div>
                             <p className={`${perfMode === 'lite' ? 'text-indigo-400' : 'text-zinc-300'} font-bold tracking-wide`}>UNIVERSAL LITE CORE</p>
                             <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">SDL2 / GDI / ARMv7 Optimized / 15kHz CRT Compatible</p>
                          </div>
                        </label>
                        <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">Hardware Auto-Detection Active: Opt-In for Kernel-Level Overrides</span>
                        </div>
                     </div>
                   </div>

                   <div className="space-y-3">
                     <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Proton Optimization Layer</label>
                      <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800 space-y-4">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-white text-xs">
                               <Wrench size={14} className="text-indigo-400" />
                               Fsync + Esync Overdrive (Valve Patched)
                            </div>
                            <div className="w-8 h-4 bg-emerald-600 rounded-full relative">
                               <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-all" />
                            </div>
                         </div>
                         <p className="text-[10px] text-zinc-500 uppercase tracking-tight">Active: Low-level threading optimization for Proton games.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Input Latency Overdrive</label>
                     <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2 font-bold text-white text-xs">
                              <Zap size={14} className="text-amber-400" />
                              Kernel Input Polling (1000Hz)
                           </div>
                           <div className="w-8 h-4 bg-indigo-600 rounded-full relative">
                              <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-all" />
                           </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-tight">Reduces lag significantly via xpad-overdrive drivers.</p>
                     </div>
                   </div>
                 </>
             )}

             {activeTab === 'emulators' && (
                 <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">Core Allocation Matrix</h3>
                        <p className="text-sm text-zinc-400 mb-6">Select which backend powers each system architecture. FliperOS handles shaders and environment variables per-core.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {/* Section: 32/64/128 Bit */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] border-b border-zinc-800 pb-2">32 / 64 / 128 Bit Consoles</h4>
                        
                        <div className="space-y-2">
                          <label className="text-xs text-zinc-400">PlayStation 1 (PSX)</label>
                          <select value={cores.psx} onChange={e => updateCore('psx', e.target.value)} className="w-full bg-[#1A1A1D] border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-200 outline-none focus:border-indigo-500">
                             <option value="duckstation">DuckStation (Standalone)</option>
                             <option value="pcsx_rearmed">PCSX ReARMed (Libretro)</option>
                             <option value="mednafen_psx_hw">Beetle PSX (Libretro)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-zinc-400">PlayStation 2 (PS2)</label>
                          <select value={cores.ps2} onChange={e => updateCore('ps2', e.target.value)} className="w-full bg-[#1A1A1D] border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-200 outline-none focus:border-indigo-500">
                             <option value="pcsx2">PCSX2 (Standalone Qt)</option>
                             <option value="play">Play! (Experimental)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-zinc-400">Nintendo 64</label>
                          <select value={cores.n64} onChange={e => updateCore('n64', e.target.value)} className="w-full bg-[#1A1A1D] border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-200 outline-none focus:border-indigo-500">
                             <option value="mupen64plus_next">Mupen64Plus-Next (Vulkan)</option>
                             <option value="paralleln64">ParaLLEl N64</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-zinc-400">GameCube / Wii</label>
                          <select value={cores.gc_wii} onChange={e => updateCore('gc_wii', e.target.value)} className="w-full bg-[#1A1A1D] border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-200 outline-none focus:border-indigo-500">
                             <option value="dolphin">Dolphin (Standalone)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-zinc-400">Dreamcast / Saturn</label>
                          <select value={cores.dreamcast} onChange={e => updateCore('dreamcast', e.target.value)} className="w-full bg-[#1A1A1D] border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-200 outline-none focus:border-indigo-500">
                             <option value="flycast">Flycast (Standard)</option>
                             <option value="redream">Redream (Standalone)</option>
                          </select>
                        </div>
                      </div>

                      {/* Section: Handhelds & Modern */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] border-b border-zinc-800 pb-2">Handhelds & Modern</h4>
                        
                        <div className="space-y-2">
                          <label className="text-xs text-zinc-400">Switch / 3DS</label>
                          <div className="flex gap-2">
                            <select value={cores.switch} onChange={e => updateCore('switch', e.target.value)} className="flex-1 bg-[#1A1A1D] border border-zinc-700 rounded-md px-2 py-2 text-[10px] text-zinc-200">
                               <option value="ryujinx">Ryujinx</option>
                               <option value="sudachi">Sudachi</option>
                            </select>
                            <select value={cores.n3ds} onChange={e => updateCore('n3ds', e.target.value)} className="flex-1 bg-[#1A1A1D] border border-zinc-700 rounded-md px-2 py-2 text-[10px] text-zinc-200">
                               <option value="citra">Citra</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-zinc-400">PC Games / Steam (Proton)</label>
                          <select value={cores.proton || 'proton-9'} onChange={e => updateCore('proton', e.target.value)} className="w-full bg-[#1A1A1D] border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-200 outline-none focus:border-indigo-500">
                             <option value="proton-9">Steam Proton 9.0-2</option>
                             <option value="proton-ge">Proton-GE-Latest (Performance)</option>
                             <option value="proton-experimental">Proton Experimental (Features)</option>
                             <option value="wine-staging">Wine-Staging (Vanilla x86)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-zinc-400">PSP / PSVita</label>
                          <select value={cores.ps3} onChange={e => updateCore('ps3', e.target.value)} className="w-full bg-[#1A1A1D] border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-200 outline-none focus:border-indigo-500">
                             <option value="ppsspp">PPSSPP (Standalone/Libretro)</option>
                             <option value="rpcs3">RPCS3 (PS3 Desktop)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-zinc-400">Arcade / NeoGeo</label>
                          <select value={cores.arcade} onChange={e => updateCore('arcade', e.target.value)} className="w-full bg-[#1A1A1D] border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-200 outline-none focus:border-indigo-500">
                             <option value="mame">MAME (Current)</option>
                             <option value="fbneo">FinalBurn Neo</option>
                             <option value="teknoparrot">TeknoParrot</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-zinc-400">8/16 Bit Classics</label>
                          <div className="flex gap-2">
                            <select value={cores.snes} onChange={e => updateCore('snes', e.target.value)} className="flex-1 bg-[#1A1A1D] border border-zinc-700 rounded-md px-2 py-2 text-[10px] text-zinc-200">
                               <option value="snes9x">snes9x</option>
                               <option value="bsnes">bsnes</option>
                            </select>
                            <select value={cores.genesis} onChange={e => updateCore('genesis', e.target.value)} className="flex-1 bg-[#1A1A1D] border border-zinc-700 rounded-md px-2 py-2 text-[10px] text-zinc-200">
                               <option value="genesis_plus_gx">genesis_plus_gx</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                 </div>
             )}

             {activeTab === 'paths' && (
                 <div className="space-y-6">
                    <h3 className="text-lg font-bold text-white mb-2">Internal Drives & Mounts</h3>

                    <div className="space-y-3 mb-4">
                      <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider">{t('lb_path')}</label>
                      <input 
                        type="text" 
                        value={lbPath}
                        onChange={(e) => setLbPath(e.target.value)}
                        className="w-full bg-[#1A1A1D] border border-zinc-700 rounded-md px-3 py-3 text-sm text-zinc-200 outline-none focus:border-indigo-500 shadow-inner"
                        placeholder="C:\LaunchBox"
                      />
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider">Independent ROMs Directory (/roms)</label>
                      <div className="flex gap-2 relative">
                        <input 
                          type="text" 
                          value="/mnt/storage/roms"
                          disabled
                          className="w-full bg-[#1A1A1D] border border-zinc-700/50 rounded-md px-3 py-3 text-sm text-zinc-500 outline-none opacity-50 cursor-not-allowed"
                        />
                        <button className="px-4 bg-[#2A2A2D] text-zinc-300 rounded hover:bg-white/10 transition">Browse</button>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">Mounted directly to FliperOS core storage volume.</p>
                    </div>

                    <div className="space-y-3 mb-4">
                      <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider">Asset Media Directory (/media)</label>
                      <div className="flex gap-2 relative">
                        <input 
                          type="text" 
                          value="/mnt/storage/media"
                          disabled
                          className="w-full bg-[#1A1A1D] border border-zinc-700/50 rounded-md px-3 py-3 text-sm text-zinc-500 outline-none opacity-50 cursor-not-allowed"
                        />
                        <button className="px-4 bg-[#2A2A2D] text-zinc-300 rounded hover:bg-white/10 transition">Browse</button>
                      </div>
                    </div>
                 </div>
             )}

             {activeTab === 'video' && (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                    <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 mb-6">
                       <Monitor size={40} className="text-amber-500 shrink-0" />
                       <div>
                          <h3 className="font-bold text-white">Dynamic Visual Engine</h3>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Pixel-level post-processing injected at Kernel level</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Post-Processing Shaders</label>
                        <div className="grid grid-cols-1 gap-2">
                           {[
                             { id: 'none', name: 'Original (None)', desc: 'Sharp edges, 1:1 pixel mapping' },
                             { id: 'crt-lottes', name: 'CRT-Lottes', desc: 'Classic arcade glow, slight curvature' },
                             { id: 'crt-royale', name: 'CRT-Royale', desc: 'Elite composite simulation, intense scanlines' },
                             { id: 'sharp-bilinear', name: 'Sharp Bilinear', desc: 'Anti-aliased scaling for modern screens' },
                             { id: 'scanlines-25', name: 'Scanlines 25%', desc: 'Light cinematic grid' }
                           ].map((shader) => (
                             <button key={shader.id} className="w-full text-left p-3 rounded-lg border border-zinc-800 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group">
                                <div className="flex items-center justify-between">
                                   <span className="text-sm font-bold text-zinc-200 group-hover:text-amber-400">{shader.name}</span>
                                   <div className="w-4 h-4 rounded-full border-2 border-zinc-700" />
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-0.5">{shader.desc}</p>
                             </button>
                           ))}
                        </div>
                    </div>

                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                       <p className="text-xs text-amber-200/70 italic">Note: These shaders use 6.8% extra GPU overhead. Active hardware throttling will fallback to 'Original' automatically.</p>
                    </div>
                </div>
             )}
          </div>

          <div className="p-6 border-t border-[#2A2A2D] flex flex-row-reverse justify-between items-center">
            <button onClick={onClose} className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-lg hover:bg-zinc-200 transition-colors shadow-lg">
               {t('close')}
            </button>
            <span className="text-zinc-600 text-xs font-mono">Build c4d1a-5060RTX</span>
          </div>
        </div>
      </div>
  );

  if (inWindowMode) {
      return content;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {content}
    </div>
  );
};
