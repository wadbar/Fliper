import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Cpu, Zap, Activity, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useKernel } from '../../contexts/KernelContext';

interface LogEntry {
  type: 'incoming' | 'system' | 'ai' | 'error';
  content: string;
  timestamp: string;
}

export const KernelShellApp: React.FC = () => {
  const { dispatch } = useKernel();
  const [logs, setLogs] = useState<LogEntry[]>([
    { type: 'system', content: 'FliperOS Kernel v2.6.0-PRO initialized.', timestamp: new Date().toLocaleTimeString() },
    { type: 'system', content: 'Neural Bridge connected. Awaiting natural language input.', timestamp: new Date().toLocaleTimeString() },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (type: LogEntry['type'], content: string) => {
    setLogs(prev => [...prev, { type, content, timestamp: new Date().toLocaleTimeString() }]);
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userQuery = input.trim();
    addLog('incoming', userQuery);
    setInput('');

    // Native Command Bypass
    if (userQuery.toLowerCase() === 'clear') {
       setLogs([]);
       return;
    }

    setIsProcessing(true);

    try {
       // Real Network Telemetry Log
       addLog('system', 'NET_DISPATCH: Opening secure semantic tunnel...');

       // AI Processed Command via backend API
       const aiRes = await fetch('/api/ai/intent', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ prompt: userQuery })
       });
       
       if (!aiRes.ok) throw new Error(`API_FAULT: ${aiRes.status}`);
       const intent = await aiRes.json();
       
       if (intent.acao === 'error') {
          addLog('error', intent.resumo_ia || 'Falha crítica no processador neural.');
          if (intent.resumo_ia?.includes('Circuit Breaker')) {
             addLog('system', 'HEURISTICS_FALLBACK: Resolving via local kernel patterns...');
             const words = userQuery.toLowerCase();
             if (words.includes('process') || words.includes('ram')) {
                 addLog('ai', 'Detectado interesse em monitoramento. Recomendo abrir [System Monitor].');
             } else if (words.includes('jog') || words.includes('game') || words.includes('rom')) {
                 addLog('ai', 'Detectado interesse em jogos. Ativando [Fliper Store] ou [Game Manager].');
             } else if (words.includes('windows') || words.includes('exe')) {
                 addLog('ai', 'Detectada intenção de compatibilidade Windows. Camada [WINE_PROTON_V9] disponível no Hub.');
             } else if (words.includes('android') || words.includes('apk')) {
                 addLog('ai', 'Detectada intenção Mobile. Ativando subsistema [Waydroid] via Kernel Bridge.');
             } else if (words.includes('linux') || words.includes('soft') || words.includes('app')) {
                 addLog('ai', 'Compatibilidade Universal ativa. Verifique seccionamento de pacotes em [App Hub].');
             }
          }
       } else {
          addLog('ai', intent.resumo_ia);
          addLog('system', `ID_INTENT: [${intent.acao}] | TARGET: [${intent.categoria}] | QUERY: [${intent.termo_busca}]`);
          
          // IPC DISPATCH
          if (intent.acao === 'download') {
             dispatch('trigger_download', { query: intent.termo_busca, category: intent.categoria });
             dispatch('open_window', 'store');
          } else if (intent.acao === 'search') {
             dispatch('trigger_search', { query: intent.termo_busca, category: intent.categoria });
             dispatch('open_window', 'store');
          } else if (intent.acao === 'launch') {
             dispatch('open_window', 'gameManager');
          } else if (intent.acao === 'settings') {
             dispatch('open_window', 'settings');
          } else if (intent.acao === 'sys_report') {
             // Execute real system command matrix
             try {
               // 1. Authenticate to get JWT token
               const authRes = await fetch('/api/auth', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ username: 'admin', password: 'admin' })
               });
               
               if (!authRes.ok) throw new Error(`AUTH_FAULT: ${authRes.status}`);
               const authData = await authRes.json();
               
               if (!authData.token) throw new Error('Authentication failed (No JWT allocated)');
               
               // 2. Perform secured Kernel Execution
               const res = await fetch('/api/system/kernel/exec', {
                 method: 'POST',
                 headers: { 
                   'Content-Type': 'application/json',
                   'Authorization': `Bearer ${authData.token}`
                 },
                 body: JSON.stringify({ command: 'uptime && free -m && df -h /' })
               });
               
               if (!res.ok) throw new Error(`EXEC_FAULT: ${res.status}`);
               const data = await res.json();
               
               if (data.output) {
                 const lines = data.output.split('\n');
                 lines.forEach((l: string) => { if (l.trim()) addLog('system', `> ${l.trim()}`) });
               } else if (data.error) {
                 addLog('error', `KERNEL_ERR: ${data.error}`);
               }
             } catch (e: any) {
               addLog('error', `Falha ao acessar subsystem de telemetria: ${e.message}`);
             }
          }
       }
    } catch (err: any) {
       addLog('error', `Kernel Exception: IPC_TIMEOUT or Pipeline Fault (${err.message}). Verifique sua conexão.`);
    } finally {
       setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-zinc-300 font-mono text-[11px] relative overflow-hidden select-text">
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-10" />
      
      {/* Header Info */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 z-20">
         <div className="flex items-center gap-2">
            <Cpu size={14} className="text-emerald-500 animate-pulse" />
            <span className="font-bold tracking-widest text-[10px] uppercase">Kernel AI Shell</span>
         </div>
         <div className="flex items-center gap-4 text-zinc-500">
            <div className="flex items-center gap-1">
               <Activity size={12} />
               <span>IO_WAIT: 0.02ms</span>
            </div>
            <div className="flex items-center gap-1">
               <Zap size={12} className="text-amber-500" />
               <span>BRIDGE_OK</span>
            </div>
         </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2 relative z-0 custom-scrollbar">
        {logs.map((log, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex flex-col gap-1 ${log.type === 'error' ? 'text-rose-400' : ''}`}
          >
            <div className="flex items-center gap-2">
               <span className="text-zinc-600">[{log.timestamp}]</span>
               {log.type === 'incoming' && <span className="text-emerald-400 font-bold">USER_REQ:</span>}
               {log.type === 'system' && <span className="text-sky-400 font-bold">SYS:</span>}
               {log.type === 'ai' && <span className="text-indigo-400 font-bold flex items-center gap-1"><Sparkles size={10} /> NEURAL_OUT:</span>}
               {log.type === 'error' && <span className="text-rose-500 font-bold flex items-center gap-1"><ShieldAlert size={10} /> PANIC:</span>}
               <span className={`break-words ${log.type === 'ai' ? 'italic' : ''}`}>{log.content}</span>
            </div>
          </motion.div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 text-indigo-400 italic">
             <Loader2 size={12} className="animate-spin" />
             <span>Processando pacote neural...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleCommand} className="p-4 bg-black/40 border-t border-zinc-800 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-emerald-500 font-bold">
            <span>fliperos</span>
            <span className="text-zinc-600">@</span>
            <span>kernel</span>
            <span className="text-zinc-500">:</span>
            <span className="text-sky-400">~</span>
            <span className="text-zinc-400">$</span>
          </div>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-700 disabled:opacity-50"
            placeholder="Digite sua intenção (EX: 'baixe mortal kombat para snes')"
            autoFocus
            spellCheck={false}
          />
        </div>
      </form>
    </div>
  );
};
