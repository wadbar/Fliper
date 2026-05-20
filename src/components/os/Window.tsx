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
      className={`flex flex-col bg-m3-surface border shadow-2xl rounded-[28px] overflow-hidden transition-all duration-300 ${isActive ? 'border-m3-outline/30 shadow-m3-primary/10 ring-1 ring-m3-primary/20' : 'border-m3-outline/10'}`}
    >
      <div 
        onPointerDown={(e) => dragControls.start(e)}
        className="window-titlebar flex items-center justify-between px-6 py-4 bg-m3-surface-variant/30 select-none cursor-move border-b border-m3-outline/10"
      >
        <div className="flex items-center gap-3 text-m3-on-surface">
          <div className="w-8 h-8 rounded-full bg-m3-primary/10 flex items-center justify-center">
            {icon ? React.cloneElement(icon as React.ReactElement<any>, { size: 16, className: 'text-m3-primary' }) : <div className="w-2 h-2 rounded-full bg-m3-primary" />}
          </div>
          <span className="text-sm font-bold tracking-tight text-white">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-m3-outline hover:bg-m3-surface-variant hover:text-white transition-all">
            <Minus size={16} />
          </button>
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-m3-outline hover:bg-m3-surface-variant hover:text-white transition-all">
            <Square size={14} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-m3-outline hover:bg-m3-error/20 hover:text-m3-error transition-all"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden relative bg-m3-surface/50 backdrop-blur-sm">
        {children}
      </div>
    </motion.div>
  );
};
