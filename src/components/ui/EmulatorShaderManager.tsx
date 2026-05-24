import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MonitorPlay, 
  CheckCircle2, 
  Zap, 
  Info, 
  Palette, 
  Maximize2, 
  Settings2, 
  Smartphone,
  Tv,
  LayoutGrid
} from 'lucide-react';

export interface ShaderDefinition {
  id: string;
  name: string;
  desc: string;
  category: 'CRT' | 'LCD' | 'Arcade' | 'Special';
  complexity: 'Low' | 'Med' | 'High';
  features: string[];
  previewClass: string;
}

export const SHADER_LIBRARY: ShaderDefinition[] = [
  {
    id: 'crt-royale',
    name: 'CRT Royale',
    desc: 'The gold standard for aperture grille emulation. Mimics Sony BVM monitors.',
    category: 'CRT',
    complexity: 'High',
    features: ['Bloom', 'Interlacing', 'Multi-tap Resize'],
    previewClass: 'brightness-110 contrast-125 saturate-125 blur-[0.2px] crt-mask',
  },
  {
    id: 'zfast-scanlines',
    name: 'ZFast Scanlines',
    desc: 'High performance scanline implementation. Ideal for mobile/low-power nodes.',
    category: 'CRT',
    complexity: 'Low',
    features: ['Gamma Correct', 'Integer Scaling', 'Scanline Weight'],
    previewClass: 'brightness-90 contrast-110 scanlines-overlay',
  },
  {
    id: 'lcd-grid',
    name: 'GBA Grid',
    desc: 'Simulates the high-density grid of modern handheld LCD screens.',
    category: 'LCD',
    complexity: 'Med',
    features: ['Sub-pixel Rendering', 'Motion Blur', 'Ghosting'],
    previewClass: 'brightness-105 contrast-100 lcd-stencil',
  },
  {
    id: 'cyber-arcade',
    name: 'Neo Arcade',
    desc: 'Retro-futuristic glow effect with heavy phosphor decay.',
    category: 'Arcade',
    complexity: 'High',
    features: ['Phosphor Trail', 'Curvature', 'Color Bleed'],
    previewClass: 'brightness-150 contrast-150 saturate-200 hue-rotate-15 arcade-glow',
  },
  {
    id: 'vhs-glitch',
    name: 'VHS Studio',
    desc: 'Extreme magnetic interference and tape degradation simulation.',
    category: 'Special',
    complexity: 'Med',
    features: ['Static Noise', 'Tracking Errors', 'Chroma Shift'],
    previewClass: 'blur-[1px] hue-rotate-90 sepia-50 brightness-110 vhs-distortion',
  }
];

interface EmulatorShaderManagerProps {
  currentShaderId: string;
  onShaderChange: (id: string) => void;
  onClose?: () => void;
  previewImage?: string;
}

