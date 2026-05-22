import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Trash2, RotateCcw, Image as ImageIcon, Clock, FileCheck, Loader2, PlayCircle, Plus, ChevronDown, AlertTriangle, Check, X, ShieldCheck, ShieldAlert, History, Square, CheckSquare, Layers, Cloud, CloudOff, ScanText, Sparkles } from 'lucide-react';

interface SaveState {
  id: string;
  name: string;
  timestamp: string;
  previewUrl?: string;
  size?: number;
  auditStatus?: 'MATCH' | 'ORPHAN' | 'checking';
  headerMatch?: boolean;
  sessionId?: string;
}

interface SaveStatePanelProps {
  gameId: string;
  onRestore: (stateId: string) => void;
  onDelete: (stateId: string) => void;
  onCapture: (previewUrl?: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'alphabetical' | 'session';

const captureCanvasToDataURL = (): string | undefined => {
  try {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      return canvas.toDataURL('image/jpeg', 0.7);
    }
    // Fallback for mockup: find the main emulator preview image
    const mockupImg = document.querySelector('img[alt="emulator-viewport"]') as HTMLImageElement || document.querySelector('.emulator-layer img') as HTMLImageElement;
    if (mockupImg) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = mockupImg.naturalWidth || 640;
      tempCanvas.height = mockupImg.naturalHeight || 480;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(mockupImg, 0, 0);
        return tempCanvas.toDataURL('image/jpeg', 0.7);
      }
    }
  } catch (e) {
    console.warn('Capture failed:', e);
  }
  return undefined;
};

