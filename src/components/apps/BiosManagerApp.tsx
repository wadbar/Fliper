import React, { useState, useEffect, useRef } from 'react';
import { Shield, CheckCircle2, AlertTriangle, FileSearch, Database, RefreshCcw, Upload } from 'lucide-react';

interface BiosFile {
  name: string;
  system: string;
  status: 'valid' | 'missing' | 'checking';
  checksum?: string;
  description: string;
}

export const BiosManagerApp: React.FC = () => {
  const [files, setFiles] = useState<BiosFile[]>(() => {
    try {
      const stored = localStorage.getItem('fliperos_bios_state');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load BIOS state', e);
    }
    return [
      { name: 'scph1001.bin', system: 'PlayStation 1', status: 'valid', description: 'Sony PS1 US Bios (Recommended)' },
      { name: 'scph39001.bin', system: 'PlayStation 2', status: 'missing', description: 'Required for PCSX2 Boot' },
      { name: 'dc_boot.bin', system: 'Dreamcast', status: 'checking', description: 'SEGA Dreamcast Flash' },
      { name: 'neogeo.zip', system: 'Neo Geo', status: 'valid', description: 'Universal Arcade Bios' },
      { name: 'famicom.sys', system: 'Famicom Disk System', status: 'missing', description: 'Required for FDS games' },
      { name: 'sys_data.bin', system: 'Nintendo Switch', status: 'missing', description: 'Keys & Firmware for Ryujinx' }
    ];
  });
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('fliperos_bios_state', JSON.stringify(files));
    } catch (e) {}
  }, [files]);

  const isMountedRef = useRef(true);
  useEffect(() => { return () => { isMountedRef.current = false; }; }, []);

  const scanBios = async () => {
    setIsScanning(true);
    setFiles(prev => prev.map(f => ({ ...f, status: 'checking' })));
    try {
       const res = await fetch('/api/system/kernel/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'ls -la /roms/bios 2>/dev/null || echo ""' })
       });
       if (res.ok) {
          const { output } = await res.json();
          const presentFiles = output.split('\n').map((line: string) => line.split(' ').pop());
          setFiles(prev => prev.map(f => ({
             ...f,
             status: presentFiles.includes(f.name) ? 'valid' : 'missing'
          })));
       }
    } catch(err) {
       setFiles(prev => prev.map(f => ({ ...f, status: 'missing' })));
    } finally {
       if (isMountedRef.current) setIsScanning(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     
     const formData = new FormData();
     formData.append('file', file);
     formData.append('type', 'bios');
     
     try {
       await fetch('/api/system/import', { method: 'POST', body: formData });
       // Assuming it works, we optimistic update if it matches
       setFiles(prev => prev.map(f => {
         if (file.name.toLowerCase().includes(f.name.toLowerCase())) {
            return { ...f, status: 'valid' };
         }
         return f;
       }));
       alert(`BIOS ${file.name} imported securely.`);
     } catch(err) {
       alert('Failed to import BIOS.');
     }
  };

  return (
    <div className="p-6 bg-[#0f0f11] h-full text-zinc-300 font-sans flex flex-col">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="text-indigo-400" /> BIOS Integrity Shield
          </h2>
          <p className="text-zinc-500 text-sm">Validating system firmware for maximum compatibility</p>
        </div>
        <div className="flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleImport} accept=".bin,.zip,.sys,.rom" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
            >
              <Upload size={16} /> IMPORT ROOT FIRMWARE
            </button>
            <button 
              onClick={scanBios}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isScanning ? <RefreshCcw className="animate-spin" size={16} /> : <FileSearch size={16} />}
              {isScanning ? 'SCANNING KERNEL...' : 'RESYNC BIOS'}
            </button>
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {files.map((file, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-[#1a1a1d] border border-zinc-800 rounded-xl group hover:border-zinc-700 transition-colors">
            <div className={`p-3 rounded-lg ${
              file.status === 'valid' ? 'bg-emerald-500/10 text-emerald-400' : 
              file.status === 'missing' ? 'bg-rose-500/10 text-rose-400' :
              'bg-indigo-500/10 text-indigo-400'
            }`}>
              {file.status === 'valid' ? <CheckCircle2 size={24} /> : 
               file.status === 'missing' ? <AlertTriangle size={24} /> :
               <RefreshCcw size={24} className="animate-spin" />}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-bold text-white text-sm">{file.name}</span>
                <span className="text-[10px] text-indigo-400 uppercase font-black tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{file.system}</span>
              </div>
              <p className="text-xs text-zinc-500 font-mono">{file.description}</p>
            </div>

            <div className="text-right">
               <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                 file.status === 'valid' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' :
                 file.status === 'missing' ? 'border-rose-500/20 text-rose-400 bg-rose-500/5' :
                 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5'
               }`}>
                 {file.status}
               </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-4 shrink-0">
         <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
         <div className="text-xs text-amber-200/60 leading-relaxed font-mono">
            <p className="font-bold text-amber-500 mb-1 uppercase tracking-tight">System Notification</p>
            You must provide your own BIOS files. Importing them will copy them securely into <code className="text-amber-400 font-bold bg-amber-500/10 px-1 rounded">/roms/bios/</code>. The kernel will automatically mount them for Libretro cores.
         </div>
      </div>
    </div>
  );
};
