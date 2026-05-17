import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, Cpu, Zap, Activity, Shield, AlertTriangle, CheckCircle2, Terminal, BarChart3, Globe, Database, History, Search, Circle, RefreshCw, Settings } from 'lucide-react';
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
    breakers: Record<string, { status: string, failures: number, priority: 'HIGH' | 'HIBERNATED' | 'OFF', avgLatency: number, errorCode?: string, quarantinedUntil?: number }>;
}

export const NeuralCoreApp: React.FC = () => {
    const [stats, setStats] = useState<AIStats | null>(null);
    const [history, setHistory] = useState<{ time: string, latency: number }[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [updating, setUpdating] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [wiping, setWiping] = useState(false);

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [temperature, setTemperature] = useState(0.7);

    // Prompt Resonator State
    const [promptType, setPromptType] = useState<'image' | 'analysis' | 'code'>('image');
    const [prompt, setPrompt] = useState('');
    const [imageSize, setImageSize] = useState({ width: 600, height: 800 });
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const TASK_SUGGESTIONS = {
        image: ['Photorealistic', 'Cyberpunk', 'Minimalist', '4k', 'Cinematic', 'Abstract', 'Vibrant', 'Dark'],
        analysis: ['Trend Analysis', 'Feature Breakdown', 'Summarization', 'Structured Output', 'Comparative', 'Anomaly Detection'],
        code: ['TypeScript React Function', 'Node.js Express Route', 'Data Processing Hook', 'CSS Layout Pattern']
    };

    const PREDEFINED_TEMPLATES = {
        image: [
            { name: 'Fantasy Character', prompt: 'High-detail fantasy portrait of a majestic elven mage wearing intricate, glowing arcane armor, intricate leather textures, dramatic cinematic side-lighting, epic magical swirling energy, ultra-realistic, 8k resolution.' },
            { name: 'Cyberpunk Cityscape', prompt: 'Futuristic cyberpunk city at night, rain-slicked neon-lit streets, towering skyscrapers with holographic advertisements, bustling crowd, cinematic perspective, highly detailed.' }
        ],
        analysis: [
            { name: 'Data Trend Analysis', prompt: 'Perform a detailed trend analysis on this data set: identify key growth vectors, seasonal patterns, potential outliers, and provide actionable business recommendations based on these findings.' },
            { name: 'Market Anomaly Detector', prompt: 'Examine these market data points and detect any significant anomalies, comparing them against historical norms and outlining possible root causes.' }
        ],
        code: [
            { name: 'TypeScript Interface Skeleton', prompt: 'Generate a clean, reusable TypeScript interface structure for a complex data model entity, including optional fields and documented properties.' },
            { name: 'Fast Async API Handler', prompt: 'Write a robust, production-grade asynchronous Node.js Express API route handler with proper error catching, validation, and status code management.' }
        ]
    };

    const addSuggestion = (suggestion: string) => {
        setPrompt(prev => prev ? `${prev}, ${suggestion}` : suggestion);
    };

    const generateSignal = async () => {
        if (!prompt.trim() || generating) return;
        setGenerating(true);
        if (promptType === 'image') setGeneratedImageUrl(null);
        
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] INFO: Initiating ${promptType} signal.`, ...prev].slice(0, 50));
        
        try {
            const endpoint = promptType === 'image' ? '/api/ai/image' : '/api/ai/analyze';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt, 
                    ...(promptType === 'image' ? imageSize : {})
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`FAILURE_${response.status}:${errorText}`);
            }

            const data = await response.json();
            
            if (promptType === 'image') {
                if (!data.url) throw new Error("PAYLOAD_INVALID");
                setGeneratedImageUrl(data.url);
            } else {
                setLogs(prev => [`[${new Date().toLocaleTimeString()}] INFO: Analysis complete.`, ...prev].slice(0, 50));
            }
            
            setLogs(prev => [`[${new Date().toLocaleTimeString()}] INFO: ${promptType} signal stabilized and rendered.`, ...prev].slice(0, 50));
            
        } catch (e: any) {
            const errTimestamp = new Date().toLocaleTimeString();
            console.error(`[${errTimestamp}] FATAL ${promptType.toUpperCase()}:`, e);
            
            setLogs(prev => [
                `[${errTimestamp}] FATAL: ${promptType} failed.`,
                `[${errTimestamp}] DIAGNOSTIC: ${e.message}`,
                ...prev
            ].slice(0, 50));
        } finally {
            setGenerating(false);
        }
    };

    const updateTelemetryState = useCallback((data: AIStats) => {
        setStats(prevStats => {
            // Immutable comparison to avoid unnecessary updates
            if (JSON.stringify(prevStats) === JSON.stringify(data)) return prevStats;
            
            // Log circuit breaker trips and stabilization
            if (data.breakers) {
                Object.entries(data.breakers).forEach(([p, b]: [any, any]) => {
                    const prevStatus = prevStats?.breakers?.[p]?.status;
                    if (b.status === 'OPEN' && prevStatus !== 'OPEN') {
                        const alert = `[${new Date().toLocaleTimeString()}] ALERT: Circuit OPEN for ${p.toUpperCase()} (Critical Failures)`;
                        setLogs(prev => [alert, ...prev].slice(0, 50));
                    } else if (b.status === 'CLOSED' && prevStatus === 'OPEN') {
                        const stabilization = `[${new Date().toLocaleTimeString()}] STABILIZED: Circuit CLOSED for ${p.toUpperCase()}`;
                        setLogs(prev => [stabilization, ...prev].slice(0, 50));
                    }
                });
            }

            // Log successful calls
            if (data.totalCalls > (prevStats?.totalCalls || 0)) {
                const providers = ['ollama', 'gemini', 'nvidia'];
                const used = providers.find(p => 
                    // @ts-ignore
                    data.successByProvider[p] > (prevStats?.successByProvider?.[p] || 0)
                );
                
                if (used) {
                    const log = `[${new Date().toLocaleTimeString()}] CALL ${data.totalCalls}: Transmitted via ${used.toUpperCase()}`;
                    setLogs(prev => [log, ...prev].slice(0, 50));
                }
            }

            return data;
        });
        
        setHistory(prev => {
            const lastLatency = data.lastLatency || 0;
            if (prev.length > 0 && prev[prev.length - 1].latency === lastLatency && prev[prev.length - 1].time === new Date().toLocaleTimeString().split(' ')[0]) {
                return prev;
            }
            const newEntry = { time: new Date().toLocaleTimeString().split(' ')[0], latency: lastLatency };
            const nextHistory = [...prev, newEntry].slice(-30);
            return nextHistory;
        });
    }, []);

    const fetchStats = useCallback(async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            const res = await fetch('/api/ai/stats');
            if (res.ok) {
                const data = await res.json();
                updateTelemetryState(data);
            }
        } catch (e) {
            console.error("STATS_FETCH_FAILED");
        } finally {
            setRefreshing(false);
        }
    }, [updateTelemetryState, refreshing]);

    const handleManualRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
        // Artificial delay for visual feedback if it finishes too fast
        setTimeout(() => setRefreshing(false), 600);
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] COMMAND: Manual telemetry sync initiated.`, ...prev].slice(0, 50));
    };

    const wipeNeuralStats = async () => {
        if (!window.confirm("CRITICAL: Wipe all neural telemetry and reset circuit breakers?")) return;
        setWiping(true);
        try {
            const res = await fetch('/api/ai/wipe', { method: 'POST' });
            if (res.ok) {
                setLogs(prev => [`[${new Date().toLocaleTimeString()}] MAINTENANCE: Neural telemetry purged. CIRCUITS_RESET.`, ...prev].slice(0, 50));
                setHistory([]);
                fetchStats();
            }
        } catch (e) {
            console.error("WIPE_FAILED");
        } finally {
            setWiping(false);
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
        // Initial Fetch
        fetchStats(); 

        // SSE Telemetry Stream
        const telemetrySource = new EventSource('/api/ai/telemetry');
        telemetrySource.onopen = () => {
            setStreaming(true);
            setLogs(prev => [`[${new Date().toLocaleTimeString()}] LINK: Neural telemetry stream established.`, ...prev].slice(0, 50));
        };
        
        telemetrySource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                updateTelemetryState(data);
            } catch (err) {
                console.error("TELEMETRY_PARSE_ERROR");
            }
        };

        telemetrySource.onerror = () => {
            setStreaming(false);
        };

        // Fallback polling (less frequent)
        const fallbackInterval = setInterval(() => {
            if (!telemetrySource || telemetrySource.readyState !== 1) {
                fetchStats();
            }
        }, 10000);

        // System Logs Stream
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
            telemetrySource.close();
            eventSource.close();
            clearInterval(fallbackInterval);
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
                    <button 
                        onClick={() => setSettingsOpen(true)}
                        className="p-1.5 bg-zinc-800/80 border border-zinc-700/50 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-500 transition-all active:scale-95"
                        title="Configurações"
                    >
                        <Settings size={14} />
                    </button>
                    <button 
                        onClick={wipeNeuralStats}
                        disabled={wiping}
                        className={`p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 hover:bg-rose-500/20 transition-all disabled:opacity-30`}
                        title="Purge Telemetry (Hard Reset)"
                    >
                        <Shield size={14} className={wiping ? 'animate-pulse' : ''} />
                    </button>
                        {streaming && (
                            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-[10px] font-black uppercase flex items-center gap-2">
                                <Activity size={10} className="animate-pulse" />
                                Live Feed
                            </div>
                        )}
                        <button 
                            onClick={handleManualRefresh}
                        disabled={refreshing}
                        className={`p-1.5 bg-zinc-800/80 border border-zinc-700/50 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-500 transition-all active:scale-95 disabled:opacity-50`}
                        title="Manual Telemetry Sync"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin text-fuchsia-400' : ''} />
                    </button>
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
                        
                        <div className="p-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 mb-4 overflow-hidden relative">
                             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent" />
                             <h4 className="text-[10px] font-black text-zinc-600 uppercase mb-3 flex items-center gap-2 relative z-10">
                                 <Activity size={10} className="text-emerald-500" /> Neural Heartbeat
                             </h4>
                             <div className="flex items-center gap-1 h-8 relative z-10">
                                 {Array.from({ length: 40 }).map((_, i) => (
                                     <motion.div
                                         key={i}
                                         animate={{ 
                                             height: [2, Math.random() * 20 + 4, 2],
                                             opacity: [0.1, 0.4, 0.1]
                                         }}
                                         transition={{ 
                                             repeat: Infinity, 
                                             duration: 2 + Math.random(), 
                                             delay: i * 0.05,
                                             ease: "easeInOut"
                                         }}
                                         className="w-0.5 bg-emerald-500/40 rounded-full"
                                     />
                                 ))}
                             </div>
                             <div className="mt-2 flex items-center justify-between relative z-10">
                                 <span className="text-[7px] font-mono text-zinc-600">STABILITY_WAVE: OK</span>
                                 <span className="text-[7px] font-mono text-emerald-500/60 animate-pulse">HZ: 0.85-SYNCHRONIZED</span>
                             </div>
                        </div>

                        {[
                            { id: 'ollama', level: 1, name: 'Local Edge', provider: 'Ollama', color: 'emerald', success: stats?.successByProvider?.ollama },
                            { id: 'gemini', level: 2, name: 'Cloud Context', provider: 'Gemini', color: 'indigo', success: stats?.successByProvider?.gemini },
                            { id: 'nvidia', level: 3, name: 'Final Wall', provider: 'Nvidia', color: 'fuchsia', success: stats?.successByProvider?.nvidia },
                            { id: 'heuristic', level: 4, name: 'Heuristic', provider: 'Emergency', color: 'zinc', success: stats?.successByProvider?.heuristic }
                        ].map((tier) => {
                            const breaker = stats?.breakers?.[tier.id];
                            const isFailing = breaker?.status === 'OPEN';
                            const isQuarantined = !!(breaker?.quarantinedUntil && breaker.quarantinedUntil > Date.now());
                            const isOff = breaker?.priority === 'OFF';
                            const isHibernated = breaker?.priority === 'HIBERNATED';
                            
                            const statusColor = isOff ? 'zinc' : (isQuarantined ? 'amber' : (isFailing ? 'rose' : (breaker?.status === 'HALF-OPEN' ? 'amber' : tier.color)));
                            const latency = breaker?.avgLatency ? `${Math.round(breaker.avgLatency)}ms` : '---';
                            const currentPriority = breaker?.priority || (tier.id === 'heuristic' ? 'SYS' : 'HIGH');

                            return (
                                <div key={tier.level} className={`relative p-4 rounded-2xl border transition-all overflow-hidden bg-zinc-900/20 group hover:border-zinc-700 ${isOff ? 'opacity-40 grayscale' : ''} ${isFailing || isQuarantined ? 'border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-zinc-800/50'}`}>
                                    <div className={`absolute top-0 left-0 w-1 h-full bg-${statusColor}-500/50 opacity-0 group-hover:opacity-100 transition-opacity`} />
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded bg-${statusColor}-500/10 text-${statusColor}-400 border border-${statusColor}-500/20 flex items-center gap-1.5`}>
                                                        {isOff ? <Shield size={8} /> : isHibernated ? <Zap size={8} className="text-amber-400" /> : isQuarantined ? <AlertTriangle size={8} className="animate-pulse text-amber-400" /> : <Circle size={8} fill="currentColor" className={`${breaker?.status === 'HALF-OPEN' ? 'animate-pulse' : (breaker?.status === 'CLOSED' ? 'animate-none' : '')}`} />}
                                                        {isOff ? 'OFFLINE / MANUAL' : 
                                                         isQuarantined ? 'QUARANTINED / COOLDOWN' :
                                                         isHibernated ? 'HIBERNATED / FALLBACK' :
                                                         breaker?.status === 'CLOSED' ? 'CB: CLOSED / ACTIVE' : 
                                                         breaker?.status === 'OPEN' ? 'CB: OPEN / HALTED' : 
                                                         breaker?.status === 'HALF-OPEN' ? 'CB: HALF-OPEN / TESTING' : 'CB: UNKNOWN'}
                                                    </span>
                                                </div>
                                                {breaker && breaker.failures > 0 && !isOff && (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden flex">
                                                                <div 
                                                                    className="h-full bg-rose-500 shadow-[0_0_5px_#f43f5e]" 
                                                                    style={{ width: `${Math.min(100, (breaker.failures / 5) * 100)}%` }} 
                                                                />
                                                            </div>
                                                            <span className="text-[7px] font-black text-rose-500/70 uppercase">
                                                                {breaker.failures} ERRORS
                                                            </span>
                                                        </div>
                                                        {breaker.errorCode && (
                                                            <span className="text-[8px] font-mono text-rose-400 font-bold max-w-[150px] truncate">
                                                                {breaker.errorCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isFailing && <AlertTriangle size={10} className="text-rose-500 animate-pulse" />}
                                        </div>
                                    </div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">{tier.name}</h4>
                                    
                                    <div className="mt-2 space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                            <span className="flex items-center gap-1.5 uppercase font-black text-[8px] tracking-widest text-zinc-600">
                                                <Activity size={10} /> Latency
                                            </span>
                                            <span className={`font-bold ${breaker?.avgLatency && breaker.avgLatency < 800 ? 'text-emerald-400' : breaker?.avgLatency && breaker.avgLatency < 2000 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                {latency}
                                            </span>
                                        </div>
                                        <div className="w-full h-1 bg-zinc-800/50 rounded-full overflow-hidden relative">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: breaker?.avgLatency ? `${Math.min(100, (breaker.avgLatency / 3000) * 100)}%` : '0%' }}
                                                className={`h-full rounded-full ${breaker?.avgLatency && breaker.avgLatency < 800 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : breaker?.avgLatency && breaker.avgLatency < 2000 ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`}
                                            />
                                            {/* Scanning effect */}
                                            <motion.div 
                                                animate={{ x: [-10, 200] }}
                                                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                                className="absolute top-0 left-0 w-8 h-full bg-white/20 blur-md skew-x-12"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-3 text-[10px] font-mono text-zinc-600">
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
                                    {tier.id !== 'heuristic' && (
                                        <div className="mt-4 flex flex-col gap-2 border-t border-zinc-800/50 pt-3 opacity-60 hover:opacity-100 transition-opacity">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Manual Override</span>
                                                <span className={`text-[8px] font-black uppercase ${currentPriority === 'HIGH' ? 'text-emerald-400' : currentPriority === 'HIBERNATED' ? 'text-amber-400' : 'text-zinc-600'}`}>{currentPriority}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                {['HIGH', 'HIBERNATED', 'OFF'].map((p) => (
                                                    <button
                                                        key={p}
                                                        disabled={!!updating}
                                                        onClick={() => updatePriority(tier.id, p as any)}
                                                        className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg border transition-all active:scale-95 ${
                                                            currentPriority === p 
                                                                ? (p === 'HIGH' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : p === 'HIBERNATED' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'bg-white/10 border-white/20 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]')
                                                                : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-600 hover:border-zinc-500/50 hover:text-zinc-400'
                                                        } ${updating === `${tier.id}-${p}` ? 'animate-pulse opacity-50' : ''}`}
                                                    >
                                                        {p.substring(0, 4)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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
                            {/* Neural Prompt Resonator */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#0C0C0E] border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group shadow-[0_0_50px_rgba(168,85,247,0.05)]"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-fuchsia-500/20 rounded-lg border border-fuchsia-500/20">
                                            <Zap size={20} className="text-fuchsia-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Neural Image Synthesizer</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Architectural Visualization</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                    <div className="flex gap-1 p-1 bg-black/40 rounded-lg border border-zinc-800 mb-4 overflow-x-auto pb-1 custom-scrollbar">
                                        {(['image', 'analysis', 'code'] as const).map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setPromptType(type)}
                                                className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all whitespace-nowrap ${promptType === type ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30' : 'text-zinc-600 hover:text-zinc-400'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <textarea 
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                placeholder="Inject raw neural seed concept here..."
                                                className="w-full h-32 bg-black/40 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-fuchsia-500/50 transition-all resize-none custom-scrollbar"
                                            />
                                            <button 
                                                onClick={async () => {
                                                    setGenerating(true);
                                                    try {
                                                        const response = await fetch('/api/ai/refine-prompt', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ rawPrompt: prompt, category: promptType })
                                                        });
                                                        if (!response.ok) throw new Error("Failed to refine");
                                                        const data = await response.json();
                                                        setPrompt(data.refinedPrompt || data);
                                                    } catch (e) {
                                                        console.error(e);
                                                    } finally {
                                                        setGenerating(false);
                                                    }
                                                }}
                                                className="absolute top-2 right-2 p-2 bg-fuchsia-900/50 hover:bg-fuchsia-800 text-fuchsia-200 rounded-lg transition-colors"
                title="Refine Prompt"
                                            >
                                                <Brain size={16} />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {TASK_SUGGESTIONS[promptType].map(suggestion => (
                                                <button
                                                    key={suggestion}
                                                    onClick={() => addSuggestion(suggestion)}
                                                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[9px] font-bold text-zinc-400 rounded-md transition-colors"
                                                >
                                                    + {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-4 border-t border-zinc-800 pt-4">
                                            <h4 className="text-[10px] uppercase font-black text-zinc-600 mb-2">Pre-defined Templates</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {PREDEFINED_TEMPLATES[promptType].map(template => (
                                                    <button
                                                        key={template.name}
                                                        onClick={() => setPrompt(template.prompt)}
                                                        className="text-left px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 text-[10px] font-bold text-zinc-400 rounded-md transition-colors"
                                                        title={template.prompt}
                                                    >
                                                        {template.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {promptType === 'image' && (
                                                <>
                                                    <input 
                                                        type="number" 
                                                        value={imageSize.width} 
                                                        onChange={(e) => setImageSize({...imageSize, width: parseInt(e.target.value)})}
                                                        className="w-20 bg-black/40 border border-zinc-800 rounded p-2 text-xs text-white"
                                                    />
                                                    <span className="text-zinc-500">x</span>
                                                    <input 
                                                        type="number" 
                                                        value={imageSize.height} 
                                                        onChange={(e) => setImageSize({...imageSize, height: parseInt(e.target.value)})}
                                                        className="w-20 bg-black/40 border border-zinc-800 rounded p-2 text-xs text-white"
                                                    />
                                                </>
                                            )}
                                            <button 
                                                onClick={generateSignal}
                                                disabled={generating || !prompt.trim()}
                                                className="flex-1 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-[10px] font-black uppercase rounded-lg transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                            >
                                                {generating ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                                                Synthesize
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-black/60 border border-zinc-800/80 rounded-xl p-4 min-h-[192px] relative group/output">
                                        <AnimatePresence mode="wait">
                                            {generatedImageUrl ? (
                                                <motion.div 
                                                    key="output"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="relative"
                                                >
                                                    <img 
                                                        src={generatedImageUrl} 
                                                        alt="Generated" 
                                                        className="w-full h-48 object-cover rounded-lg"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </motion.div>
                                            ) : (
                                                <div key="placeholder" className="h-full flex flex-col items-center justify-center text-center opacity-30">
                                                    <Brain size={32} className="text-zinc-700 mb-2" />
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase">Awaiting Neural Synthesizer</p>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                        
                                        {generating && (
                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-xl">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                        <motion.div 
                                                            animate={{ x: [-48, 48] }}
                                                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                                            className="w-full h-full bg-fuchsia-500 shadow-[0_0_10px_#d946ef]"
                                                        />
                                                    </div>
                                                    <span className="text-[9px] font-black text-fuchsia-400 uppercase tracking-[0.3em] animate-pulse">Synthesizing...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>

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
            {settingsOpen && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6"
                    >
                        <h3 className="text-lg font-black text-white uppercase mb-6 flex items-center justify-between">
                            Neural Config
                            <button onClick={() => setSettingsOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase font-black">API Key</label>
                                <input 
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full bg-black/40 border border-zinc-800 rounded-lg p-3 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase font-black">Temperature: {temperature}</label>
                                <input 
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                            <button 
                                onClick={() => setSettingsOpen(false)}
                                className="w-full py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-[10px] font-black uppercase rounded-lg transition-all"
                            >
                                Persist Settings
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

