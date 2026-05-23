import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, MemoryStick, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { monitoringService, SystemMetrics } from '../../services/MonitoringService';

export const SystemResourceWidget: React.FC = () => {
  const [data, setData] = useState<SystemMetrics[]>([]);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    // Initial data from service or placeholder
    setData(Array.from({ length: 20 }, (_, i) => ({
      time: i.toString(),
      cpu: 10 + Math.random() * 20,
      memory: 40 + Math.random() * 10,
      timestamp: Date.now()
    })));

    const unsubscribe = monitoringService.subscribe((metrics) => {
      setData(prev => {
        const next = [...prev, metrics];
        return next.length > 30 ? next.slice(1) : next;
      });
    });

    const handleAlert = (e: Event) => {
      const customEvent = e as CustomEvent;
      setAlertMsg(customEvent.detail.message);
      setTimeout(() => setAlertMsg(null), 10000);
    };
    window.addEventListener('monitoring-alert', handleAlert);

    return () => {
      unsubscribe();
      window.removeEventListener('monitoring-alert', handleAlert);
    };
  }, []);

  const latest = data[data.length - 1] || { cpu: 0, memory: 0 };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 rounded-[28px] overflow-hidden shadow-sm"
    >
      <div className="p-6 pb-2">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-[var(--md-sys-color-primary)]" />
              <h3 className="text-xs font-bold text-[var(--md-sys-color-on-surface)] uppercase tracking-[0.1em]">Core Telemetry</h3>
            </div>
            <AnimatePresence>
              {alertMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1 text-[9px] font-bold text-[var(--md-sys-color-error)]"
                >
                  <AlertTriangle size={10} />
                  <span>{alertMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex gap-3">
             <div className="text-right">
                <p className="text-[8px] font-black text-[var(--md-sys-color-outline)] uppercase">CPU</p>
                <p className="text-sm font-black text-[var(--md-sys-color-primary)]">{Math.round(latest.cpu)}%</p>
             </div>
             <div className="text-right">
                <p className="text-[8px] font-black text-[var(--md-sys-color-outline)] uppercase">MEM</p>
                <p className="text-sm font-black text-[var(--md-sys-color-tertiary)]">{Math.round(latest.memory)}%</p>
             </div>
          </div>
        </div>
      </div>
      
      <div className="h-[100px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--md-sys-color-primary)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--md-sys-color-primary)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--md-sys-color-tertiary)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--md-sys-color-tertiary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--md-sys-color-surface-variant)', border: 'none', borderRadius: '12px', color: 'var(--md-sys-color-on-surface)', fontSize: '10px' }}
              itemStyle={{ color: 'var(--md-sys-color-on-surface)' }}
            />
            <Area 
              type="monotone" 
              dataKey="cpu" 
              stroke="var(--md-sys-color-primary)" 
              fillOpacity={1} 
              fill="url(#cpuGradient)" 
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Area 
              type="monotone" 
              dataKey="memory" 
              stroke="var(--md-sys-color-tertiary)" 
              fillOpacity={1} 
              fill="url(#memGradient)" 
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
