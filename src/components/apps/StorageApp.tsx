import React, { useState, useEffect } from 'react';
import { HardDrive, Trash2, RefreshCw, FileText, FileCode, AlertCircle, Loader2, Cloud, CloudUpload, ExternalLink } from 'lucide-react';
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
  const [tab, setTab] = useState<'local' | 'cloud'>('local');
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
           <HardDrive size={20} className={tab === 'local' ? 'text-sky-400' : 'text-zinc-500'} />
           <Cloud size={20} className={tab === 'cloud' ? 'text-indigo-400' : 'text-zinc-500'} />
           <div>
              <h3 className="font-bold text-zinc-100 uppercase tracking-tighter">
                {tab === 'local' ? 'VFS Buffer Node' : 'FliperOS Cloud Vault'}
              </h3>
              <p className="text-[10px] text-zinc-500">
                {tab === 'local' ? 'Mount: /database | Status: ONLINE' : 'Status: CONNECTED | Region: US-EAST'}
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
         {loading && currentFiles.length === 0 ? (
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
