import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Image as ImageIcon, Gamepad2, Settings, Cloud, Loader2, Search, Sparkles, Database, FileArchive, HardDrive, Cpu, Save, Upload, RefreshCw, Package } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { processKernelIntent } from '../core/ai';
import { KernelIntent } from '../core/ai/types';

interface DownloaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshGames?: () => void;
  inWindowMode?: boolean;
}

interface DownloadTask {
  id: string;
  type: string;
  name: string;
  status: 'queued' | 'downloading' | 'hashing' | 'compressing' | 'completed' | 'error';
  progress: number;
  message: string;
}

const TaskItem = React.memo(({ task }: { task: DownloadTask }) => (
  <div className="p-5 rounded-[24px] bg-m3-surface-variant/20 border border-m3-outline/5 flex flex-col gap-3 relative overflow-hidden shrink-0">
    <div 
      className={`absolute top-0 left-0 h-full opacity-10 transition-all duration-300 ${
        task.status === 'error' ? 'bg-m3-error' :
        task.status === 'completed' ? 'bg-emerald-500' :
        task.status === 'hashing' ? 'bg-m3-tertiary' :
        task.status === 'compressing' ? 'bg-amber-500' :
        'bg-m3-primary'
      }`} 
      style={{ width: `${task.progress}%` }} 
    />
    
    <div className="flex justify-between items-start relative z-10">
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-white flex items-center gap-3 truncate">
          {task.type === 'iso' || task.type === 'roms' ? <FileArchive size={16} className="text-m3-outline"/> : <Download size={16} className="text-m3-outline"/>}
          {task.name}
        </h4>
        <p className="text-xs text-m3-outline mt-1 font-medium">{task.message}</p>
      </div>
      <div className="text-right shrink-0">
        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
            task.status === 'completed' ? 'text-emerald-400 bg-emerald-400/10' :
            task.status === 'error' ? 'text-m3-error bg-m3-error/10' :
            task.status === 'queued' ? 'text-m3-outline bg-m3-surface-variant' :
            task.status === 'hashing' ? 'text-m3-tertiary bg-m3-tertiary/10' :
            task.status === 'compressing' ? 'text-amber-400 bg-amber-400/10' :
            'text-m3-primary bg-m3-primary/10'
        }`}>
          {task.status}
        </span>
      </div>
    </div>
    
    <div className="flex items-center gap-4 relative z-10">
        <div className="flex-1 h-1.5 bg-m3-surface-variant/40 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${task.progress}%` }}
            className={`h-full transition-all duration-300 ${
              task.status === 'error' ? 'bg-m3-error' :
              task.status === 'completed' ? 'bg-emerald-500' :
              task.status === 'hashing' ? 'bg-m3-tertiary animate-pulse' :
              task.status === 'compressing' ? 'bg-amber-500' :
              'bg-m3-primary'
            }`} 
          />
        </div>
        <span className="text-[10px] font-black text-m3-outline w-8">{Math.round(task.progress)}%</span>
    </div>
  </div>
));

