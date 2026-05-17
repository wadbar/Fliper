import React, { useState, useEffect } from 'react';
import { HardDrive, Trash2, RefreshCw, FileText, FileCode, AlertCircle, Loader2, Cloud, CloudUpload, ExternalLink, Layers, Box, Cpu, Download } from 'lucide-react';
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

  const fetchLocal = async () => {
    try {
      const res = await fetch('/api/system/files');
      if (res.ok) setLocalFiles(await res.json());
    } catch (e) {
      console.error("VFS_FETCH_FAILED");
    }
  };

  const fetchCloud = async () => {
    try {
      const res = await fetch('/api/cloud/files');
      if (res.ok) setCloudFiles(await res.json());
    } catch (e) {
      console.error("CLOUD_FETCH_FAILED");
    }
  };

  const refresh = async () => {
    setLoading(true);
    await Promise.all([fetchLocal(), fetchCloud()]);
    setLoading(false);
  };

  const deleteLocal = async (name: string) => {
    setDeleting(name);
    try {
      const res = await fetch(`/api/system/files/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok) fetchLocal();
    } catch (e) {
      alert("FS_PERMISSION_DENIED");
    } finally {
      setDeleting(null);
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
  }, []);

  const currentFiles = tab === 'local' ? localFiles : cloudFiles;
  const totalSize = localFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-zinc-300 font-mono text-[11px] select-text">
      {/* Header Stat Area */}
      <div className="p-4 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
           {tab === 'local' && <HardDrive size={20} className="text-sky-400" />}
           {tab === 'cloud' && <Cloud size={20} className="text-indigo-400" />}
           {tab === 'layers' && <Layers size={20} className="text-orange-400" />}
           <div>
              <h3 className="font-bold text-zinc-100 uppercase tracking-tighter">
                {tab === 'local' && 'VFS Buffer Node'}
                {tab === 'cloud' && 'FliperOS Cloud Vault'}
                {tab === 'layers' && 'Frankenstein Runtime Layers'}
              </h3>
              <p className="text-[10px] text-zinc-500">
                {tab === 'local' && 'Mount: /database | Status: ONLINE'}
                {tab === 'cloud' && 'Status: CONNECTED | Region: US-EAST'}
                {tab === 'layers' && 'Isolated Co-existence Modulators: ACTIVE'}
              </p>
           </div>
        </div>
        <div className="text-right">
           <p className="text-zinc-400">{(totalSize / 1024 / 1024).toFixed(2)} MB</p>
           <div className="w-24 h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-sky-500" style={{ width: `${Math.min(100, (totalSize / (100 * 1024 * 1024)) * 100)}%` }} />
           </div>
        </div>
      </div>

      {/* Tab Switcher & Action Bar */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-zinc-800/50">
         <div className="flex items-center gap-4">
            <button 
              onClick={() => setTab('local')}
              className={`pb-1 border-b-2 transition-colors ${tab === 'local' ? 'border-sky-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              LOCAL
            </button>
            <button 
              onClick={() => setTab('cloud')}
              className={`pb-1 border-b-2 transition-colors ${tab === 'cloud' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              CLOUD VAULT
            </button>
            <button 
              onClick={() => setTab('layers')}
              className={`pb-1 border-b-2 transition-colors ${tab === 'layers' ? 'border-orange-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              LAYERS
            </button>
         </div>
         <button 
           onClick={refresh}
           className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-100"
         >
           <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
         </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
         {tab === 'layers' ? (
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                    { id: 'proton', name: 'Proton-GE Runtime', status: 'Active', size: '2.4 GB', desc: 'Windows compatibility via Vulkan' },
                    { id: 'waydroid', name: 'Waydroid Container', status: 'Standby', size: '1.8 GB', desc: 'Android app layer for Linux' },
                    { id: 'wine', name: 'Wine-Staging 9.0', status: 'Active', size: '850 MB', desc: 'Direct execution of Windows bin' },
                    { id: 'box64', name: 'Box64 RISC-V Emul', status: 'Offline', size: '120 MB', desc: 'Running x86_64 on ARM/RISC' },
                    { id: 'steam-link', name: 'Steam Link Engine', status: 'Active', size: '420 MB', desc: 'Cloud streaming bridge' },
                    { id: 'kernel-ai', name: 'Neural Core v1.0', status: 'Optimizing', size: '4.2 GB', desc: 'Ollama + Local Heuristics' }
                ].map(layer => (
                    <div key={layer.id} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex gap-4 items-start group hover:border-orange-500/30 transition-all">
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 group-hover:scale-110 transition-transform">
                            <Box size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-zinc-200 text-xs">{layer.name}</h4>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${layer.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : (layer.status === 'Standby' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-500')}`}>
                                    {layer.status}
                                </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-tight mb-2">{layer.desc}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-zinc-600 font-mono italic">{layer.size}</span>
                                <div className="flex gap-2">
                                    <button className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors">
                                        <Cpu size={12} />
                                    </button>
                                    <button className="p-1 hover:bg-rose-500/20 rounded text-zinc-500 hover:text-rose-400 transition-colors">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
             </div>
         ) : loading && currentFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-50">
               <Loader2 className="animate-spin mb-2" />
               <span>Scanning blocks...</span>
            </div>
         ) : currentFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-50 italic">
               <AlertCircle size={20} className="mb-2" />
               <span>No objects detected.</span>
            </div>
         ) : (
            <table className="w-full text-left">
               <thead className="sticky top-0 bg-zinc-900 text-zinc-500 border-b border-zinc-800 uppercase text-[9px]">
                  <tr>
                     <th className="px-4 py-2 font-medium">Name</th>
                     <th className="px-4 py-2 font-medium">Size</th>
                     <th className="px-4 py-2 font-medium">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-900">
                  {currentFiles.map((file) => (
                     <tr key={file.name} className="hover:bg-zinc-800/30 group">
                        <td className="px-4 py-3 flex items-center gap-2">
                           {file.name.endsWith('.tmp') ? <FileCode size={14} className="text-amber-500" /> : <FileText size={14} className="text-zinc-500" />}
                           <span className="truncate max-w-[250px]" title={file.name}>{file.name}</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                           {(file.size / 1024).toFixed(1)} KB
                        </td>
                        <td className="px-4 py-3">
                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             {tab === 'local' && (
                               <button 
                                 onClick={() => syncToCloud(file.name)}
                                 disabled={syncing === file.name}
                                 className="text-indigo-400 hover:text-indigo-300 p-1"
                                 title="Sync to Cloud Vault"
                               >
                                 {syncing === file.name ? <Loader2 size={12} className="animate-spin" /> : <CloudUpload size={14} />}
                               </button>
                             )}
                             {tab === 'cloud' && (
                               <button 
                                 onClick={() => getCloudLink(file.name)}
                                 className="text-sky-400 hover:text-sky-300 p-1" 
                                 title="Get Signed URL"
                               >
                                  <ExternalLink size={14} />
                               </button>
                             )}
                             {tab === 'local' && (
                               <button 
                                 onClick={() => deleteLocal(file.name)}
                                 disabled={deleting === file.name}
                                 className="text-rose-500 hover:text-rose-400 p-1"
                                 title="Delete Local Buffer"
                               >
                                 {deleting === file.name ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={14} />}
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
