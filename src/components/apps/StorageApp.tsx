import React, { useState, useEffect } from 'react';
import { HardDrive, Trash2, RefreshCw, FileText, FileCode, AlertCircle, Loader2, Cloud, CloudUpload, ExternalLink, Layers, Box, Cpu, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SystemFile {
  name: string;
  size: number;
  createdAt?: string;
  lastModified?: string;
}

export const StorageApp: React.FC = () => {
  const [localFiles, setLocalFiles] = useState<SystemFile[]>([]);
  const [cloudFiles, setCloudFiles] = useState<SystemFile[]>([]);
  const [tab, setTab] = useState<'local' | 'cloud' | 'layers'>('local');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchLocal = async () => {
    try {
      const res = await fetch('/api/system/files');
      if (res.ok && isMountedRef.current) setLocalFiles(await res.json());
    } catch (e) {
      if (isMountedRef.current) console.error("VFS_FETCH_FAILED");
    }
  };

  const fetchCloud = async () => {
    try {
      const res = await fetch('/api/cloud/files');
      if (res.ok && isMountedRef.current) setCloudFiles(await res.json());
    } catch (e) {
      if (isMountedRef.current) console.error("CLOUD_FETCH_FAILED");
    }
  };

  const refresh = async () => {
    setLoading(true);
    await Promise.all([fetchLocal(), fetchCloud()]);
    if (isMountedRef.current) setLoading(false);
  };

  const deleteLocal = async (name: string) => {
    setDeleting(name);
    try {
      const res = await fetch(`/api/system/files/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok && isMountedRef.current) fetchLocal();
    } catch (e) {
      if (isMountedRef.current) alert("FS_PERMISSION_DENIED");
    } finally {
      if (isMountedRef.current) setDeleting(null);
    }
  };

  const getCloudLink = async (name: string) => {
    try {
      const res = await fetch(`/api/cloud/link/${encodeURIComponent(name)}`);
      if (res.ok) {
        const { url } = await res.json();
        window.open(url, '_blank');
      }
    } catch (e) {
      alert("CLOUD_LINK_ERROR");
    }
  };

  const syncToCloud = async (name: string) => {
    setSyncing(name);
    try {
      const res = await fetch('/api/cloud/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: name })
      });
      if (res.ok) alert("Sync job queued. Monitor Downloader activity.");
    } catch (e) {
      alert("NETWORK_RPC_FAULT");
    } finally {
      setSyncing(null);
    }
  };

  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [searchQuery, setSearchQuery] = useState('');

  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'type' | 'size' | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const handleSort = (key: 'name' | 'type' | 'size') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vfs_search_history');
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const saveSearch = (query: string) => {
    if (!query.trim()) return;
    const next = [query, ...searchHistory.filter(q => q !== query)].slice(0, 10);
    setSearchHistory(next);
    localStorage.setItem('vfs_search_history', JSON.stringify(next));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('vfs_search_history');
  };

  const currentFiles = (tab === 'local' ? localFiles : cloudFiles).filter(
    (file) => file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalSize = localFiles.reduce((acc, f) => acc + f.size, 0);

  const getFileExtension = (name: string) => name.split('.').pop() || '';

  const sortedFiles = React.useMemo(() => {
    let sortableFiles = [...currentFiles];
    if (sortConfig.key !== null) {
      sortableFiles.sort((a, b) => {
        if (sortConfig.key === 'name') {
          return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
        if (sortConfig.key === 'type') {
          const typeA = getFileExtension(a.name);
          const typeB = getFileExtension(b.name);
          return sortConfig.direction === 'asc' ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA);
        }
        if (sortConfig.key === 'size') {
          return sortConfig.direction === 'asc' ? a.size - b.size : b.size - a.size;
        }
        return 0;
      });
    }
    return sortableFiles;
  }, [currentFiles, sortConfig]);

  return (
    <div className="flex flex-col h-full bg-m3-surface text-m3-on-surface font-sans text-sm select-text">
      {/* Header Stat Area */}
      <div className="p-6 bg-m3-surface-variant/20 border-b border-m3-outline/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className={`p-3 rounded-2xl flex items-center justify-center ${tab === 'local' ? 'bg-m3-primary-container text-m3-on-primary-container' : tab === 'cloud' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-orange-500/20 text-orange-400'}`}>
             {tab === 'local' && <HardDrive size={24} />}
             {tab === 'cloud' && <Cloud size={24} />}
             {tab === 'layers' && <Layers size={24} />}
           </div>
           <div>
              <h3 className="font-bold text-m3-on-surface uppercase tracking-tight text-lg">
                {tab === 'local' && 'VFS Buffer Node'}
                {tab === 'cloud' && 'FliperOS Cloud Vault'}
                {tab === 'layers' && 'Frankenstein Runtime Layers'}
              </h3>
              <p className="text-xs text-m3-on-surface-variant font-mono">
                {tab === 'local' && 'Mount: /database | Status: ONLINE'}
                {tab === 'cloud' && 'Status: CONNECTED | Region: US-EAST'}
                {tab === 'layers' && 'Isolated Co-existence Modulators: ACTIVE'}
              </p>
           </div>
        </div>
        <div className="text-right">
           <p className="text-m3-on-surface font-bold text-sm">{(totalSize / 1024 / 1024).toFixed(2)} MB</p>
           <div className="w-32 h-2 bg-m3-surface-variant rounded-full mt-2 overflow-hidden shadow-inner">
              <div className="h-full bg-m3-primary transition-all duration-300" style={{ width: `${Math.min(100, (totalSize / (100 * 1024 * 1024)) * 100)}%` }} />
           </div>
        </div>
      </div>

      {/* Tab Switcher & Action Bar */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-m3-outline/10 bg-m3-surface">
         <div className="flex items-center gap-6">
            <button 
              onClick={() => setTab('local')}
              className={`pb-2 border-b-2 font-bold tracking-widest text-xs uppercase transition-colors ${tab === 'local' ? 'border-m3-primary text-m3-primary' : 'border-transparent text-m3-on-surface-variant hover:text-m3-on-surface'}`}
            >
              LOCAL
            </button>
            <button 
              onClick={() => setTab('cloud')}
              className={`pb-2 border-b-2 font-bold tracking-widest text-xs uppercase transition-colors ${tab === 'cloud' ? 'border-m3-primary text-m3-primary' : 'border-transparent text-m3-on-surface-variant hover:text-m3-on-surface'}`}
            >
              CLOUD VAULT
            </button>
            <button 
              onClick={() => setTab('layers')}
              className={`pb-2 border-b-2 font-bold tracking-widest text-xs uppercase transition-colors ${tab === 'layers' ? 'border-m3-primary text-m3-primary' : 'border-transparent text-m3-on-surface-variant hover:text-m3-on-surface'}`}
            >
              LAYERS
            </button>
         </div>
         <div className="flex items-center gap-3 relative">
           <input 
             type="text" 
             placeholder="Search files..."
             value={searchQuery}
             onFocus={() => setShowHistory(true)}
             onBlur={() => setTimeout(() => setShowHistory(false), 200)}
             onChange={(e) => setSearchQuery(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter') saveSearch(searchQuery);
             }}
             className="m3-input w-64 !py-2 !text-xs !rounded-full relative z-10"
           />
           {showHistory && searchHistory.length > 0 && (
             <div className="absolute top-full right-8 mt-2 w-64 m3-card !bg-m3-surface-variant !p-0 shadow-2xl overflow-hidden z-50">
               <div className="flex justify-between items-center px-4 py-2 bg-m3-surface/50">
                 <span className="text-xs text-m3-on-surface-variant font-bold uppercase">Recent</span>
                 <button onClick={clearHistory} className="text-xs text-m3-error hover:text-m3-error/80 font-bold">Clear</button>
               </div>
               <ul className="py-2">
                 {searchHistory.map((q, i) => (
                   <li key={i}>
                     <button
                       onClick={() => setSearchQuery(q)}
                       className="w-full text-left px-4 py-2 text-xs text-m3-on-surface hover:bg-m3-surface/30 transition-colors"
                     >
                       {q}
                     </button>
                   </li>
                 ))}
               </ul>
             </div>
           )}
           <button 
             onClick={refresh}
             className="p-2 hover:bg-m3-surface-variant rounded-full transition-colors text-m3-on-surface-variant hover:text-m3-on-surface"
           >
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
           </button>
         </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
         {tab === 'layers' ? (
             <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { id: 'proton', name: 'Proton-GE Runtime', status: 'Active', size: '2.4 GB', desc: 'Windows compatibility via Vulkan' },
                    { id: 'waydroid', name: 'Waydroid Container', status: 'Standby', size: '1.8 GB', desc: 'Android app layer for Linux' },
                    { id: 'wine', name: 'Wine-Staging 9.0', status: 'Active', size: '850 MB', desc: 'Direct execution of Windows bin' },
                    { id: 'box64', name: 'Box64 RISC-V Emul', status: 'Offline', size: '120 MB', desc: 'Running x86_64 on ARM/RISC' },
                    { id: 'steam-link', name: 'Steam Link Engine', status: 'Active', size: '420 MB', desc: 'Cloud streaming bridge' },
                    { id: 'kernel-ai', name: 'Neural Core v1.0', status: 'Optimizing', size: '4.2 GB', desc: 'Ollama + Local Heuristics' }
                ].map(layer => (
                    <div key={layer.id} className="m3-card !bg-m3-surface-variant/20 !border-m3-outline/10 flex flex-row gap-4 items-start group hover:!border-m3-primary/30 transition-all cursor-default">
                        <div className="p-3 bg-m3-primary/10 rounded-2xl text-m3-primary group-hover:scale-110 transition-transform shadow-inner">
                            <Box size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-m3-on-surface">{layer.name}</h4>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${layer.status === 'Active' ? 'bg-emerald-500/20 text-emerald-500' : (layer.status === 'Standby' ? 'bg-amber-500/20 text-amber-500' : 'bg-m3-surface-variant text-m3-on-surface-variant')}`}>
                                    {layer.status}
                                </span>
                            </div>
                            <p className="text-xs text-m3-on-surface-variant leading-tight mb-3 font-mono">{layer.desc}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-m3-on-surface-variant font-mono font-bold tracking-widest">{layer.size}</span>
                                <div className="flex gap-2">
                                    <button className="p-2 bg-m3-surface-variant hover:bg-m3-primary hover:text-m3-on-primary rounded-xl text-m3-on-surface-variant transition-colors">
                                        <Cpu size={14} />
                                    </button>
                                    <button className="p-2 bg-m3-surface-variant hover:bg-m3-error hover:text-m3-on-error rounded-xl text-m3-on-surface-variant transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
             </div>
         ) : loading && currentFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-50 text-m3-on-surface-variant">
               <Loader2 className="animate-spin mb-4" size={32} />
               <span className="font-bold uppercase tracking-widest text-xs">Scanning blocks...</span>
            </div>
         ) : currentFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-50 text-m3-on-surface-variant">
               <AlertCircle size={32} className="mb-4" />
               <span className="font-bold uppercase tracking-widest text-xs">No objects detected.</span>
            </div>
         ) : (
            <table className="w-full text-left">
               <thead className="sticky top-0 bg-m3-surface-variant/90 backdrop-blur text-m3-on-surface-variant border-b border-m3-outline/20 font-bold uppercase text-xs z-10 shadow-sm">
                  <tr>
                     <th className="px-6 py-4">
                       <button onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-m3-primary transition-colors focus:outline-none uppercase tracking-widest font-black">
                         File Name
                         {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                       </button>
                     </th>
                     <th className="px-6 py-4">
                       <button onClick={() => handleSort('type')} className="flex items-center gap-2 hover:text-m3-primary transition-colors focus:outline-none uppercase tracking-widest font-black">
                         Type
                         {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                       </button>
                     </th>
                     <th className="px-6 py-4">
                       <button onClick={() => handleSort('size')} className="flex items-center gap-2 hover:text-m3-primary transition-colors focus:outline-none uppercase tracking-widest font-black">
                         Size
                         {sortConfig.key === 'size' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                       </button>
                     </th>
                     <th className="px-6 py-4 uppercase tracking-widest font-black">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-m3-outline/10">
                  {sortedFiles.map((file) => (
                     <tr key={file.name} className="hover:bg-m3-surface-variant/30 group transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                           {file.name.endsWith('.tmp') ? <FileCode size={18} className="text-amber-500" /> : <FileText size={18} className="text-m3-primary" />}
                           <span className="truncate max-w-[300px] font-medium" title={file.name}>{file.name}</span>
                        </td>
                        <td className="px-6 py-4 text-m3-on-surface-variant uppercase font-bold text-xs tracking-wider">
                           {getFileExtension(file.name) || 'FILE'}
                        </td>
                        <td className="px-6 py-4 text-m3-on-surface-variant font-mono">
                           {(file.size / 1024).toFixed(1)} KB
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                             {tab === 'local' && (
                               <button 
                                 onClick={() => syncToCloud(file.name)}
                                 disabled={syncing === file.name}
                                 className="text-m3-primary hover:text-m3-primary/80 p-2 bg-m3-primary/10 rounded-full transition-colors"
                                 title="Sync to Cloud Vault"
                               >
                                 {syncing === file.name ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                               </button>
                             )}
                             {tab === 'cloud' && (
                               <button 
                                 onClick={() => getCloudLink(file.name)}
                                 className="text-indigo-400 hover:text-indigo-300 p-2 bg-indigo-400/10 rounded-full transition-colors" 
                                 title="Get Signed URL"
                               >
                                  <ExternalLink size={16} />
                               </button>
                             )}
                             {tab === 'local' && (
                               <button 
                                 onClick={() => deleteLocal(file.name)}
                                 disabled={deleting === file.name}
                                 className="text-m3-error hover:text-m3-error/80 p-2 bg-m3-error/10 rounded-full transition-colors"
                                 title="Delete Local Buffer"
                               >
                                 {deleting === file.name ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                               </button>
                             )}
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         )}
      </div>
    </div>
  );
};
