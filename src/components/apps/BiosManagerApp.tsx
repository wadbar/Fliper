import React, { useState, useEffect, useRef } from 'react';
import { Shield, CheckCircle2, AlertTriangle, FileSearch, Database, RefreshCcw } from 'lucide-react';

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
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load BIOS state from localStorage', e);
    }
    return [
      { name: 'scph1001.bin', system: 'PlayStation 1', status: 'valid', description: 'Sony PS1 US Bios (Recommended)' },
      { name: 'scph39001.bin', system: 'PlayStation 2', status: 'missing', description: 'Required for PCSX2 Boot' },
      { name: 'dc_boot.bin', system: 'Dreamcast', status: 'checking', description: 'SEGA Dreamcast Flash' },
      { name: 'neogeo.zip', system: 'Neo Geo', status: 'valid', description: 'Universal Arcade Bios' },
      { name: 'famicom.sys', system: 'Famicom Disk System', status: 'missing', description: 'Required for FDS games' }
    ];
  });
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('fliperos_bios_state', JSON.stringify(files));
    } catch (e) {
      console.error('Failed to save BIOS state to localStorage', e);
    }
  }, [files]);

  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const scanBios = () => {
    setIsScanning(true);
    setFiles(prev => prev.map(f => ({ ...f, status: 'checking' })));
    
    setTimeout(() => {
      if (!isMountedRef.current) return;
      setFiles(prev => prev.map(f => ({
        ...f,
        status: Math.random() > 0.3 ? 'valid' : 'missing'
      })));
      setIsScanning(false);
    }, 2000);
  };

  return (
    <div className="p-6 bg-[#0f0f11] h-full text-zinc-300 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="text-indigo-400" /> BIOS Integrity Shield
          </h2>
          <p className="text-zinc-500 text-sm">Validating system firmware for maximum compatibility</p>
        </div>
        <button 
          onClick={scanBios}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
        >
          {isScanning ? <RefreshCcw className="animate-spin" size={16} /> : <FileSearch size={16} />}
          {isScanning ? 'SCANNING KERNEL...' : 'RESYNC BIOS'}
        </button>
      </div>

      <div className="space-y-3">
        {files.map((file, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-[#1a1a1d] border border-zinc-800 rounded-xl group hover:border-zinc-700 transition-colors">
            <div className={`p-2 rounded-lg ${
              file.status === 'valid' ? 'bg-emerald-500/10 text-emerald-400' : 
              file.status === 'missing' ? 'bg-rose-500/10 text-rose-400' :
              'bg-indigo-500/10 text-indigo-400'
            }`}>
              {file.status === 'valid' ? <CheckCircle2 size={24} /> : 
               file.status === 'missing' ? <AlertTriangle size={24} /> :
               <RefreshCcw size={24} className="animate-spin" />}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{file.name}</span>
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">[{file.system}]</span>
              </div>
              <p className="text-xs text-zinc-500">{file.description}</p>
            </div>

            <div className="text-right">
               <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${
                 file.status === 'valid' ? 'border-emerald-500/20 text-emerald-400' :
                 file.status === 'missing' ? 'border-rose-500/20 text-rose-400' :
                 'border-indigo-500/20 text-indigo-400'
               }`}>
                 {file.status}
               </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
         <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
         <div className="text-xs text-amber-200/60 leading-relaxed">
            <p className="font-bold text-amber-500 mb-1 uppercase tracking-tight">Legal Notice</p>
            You must provide your own BIOS files. Placing them in <code className="text-amber-500 font-mono">/home/fliper/system/bios/</code> will trigger automatic hardware registration.
         </div>
      </div>
    </div>
  );
};
