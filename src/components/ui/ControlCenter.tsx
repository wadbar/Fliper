import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Sun, Wifi, Bluetooth, Battery, Moon, Zap, ShieldCheck, Cpu } from 'lucide-react';

interface ControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  brightness: number;
  onBrightnessChange: (val: number) => void;
}

export const ControlCenter: React.FC<ControlCenterProps> = ({ 
  isOpen, 
  onClose, 
  volume, 
  onVolumeChange,
  brightness,
  onBrightnessChange
}) => {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-16 right-4 w-80 bg-zinc-900/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl z-[100] overflow-hidden"
    >
       <div className="p-6 space-y-6">
          {/* Quick Toggles */}
          <div className="grid grid-cols-2 gap-3">
             <div className="flex items-center gap-3 p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                <Wifi size={18} className="text-white" />
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-indigo-200">WiFi</span>
                   <span className="text-xs font-black text-white">UP-V9-NET</span>
                </div>
             </div>
             <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-2xl border border-white/5">
                <Bluetooth size={18} className="text-zinc-400" />
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-zinc-500">Bluetooth</span>
                   <span className="text-xs font-black text-zinc-300">Off</span>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             {/* Brightness */}
             <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">
                   <div className="flex items-center gap-2"><Sun size={12} /> Brightness</div>
                   <span>{Math.round(brightness * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.5" 
                  step="0.05"
                  value={brightness}
                  onChange={(e) => onBrightnessChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
             </div>

             {/* Volume */}
             <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">
                   <div className="flex items-center gap-2"><Volume2 size={12} /> Master Volume</div>
                   <span>{Math.round(volume * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01"
                  value={volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
             </div>
          </div>

          {/* System Health Summary */}
          <div className="grid grid-cols-2 gap-3">
             <div className="p-3 bg-zinc-950/50 rounded-2xl border border-white/5 flex flex-col gap-1 items-center justify-center">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span className="text-[9px] font-black text-zinc-500 uppercase">Integrity</span>
                <span className="text-xs font-bold text-zinc-300">100%</span>
             </div>
             <div className="p-3 bg-zinc-950/50 rounded-2xl border border-white/5 flex flex-col gap-1 items-center justify-center">
                <Cpu size={16} className="text-indigo-400" />
                <span className="text-[9px] font-black text-zinc-500 uppercase">Neural Load</span>
                <span className="text-xs font-bold text-zinc-300">2.4%</span>
             </div>
          </div>
       </div>

       {/* Footer */}
       <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
             <Battery size={12} className="text-emerald-500" /> 100% (AC)
          </div>
          <div className="flex gap-2">
             <button className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
                <Moon size={14} className="text-zinc-400" />
             </button>
             <button className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
                <Zap size={14} className="text-amber-500" />
             </button>
          </div>
       </div>
    </motion.div>
  );
};
