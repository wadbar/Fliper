import React, { useState, useEffect } from 'react';
import { Brain, Cpu, Zap, Activity, Shield, AlertTriangle, CheckCircle2, Terminal, BarChart3, Globe, Database, History, Search, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AIStats {
    totalCalls: number;
    successByProvider: { ollama: number; gemini: number; nvidia: number; heuristic: number };
    failuresByProvider: { ollama: number; gemini: number; nvidia: number; };
    errorTypes: Record<string, number>;
    avgLatency: number;
    lastLatency: number;
    totalCostUSD: number;
    totalTokensEst: number;
    memoryCount: number;
    cacheSize: number;
    breakers: Record<string, { status: string, failures: number, priority: 'HIGH' | 'HIBERNATED' | 'OFF', avgLatency: number }>;
}

export const NeuralCoreApp: React.FC = () => {
    const [stats, setStats] = useState<AIStats | null>(null);
    const [history, setHistory] = useState<{ time: string, latency: number }[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/ai/stats');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                
                setHistory(prev => {
                    const newEntry = { time: new Date().toLocaleTimeString(), latency: data.lastLatency };
                    const nextHistory = [...prev, newEntry].slice(-30);
                    return nextHistory;
                });

                if (data.totalCalls > (stats?.totalCalls || 0)) {
                    const provider = data.successByProvider.ollama > (stats?.successByProvider.ollama || 0) ? 'OLLAMA' :
                                   data.successByProvider.gemini > (stats?.successByProvider.gemini || 0) ? 'GEMINI' :
                                   data.successByProvider.nvidia > (stats?.successByProvider.nvidia || 0) ? 'NVIDIA' : 'NONE';
                    
                    if (provider !== 'NONE') {
                        const log = `[${new Date().toLocaleTimeString()}] CALL ${data.totalCalls}: Transmitted via ${provider}`;
                        setLogs(prev => [log, ...prev].slice(0, 50));
                    }

                    // Log circuit breaker trips
                    if (data.breakers) {
                        Object.entries(data.breakers).forEach(([p, b]: [any, any]) => {
                            if (b.status === 'OPEN' && stats?.breakers?.[p]?.status !== 'OPEN') {
                                setLogs(prev => [`[${new Date().toLocaleTimeString()}] ALERT: Circuit OPEN for ${p.toUpperCase()} (Critical Failures)`, ...prev].slice(0, 50));
                            }
                        });
                    }
                }
            }
        } catch (e) {
            console.error("STATS_FETCH_FAILED");
        }
    };

    const updatePriority = async (provider: string, priority: string) => {
        setUpdating(`${provider}-${priority}`);
        try {
            const res = await fetch('/api/ai/priority', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, priority })
            });
            if (res.ok) {
                setLogs(prev => [`[${new Date().toLocaleTimeString()}] CONFIG: ${provider.toUpperCase()} priority set to ${priority}`, ...prev].slice(0, 50));
                fetchStats();
            }
        } catch (e) {
            console.error("PRIORITY_UPDATE_FAILED");
        } finally {
            setUpdating(null);
        }
    };

    useEffect(() => {
        const interval = setInterval(fetchStats, 3000);
        fetchStats(); // Initial

        // Stream real-time logs
        const eventSource = new EventSource('/api/system/logs/stream');
        eventSource.onmessage = (event) => {
            try {
                const log = JSON.parse(event.data);
                const logStr = `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.level}: ${log.message}`;
                setLogs(prev => [logStr, ...prev].slice(0, 100));
            } catch (e) {
                console.error("LOG_STREAM_PARSE_ERROR");
            }
        };

        return () => {
            clearInterval(interval);
            eventSource.close();
        };
    }, []); // Only once on mount

    const COLORS = ['#10b981', '#6366f1', '#a855f7', '#71717a'];

    const pieData = stats ? [
        { name: 'Ollama', value: stats.successByProvider.ollama },
        { name: 'Gemini', value: stats.successByProvider.gemini },
        { name: 'Nvidia', value: stats.successByProvider.nvidia },
        { name: 'Heuristic', value: stats.successByProvider.heuristic || 0 },
    ].filter(d => d.value > 0) : [];

    if (pieData.length === 0) {
        pieData.push({ name: 'Standby', value: 1 });
    }

    const totalSuccess = stats ? stats.successByProvider.ollama + stats.successByProvider.gemini + stats.successByProvider.nvidia + (stats.successByProvider.heuristic || 0) : 0;
    const successRate = stats?.totalCalls ? ((totalSuccess / stats.totalCalls) * 100).toFixed(1) : "100";

    return (
        <div className="h-full bg-[#08080A] text-zinc-300 font-sans flex flex-col overflow-hidden relative">
            {/* Ambient Background Visualization */}
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')] opacity-20" />
                 <div className="absolute top-0 right-0 w-full h-[500px]">
                      <img 
                         src="https://picsum.photos/seed/neural/1920/1080?blur=10" 
                         className="w-full h-full object-cover scale-125"
                         referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#08080A]/80 to-[#08080A]" />
                 </div>
                 <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-fuchsia-500/5 to-transparent blur-3xl rounded-full translate-y-1/2" />
            </div>

            {/* Header */}
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-fuchsia-500/10 rounded-2xl border border-fuchsia-500/20 shadow-[0_0_20px_rgba(217,70,239,0.1)]">
                        <Brain className="text-fuchsia-400" size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Neural Core Engine <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded ml-2 align-middle border border-indigo-500/20 font-black">v2.0-SOVEREIGN-MASTER</span></h2>
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Sovereign Resiliency Active</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1.5 bg-zinc-800/80 border border-zinc-700/50 rounded-lg text-zinc-400 text-[10px] font-black uppercase flex items-center gap-2">
                        <History size={12} className="text-amber-400" />
                        Avg: {stats?.avgLatency ? `${Math.round(stats.avgLatency)}ms` : '---'}
                    </div>
                    <div className="px-3 py-1.5 bg-zinc-800/80 border border-zinc-700/50 rounded-lg text-zinc-400 text-[10px] font-black uppercase flex items-center gap-2">
                        <Database size={12} className="text-blue-400" />
                        Tokens: {stats?.totalTokensEst || 0}
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-[10px] font-black uppercase flex items-center gap-2">
                        <Zap size={12} className="text-emerald-400" />
                        Cost: ${stats?.totalCostUSD ? stats.totalCostUSD.toFixed(6) : '0.000000'}
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-[10px] font-black uppercase">
                        SR: {successRate}%
                    </div>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    
                    {/* Level Indicators */}
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1 flex items-center gap-2">
                            <Activity size={10} /> Tier Hierarchy
                        </h3>
                        
                        {[
                            {level: 1, name: 'Local Edge', provider: 'Ollama', color: 'emerald', success: stats?.successByProvider.ollama },
                            {level: 2, name: 'Cloud Context', provider: 'Gemini', color: 'indigo', success: stats?.successByProvider.gemini },
                            {level: 3, name: 'Final Wall', provider: 'Nvidia', color: 'fuchsia', success: stats?.successByProvider.nvidia },
                            {level: 4, name: 'Heuristic', provider: 'Emergency', color: 'zinc', success: stats?.successByProvider.heuristic }
                        ].map((tier) => {
                            const breaker = stats?.breakers?.[tier.provider.toLowerCase()];
                            const isFailing = breaker?.status === 'OPEN';
                            const statusColor = isFailing ? 'rose' : (breaker?.status === 'HALF-OPEN' ? 'amber' : tier.color);
                            const latency = breaker?.avgLatency ? `${Math.round(breaker.avgLatency)}ms` : '---';
                            const currentPriority = breaker?.priority || 'HIGH';

                            return (
                                <div key={tier.level} className={`relative p-4 rounded-2xl border transition-all overflow-hidden bg-zinc-900/20 group hover:border-zinc-700 ${isFailing ? 'border-rose-500/30' : 'border-zinc-800/50'}`}>
                                    <div className={`absolute top-0 left-0 w-1 h-full bg-${statusColor}-500/50 opacity-0 group-hover:opacity-100 transition-opacity`} />
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded bg-${statusColor}-500/10 text-${statusColor}-400 border border-${statusColor}-500/20 flex items-center gap-1.5`}>
                                                <Circle size={6} fill="currentColor" className={breaker?.status === 'HALF-OPEN' ? 'animate-pulse' : ''} />
                                                CB: {breaker?.status || 'UNKNOWN'}
                                            </span>
                                            {breaker && breaker.failures > 0 && (
                                                <span className="text-[8px] font-mono text-rose-500/70 tabular-nums">
                                                    {breaker.failures} FAIL
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isFailing && <AlertTriangle size={10} className="text-rose-500 animate-pulse" />}
                                            <span className="text-[10px] font-mono text-zinc-500">{latency}</span>
                                        </div>
                                    </div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">{tier.name}</h4>
                                    <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-zinc-600">
                                        <span>{tier.provider}</span>
                                        {isFailing ? (
                                            <span className="text-rose-500 font-bold uppercase text-[8px]">Critically Degraded</span>
                                        ) : tier.success && tier.success > 0 ? (
                                            <CheckCircle2 size={10} className="text-emerald-500" />
                                        ) : (
                                            <div className="w-2.5 h-2.5 rounded-full border border-zinc-700" />
                                        )}
                                    </div>

                                    {/* Priority Controls */}
                                    <div className="mt-4 flex flex-col gap-2 border-t border-zinc-800/50 pt-3 opacity-60 hover:opacity-100 transition-opacity">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Priority</span>
                                            <span className={`text-[8px] font-black uppercase ${currentPriority === 'HIGH' ? 'text-emerald-400' : currentPriority === 'HIBERNATED' ? 'text-amber-400' : 'text-zinc-600'}`}>{currentPriority}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            {['HIGH', 'HIBERNATED', 'OFF'].map((p) => (
                                                <button
                                                    key={p}
                                                    disabled={!!updating}
                                                    onClick={() => updatePriority(tier.provider.toLowerCase(), p)}
                                                    className={`flex-1 py-1 text-[8px] font-black uppercase rounded border transition-all ${
                                                        currentPriority === p 
                                                            ? (p === 'HIGH' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : p === 'HIBERNATED' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-white/10 border-white/20 text-white')
                                                            : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-600 hover:border-zinc-500'
                                                    } ${updating === `${tier.provider.toLowerCase()}-${p}` ? 'animate-pulse opacity-50' : ''}`}
                                                >
                                                    {p.substring(0, 4)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="p-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/40">
                             <h4 className="text-[10px] font-black text-zinc-600 uppercase mb-3 flex items-center gap-2"><Activity size={10} /> Neural Context Buffer</h4>
                             <div className="space-y-4">
                                <div className="flex items-end justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-zinc-500 uppercase font-black">History depth</span>
                                        <span className="text-xl font-black text-white">{stats?.memoryCount || 0} / 12</span>
                                    </div>
                                    <div className="flex gap-0.5 h-8 items-end">
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <div 
                                                key={i} 
                                                className={`w-1.5 rounded-t-sm transition-all duration-500 ${
                                                    i < (stats?.memoryCount || 0) 
                                                        ? 'bg-indigo-500 h-full' 
                                                        : 'bg-zinc-800 h-1'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="p-2 bg-black/40 border border-zinc-800/50 rounded flex items-center justify-between">
                                    <span className="text-[9px] text-zinc-600 uppercase font-bold">Compression Status</span>
                                    <span className="text-[9px] text-indigo-400 font-black">DYNAMIC-L3</span>
                                </div>
                                <div className="p-2 bg-black/40 border border-zinc-800/50 rounded flex items-center justify-between">
                                    <span className="text-[9px] text-zinc-600 uppercase font-bold">Semantic Cache</span>
                                    <span className="text-[9px] text-emerald-500 font-black">{stats?.cacheSize || 0} ENTRIES</span>
                                </div>
                             </div>
                        </div>

                        <div className="p-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/40">
                             <h4 className="text-[10px] font-black text-zinc-600 uppercase mb-3 flex items-center gap-2"><AlertTriangle size={10} /> Neural Conflicts</h4>
                             <div className="space-y-2">
                                {(stats as any)?.lastError && (
                                    <div className="p-2 mb-2 bg-rose-500/10 border border-rose-500/20 rounded text-[9px] text-rose-400 font-mono break-words">
                                        ERR: {(stats as any).lastError}
                                    </div>
                                )}
                                {stats?.errorTypes && Object.entries(stats.errorTypes).length > 0 ? (
                                    Object.entries(stats.errorTypes).map(([type, count]) => (
                                        <div key={type} className="flex items-center justify-between">
                                            <span className="text-[9px] text-zinc-500 font-mono truncate max-w-[120px]">{type}</span>
                                            <span className="text-[10px] text-rose-400 font-bold">{count}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[9px] text-zinc-700 italic">No neural collapse detected.</p>
                                )}
                             </div>
                        </div>
                    </div>

                        {/* Charts & Metrics */}
                        <div className="lg:col-span-3 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#0C0C0E] border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                            <Activity size={14} className="text-fuchsia-400" /> Latency Pulse (ms)
                                        </h4>
                                        <span className="text-xs font-mono text-white">{stats?.lastLatency || 0}ms</span>
                                    </div>
                                    <div className="h-40 w-full relative z-10">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={history}>
                                                <defs>
                                                    <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                                <XAxis dataKey="time" hide />
                                                <YAxis hide domain={[0, 'auto']} />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px', fontSize: '9px' }}
                                                    itemStyle={{ color: '#d946ef' }}
                                                />
                                                <Area type="monotone" dataKey="latency" stroke="#d946ef" fillOpacity={1} fill="url(#colorLat)" isAnimationActive={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-[#0C0C0E] border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                                        <BarChart3 size={14} className="text-indigo-400" /> Provider Distribution
                                    </h4>
                                    <div className="flex gap-6 items-center relative z-10">
                                        <div className="h-32 w-32 shrink-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={30}
                                                        outerRadius={45}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            {pieData.filter(d => d.name !== 'Standby').map((entry, index) => (
                                                <div key={entry.name} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                        <span className="text-[10px] text-zinc-500 uppercase font-bold">{entry.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-mono text-white">{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* System Roadmap */}
                            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/20">
                                            <History size={24} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white italic tracking-tight">SYSOPS ROADMAP</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em]">Project Integrity Cycle</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <CheckCircle2 size={10} /> Sovereign Integrity Verified
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="w-[100%] h-full bg-gradient-to-r from-emerald-500 to-indigo-500 shadow-[0_0_10px_#10b981]" />
                                            </div>
                                            <span className="text-xs font-black text-emerald-500">100%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                    {[
                                        { task: 'Unified Neural Pipeline', status: 'completed', desc: 'Sovereign fallback mechanism with multi-tier redundancy.' },
                                        { task: 'Context-Aware Relay', status: 'completed', desc: 'Hybrid Logic intent detection for optimized routing.' },
                                        { task: 'Privacy Shield & PII Masking', status: 'completed', desc: 'Deep data sanitization before cloud inference.' },
                                        { task: 'Dynamic Context Compression', status: 'completed', desc: 'Automatic token surgery for window optimization.' },
                                        { task: 'Real-time Cost & Token Telemetry', status: 'completed', desc: 'Precision estimation with USD convergence tracking.' },
                                        { task: 'Self-Correction Healer 2.0', status: 'completed', desc: 'Hardware-level failover and JSON pattern recovery.' }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:border-zinc-700 transition-all hover:bg-zinc-800/50 group">
                                            <div className={`mt-1 p-1.5 rounded-lg border shadow-lg ${
                                                item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5' :
                                                item.status === 'in-progress' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-indigo-500/5' : 
                                                'bg-zinc-800 text-zinc-600 border-zinc-700 shadow-none'
                                            }`}>
                                                {item.status === 'completed' ? <CheckCircle2 size={16} /> : 
                                                 item.status === 'in-progress' ? <Zap size={16} className="animate-pulse" /> : 
                                                 <Circle size={16} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-black uppercase tracking-tight ${item.status === 'pending' ? 'text-zinc-600' : 'text-zinc-200'}`}>{item.task}</span>
                                                </div>
                                                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        {/* Telemetry Log View */}
                        <div className="bg-[#0C0C0E] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-64">
                            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/10">
                                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <Terminal size={14} /> LIVE_TELEMETRY_STREAM
                                </h4>
                                <div className="flex items-center gap-4 text-[9px] font-mono text-zinc-500">
                                     <span className="flex items-center gap-1"><Search size={10} /> HEALER: ACTIVE</span>
                                     <span className="flex items-center gap-1"><Database size={10} /> CACHE: ENABLED</span>
                                </div>
                            </div>
                            <div className="flex-1 p-4 font-mono text-[10px] space-y-1 overflow-y-auto custom-scrollbar bg-black/20">
                                 <p className="text-emerald-500/80">[BOOT] NeuralResiliency v2.0-SOVEREIGN initialization complete.</p>
                                 <p className="text-zinc-600">[BOOT] Intent-Relay armed (Hybrid Logic Detection).</p>
                                 <p className="text-zinc-600">[BOOT] PII-Shield active (Sanitization Layer).</p>
                                 <p className="text-zinc-600">[BOOT] Context-Compactor active (Token Window Management).</p>
                                 {logs.map((log, i) => (
                                     <p key={i} className="text-zinc-400">
                                         <span className="text-zinc-700">&gt;</span> {log}
                                     </p>
                                 ))}
                                 <p className="text-zinc-500 animate-pulse cursor-default">_ Listening for sovereign neural events...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/10 flex items-center justify-between">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-[9px] text-zinc-500 uppercase font-black">
                        <Shield className="text-emerald-500" size={12} /> Privacy: Enforced
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-zinc-500 uppercase font-black">
                        <BarChart3 className="text-indigo-400" size={12} /> Agnosticism: 100%
                    </div>
                </div>
                <div className="text-[9px] text-zinc-600 font-mono italic">
                    AUTO_HEALING_PROTOCOLS: VERIFIED
                </div>
            </div>
        </div>
    );
};

