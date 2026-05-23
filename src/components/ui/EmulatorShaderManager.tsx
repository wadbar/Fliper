import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MonitorPlay, Sparkles, CheckCircle2, Zap } from 'lucide-react';

interface EmulatorShaderManagerProps {
  currentShader: string;
  onShaderChange: (shader: string) => void;
  previewImage?: string;
}

export const EmulatorShaderManager: React.FC<EmulatorShaderManagerProps> = ({ currentShader, onShaderChange, previewImage }) => {
  const shaders = [
    { id: 'crt-royale', name: 'CRT Royale', desc: 'Aperture grille and blooming', complexity: 'High' },
    { id: 'scanlines', name: 'ZFast Scanlines', desc: 'Optimized horizontal lines', complexity: 'Low' },
    { id: 'ntsc-u', name: 'NTSC Composite', desc: 'Color bleed and soft artifacts', complexity: 'Med' },
    { id: 'pixel-perfect', name: 'Pixel Perfect', desc: 'Sharp integer scaling', complexity: 'None' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
         <MonitorPlay className="text-[var(--md-sys-color-primary)]" size={24} />
         <div>
            <h3 className="text-[14px] font-black text-white uppercase tracking-widest">Display Pipeline</h3>
            <p className="text-[10px] uppercase text-zinc-400 font-bold">Configure Post-Processing</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          {shaders.map(s => (
            <button
              key={s.id}
              onClick={() => onShaderChange(s.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                currentShader === s.id 
                  ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/10 shadow-[0_0_15px_rgba(var(--m3-primary-rgb),0.2)]'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm text-zinc-100">{s.name}</span>
                {currentShader === s.id && <CheckCircle2 size={16} className="text-[var(--md-sys-color-primary)]" />}
              </div>
              <p className="text-xs text-zinc-400 mb-2">{s.desc}</p>
              <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-zinc-500 font-bold">
                <Zap size={10} /> {s.complexity} GPU
              </div>
            </button>
          ))}
        </div>

        <div className="relative rounded-3xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center p-4">
           {/* Pseudo-preview window */}
           <motion.div 
             layout
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             key={currentShader}
             transition={{ duration: 0.5, ease: 'easeOut' }}
             className={`relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-900 transition-all duration-700 ease-in-out ${
              currentShader === 'crt-royale' ? 'brightness-110 contrast-125 saturate-150 blur-[0.3px]' :
              currentShader === 'scanlines' ? 'brightness-90 contrast-110' :
              currentShader === 'ntsc-u' ? 'blur-[0.5px] contrast-90 saturate-120 sepia-[0.2]' :
              'brightness-100 contrast-100'
           }`}>
             {previewImage ? (
                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
                   <MonitorPlay size={48} className="text-zinc-500/50" />
                </div>
             )}

             {/* Overlay Effects */}
             {currentShader === 'scanlines' && (
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.25) 50%)', backgroundSize: '100% 4px' }} />
             )}
             {currentShader === 'crt-royale' && (
                <>
                  <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse,transparent,rgba(0,0,0,0.8))]"></div>
                  <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f00 0, #0f0 1px, #00f 2px, #f00 3px)' }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.4) 50%)', backgroundSize: '100% 3px' }} />
                </>
             )}
             {currentShader === 'ntsc-u' && (
                <div className="absolute inset-0 pointer-events-none mix-blend-color opacity-30 bg-orange-500/20" />
             )}
           </motion.div>
        </div>
      </div>
    </div>
  );
};
