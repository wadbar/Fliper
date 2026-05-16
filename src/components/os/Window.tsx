import React, { ReactNode } from 'react';
import { motion } from 'motion/react';
import { X, Minus, Square } from 'lucide-react';

interface WindowProps {
  id: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  isActive: boolean;
  onFocus: () => void;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  zIndex?: number;
}

export const OsWindow: React.FC<WindowProps> = ({ 
  title, 
  icon, 
  children, 
  onClose, 
  isActive, 
  onFocus,
  defaultPosition = { x: 50, y: 50 },
  defaultSize = { width: 800, height: 600 },
  zIndex = 10
}) => {
  return (
    <motion.div
      drag
      dragHandle=".window-titlebar"
      dragMomentum={false}
      initial={defaultPosition}
      style={{
        width: defaultSize.width,
        height: defaultSize.height,
        position: 'absolute',
        zIndex,
      }}
      onPointerDown={onFocus}
      className={`flex flex-col bg-[#1A1A1D]/95 backdrop-blur-3xl border shadow-2xl rounded-xl overflow-hidden transition-all duration-200 ${isActive ? 'border-zinc-500/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10' : 'border-zinc-800'}`}
    >
      {/* Titlebar */}
      <div className="window-titlebar flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-black/60 to-transparent select-none cursor-move border-b border-white/5">
        <div className="flex items-center gap-2 text-zinc-300">
          {icon}
          <span className="text-sm font-bold tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-zinc-500 hover:text-white transition-colors">
            <Minus size={14} />
          </button>
          <button className="text-zinc-500 hover:text-white transition-colors">
            <Square size={12} />
          </button>
          <button onClick={onClose} className="text-zinc-500 hover:text-red-500 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden relative bg-[#0F0F11]">
        {children}
      </div>
    </motion.div>
  );
};
