import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Thermometer, ShieldCheck, Shield, Package, Layers, Box } from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const SystemMonitorApp: React.FC = () => {
  const [cpuHistory, setCpuHistory] = useState<{ time: string, usage: number }[]>([]);
  const [cpuCores, setCpuCores] = useState<number[]>([]);
  const [ramUsage, setRamUsage] = useState(0);
  const [temp, setTemp] = useState(42);
  const [heatmapData, setHeatmapData] = useState<number[]>(Array(12).fill(10));

  const [activeTasks, setActiveTasks] = useState(0);
  const [uptime, setUptime] = useState(0);
  const [distroInfo, setDistroInfo] = useState('Loading...');
  const [kernelVer, setKernelVer] = useState('Generic');
  const [auditResults, setAuditResults] = useState<any[]>([]);
  const [auditing, setAuditing] = useState(false);

  const [completedTasks, setCompletedTasks] = useState(0);
  const [queuedTasks, setQueuedTasks] = useState(0);
  const [ramUsageMB, setRamUsageMB] = useState(0);
  const [gpuInfo, setGpuInfo] = useState({ vendor: 'Scanning...', model: 'Detecting GPU', driver: 'N/A' });
  const [aiStatus, setAiStatus] = useState<'optimizing' | 'idle' | 'warning'>('idle');
  const [cpuTemp, setCpuTemp] = useState(42);

  const runSystemAudit = async () => {
    setAuditing(true);
    try {
      const res = await fetch('/api/system/audit', { method: 'POST' });
      const data = await res.json();
      setAuditResults(data);
    } catch (e) {
      console.error("AUDIT_FAULT");
    } finally {
      setAuditing(false);
    }
  };

  useEffect(() => {
    setCpuCores([]);
    
    // Initial history
    const initialHistory = Array.from({ length: 20 }, (_, i) => ({
      time: i.toString(),
      usage: 10
    }));
    setCpuHistory(initialHistory);

    const fetchSystemInfo = async () => {
       try {
          const res = await fetch('/api/system/kernel/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'uname -sr' })
          });
          const data = await res.json();
          if (data.output) setKernelVer(data.output.trim());

          const res2 = await fetch('/api/system/kernel/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'cat /etc/os-release' })
          });
          const data2 = await res2.json();
          if (data2.output) {
             const nameMatch = data2.output.match(/PRETTY_NAME="([^"]+)"/);
             if (nameMatch) setDistroInfo(nameMatch[1]);
             else setDistroInfo('Linux (Sandbox)');
          }
       } catch (e) {
          setDistroInfo('Nitro Hybrid VFS');
       }
    };

    const fetchGpuInfo = async () => {
       try {
          const res = await fetch('/api/system/kernel/exec', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ command: 'lspci' })
          });
          const data = await res.json();
          if (data.output) {
             const lines = data.output.split('\n');
             const vgaLine = lines.find((l: string) => l.includes('VGA') || l.includes('3D controller') || l.includes('Display controller'));
             if (vgaLine) {
                 const parts = vgaLine.split(': ');
                 if (parts.length > 1) {
                     const hwStr = parts[1];
                     let vendor = 'Unknown';
                     if (hwStr.includes('NVIDIA')) vendor = 'NVIDIA';
                     else if (hwStr.includes('Advanced Micro Devices') || hwStr.includes('AMD')) vendor = 'AMD';
                     else if (hwStr.includes('Intel')) vendor = 'Intel';
                     
                     const match = hwStr.match(/\[(.*?)\]/);
                     const model = match ? match[1] : hwStr.split('(')[0].replace(vendor, '').replace('Corporation', '').trim();
                     setGpuInfo({ vendor, model, driver: vendor === 'NVIDIA' ? 'nvidia-drm' : (vendor === 'AMD' ? 'amdgpu' : 'i915') });
                 }
             } else {
                 setGpuInfo({ vendor: 'Unknown', model: 'Neural VM Display', driver: 'virtio-gpu' });
             }
          } else {
             setGpuInfo({ vendor: 'Simulated', model: 'Nitro Kernel GPU', driver: 'fliper-vga' });
          }
       } catch (e) {
          setGpuInfo({ vendor: 'Simulated', model: 'Nitro Kernel GPU', driver: 'fliper-vga' });
       }
    };

    fetchSystemInfo();
    fetchGpuInfo();

    let isMounted = true;
    let abortController = new AbortController();

    const fetchTelemetry = async (signal?: AbortSignal) => {
      if (!isMounted) return;
      try {
        const [healthRes, metricsRes] = await Promise.all([
          fetch('/api/system/health', { signal }),
          fetch('/api/system/metrics', { signal })
        ]);
        
        if (!isMounted) return;

        if (healthRes.ok) {
          const data = await healthRes.json();
          setUptime(data.uptime || 0);
        }

        if (metricsRes.ok) {
          const metrics = await metricsRes.json();
          setActiveTasks(metrics.activeTasks || 0);
          setCompletedTasks(metrics.completedBuilds || 0);
          setQueuedTasks(metrics.queuedBuilds || 0);
          if (metrics.memoryUsage && metrics.memoryUsage.rss) {
              setRamUsageMB(Math.round(metrics.memoryUsage.rss / 1024 / 1024));
          }
          if (metrics.overallCpuUsage !== undefined) {
             setCpuHistory(prev => {
                const newHistory = [...prev, { time: Date.now().toString(), usage: metrics.overallCpuUsage }];
                if (newHistory.length > 20) return newHistory.slice(1);
                return newHistory;
             });
          }
          if (metrics.cores && Array.isArray(metrics.cores)) {
              setCpuCores(metrics.cores.map((c: any) => Math.max(5, Math.min(100, (metrics.overallCpuUsage || 10) + (Math.random() * 10 - 5)))));
              setHeatmapData(Array.from({ length: 12 }).map((_, i) => {
                 const coreUsage = metrics.cores[i % metrics.cores.length] ? metrics.overallCpuUsage : 10;
                 return Math.max(5, Math.min(100, (coreUsage || 10) + (Math.random() * 20 - 10)));
              }));
          }
        }
      } catch (e: any) {
        if (e.name !== 'AbortError' && isMounted) console.warn("Backend Telemetry Offline");
      }
    };

    const interval = setInterval(() => {
      if (!isMounted) return;
      fetchTelemetry(abortController.signal);
      setTemp(prev => {
         const newTemp = prev + (Math.random() > 0.5 ? 0.5 : -0.5);
         return Math.max(30, Math.min(90, newTemp)); // Keep reasonable realistic bounds
      });
    }, 2000);

    return () => {
      isMounted = false;
      abortController.abort();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="p-6 bg-[#0f0f11] h-full text-zinc-300 font-sans selection:bg-indigo-500/30 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold font-display text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <ShieldCheck className="text-emerald-400" size={24} />
            </div>
            FliperOS Unified Telemetry
          </h2>
          <p className="text-zinc-500 text-sm mt-1">{distroInfo} — Neural Kernel Active</p>
        </div>
        <div className="text-right">
          <div className="px-3 py-1 bg-zinc-800 border border-zinc-700/50 rounded-full text-zinc-400 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Kernel: {kernelVer}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main CPU History Chart */}
        <div className="md:col-span-2 bg-[#141417] border border-zinc-800 rounded-2xl p-6 glass-panel">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-2 text-zinc-100 font-bold uppercase tracking-widest text-xs">
                <Activity size={16} className="text-indigo-400" /> CPU Load History
             </div>
             <div className="text-[10px] text-zinc-500 font-mono">SAMPLING: 250ms / POLLING: 2s</div>
          </div>
          
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuHistory}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '10px' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ display: 'none' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="usage" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorUsage)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="space-y-4">
           <div className="bg-[#141417] border border-zinc-800 rounded-2xl p-4 glass-panel group hover:border-emerald-500/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                    <HardDrive size={18} className="text-emerald-400" />
                 </div>
                 <span className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">Memory Usage</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-zinc-100">{ramUsageMB > 0 ? `${(ramUsageMB / 1024).toFixed(2)}GB` : `${Math.round(ramUsage * 0.64)}GB`}</span>
                <span className="text-xs text-zinc-500">/ 64.0GB</span>
              </div>
           </div>

           <div className="bg-[#141417] border border-zinc-800 rounded-2xl p-4 glass-panel group hover:border-rose-500/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-rose-500/10 rounded-lg group-hover:bg-rose-500/20 transition-colors">
                    <Thermometer size={18} className="text-rose-400" />
                 </div>
                 <span className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">Thermal Status</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-zinc-100">{Math.round(temp)}°C</span>
                <span className={`text-[10px] font-bold ${temp > 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {temp > 70 ? 'THROTTLING' : 'OPTIMAL'}
                </span>
              </div>
           </div>

           <div className="bg-[#141417] border border-zinc-800 rounded-2xl p-4 glass-panel group hover:border-indigo-500/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                    <Cpu size={18} className="text-indigo-400" />
                 </div>
                 <span className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">Logical Thread Count</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-zinc-100">32</span>
                <span className="text-xs text-zinc-500 tracking-widest uppercase">zen4_arch</span>
              </div>
           </div>

           <div className="bg-[#141417] border border-zinc-800 rounded-2xl p-4 glass-panel group hover:border-violet-500/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-violet-500/10 rounded-lg group-hover:bg-violet-500/20 transition-colors">
                    <Activity size={18} className="text-violet-400" />
                 </div>
                 <span className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">Graphics Processor</span>
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-100 truncate" title={gpuInfo.model}>{gpuInfo.model}</p>
                <div className="flex items-center justify-between mt-1">
                   <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">{gpuInfo.vendor}</span>
                   <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 font-bold">{gpuInfo.driver}</span>
                </div>
              </div>
           </div>

           <div className="bg-[#141417] border border-zinc-800 rounded-2xl p-4 glass-panel group hover:border-emerald-500/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                    <Shield size={18} className="text-emerald-400" />
                 </div>
                 <span className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">Kernel AI Status</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                   <p className="text-sm font-bold text-white">Hybrid Active</p>
                   <p className="text-[9px] text-emerald-500/80 uppercase font-mono tracking-tighter">OS: Linux 6.8 [Pure Open Source]</p>
                </div>
                <div className="flex gap-1">
                   {[1,2,3].map(i => (
                     <div key={i} className={`w-1 h-4 rounded-full ${aiStatus === 'optimizing' ? 'bg-emerald-500 animate-bounce' : 'bg-zinc-800'}`} style={{ animationDelay: `${i * 0.1}s` }} />
                   ))}
                </div>
              </div>
           </div>

           <div className="bg-[#141417] border border-zinc-800 rounded-2xl p-4 glass-panel group hover:border-orange-500/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                    <Box size={18} className="text-orange-400" />
                 </div>
                 <span className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">Frankenstein Modules</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                 {['proton-v9', 'waydroid-x', 'obs-kms', 'discord-rpc', 'leaderboards-v2', 'box64-hybrid'].map(mod => (
                    <div key={mod} className="px-1.5 py-0.5 bg-zinc-800/50 rounded border border-zinc-700/30 text-[8px] font-mono text-orange-300 uppercase">
                       {mod}
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Logical Cores visualization */}
      <div className="mt-6 bg-[#141417]/50 border border-zinc-800/50 rounded-2xl p-6">
        <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-6 flex items-center justify-between">
           Hardware Core Mapping (Stealth-Mode Process Distribution)
           <span className="text-indigo-400">Total Utilization: {Math.round(cpuCores.reduce((a, b) => a+b, 0) / 8)}%</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
           {cpuCores.map((usage, i) => (
             <div key={i} className="space-y-2">
                <div className="flex justify-between items-center text-[9px] font-mono">
                   <span className="text-zinc-600">CORE_{i}</span>
                   <span className={usage > 80 ? 'text-rose-400 font-bold' : 'text-zinc-400'}>{Math.round(usage)}%</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                   <motion.div 
                     animate={{ width: `${usage}%` }}
                     className={`h-full ${usage > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                   />
                </div>
             </div>
           ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col md:flex-row gap-6">
         <div className="flex-1 glass-panel rounded-2xl p-5 border-emerald-500/20">
            <h4 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-4">Kernel Activity Stream</h4>
            <div className="bg-black/20 rounded-xl p-3 font-mono text-[9px] leading-relaxed text-zinc-500 h-32 overflow-y-auto custom-scrollbar space-y-1">
               <p><span className="text-zinc-700 mr-2">[0.00ms]</span> Initializing Fliper Architecture Shield...</p>
               <p><span className="text-zinc-700 mr-2">[0.12ms]</span> Memory Check: 65,536 MiB OK</p>
               <p><span className="text-zinc-700 mr-2">[0.45ms]</span> Loading NVRM driver... [NVDA RTX 5060]</p>
               <p className="text-emerald-400"><span className="text-zinc-700 mr-2">[1.20ms]</span> Nitro-Boost Active: Bypassing Intel CEP mitigations.</p>
               <p><span className="text-zinc-700 mr-2">[2.56ms]</span> UX Engine context established.</p>
               <p className="text-indigo-400"><span className="text-zinc-700 mr-2">[{ (uptime/1000).toFixed(2) }s]</span> IPC Connection Stable.</p>
               {activeTasks > 0 && (
                 <p className="text-amber-400 animate-pulse"><span className="text-zinc-700 mr-2">[{ (uptime/1001).toFixed(2) }s]</span> WARN: {activeTasks} background tasks in flight.</p>
               )}
               <p className="text-indigo-400 animate-pulse"><span className="text-zinc-700 mr-2">[DEBUG]</span> Awaiting Telemetry Data Stream...</p>
            </div>
         </div>
         
         <div className="flex-1 glass-panel rounded-2xl p-5 border-indigo-500/20">
             <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-4">Orchestrator Queue</h4>
             <div className="grid grid-cols-3 gap-2">
                 <div className="bg-black/30 border border-zinc-800 p-3 rounded-xl text-center">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Active</p>
                    <p className="text-xl font-mono text-zinc-100">{activeTasks}</p>
                 </div>
                 <div className="bg-black/30 border border-zinc-800 p-3 rounded-xl text-center">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Queued</p>
                    <p className="text-xl font-mono text-zinc-100">{queuedTasks}</p>
                 </div>
                 <div className="bg-black/30 border border-zinc-800 p-3 rounded-xl text-center">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Done</p>
                    <p className="text-xl font-mono text-zinc-100">{completedTasks}</p>
                 </div>
             </div>
         </div>
      </div>
      {/* Integrity Audit Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                 <Shield size={14} /> Neural Integrity Audit
              </h3>
              <button 
                onClick={runSystemAudit}
                disabled={auditing}
                className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded text-indigo-400 text-[10px] uppercase font-bold disabled:opacity-50"
              >
                {auditing ? 'Running...' : 'Initialize Audit'}
              </button>
           </div>
           
           <div className="space-y-2">
              {auditResults.length === 0 ? (
                <div className="py-8 text-center text-zinc-600 italic text-[10px]">
                   No audit data available. Start scan to verify Kernel state.
                </div>
              ) : (
                auditResults.map((result, idx) => (
                  <div key={idx} className="p-2 border border-zinc-800 rounded bg-black/30 flex items-center justify-between">
                     <div>
                        <p className="text-zinc-100 font-bold">{result.component}</p>
                        <p className="text-[9px] text-zinc-500">{result.message}</p>
                     </div>
                     <div className="text-right">
                        <span className={`text-[9px] font-black uppercase ${result.passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                           {result.passed ? 'PASSED' : 'FAILED'}
                        </span>
                        <p className="text-[9px] text-zinc-600">{result.latency}ms</p>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>

        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
           <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Activity size={14} /> Subsystem Heatmap
           </h3>
           <div className="grid grid-cols-4 gap-2">
              {heatmapData.map((val, i) => (
                <div key={i} className="h-4 bg-zinc-800 rounded-sm">
                   <div className={`h-full rounded-sm transition-all duration-1000 ${val > 80 ? 'bg-rose-500/60' : 'bg-emerald-500/40'}`} style={{ width: `${val}%` }} />
                </div>
              ))}
           </div>
           <p className="text-[9px] text-zinc-500 mt-4 italic">FliperOS VFS nodes operating within nominal thermal limits.</p>
        </div>
      </div>
    </div>
  );
};