export const EmulatorShaderManager: React.FC<EmulatorShaderManagerProps> = ({ 
  currentShaderId, 
  onShaderChange, 
  onClose,
  previewImage = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [hoveredShaderId, setHoveredShaderId] = useState<string | null>(null);

  const categories = ['All', 'CRT', 'LCD', 'Arcade', 'Special'];

  const filteredShaders = useMemo(() => {
    return selectedCategory === 'All' 
      ? SHADER_LIBRARY 
      : SHADER_LIBRARY.filter(s => s.category === selectedCategory);
  }, [selectedCategory]);

  const currentShader = useMemo(() => 
    SHADER_LIBRARY.find(s => s.id === (hoveredShaderId || currentShaderId)) || SHADER_LIBRARY[0],
    [hoveredShaderId, currentShaderId]
  );

  return (
    <div className="flex flex-col h-full bg-m3-surface text-m3-on-surface font-sans selection:bg-m3-primary/30">
      {/* M3 Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-m3-outline/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-m3-primary/10 flex items-center justify-center text-m3-primary">
            <Settings2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest italic">Display Pipeline</h1>
            <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.3em]">BGFX / HLSL Shader Orchestrator</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           {categories.map(cat => (
             <button
               key={cat}
               onClick={() => setSelectedCategory(cat)}
               className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                 selectedCategory === cat 
                   ? 'bg-m3-primary text-m3-on-primary shadow-lg shadow-m3-primary/20' 
                   : 'text-m3-on-surface-variant hover:bg-m3-surface-variant/50'
               }`}
             >
               {cat}
             </button>
           ))}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 overflow-hidden">
        {/* Selection Rail */}
        <div className="xl:col-span-5 border-r border-m3-outline/10 overflow-y-auto no-scrollbar p-8 space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredShaders.map((shader) => (
              <motion.button
                key={shader.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onMouseEnter={() => setHoveredShaderId(shader.id)}
                onMouseLeave={() => setHoveredShaderId(null)}
                onClick={() => onShaderChange(shader.id)}
                className={`w-full group relative p-6 rounded-[32px] text-left transition-all duration-500 overflow-hidden ${
                  currentShaderId === shader.id 
                    ? 'bg-m3-primary/10 border-2 border-m3-primary shadow-xl shadow-m3-primary/5' 
                    : 'bg-m3-surface-variant/20 border border-m3-outline/10 hover:border-m3-primary/40 hover:bg-m3-surface-variant/40'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      shader.category === 'CRT' ? 'bg-indigo-500/10 text-indigo-400' :
                      shader.category === 'LCD' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-orange-500/10 text-orange-400'
                    }`}>
                      {shader.category === 'CRT' && <Tv size={20} />}
                      {shader.category === 'LCD' && <Smartphone size={20} />}
                      {shader.category === 'Arcade' && <LayoutGrid size={20} />}
                      {shader.category === 'Special' && <Palette size={20} />}
                    </div>
                    <div>
                      <h4 className="font-black text-lg uppercase tracking-tight text-m3-on-surface italic">{shader.name}</h4>
                      <p className="text-[9px] font-black opacity-50 uppercase tracking-widest">{shader.category} Specification</p>
                    </div>
                  </div>
                  {currentShaderId === shader.id && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                       <CheckCircle2 className="text-m3-primary" size={20} />
                    </motion.div>
                  )}
                </div>

                <p className="text-xs text-m3-on-surface-variant mb-6 line-clamp-2 leading-relaxed">
                  {shader.desc}
                </p>

                <div className="flex flex-wrap gap-2">
                   {shader.features.map(f => (
                     <span key={f} className="px-2 py-1 rounded-lg bg-black/20 text-[8px] font-black text-m3-primary uppercase border border-m3-primary/10">
                        {f}
                     </span>
                   ))}
                   <div className="ml-auto flex items-center gap-1 text-[8px] font-black text-m3-on-surface-variant uppercase opacity-40 group-hover:opacity-100 transition-opacity">
                      <Zap size={10} /> {shader.complexity} Load
                   </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Real-time Preview Stage */}
        <div className="xl:col-span-7 bg-black/40 p-8 flex flex-col gap-8 relative">
           {/* Backdrop Decorative Elements */}
           <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-m3-primary rounded-full blur-[160px]" />
           </div>

           <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                 <MonitorPlay className="text-m3-primary" size={24} />
                 <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-m3-on-surface italic">Heuristic Engine Preview</h3>
                    <p className="text-[9px] font-black text-m3-on-surface-variant uppercase">Simulating: {currentShader.name}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button className="p-3 bg-m3-surface-variant/30 rounded-full hover:bg-m3-surface-variant/50 text-m3-on-surface-variant transition-all border border-m3-outline/10">
                    <Maximize2 size={16} />
                 </button>
                 <button className="p-3 bg-m3-surface-variant/30 rounded-full hover:bg-m3-surface-variant/50 text-m3-on-surface-variant transition-all border border-m3-outline/10">
                    <Info size={16} />
                 </button>
              </div>
           </div>

           {/* The Canvas */}
           <div className="flex-1 relative rounded-[40px] overflow-hidden border-8 border-m3-surface-variant/20 shadow-2xl z-10 group">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentShader.id}
                  initial={{ filter: 'blur(20px)', opacity: 0 }}
                  animate={{ filter: 'blur(0px)', opacity: 1 }}
                  exit={{ filter: 'blur(10px)', opacity: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 w-full h-full"
                >
                  <img 
                    src={previewImage} 
                    alt="BGFX Preview" 
                    className={`w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110 ${currentShader.previewClass}`}
                  />
                  
                  {/* Real-time Filter Overlays */}
                  {currentShader.id === 'zfast-scanlines' && (
                    <div className="absolute inset-0 pointer-events-none z-20" 
                      style={{ 
                        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.4) 50%)', 
                        backgroundSize: '100% 4px' 
                      }} 
                    />
                  )}
                  {currentShader.id === 'crt-royale' && (
                    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
                       <div className="absolute inset-0 opacity-10 mix-blend-screen" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
                       <div className="absolute inset-0 animate-pulse duration-[5000ms] opacity-5 bg-white/10" />
                    </div>
                  )}
                  {currentShader.id === 'vhs-glitch' && (
                    <div className="absolute inset-0 pointer-events-none z-20 mix-blend-overlay opacity-30">
                       <div className="absolute inset-0 animate-flicker bg-zinc-900/10" />
                       <div className="absolute top-0 w-full h-[1px] bg-white opacity-50 animate-vhs-scan" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              
              {/* Technical HUD Overlay */}
              <div className="absolute bottom-10 left-10 right-10 flex items-end justify-between pointer-events-none z-30">
                 <div className="space-y-1">
                    <div className="flex gap-2">
                       <div className="px-2 py-0.5 bg-m3-primary/80 backdrop-blur rounded italic text-[9px] font-black text-m3-on-primary uppercase">Active Node: WSL2-GPU-01</div>
                       <div className="px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[9px] font-black text-white/60 uppercase">60.00 FPS</div>
                    </div>
                    <div className="text-white text-2xl font-black uppercase italic tracking-tighter opacity-80">{currentShader.name}</div>
                 </div>
                 <div className="h-24 w-1 bg-m3-primary/20 rounded-full relative overflow-hidden">
                    <motion.div 
                      className="absolute bottom-0 w-full bg-m3-primary"
                      initial={{ height: '0%' }}
                      animate={{ height: `${Math.random() * 60 + 40}%` }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                    />
                 </div>
              </div>
           </div>

           <div className="m3-card !bg-m3-surface-variant/10 !p-6 flex flex-row items-center gap-6 z-10">
              <div className="p-3 rounded-full bg-m3-primary/10 text-m3-primary">
                 <Zap size={20} />
              </div>
              <div className="flex-1">
                 <h4 className="text-[10px] font-black uppercase text-m3-on-surface italic mb-1 tracking-widest">Auto-Calibration Active</h4>
                 <p className="text-[9px] text-m3-on-surface-variant font-medium leading-relaxed">
                    Neural Core detected <strong>Radeon Graphics</strong>. Adjusting HLSL bloom thresholds for optimal luminance coherence.
                 </p>
              </div>
              <div className="flex gap-4">
                 <div className="flex flex-col items-center">
                    <span className="text-[14px] font-black text-m3-on-surface tracking-tighter">0.8ms</span>
                    <span className="text-[8px] font-black text-m3-on-surface-variant uppercase italic">Draw</span>
                 </div>
                 <div className="w-px h-8 bg-m3-outline/20" />
                 <div className="flex flex-col items-center">
                    <span className="text-[14px] font-black text-m3-on-surface tracking-tighter">12%</span>
                    <span className="text-[8px] font-black text-m3-on-surface-variant uppercase italic">VRAM</span>
                 </div>
              </div>
           </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="p-8 border-t border-m3-outline/10 flex items-center justify-between bg-m3-surface-variant/5">
         <div className="flex items-center gap-6">
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-m3-on-surface-variant uppercase tracking-widest">Config Snapshot</span>
               <code className="text-[10px] font-mono text-m3-primary">RETROARCH_BGFX_{currentShaderId.toUpperCase()}.cfg</code>
            </div>
         </div>
         <div className="flex gap-4">
            {onClose && (
              <button 
                onClick={onClose}
                className="px-10 py-4 rounded-full border border-m3-outline/20 text-m3-on-surface font-black uppercase text-[10px] tracking-widest hover:bg-m3-surface-variant/50 transition-all"
              >
                Cancel
              </button>
            )}
            <button 
              onClick={() => onShaderChange(currentShaderId)}
              className="m3-button-filled px-12 py-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-m3-primary/20"
            >
              Apply Pipeline
            </button>
         </div>
      </footer>

      {/* Global Filter Styles */}
      <style>{`
        .crt-mask {
          mask-image: linear-gradient(rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.95)), linear-gradient(90deg, rgba(255, 0, 0, 0.1), rgba(0, 255, 0, 0.1), rgba(0, 0, 255, 0.1));
          mask-size: 100% 3px, 3px 100%;
        }
        .lcd-stencil {
          background-image: 
            linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px);
          background-size: 3px 3px;
        }
        @keyframes vhs-scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }
        .animate-vhs-scan {
          animation: vhs-scan 8s linear infinite;
        }
        @keyframes flicker {
          0% { opacity: 0.27861; }
          5% { opacity: 0.34769; }
          10% { opacity: 0.23604; }
          15% { opacity: 0.90626; }
          20% { opacity: 0.18128; }
          25% { opacity: 0.83891; }
          30% { opacity: 0.65583; }
          35% { opacity: 0.57807; }
          40% { opacity: 0.26559; }
          45% { opacity: 0.84693; }
          50% { opacity: 0.96052; }
          55% { opacity: 0.07141; }
          60% { opacity: 0.6056; }
          65% { opacity: 0.50424; }
          70% { opacity: 0.10651; }
          75% { opacity: 0.57321; }
          80% { opacity: 0.82586; }
          85% { opacity: 0.33465; }
          90% { opacity: 0.96342; }
          95% { opacity: 0.74127; }
          100% { opacity: 0.72023; }
        }
        .animate-flicker {
          animation: flicker 0.15s infinite;
        }
      `}</style>
    </div>
  );
};
