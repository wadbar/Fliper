import React, { useState, useEffect } from 'react';
import { Activity, Signal, Cpu, Server } from 'lucide-react';
import { motion } from 'motion/react';

// Telemetry Widget for Real-Time Performance & Resiliency Monitoring
export const TelemetryWidget: React.FC = () => {
  const [metrics, setMetrics] = useState({
    fps: 60,
    latency: 0,
    memory: 0,
    mode: 'STABLE'
  });

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measureFPS = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setMetrics(prev => ({ ...prev, fps: frameCount }));
        frameCount = 0;
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    // Simulate real ping check
    const pingInterval = setInterval(async () => {
      const start = performance.now();
      try {
        await fetch('/api/games');
        const end = performance.now();
        const latency = Math.round(end - start);
        setMetrics(prev => ({ 
          ...prev, 
          latency,
          memory: (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0,
          mode: latency > 500 ? 'DEGRADED' : 'STABLE'
        }));
      } catch (e) {
        setMetrics(prev => ({ ...prev, mode: 'OFFLINE' }));
      }
    }, 5000);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(pingInterval);
    };
  }, []);

  if (!expanded) {
    return (
      <div 
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-md border border-zinc-700/50 p-2 rounded-full cursor-pointer flex items-center gap-2 hover:bg-zinc-800 transition z-50 shadow-2xl"
      >
        <Activity size={16} className={metrics.mode === 'STABLE' ? 'text-emerald-400' : 'text-amber-500'} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed bottom-4 right-4 w-64 bg-black/90 backdrop-blur-md border border-zinc-700 shadow-2xl shadow-indigo-500/10 rounded-lg p-3 z-50 text-xs font-mono text-zinc-300"
    >
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 font-bold text-white uppercase">
          <Activity size={14} className={metrics.mode === 'STABLE' ? 'text-emerald-400' : 'text-rose-500'} />
          Telemetry Core
        </div>
        <button onClick={() => setExpanded(false)} className="text-zinc-500 hover:text-white">✕</button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5"><Signal size={12}/> Net Latency</span>
          <span className={metrics.latency < 100 ? 'text-emerald-400' : 'text-amber-400'}>{metrics.latency}ms</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5"><Cpu size={12}/> Render FPS</span>
          <span className={metrics.fps >= 50 ? 'text-emerald-400' : 'text-rose-400'}>{metrics.fps}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5"><Server size={12}/> API State</span>
          <span className={metrics.mode === 'STABLE' ? 'text-emerald-400' : 'text-rose-400'}>{metrics.mode}</span>
        </div>
        <div className="flex justify-between items-center text-zinc-500">
           <span>Kernel Node</span>
           <span className="text-indigo-400">v2.5.0-PRO</span>
        </div>
        <div className="flex justify-between items-center text-zinc-500">
          <span>Security Level</span>
          <span className="text-emerald-500 border border-emerald-500/30 px-1 rounded-[2px] text-[10px]">HARDENED</span>
        </div>
        {metrics.memory > 0 && (
           <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
             <motion.div 
               animate={{ width: `${Math.min(100, (metrics.memory / 1024) * 100)}%` }}
               className="h-full bg-indigo-500"
             />
           </div>
        )}
      </div>
    </motion.div>
  );
};
