import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Thermometer, ShieldCheck, Shield, Package, Layers, Box, RefreshCw, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const SystemMonitorApp: React.FC = () => {
  const [cpuHistory, setCpuHistory] = useState<{ time: string, usage: number }[]>([]);
  const [cpuCores, setCpuCores] = useState<number[]>(Array(16).fill(0));
  const [uptime, setUptime] = useState(0);
  const [distroInfo, setDistroInfo] = useState('Nitro Hybrid VFS');
  const [kernelVer, setKernelVer] = useState('6.8.0-unif-flp');
  const [ramUsageMB, setRamUsageMB] = useState(1240);
  const [gpuInfo, setGpuInfo] = useState({ vendor: 'NVIDIA', model: 'RTX 5060 Core VM', driver: 'nvidia-drm' });
  const [auditing, setAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<any[]>([]);

  useEffect(() => {
    const initialHistory = Array.from({ length: 30 }, (_, i) => ({
      time: i.toString(),
      usage: 10 + Math.random() * 20
    }));
    setCpuHistory(initialHistory);

    const interval = setInterval(() => {
      setCpuHistory(prev => {
        const next = [...prev, { time: Date.now().toString(), usage: 15 + Math.random() * 30 }];
        return next.length > 50 ? next.slice(1) : next;
      });
      setCpuCores(prev => prev.map(() => 10 + Math.random() * 60));
      setUptime(u => u + 2000);
      setRamUsageMB(r => r + (Math.random() > 0.5 ? 5 : -5));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const runSystemAudit = async () => {
    setAuditing(true);
    setTimeout(() => {
      setAuditResults([
        { component: 'Kernel Integrity', message: 'Signed valid V9', passed: true, latency: 12 },
        { component: 'VFS Layer', message: '12 Mount Points Secure', passed: true, latency: 45 },
        { component: 'Neural Engine', message: 'Latency Optimized', passed: true, latency: 2 },
        { component: 'GPU Tunnels', message: 'Vulkan Active', passed: true, latency: 8 }
      ]);
      setAuditing(false);
    }, 1500);
  };

  return (
    <div className="p-10 bg-m3-surface h-full text-m3-on-surface overflow-y-auto no-scrollbar selection:bg-m3-primary/30">
      {/* M3 Header Section */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[24px] bg-m3-primary/10 flex items-center justify-center shadow-lg">
            <ShieldCheck className="text-m3-primary" size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-m3-on-surface tracking-tighter uppercase">Kernel Telemetry</h2>
            <div className="flex items-center gap-3 mt-1">
               <div className="w-2 h-2 rounded-full bg-m3-primary animate-pulse" />
               <p className="text-[10px] font-black text-m3-primary uppercase tracking-[0.2em]">{distroInfo} | Node Active</p>
            </div>
          </div>
        </div>
        <div className="bg-m3-surface-variant/30 px-6 py-3 rounded-full border border-m3-outline/10 text-right">
            <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest leading-none mb-1">Architecture Hash</p>
            <p className="text-sm font-black text-m3-on-surface italic tracking-tighter">{kernelVer}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time Compute Graph */}
        <div className="lg:col-span-2 m3-card p-8 bg-m3-surface-variant/10">
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3">
                <Activity size={20} className="text-m3-primary" />
                <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-[0.2em]">Neural Compute Load</h3>
             </div>
             <div className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest">Global Sampling: 500ms</div>
          </div>
          
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuHistory}>
                <defs>
                  <linearGradient id="m3PrimaryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--m3-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--m3-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--m3-surface-variant)', border: 'none', borderRadius: '16px', color: 'var(--m3-on-surface)', fontSize: '10px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="usage" 
                  stroke="var(--m3-primary)" 
                  strokeWidth={4}
                  fill="url(#m3PrimaryGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vital Metrics Grid */}
        <div className="space-y-6">
           {[
             { label: 'Storage Cluster', val: `${(ramUsageMB / 1024).toFixed(2)}GB`, icon: HardDrive, color: 'text-emerald-500', trail: '/ 64GB' },
             { label: 'Thermal Envelope', val: '42°C', icon: Thermometer, color: 'text-m3-error', trail: 'OPTIMAL' },
             { label: 'Hardware Vendor', val: gpuInfo.model, icon: Cpu, color: 'text-amber-500', trail: gpuInfo.driver },
           ].map((stat, i) => (
             <div key={i} className="m3-card p-6 flex flex-col justify-between group hover:border-m3-primary/30 transition-all cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-12 h-12 rounded-[16px] bg-m3-surface-variant flex items-center justify-center">
                      <stat.icon size={24} className={stat.color} />
                   </div>
                   <span className="text-[10px] font-black uppercase text-m3-on-surface-variant tracking-widest">{stat.label}</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-m3-on-surface tracking-tighter uppercase">{stat.val}</span>
                  <span className="text-xs font-black text-m3-on-surface-variant uppercase italic">{stat.trail}</span>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* Logical Thread Matrix */}
      <div className="mt-12 space-y-6">
        <h3 className="text-xs font-black uppercase text-m3-on-surface-variant tracking-[0.3em] px-2">Thread Allocation Matrix</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
           {cpuCores.map((usage, i) => (
             <div key={i} className="m3-card p-4 space-y-3 bg-m3-surface-variant/5 border-m3-outline/5 hover:border-m3-primary/20 transition-all">
                <div className="flex justify-between items-center px-1">
                   <span className="text-[9px] font-black text-m3-on-surface-variant">#{i}</span>
                   <span className="text-[9px] font-black text-m3-primary">{Math.round(usage)}%</span>
                </div>
                <div className="h-2 bg-m3-surface-variant/40 rounded-full overflow-hidden">
                   <motion.div 
                     animate={{ width: `${usage}%` }}
                     className="h-full bg-m3-primary"
                   />
                </div>
             </div>
           ))}
        </div>
      </div>

      <div className="mt-12 flex flex-col lg:flex-row gap-8">
         <div className="lg:w-2/3 m3-card p-0 overflow-hidden bg-transparent border-none">
            <div className="flex items-center justify-between px-2 mb-4">
               <h3 className="text-xs font-black uppercase text-m3-on-surface-variant tracking-[0.3em]">System Audit Pipeline</h3>
               <button 
                 onClick={runSystemAudit}
                 className="m3-button-outline px-6 py-2 text-[10px] tracking-widest"
                 disabled={auditing}
               >
                 {auditing ? <RefreshCw size={12} className="animate-spin text-m3-primary" /> : <Shield size={12} className="text-m3-primary" />}
                 {auditing ? 'Scanning...' : 'Start Audit'}
               </button>
            </div>
            
            <div className="space-y-3">
               {auditResults.length > 0 ? auditResults.map((audit, idx) => (
                 <div key={idx} className="flex items-center justify-between p-6 m3-card bg-m3-surface-variant/10 border-m3-outline/5">
                    <div className="flex items-center gap-4">
                       <div className={`w-2 h-2 rounded-full ${audit.passed ? 'bg-emerald-500' : 'bg-m3-error'}`} />
                       <div>
                          <p className="text-sm font-black text-m3-on-surface uppercase tracking-tight">{audit.component}</p>
                          <p className="text-[10px] font-black text-m3-on-surface-variant uppercase mt-1">{audit.message}</p>
                       </div>
                    </div>
                    <span className="text-[10px] font-black text-m3-on-surface uppercase bg-m3-surface-variant/50 px-3 py-1 rounded-full">{audit.latency}ms</span>
                 </div>
               )) : (
                 <div className="py-20 text-center m3-card bg-m3-primary/5 border-dashed border-m3-primary/20">
                    <p className="text-sm font-black text-m3-primary uppercase tracking-widest">Neural Sensors Offline</p>
                 </div>
               )}
            </div>
         </div>

         <div className="lg:w-1/3 m3-card p-8 bg-m3-surface-variant/10 border-m3-outline/10 flex flex-col justify-between">
            <div className="space-y-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-m3-primary/10 rounded-full text-m3-primary">
                     <Layers size={24} />
                  </div>
                  <h4 className="text-sm font-black text-m3-on-surface uppercase tracking-[0.2em]">Environment Context</h4>
               </div>
               
               <div className="space-y-4">
                  {[
                    { label: 'Runtime', val: 'V9 Core Hub' },
                    { label: 'Uptime', val: `${Math.floor(uptime/1000)}s` },
                    { label: 'Isolation', val: 'Sandbox Level 4' },
                    { label: 'Telemetry', val: 'Proprietary SSL' }
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-m3-outline/10">
                       <span className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest">{row.label}</span>
                       <span className="text-xs font-black text-m3-on-surface italic">{row.val}</span>
                    </div>
                  ))}
               </div>
            </div>

            <button className="m3-button-tonal w-full py-4 text-xs tracking-widest mt-8">
               Export Stack Trace
            </button>
         </div>
      </div>
    </div>
  );
};
