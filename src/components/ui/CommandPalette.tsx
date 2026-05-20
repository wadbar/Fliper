import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Gamepad2, Cpu, X, History, Star, ArrowRight } from 'lucide-react';
import { Game, games } from '../../data/games';
import Fuse from 'fuse.js';
import { audioEngine } from '../../services/audioEngine';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (game: Game) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onLaunch }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fuse = useMemo(() => {
    return new Fuse(games, {
      keys: ['title', 'platform', 'genre'],
      threshold: 0.3,
    });
  }, []);

  const results = useMemo(() => {
    if (!query) return games.slice(0, 5); // Default to first 5
    return fuse.search(query).map(r => r.item).slice(0, 8);
  }, [query, fuse]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Command Palette Keyboard Logic
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
        audioEngine.play('hover');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
        audioEngine.play('hover');
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        onLaunch(results[selectedIndex]);
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onLaunch, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[15vh] px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Search Bar */}
        <div className="flex items-center px-6 py-5 border-b border-white/5 gap-4">
           <Search size={20} className="text-zinc-500" />
           <input 
             autoFocus
             placeholder="Search games, systems, or metadata..."
             className="flex-1 bg-transparent border-none outline-none text-lg text-white font-medium placeholder-zinc-600"
             value={query}
             onChange={(e) => setQuery(e.target.value)}
           />
           <div className="flex items-center gap-2 px-2 py-1 bg-zinc-800 rounded border border-white/5">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">ESC</span>
           </div>
        </div>

        {/* Results Window */}
        <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
           <div className="px-4 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">
              {query ? 'Search Results' : 'Suggested Games'}
           </div>

           <div className="space-y-1">
              {results.length > 0 ? (
                results.map((game, i) => (
                  <div 
                    key={game.id}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={() => { onLaunch(game); onClose(); }}
                    className={`group px-4 py-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                      i === selectedIndex ? 'bg-indigo-600' : 'hover:bg-white/5'
                    }`}
                  >
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-14 rounded-lg overflow-hidden border shadow-lg transition-transform ${
                          i === selectedIndex ? 'border-white/40 scale-105' : 'border-white/5'
                        }`}>
                           <img src={game.coverArt} className="w-full h-full object-cover" />
                        </div>
                        <div>
                           <div className={`text-sm font-bold tracking-tight ${i === selectedIndex ? 'text-white' : 'text-zinc-200'}`}>
                              {game.title}
                           </div>
                           <div className={`text-[10px] font-mono uppercase tracking-widest ${i === selectedIndex ? 'text-indigo-200' : 'text-zinc-500'}`}>
                              {game.platform} • {game.releaseYear}
                           </div>
                        </div>
                     </div>

                     {i === selectedIndex && (
                        <div className="flex items-center gap-2 text-[10px] font-mono text-indigo-100 font-bold">
                           LAUNCH <ArrowRight size={12} />
                        </div>
                     )}
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-600 gap-3">
                   <Cpu size={32} strokeWidth={1.5} />
                   <p className="text-sm font-medium">No system matches for "{query}"</p>
                </div>
              )}
           </div>
        </div>

        {/* Footer Hints */}
        <div className="px-6 py-3 bg-black/40 border-t border-white/5 flex items-center gap-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
           <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-zinc-800 rounded border border-white/5 text-zinc-300">↑↓</span> Navigate
           </div>
           <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-zinc-800 rounded border border-white/5 text-zinc-300">⏎</span> Select
           </div>
           <div className="ml-auto flex items-center gap-2">
              <History size={12} /> Recent History Enabled
           </div>
        </div>
      </motion.div>
    </div>
  );
};
