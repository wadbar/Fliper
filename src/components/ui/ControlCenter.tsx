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
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="absolute bottom-20 right-8 w-[360px] bg-m3-surface shadow-2xl border border-m3-outline/20 rounded-[28px] z-[100] overflow-hidden"
    >
       <div className="p-8 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
             <h3 className="text-base font-bold text-m3-on-surface tracking-tight">System Controls</h3>
             <span className="text-[10px] font-black text-m3-outline uppercase tracking-widest bg-m3-surface-variant/50 px-2 py-0.5 rounded-full">v6.8.zen1</span>
          </div>

          {/* Quick Toggles */}
          <div className="grid grid-cols-2 gap-4">
             <div className="flex items-center gap-4 p-4 bg-m3-primary-container text-m3-on-primary-container rounded-[24px] shadow-sm">
                <div className="w-10 h-10 rounded-full bg-m3-primary/20 flex items-center justify-center shrink-0">
                  <Wifi size={20} className="text-m3-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                   <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">Wifi</span>
                   <span className="text-sm font-bold truncate">UP-V9-NET</span>
                </div>
             </div>
             <div className="flex items-center gap-4 p-4 bg-m3-surface-variant/40 rounded-[24px] border border-m3-outline/10 text-m3-on-surface-variant hover:bg-m3-surface-variant/60 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-m3-outline/10 flex items-center justify-center shrink-0 group-hover:bg-m3-outline/20 transition-all">
                  <Bluetooth size={20} className="text-m3-outline" />
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">Bluetooth</span>
                   <span className="text-sm font-bold">Inactive</span>
                </div>
             </div>
          </div>

          <div className="space-y-6">
             {/* Brightness */}
             <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px] font-black text-m3-outline uppercase tracking-[0.15em]">
                   <div className="flex items-center gap-2"><Sun size={14} /> Screen Intensity</div>
                   <span className="text-m3-primary">{Math.round(brightness * 100)}%</span>
                </div>
                <div className="relative h-4 flex items-center">
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.5" 
                    step="0.05"
                    value={brightness}
                    onChange={(e) => onBrightnessChange(parseFloat(e.target.value))}
                    className="w-full h-8 bg-m3-surface-variant rounded-full appearance-none cursor-pointer accent-m3-primary opacity-0 z-10"
                  />
                  <div className="absolute inset-0 bg-m3-surface-variant rounded-full overflow-hidden pointer-events-none">
                    <div 
                      className="h-full bg-m3-primary/30" 
                      style={{ width: `${((brightness - 0.1) / 1.4) * 100}%` }} 
                    />
                  </div>
                  <div 
                    className="absolute w-1 h-4 bg-m3-primary rounded-full pointer-events-none" 
                    style={{ left: `calc(${((brightness - 0.1) / 1.4) * 100}%)`, transform: 'translateX(-50%)' }}
                  />
                </div>
             </div>

             {/* Volume */}
             <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px] font-black text-m3-outline uppercase tracking-[0.15em]">
                   <div className="flex items-center gap-2"><Volume2 size={14} /> Audio Driver</div>
                   <span className="text-m3-primary">{Math.round(volume * 100)}%</span>
                </div>
                <div className="relative h-4 flex items-center">
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01"
                    value={volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-8 bg-m3-surface-variant rounded-full appearance-none cursor-pointer accent-m3-primary opacity-0 z-10"
                  />
                  <div className="absolute inset-0 bg-m3-surface-variant rounded-full overflow-hidden pointer-events-none">
                    <div 
                      className="h-full bg-m3-primary/30" 
                      style={{ width: `${volume * 100}%` }} 
                    />
                  </div>
                  <div 
                    className="absolute w-1 h-4 bg-m3-primary rounded-full pointer-events-none" 
                    style={{ left: `${volume * 100}%`, transform: 'translateX(-50%)' }}
                  />
                </div>
             </div>
          </div>

          {/* System Health */}
          <div className="flex gap-4">
             <div className="flex-1 p-4 bg-m3-surface-variant/20 rounded-[20px] flex flex-col items-center justify-center gap-2 border border-m3-outline/5 hover:bg-m3-surface-variant/30 transition-all">
                <ShieldCheck size={20} className="text-emerald-400" />
                <span className="text-xs font-bold text-white">Secure</span>
             </div>
             <div className="flex-1 p-4 bg-m3-surface-variant/20 rounded-[20px] flex flex-col items-center justify-center gap-2 border border-m3-outline/5 hover:bg-m3-surface-variant/30 transition-all">
                <Cpu size={20} className="text-m3-primary" />
                <span className="text-xs font-bold text-white">2.4% Load</span>
             </div>
          </div>
       </div>

       {/* Footer */}
       <div className="px-8 py-5 bg-m3-surface-variant/30 border-t border-m3-outline/10 flex justify-between items-center">
          <div className="flex items-center gap-3 text-xs font-bold text-m3-outline">
             <Battery size={16} className="text-emerald-400" /> Powered by AC
          </div>
          <div className="flex gap-3">
             <button className="w-10 h-10 rounded-full bg-m3-surface-variant text-m3-outline hover:text-white flex items-center justify-center transition-all">
                <Moon size={16} />
             </button>
             <button className="w-10 h-10 rounded-full bg-m3-primary text-m3-on-primary flex items-center justify-center shadow-lg shadow-m3-primary/20 transition-all active:scale-95">
                <Zap size={16} />
             </button>
          </div>
       </div>
    </motion.div>

  );
};
