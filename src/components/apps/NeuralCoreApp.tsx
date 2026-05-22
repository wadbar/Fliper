import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, Cpu, Zap, Activity, Shield, AlertTriangle, CheckCircle2, Terminal, BarChart3, Globe, Database, History, Search, Circle, RefreshCw, Settings, ChevronRight, Share2, Download, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const NeuralCoreApp: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [history, setHistory] = useState<{ time: string, latency: number }[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [generating, setGenerating] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

    // Mock telemetry sync
    useEffect(() => {
      const interval = setInterval(() => {
        setHistory(prev => {
          const next = [...prev, { time: new Date().toLocaleTimeString().split(' ')[0], latency: 200 + Math.random() * 800 }];
          return next.slice(-20);
        });
      }, 3000);
      return () => clearInterval(interval);
    }, []);

    const generateImage = async () => {
        if (!prompt.trim()) return;
        setGenerating(true);
        setGeneratedImageUrl(null);
        try {
            const res = await fetch('/api/ai/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, width: 1024, height: 1024 })
            });
            const data = await res.json();
            setGeneratedImageUrl(data.url);
        } catch (e) {
            console.error("GEN_FAULT");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="h-full bg-m3-surface text-m3-on-surface flex flex-col overflow-hidden relative selection:bg-m3-primary/30">
            {/* Ambient Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
               <div className="absolute top-0 right-0 w-full h-[600px] bg-gradient-to-b from-m3-primary/20 to-transparent blur-[120px]" />
            </div>

            {/* M3 Header */}
            <header className="p-8 border-b border-m3-outline/10 bg-m3-surface-variant/10 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[24px] bg-m3-primary flex items-center justify-center shadow-xl">
                        <Brain size={32} className="text-m3-on-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-widest uppercase italic">Neural Core</h1>
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-m3-primary animate-pulse" />
                           <p className="text-[10px] font-black text-m3-primary uppercase tracking-[0.2em]">Distributed Inference Engine</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                   <div className="m3-card bg-m3-surface-variant/30 px-6 py-2 border-m3-outline/20">
                      <p className="text-[9px] font-black text-m3-outline uppercase tracking-widest text-center">Avg Latency</p>
                      <p className="text-xl font-black text-white text-center">482ms</p>
                   </div>
                   <button className="m3-button-tonal p-4 rounded-full">
                      <RefreshCw size={20} />
                   </button>
                   <button className="m3-button-filled p-4 rounded-full shadow-lg shadow-m3-primary/20">
                      <Settings size={20} />
                   </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-10 no-scrollbar relative z-10">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
                    
                    {/* Left Rail: Node Status */}
                    <div className="xl:col-span-1 space-y-8">
                       <h3 className="text-xs font-black text-m3-outline uppercase tracking-[0.3em] px-2 flex items-center gap-3">
                          <Activity size={14} /> Propagation Stack
                       </h3>
                       
                       {[
                         { id: 'ollama', name: 'Edge Node 01', provider: 'Ollama', status: 'Optimal', color: 'text-emerald-400' },
                         { id: 'gemini', name: 'Cloud Node 05', provider: 'Gemini', status: 'Stable', color: 'text-m3-primary' },
                         { id: 'nvidia', name: 'Final Wall', provider: 'Nvidia', status: 'Halt', color: 'text-rose-500' }
                       ].map(node => (
                         <div key={node.id} className="m3-card p-6 bg-m3-surface-variant/5 border-m3-outline/5 hover:border-m3-primary/20 transition-all cursor-pointer group">
                            <div className="flex items-center justify-between mb-4">
                               <span className={`text-[10px] font-black uppercase italic ${node.color}`}>{node.provider}</span>
                               <div className="flex gap-1">
                                  {[1,2,3].map(i => <div key={i} className={`w-1 h-3 rounded-full ${node.status === 'Halt' ? 'bg-m3-error/30' : 'bg-m3-primary/30'} ${node.status !== 'Halt' ? 'animate-bounce' : ''}`} style={{ animationDelay: `${i*0.2}s` }} />)}
                               </div>
                            </div>
                            <h4 className="text-xl font-black text-white tracking-tighter uppercase mb-1">{node.name}</h4>
                            <div className="flex items-center justify-between">
                               <p className="text-[10px] font-black text-m3-outline uppercase tracking-widest">{node.status === 'Halt' ? 'Node Isolated' : 'Data Streaming'}</p>
                               <span className="text-[10px] font-black text-white opacity-50 italic">12ms</span>
                            </div>
                         </div>
                       ))}
                    </div>

                    {/* Center Context: Synthesizer */}
                    <div className="xl:col-span-3 space-y-10">
                       <div className="m3-card p-10 bg-m3-surface-variant/10 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-96 h-96 bg-m3-primary/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                          
                          <div className="flex items-center gap-6 mb-10">
                             <div className="p-4 bg-m3-primary/10 rounded-[20px] text-m3-primary">
                                <Zap size={32} />
                             </div>
                             <div>
                                <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Visual Ingestor</h2>
                                <p className="text-m3-on-surface-variant font-medium text-lg italic">Convert high-entropy thoughts into production vectors.</p>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                             <div className="space-y-6">
                                <div className="space-y-4">
                                   <label className="text-[10px] font-black text-m3-outline uppercase tracking-[0.3em] px-4">Inference Prompt</label>
                                   <textarea 
                                      value={prompt}
                                      onChange={(e) => setPrompt(e.target.value)}
                                      placeholder="Ex: Cyberpunk cityscape, rainy night, neon refraction..."
                                      className="w-full h-48 bg-m3-surface-variant/40 rounded-[32px] p-8 text-lg font-black text-white italic outline-none border border-m3-outline/10 focus:border-m3-primary/50 transition-all resize-none no-scrollbar"
                                   />
                                </div>
                                
                                <div className="flex gap-4">
                                   <button 
                                     onClick={generateImage}
                                     disabled={generating}
                                     className="m3-button-filled flex-1 py-6 rounded-full shadow-2xl shadow-m3-primary/30 flex items-center justify-center gap-3 overflow-hidden group"
                                   >
                                      {generating ? <RefreshCw size={24} className="animate-spin" /> : <Zap size={24} className="group-hover:scale-125 transition-transform" />}
                                      <span className="text-lg font-black uppercase italic tracking-tighter">{generating ? 'Synthesizing...' : 'Ignite Engine'}</span>
                                   </button>
                                   <button className="m3-button-tonal p-6 rounded-full">
                                      <Trash2 size={24} />
                                   </button>
                                </div>
                             </div>

                             <div className="relative aspect-square m3-card bg-m3-surface-variant/20 border-dashed border-m3-outline/20 flex items-center justify-center overflow-hidden">
                                <AnimatePresence mode="wait">
                                   {generatedImageUrl ? (
                                     <motion.img 
                                       key="img"
                                       initial={{ opacity: 0, scale: 0.9 }}
                                       animate={{ opacity: 1, scale: 1 }}
                                       src={generatedImageUrl}
                                       className="w-full h-full object-cover"
                                     />
                                   ) : (
                                     <motion.div 
                                       key="empty"
                                       initial={{ opacity: 0 }}
                                       animate={{ opacity: 1 }}
                                       className="text-center space-y-4"
                                     >
                                        <div className="w-20 h-20 rounded-full bg-m3-surface-variant/30 flex items-center justify-center mx-auto mb-4 border border-m3-outline/10">
                                           <Search size={32} className="text-m3-outline opacity-50" />
                                        </div>
                                        <p className="text-sm font-black text-m3-outline uppercase tracking-widest italic">Awaiting Genetic Seed</p>
                                     </motion.div>
                                   )}
                                </AnimatePresence>
                                
                                {generating && (
                                   <div className="absolute inset-0 bg-m3-surface/60 backdrop-blur-md flex items-center justify-center">
                                      <div className="flex flex-col items-center gap-6">
                                         <div className="w-1 w-full flex gap-1 justify-center">
                                            {[1,2,3,4,5].map(i => <div key={i} className="w-2 h-12 bg-m3-primary rounded-full animate-pulse" style={{ animationDelay: `${i*0.1}s` }} />)}
                                         </div>
                                         <p className="text-[10px] font-black text-m3-primary uppercase tracking-[0.4em] animate-pulse">Rendering V9 Context</p>
                                      </div>
                                   </div>
                                )}

                                {generatedImageUrl && (
                                   <div className="absolute bottom-6 right-6 flex gap-3">
                                      <button className="m3-button-tonal p-3 rounded-xl bg-black/50 backdrop-blur text-white hover:bg-m3-primary hover:text-m3-on-primary"><Download size={20} /></button>
                                      <button className="m3-button-tonal p-3 rounded-xl bg-black/50 backdrop-blur text-white hover:bg-m3-primary hover:text-m3-on-primary"><Share2 size={20} /></button>
                                   </div>
                                )}
                             </div>
                          </div>
                       </div>

                       {/* History / Logs Section */}
                       <div className="m3-card p-8 bg-m3-surface-variant/5">
                          <h3 className="text-xs font-black text-m3-outline uppercase tracking-[0.3em] mb-8 px-2">Neural Link Feed</h3>
                          <div className="m3-card bg-m3-surface-variant/20 p-6 font-mono text-xs text-white/50 space-y-4 h-64 overflow-y-auto no-scrollbar border-m3-outline/5 italic">
                             <p><span className="text-m3-primary mr-3 opacity-100">[0.00ms]</span> Establishing high-entropy tunnel...</p>
                             <p><span className="text-m3-primary mr-3 opacity-100">[1.42ms]</span> V9 Core Handshake: COMPLETED</p>
                             <p><span className="text-emerald-400 mr-3 opacity-100">[SUCCESS]</span> Propagation through Edge Node 01 verified.</p>
                             <p><span className="text-m3-outline mr-3">[TRACE]</span> Loading visual grammar for stable-diffusion-v4-hybrid...</p>
                             <p><span className="text-m3-primary mr-3 opacity-100">[HEARTBEAT]</span> Node health checking: 99.8% stability index.</p>
                             <p><span className="text-m3-error mr-3 opacity-100">[HALT]</span> Nvidia context dropped. Retrying via heuristic layer.</p>
                          </div>
                       </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