export const SaveStatePanel: React.FC<SaveStatePanelProps> = ({ gameId, onRestore, onDelete, onCapture }) => {
  const [states, setStates] = useState<SaveState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSyncEnabled, setIsSyncEnabled] = useState(true);
  const [isGroupingEnabled, setIsGroupingEnabled] = useState(true);
  const [diffViewIds, setDiffViewIds] = useState<[string, string] | null>(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system/config/sync');
      const data = await res.json();
      setIsSyncEnabled(!!data.enabled);
    } catch (e) {
      console.warn("Failed to fetch sync status");
    }
  }, []);

  const toggleSync = async () => {
    const next = !isSyncEnabled;
    setIsSyncEnabled(next);
    try {
      await fetch('/api/system/config/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next })
      });
    } catch (e) {
      console.error("Failed to update sync status");
    }
  };

  const fetchStates = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/system/files?path=states/${gameId}`);
      if (!response.ok) throw new Error('Fault in state retrieval');
      const data = await response.json();
      
      const mappedStates: SaveState[] = data.files
        .filter((f: any) => f.name.endsWith('.state'))
        .map((f: any) => ({
          id: f.name,
          name: f.name.replace('.state', ''),
          timestamp: f.mtime || new Date().toISOString(),
          previewUrl: f.previewUrl || `https://picsum.photos/seed/${f.name}/400/225`,
          size: f.size,
          sessionId: f.sessionId || `SES-${new Date(f.mtime).getHours()}` // Mock session if missing
        }));

      setStates(mappedStates);
    } catch (err) {
      setStates([
        { id: '1', name: 'Level 4 Boss Entry', timestamp: new Date().toISOString(), previewUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80', sessionId: 'SES-23', headerMatch: true },
        { id: '2', name: 'Final Secret Found', timestamp: new Date(Date.now() - 3600000).toISOString(), previewUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80', sessionId: 'SES-22', headerMatch: false }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [gameId]);

  useEffect(() => {
    fetchStates();
    fetchSyncStatus();
    const interval = setInterval(fetchStates, 10000);
    return () => clearInterval(interval);
  }, [fetchStates, fetchSyncStatus]);

  const sortedStates = useMemo(() => {
    const sorted = [...states];
    if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    else if (sortBy === 'oldest') sorted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    else if (sortBy === 'alphabetical') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'session') sorted.sort((a, b) => (a.sessionId || '').localeCompare(b.sessionId || ''));
    return sorted;
  }, [states, sortBy]);

  const sessions = useMemo(() => {
    if (!isGroupingEnabled) {
      return [{ date: 'All Snapshots', items: sortedStates }];
    }
    const groups: Record<string, SaveState[]> = {};
    sortedStates.forEach(s => {
      const groupKey = sortBy === 'session' ? (s.sessionId || 'Local Session') : new Date(s.timestamp).toLocaleDateString();
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(s);
    });
    return Object.entries(groups).map(([date, items]) => ({ date, items }));
  }, [sortedStates, sortBy, isGroupingEnabled]);

  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`fliperos_expanded_${gameId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(`fliperos_expanded_${gameId}`, JSON.stringify(expandedSessions));
  }, [expandedSessions, gameId]);

  useEffect(() => {
    const initial: Record<string, boolean> = { ...expandedSessions };
    sessions.forEach(s => {
      if (initial[s.date] === undefined) initial[s.date] = true;
    });
    setExpandedSessions(initial);
  }, [sessions]);

  const toggleSession = (date: string) => {
    setExpandedSessions(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const handleAudit = async (e: React.MouseEvent, stateId: string) => {
    e.stopPropagation();
    setStates(prev => prev.map(s => s.id === stateId ? { ...s, auditStatus: 'checking' } : s));
    try {
      const res = await fetch('/api/system/states/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, stateId })
      });
      const data = await res.json();
      setStates(prev => prev.map(s => s.id === stateId ? { ...s, auditStatus: data.status, headerMatch: data.header_valid } : s));
    } catch (err) {
      setStates(prev => prev.map(s => s.id === stateId ? { ...s, auditStatus: 'ORPHAN', headerMatch: false } : s));
    }
  };

  const handleCapture = async () => {
    setIsCapturing(true);
    const preview = captureCanvasToDataURL();
    await onCapture(preview);
    setTimeout(() => {
      setIsCapturing(false);
      fetchStates();
    }, 1500);
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const deleteSelected = async () => {
    setBatchDeleteConfirm(true);
  };

  const confirmBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
       onDelete(id);
    }
    setSelectedIds(new Set());
    setBatchDeleteConfirm(false);
    setTimeout(fetchStates, 500);
  };

  const toggleDiff = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (diffViewIds?.[0] === id) setDiffViewIds(null);
    else if (!diffViewIds) {
       const target = sortedStates.find(s => s.id !== id);
       if (target) setDiffViewIds([id, target.id]);
    } else {
       setDiffViewIds([diffViewIds[1], id]);
    }
  };

  const executeDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
    setDeleteConfirmId(null);
    setStates(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-m3-surface-variant/30 backdrop-blur-2xl rounded-[32px] border border-m3-outline/10 overflow-hidden relative">
      <header className="p-6 border-b border-m3-outline/10 space-y-4 bg-m3-primary/5 shrink-0">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-m3-primary/20 rounded-xl text-m3-primary">
                  <RotateCcw size={20} />
               </div>
               <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Restore Nodes</h3>
            </div>
            <div className="flex items-center gap-2">
               <AnimatePresence>
                  {selectedIds.size > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2"
                    >
                       <button 
                         onClick={deleteSelected} 
                         className="p-3 bg-m3-error/20 text-m3-error rounded-full hover:bg-m3-error hover:text-white transition-all shadow-lg active:scale-95"
                       >
                          <Trash2 size={16} />
                       </button>
                    </motion.div>
                  )}
               </AnimatePresence>
               <button 
                 onClick={handleCapture}
                 disabled={isCapturing}
                 className="m3-button-filled px-6 py-2 text-[10px] tracking-widest gap-2"
               >
                  {isCapturing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Capture
               </button>
            </div>
         </div>

         <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 bg-m3-surface/30 rounded-2xl p-2 border border-m3-outline/5">
                <div className="flex-1 flex items-center gap-2 px-3">
                   <span className="text-[9px] font-black text-m3-outline uppercase tracking-widest">Order:</span>
                   <select 
                     value={sortBy} 
                     onChange={(e) => setSortBy(e.target.value as any)}
                     className="bg-transparent text-[10px] font-black text-white uppercase outline-none cursor-pointer"
                   >
                      <option value="newest" className="bg-m3-surface">Newest</option>
                      <option value="oldest" className="bg-m3-surface">Oldest</option>
                      <option value="alphabetical" className="bg-m3-surface">Alpha</option>
                      <option value="session" className="bg-m3-surface">Session</option>
                   </select>
                </div>
                <div className="w-px h-4 bg-m3-outline/10" />
                <button 
                   onClick={() => setIsGroupingEnabled(!isGroupingEnabled)}
                   className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isGroupingEnabled ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-m3-surface-variant/40 text-m3-outline border border-transparent'}`}
                >
                   {isGroupingEnabled ? <Layers size={14} /> : <History size={14} />}
                   {isGroupingEnabled ? 'Grouped' : 'Flat List'}
                </button>
                <div className="w-px h-4 bg-m3-outline/10" />
                <button 
                   onClick={toggleSync}
                   className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isSyncEnabled ? 'bg-m3-primary/20 text-m3-primary shadow-[0_0_15px_rgba(var(--m3-primary-rgb),0.3)]' : 'bg-m3-surface-variant/40 text-m3-outline'}`}
                >
                   {isSyncEnabled ? <Cloud size={14} /> : <CloudOff size={14} />}
                   {isSyncEnabled ? 'Live Sync' : 'Static'}
                </button>
             </div>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
             <Loader2 size={32} className="text-m3-primary animate-spin" />
          </div>
        ) : states.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
             <div className="w-16 h-16 rounded-full border-2 border-dashed border-m3-outline mb-4 flex items-center justify-center">
                <ImageIcon size={24} />
             </div>
             <p className="text-xs font-black uppercase tracking-widest">Empty State Repository</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sessions.map(({ date, items }) => (
               <div key={date} className="space-y-4">
                  <button 
                    onClick={() => toggleSession(date)}
                    className="flex items-center gap-3 w-full group"
                  >
                     <div className="h-px flex-1 bg-m3-outline/10 group-hover:bg-m3-primary/20 transition-colors" />
                     <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-m3-surface-variant/20 border border-m3-outline/5 transition-all group-hover:border-m3-primary/30">
                        {sortBy === 'session' ? <Layers size={10} className="text-m3-primary" /> : <History size={10} className="text-m3-outline" />}
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">{date}</span>
                        <ChevronDown size={10} className={`text-m3-outline transition-transform ${expandedSessions[date] ? '' : '-rotate-90'}`} />
                     </div>
                     <div className="h-px flex-1 bg-m3-outline/10 group-hover:bg-m3-primary/20 transition-colors" />
                  </button>

                  <AnimatePresence>
                     {expandedSessions[date] && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
                           {items.map((state) => (
                              <motion.div 
                                key={state.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                                whileHover={{ 
                                  scale: 1.03, 
                                  rotateX: -2, 
                                  rotateY: 2, 
                                  translateZ: 10,
                                  zIndex: 10,
                                  transition: { duration: 0.1 }
                                }}
                                className={`group save-state-thumbnail relative rounded-[28px] overflow-hidden border transition-all cursor-pointer preserve-3d ${selectedIds.has(state.id) ? 'border-m3-primary bg-m3-primary/10 shadow-2xl' : state.headerMatch === false ? 'border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/10' : 'border-m3-outline/10 bg-m3-surface/40 hover:border-m3-primary/50'}`}
                                onClick={() => onRestore(state.id)}
                              >
                                {deleteConfirmId === state.id && (
                                  <div className="absolute inset-0 z-50 bg-m3-error/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center" onClick={e => e.stopPropagation()}>
                                     <AlertTriangle size={24} className="text-white mb-2" />
                                     <p className="text-[8px] font-black text-white uppercase tracking-widest mb-3">Confirm Purge?</p>
                                     <div className="flex gap-2">
                                        <button onClick={(e) => executeDelete(e, state.id)} className="bg-white text-m3-error px-4 py-1.5 rounded-full text-[8px] font-black uppercase active:scale-95">Yes</button>
                                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="bg-m3-error/20 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase active:scale-95">No</button>
                                     </div>
                                  </div>
                                )}

                                <div className="aspect-video relative overflow-hidden">
                                  <motion.img 
                                    src={state.previewUrl} 
                                    alt={state.name} 
                                    animate={{ filter: isRefreshing ? 'blur(10px) brightness(0.7)' : 'blur(0px) brightness(1)' }}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700 ease-out" 
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent" />
                                  
                                  {/* Multi-select checkbox */}
                                  <button onClick={(e) => toggleSelect(e, state.id)} className={`absolute top-4 left-4 p-2 backdrop-blur rounded-xl border transition-all ${selectedIds.has(state.id) ? 'bg-m3-primary border-transparent text-white' : 'bg-black/40 text-m3-outline border-white/5 hover:bg-black/60'}`}>
                                     {selectedIds.has(state.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                  </button>

                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-m3-primary/5 backdrop-blur-[1px]">
                                     <PlayCircle size={40} className="text-white drop-shadow-2xl" />
                                  </div>

                                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                     <button onClick={(e) => toggleDiff(e, state.id)} className={`p-2 rounded-xl backdrop-blur-md border border-white/10 transition-all ${diffViewIds?.includes(state.id) ? 'bg-m3-primary text-white' : 'bg-black/60 text-white hover:bg-m3-primary'}`}>
                                        <ScanText size={14} />
                                     </button>
                                     <button onClick={(e) => handleAudit(e, state.id)} className={`p-2 rounded-xl backdrop-blur-md border border-white/10 transition-all ${state.auditStatus === 'MATCH' ? 'bg-emerald-500 text-white' : state.auditStatus === 'ORPHAN' ? 'bg-m3-error text-white' : 'bg-black/40 text-m3-outline'}`}>
                                        {state.auditStatus === 'checking' ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                     </button>
                                  </div>
                                </div>

                                <div className="p-4 flex items-center justify-between bg-m3-surface-variant/10">
                                   <div className="min-w-0 flex-1">
                                      <h4 className="text-[10px] font-black text-white uppercase truncate">{state.name}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                         <Clock size={8} className="text-m3-outline" />
                                         <span className="text-[8px] font-black text-m3-outline uppercase tracking-widest">{new Date(state.timestamp).toLocaleTimeString()}</span>
                                      </div>
                                   </div>
                                   <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(state.id); }} className="p-2 ml-2 text-m3-outline hover:text-m3-error transition-colors"><Trash2 size={14} /></button>
                                </div>
                              </motion.div>
                           ))}
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Diff View Overlay */}
      <AnimatePresence>
         {diffViewIds && (
            <motion.div 
               initial={{ opacity: 0, y: 100 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 100 }}
               className="absolute inset-x-8 bottom-8 z-[60] h-64 bg-m3-surface-variant/90 backdrop-blur-3xl rounded-[32px] border border-m3-primary/30 shadow-2xl p-6 flex flex-col gap-4 overflow-hidden"
            >
               <div className="flex justify-between items-center px-4">
                  <div className="flex items-center gap-3">
                     <Sparkles size={16} className="text-m3-primary animate-pulse" />
                     <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Neural Delta Diff</h4>
                  </div>
                  <button onClick={() => setDiffViewIds(null)} className="p-2 bg-m3-surface/40 rounded-full hover:bg-m3-error/20 hover:text-m3-error transition-all"><X size={16} /></button>
               </div>
               <div className="flex-1 flex gap-4">
                  {diffViewIds.map((id, i) => {
                     const state = states.find(s => s.id === id);
                     return (
                        <div key={i} className="flex-1 flex flex-col gap-2">
                           <div className="flex-1 rounded-[20px] overflow-hidden border border-white/5 shadow-inner relative">
                              <img src={state?.previewUrl} className="w-full h-full object-cover grayscale-[0.2] contrast-125 transition-all group-hover:scale-105" />
                              <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur rounded-lg text-[8px] font-black text-white uppercase">{i === 0 ? 'SNAPSHOT A' : 'SNAPSHOT B'}</div>
                           </div>
                           <p className="text-[9px] font-black text-m3-outline/70 uppercase truncate px-2">{state?.name}</p>
                        </div>
                     );
                  })}
                  {/* Visual Difference Layer */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex-1 rounded-[20px] overflow-hidden border border-m3-primary/30 relative bg-black">
                       <div className="absolute inset-0 flex items-center justify-center">
                          <img 
                            src={states.find(s => s.id === diffViewIds[0])?.previewUrl} 
                            className="absolute inset-0 w-full h-full object-cover opacity-100" 
                          />
                          <img 
                            src={states.find(s => s.id === diffViewIds[1])?.previewUrl} 
                            className="absolute inset-0 w-full h-full object-cover mix-blend-difference invert brightness-125 contrast-150" 
                          />
                       </div>
                       <div className="absolute bottom-3 right-3 px-2 py-1 bg-m3-primary/80 backdrop-blur rounded-lg text-[8px] font-black text-white uppercase tracking-widest">
                          Delta Map
                       </div>
                    </div>
                    <p className="text-[9px] font-black text-m3-primary uppercase truncate px-2">Visual Variance Detected</p>
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Batch Delete Confirmation Overlay */}
      <AnimatePresence>
         {batchDeleteConfirm && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 z-[100] bg-m3-error/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
            >
               <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <AlertTriangle size={48} className="text-white animate-bounce" />
               </div>
               <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-4">Industrial Wipe</h2>
               <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-8 max-w-sm">
                  You are about to decommission <span className="text-white">{selectedIds.size}</span> selected restore nodes from the Nexus. This action is irreversible.
               </p>
               <div className="flex gap-4">
                  <button 
                     onClick={confirmBatchDelete}
                     className="bg-white text-m3-error px-10 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-3"
                  >
                     <Check size={18} /> Confirm Purge
                  </button>
                  <button 
                     onClick={() => setBatchDeleteConfirm(false)}
                     className="bg-m3-error/20 border border-white/20 text-white px-10 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                  >
                     <X size={18} /> Abort Mission
                  </button>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      <footer className="p-4 bg-m3-surface-variant/20 border-t border-m3-outline/10 shrink-0">
         <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-3">
               <FileCheck size={12} className="text-m3-primary" />
               <span className="text-[9px] font-black text-m3-outline uppercase tracking-widest text-emerald-400">V9 Kernel Secure</span>
            </div>
            <div className="text-[8px] font-black text-m3-outline uppercase tracking-[0.2em]">{sortedStates.length} Blobs Indexed</div>
         </div>
      </footer>
    </div>
  );
};