export const DownloaderModal: React.FC<DownloaderModalProps> = ({ isOpen, onClose, onRefreshGames, inWindowMode }) => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [activeTab, setActiveTab] = useState<'hub' | 'import' | 'config'>('hub');
  const [promptInput, setPromptInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [latestIntent, setLatestIntent] = useState<KernelIntent | null>(null);
  const [importStatus, setImportStatus] = useState<{message: string; type: 'info'|'success'|'error'} | null>(null);
  
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const eventSource = new EventSource('/api/system/download/status');
    eventSource.onmessage = (e) => setTasks(JSON.parse(e.data));
    return () => eventSource.close();
  }, [isOpen]);

  const handleDownload = async (type: string, name: string) => {
    await fetch('/api/system/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, name })
    });
    setActiveTab('hub');
  };

  const handlePromptSearch = async () => {
    if (!promptInput.trim()) return;
    setIsSearching(true);
    try {
      const result = await processKernelIntent(promptInput);
      setLatestIntent(result);
      if (result.acao === 'download') {
        handleDownload(result.categoria || 'roms', result.termo_busca || 'Unknown');
        setPromptInput('');
      }
    } catch (e) { console.error(e); }
    finally { setIsSearching(false); }
  };

  const renderHubTab = () => (
      <div className="space-y-10">
        {/* NLP Search Hub */}
        <div className="p-8 rounded-[32px] bg-m3-primary/5 border border-m3-primary/10 space-y-6 shadow-inner">
          <div className="flex items-center gap-3">
             <Sparkles size={20} className="text-m3-primary" />
             <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Neural Dispatch</h3>
          </div>
          
          <div className="flex gap-4">
            <input 
               type="text" 
               value={promptInput}
               onChange={e => setPromptInput(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handlePromptSearch()}
               placeholder="Ex: 'Fetch Super Metroid for SNES core'"
               className="flex-1 bg-m3-surface-variant/30 border border-m3-outline/10 rounded-full px-8 py-5 text-sm text-white placeholder-m3-outline outline-none focus:ring-2 focus:ring-m3-primary/30 transition-all font-bold"
            />
            <button 
               onClick={handlePromptSearch}
               disabled={isSearching || !promptInput}
               className="m3-button-filled px-10 rounded-full"
            >
               {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
            </button>
          </div>

          <AnimatePresence>
            {latestIntent && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-m3-surface/40 p-6 rounded-[24px] border border-m3-outline/5"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 rounded-full bg-m3-primary/20 flex items-center justify-center">
                    <Sparkles size={14} className="text-m3-primary" />
                  </div>
                  <p className="text-sm text-m3-on-surface-variant leading-relaxed font-medium italic">
                    {latestIntent.resumo_ia}
                  </p>
                </div>

                {latestIntent.resultados && latestIntent.resultados.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 border-t border-m3-outline/10 pt-4">
                    {latestIntent.resultados.map((res, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-m3-surface-variant/10 rounded-[16px] border border-m3-outline/5 hover:bg-m3-surface-variant/20 transition-all">
                        <div>
                          <p className="text-sm font-bold text-white">{res.nome}</p>
                          <p className="text-[10px] font-black text-m3-primary uppercase tracking-widest">{res.plataforma}</p>
                        </div>
                        <button onClick={() => handleDownload(res.categoria, res.nome)} className="p-3 bg-m3-primary/10 text-m3-primary rounded-full hover:bg-m3-primary hover:text-white transition-all">
                          <Download size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Storefront */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
           {[
             { id: 'covers', icon: ImageIcon, label: 'Metadata Scraper', desc: 'Sync Cover Art', color: 'text-emerald-400' },
             { id: 'emulators', icon: Settings, label: 'Libretro Hub', desc: 'Update Cores', color: 'text-amber-400' },
             { id: 'roms', icon: Gamepad2, label: 'Public Assets', desc: 'Archive.org Link', color: 'text-m3-primary' },
             { id: 'apps', icon: Package, label: 'Layer Sync', desc: 'Wine / Flatpak', color: 'text-m3-tertiary' },
           ].map(card => (
             <button key={card.id} onClick={() => handleDownload(card.id, card.label)} className="m3-card group p-6 flex flex-col items-center text-center gap-4 hover:bg-m3-primary/5">
                <div className={`w-14 h-14 rounded-[20px] bg-m3-surface-variant/50 flex items-center justify-center group-hover:scale-110 transition-transform ${card.color}`}>
                   <card.icon size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{card.label}</h4>
                  <p className="text-[10px] font-black text-m3-outline uppercase tracking-widest mt-1">{card.desc}</p>
                </div>
             </button>
           ))}
         </div>

         {/* Pipeline Monitor */}
         <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                 <Database size={20} className="text-m3-outline" />
                 <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Live Pipeline</h3>
              </div>
              <span className="text-[10px] font-black text-m3-outline uppercase tracking-widest">{tasks.length} Threads Active</span>
            </div>
            
            {tasks.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-m3-outline/10 bg-m3-surface-variant/5 rounded-[32px] flex flex-col items-center gap-4">
                 <div className="w-16 h-16 rounded-full bg-m3-surface-variant/20 flex items-center justify-center text-m3-outline">
                    <Cloud size={32} />
                 </div>
                 <p className="text-sm font-black text-m3-outline uppercase tracking-widest">Pipeline Idle</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {tasks.map(task => <TaskItem key={task.id} task={task} />)}
              </div>
            )}
         </div>
      </div>
  );

  const renderImportTab = () => (
      <div className="h-full flex flex-col items-center justify-center py-20 text-center gap-8">
          <div className="w-32 h-32 rounded-[40px] bg-m3-primary/10 flex items-center justify-center shadow-2xl">
              <Upload size={56} className="text-m3-primary" />
          </div>
          <div className="space-y-4">
              <h3 className="text-3xl font-black text-white tracking-tighter">Unified Importer</h3>
              <p className="text-m3-on-surface-variant max-w-lg mx-auto font-medium">
                 Directly ingest local binaries, images, or archives. The V9 kernel performs real-time categorization and hardware mapping.
              </p>
          </div>
          <button className="m3-button-filled px-12 py-5 text-sm tracking-[0.2em]">
             <HardDrive size={20} /> Select Hardware Source
          </button>
      </div>
  );

  const renderConfigTab = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Default Architecture', options: ['RetroArch (v1.17)', 'Standalone (Isolated)', 'KVM Overlay'] },
            { label: 'Active Core Mapping', options: ['Snes9x (Current)', 'Genesis Plus GX', 'DuckStation', 'Citra'] },
            { label: 'Neural Resolution', options: ['Vulkan Native', 'FSR 2.0 Upscale', 'Pristine Integer'] },
            { label: 'Telemetry Verbosity', options: ['Kernel Only', 'Extended Logs', 'Deep Audit'] },
          ].map((cfg, i) => (
            <div key={i} className="p-6 bg-m3-surface-variant/10 border border-m3-outline/10 rounded-[28px] space-y-4">
               <label className="text-[10px] font-black text-m3-outline uppercase tracking-[0.2em]">{cfg.label}</label>
               <select className="w-full bg-m3-surface-variant/40 border-none rounded-[16px] px-5 py-4 text-sm font-bold text-white outline-none ring-2 ring-transparent focus:ring-m3-primary/30 transition-all appearance-none cursor-pointer">
                  {cfg.options.map(opt => <option key={opt}>{opt}</option>)}
               </select>
            </div>
          ))}
          <div className="md:col-span-2 flex items-center justify-between pt-6 gap-6">
             <button 
                onClick={async () => {
                   const res = await fetch('/api/system/setup/bootstrap', { method: 'POST', body: JSON.stringify({ mode: 'full' }), headers: {'Content-Type': 'application/json'} });
                   if (res.ok) alert('Industrial Bootstrap Initialized! Check Pipeline.');
                }}
                className="flex items-center gap-3 px-8 py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-emerald-500/10"
             >
                <Sparkles size={18} /> Industrial Setup
             </button>
             <button className="m3-button-filled px-10 py-4 shadow-xl shadow-m3-primary/20">
                <Save size={18} /> Global Sync
             </button>
          </div>
      </div>
  );

  const content = (
      <div className={`flex flex-col h-full bg-m3-surface ${inWindowMode ? '' : 'rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden border border-m3-outline/10 max-h-[90vh] w-full relative'}`}>
          {/* M3 Header */}
          <div className="flex items-center justify-between p-10 bg-m3-primary/5 border-b border-m3-outline/5 shrink-0">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-m3-primary rounded-[20px] flex items-center justify-center text-m3-on-primary shadow-2xl">
                <Cloud size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter">Unified Repository</h2>
                <div className="flex items-center gap-3 mt-1">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Connection Latency: 4ms</span>
                </div>
              </div>
            </div>
            {!inWindowMode && (
              <button onClick={onClose} className="w-12 h-12 rounded-full bg-m3-surface-variant/30 flex items-center justify-center text-m3-outline hover:text-white transition-all">
                <X size={24} />
              </button>
            )}
          </div>
          
          {/* Smooth M3 Tabs */}
          <div className="flex items-center gap-8 px-10 pt-6 border-b border-m3-outline/5 bg-m3-surface">
              {[
                { id: 'hub', label: 'Asset Hub', icon: Cloud },
                { id: 'import', label: 'Importer', icon: HardDrive },
                { id: 'config', label: 'Systems', icon: Settings },
              ].map(tab => (
                <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`pb-5 flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === tab.id ? 'text-m3-primary' : 'text-m3-outline hover:text-m3-on-surface-variant'}`}
                >
                   <tab.icon size={18} />
                   {tab.label}
                   {activeTab === tab.id && <motion.div layoutId="tabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-m3-primary rounded-full shadow-[0_0_10px_rgba(var(--m3-primary-rgb),0.5)]" />}
                </button>
              ))}
          </div>

          <div className="p-10 overflow-y-auto flex-1 no-scrollbar">
             {activeTab === 'hub' && renderHubTab()}
             {activeTab === 'import' && renderImportTab()}
             {activeTab === 'config' && renderConfigTab()}
          </div>
      </div>
  );

  if (inWindowMode) return content;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={onClose} />
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="relative z-10 w-full max-w-5xl">
          {content}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
