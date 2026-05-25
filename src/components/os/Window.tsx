import React, { ReactNode } from 'react';
import { motion, useDragControls } from 'motion/react';
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
  const dragControls = useDragControls();

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      initial={defaultPosition}
      style={{
        width: defaultSize.width,
        height: defaultSize.height,
        position: 'absolute',
        zIndex,
      }}
      onPointerDown={onFocus}
      className={`flex flex-col bg-m3-surface-container/95 backdrop-blur-3xl shadow-m3-elevation-4 rounded-[40px] overflow-hidden transition-all duration-500 border ${isActive ? 'border-m3-primary/30 ring-1 ring-m3-primary/10' : 'border-m3-outline/10'}`}
    >
      <div 
        onPointerDown={(e) => dragControls.start(e)}
        className="window-titlebar flex items-center justify-between px-8 py-5 bg-m3-surface-container-high/40 select-none cursor-move border-b border-m3-outline/5"
      >
        <div className="flex items-center gap-4 text-m3-on-surface">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-m3-primary/10 shadow-inner' : 'bg-m3-surface-variant/30'}`}>
            {icon ? React.cloneElement(icon as React.ReactElement<any>, { size: 18, className: isActive ? 'text-m3-primary' : 'text-m3-outline' }) : <div className="w-2.5 h-2.5 rounded-full bg-m3-primary" />}
          </div>
          <div className="flex flex-col">
             <span className="text-sm font-black tracking-tight text-m3-on-surface uppercase">{title}</span>
             {isActive && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[8px] font-black text-m3-primary uppercase tracking-[0.2em] italic">Active Process</motion.span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-m3-outline hover:bg-m3-surface-variant hover:text-m3-on-surface transition-all">
            <Minus size={18} />
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-m3-outline hover:bg-m3-surface-variant hover:text-m3-on-surface transition-all">
            <Square size={14} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="w-10 h-10 rounded-full flex items-center justify-center text-m3-outline hover:bg-m3-error/20 hover:text-m3-error transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </motion.div>
  );
};
