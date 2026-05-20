import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Loader2, Database, Send, AlertTriangle } from 'lucide-react';
import { aiOrchestrator } from '../../services/ai/orchestrator';
import { Game } from '../../data/games';

interface GameImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (game: Game) => void;
}

export const GameImportModal: React.FC<GameImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('Arcade');
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsScraping(true);
    setError(null);

    try {
      // Step 1: Enrich with AI
      const metadata = await aiOrchestrator.enrichGame(title, platform);
      
      if (!metadata) {
        throw new Error("Could not find neural metadata for this title.");
      }

      // Step 2: Construct Game Object
      const newGame: Game = {
        id: `custom-${Date.now()}`,
        title: title.trim(),
        platform: platform,
        developer: metadata.developer || 'Unknown Publisher',
        releaseYear: parseInt(metadata.year || '0') || 2024,
        genre: metadata.genre || 'Various',
        description: metadata.description || `Metadata for ${title}`,
        suggestedCore: metadata.suggested_core || 'MAME',
        coverArt: `https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80`, // Placeholder that gets replaced by user later or by another step
        fanArt: `https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80`,
      };

      onImport(newGame);
      setTitle('');
      onClose();
    } catch (err: any) {
      setError(err.message || "NEURAL_PIPELINE_ERROR");
    } finally {
      setIsScraping(false);
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
            className="w-full max-w-lg bg-[#121214] border border-white/10 rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]"
          >
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-indigo-600/5">
              <div className="flex items-center gap-3">
                <Database size={24} className="text-indigo-500" />
                <div>
                  <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Neural Importer</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">V9 Core Metadata Ingestion</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Target Title</label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Street Fighter II"
                  className="w-full bg-[#09090A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Architecture Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-[#09090A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="Arcade">Arcade</option>
                  <option value="Super Nintendo">Super Nintendo</option>
                  <option value="NES">NES</option>
                  <option value="Genesis">Genesis</option>
                  <option value="PlayStation">PlayStation</option>
                  <option value="Nintendo 64">Nintendo 64</option>
                  <option value="Dreamcast">Dreamcast</option>
                </select>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3"
                >
                  <AlertTriangle className="text-rose-500 shrink-0" size={18} />
                  <p className="text-xs text-rose-200 font-medium">{error}</p>
                </motion.div>
              )}

              <div className="pt-4 flex gap-4">
                <button
                  type="submit"
                  disabled={isScraping || !title.trim()}
                  className="flex-1 bg-white hover:bg-zinc-200 text-black h-12 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isScraping ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Neural Synthesis...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Ingest Metadata
                    </>
                  )}
                </button>
              </div>

              <div className="bg-indigo-600/5 p-4 rounded-2xl flex items-start gap-4 border border-indigo-500/10">
                <Sparkles size={24} className="text-indigo-400 shrink-0" />
                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                  The <span className="text-indigo-300">Neural Core</span> will automatically fetch high-fidelity historical metadata, including developers, release years, and recommended CPU cores based on global database clusters.
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
