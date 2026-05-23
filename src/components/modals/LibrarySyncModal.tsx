import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Search, X, Loader2, Save } from 'lucide-react';

interface LibrarySyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const LibrarySyncModal: React.FC<LibrarySyncModalProps> = ({ isOpen, onClose, onSyncComplete }) => {
  const [provider, setProvider] = useState('launchbox');
  const [targetPath, setTargetPath] = useState('C:\\LaunchBox');
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPath.trim()) return;

    setIsScanning(true);
    setStatusMessage(`Initiating ${provider.toUpperCase()} sync sequence on node ${targetPath}...`);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, targetPath: targetPath.trim() })
      });
      const data = await res.json();
      
      setStatusMessage(data.message || 'Subsystem synchronized successfully.');
      setTimeout(() => {
         if (onSyncComplete) onSyncComplete();
         onClose();
      }, 2000);
    } catch(err: any) {
      setStatusMessage('Sync failure. Connection interrupted.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-lg bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)]/20 rounded-[28px] shadow-2xl overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-[var(--md-sys-color-outline)]/10 flex justify-between items-center bg-[var(--md-sys-color-surface-variant)]/20">
              <div className="flex items-center gap-3">
                <Database size={24} className="text-[var(--md-sys-color-primary)]" />
                <div>
                  <h3 className="text-[14px] font-black tracking-widest uppercase">System Sync</h3>
                  <p className="text-[10px] text-[var(--md-sys-color-outline)] font-bold tracking-[0.2em] uppercase leading-none mt-1">Cross-Platform Discovery</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[var(--md-sys-color-surface-variant)] rounded-full transition-colors text-[var(--md-sys-color-on-surface)]">
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              <form onSubmit={handleScan} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[var(--md-sys-color-primary)] uppercase tracking-widest mb-2">Target Frontend</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full bg-[var(--md-sys-color-surface-variant)]/20 border border-[var(--md-sys-color-outline)]/20 rounded-2xl px-4 py-3 text-sm font-bold text-[var(--md-sys-color-on-surface)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/50 focus:outline-none transition-all"
                    disabled={isScanning}
                  >
                    <option value="launchbox">LaunchBox (XML)</option>
                    <option value="batocera">Batocera (Gamelist XML)</option>
                    <option value="retrobat">Retrobat (Gamelist XML)</option>
                    <option value="lemuroid">Lemuroid (JSON)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--md-sys-color-primary)] uppercase tracking-widest mb-2">Absolute Path</label>
                  <input
                    type="text"
                    value={targetPath}
                    onChange={(e) => setTargetPath(e.target.value)}
                    placeholder="e.g. C:\LaunchBox or /userdata/roms/gamelist.xml"
                    className="w-full bg-[var(--md-sys-color-surface-variant)]/20 border border-[var(--md-sys-color-outline)]/20 rounded-2xl px-4 py-3 text-sm font-bold text-[var(--md-sys-color-on-surface)] placeholder-[var(--md-sys-color-outline)]/50 focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/50 focus:outline-none transition-all"
                    disabled={isScanning}
                    required
                  />
                </div>
                
                {statusMessage && (
                   <div className="p-4 bg-[var(--md-sys-color-surface-variant)]/50 border border-[var(--md-sys-color-outline)]/20 rounded-2xl text-[11px] font-mono text-[var(--md-sys-color-on-surface)]">
                      {statusMessage}
                   </div>
                )}

                <div className="pt-4 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[var(--md-sys-color-surface-variant)] transition-colors text-[var(--md-sys-color-on-surface)]"
                    disabled={isScanning}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isScanning || !targetPath.trim()}
                    className="flex items-center gap-2 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[var(--md-sys-color-primary)]/90 transition-all disabled:opacity-50"
                  >
                    {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    {isScanning ? "Scanning..." : "Execute Sync"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
