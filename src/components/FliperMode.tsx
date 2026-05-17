import React, { useState, useEffect, useMemo } from 'react';
import { Game } from '../data/games';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Settings, Menu, Gamepad2, Trophy, Clock, DownloadCloud, Loader2, Sparkles, Cpu, Zap } from 'lucide-react';

import { useLanguage } from '../contexts/LanguageContext';
import { CrtOverlay } from './CrtOverlay';

interface FliperModeProps {
  games: Game[];
  onGamesUpdate: React.Dispatch<React.SetStateAction<Game[]>>;
  onExit: () => void;
}

export const FliperMode: React.FC<FliperModeProps> = ({ games: gamesProp, onGamesUpdate, onExit }) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPreloading, setIsPreloading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const enrichedGamesRef = React.useRef<Set<string>>(new Set());

  // AI Enrichment Effect
  useEffect(() => {
    const game = gamesProp[selectedIndex];
    if (!game) return;

    // Only enrich if description is very short or suggestedCore is missing
    if ((game.description.length < 50 || !game.suggestedCore) && !enrichedGamesRef.current.has(game.id)) {
      const enrich = async () => {
        setIsAiLoading(true);
        try {
          enrichedGamesRef.current.add(game.id);
          const res = await fetch('/api/ai/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: game.title, platform: game.platform })
          });
          if (!res.ok) throw new Error("API Failure");
          const data = await res.json();
          if (data) {
            onGamesUpdate(prev => prev.map(g => g.id === game.id ? {
              ...g,
              releaseYear: parseInt(data.year) || g.releaseYear,
              developer: data.developer || g.developer,
              genre: data.genre || g.genre,
              description: data.description || g.description,
              suggestedCore: data.suggested_core || g.suggestedCore
            } : g));
          }
        } catch (err) {
          console.error("AI Enrichment failed", err);
        } finally {
          setIsAiLoading(false);
        }
      };
      enrich();
    }
  }, [selectedIndex, gamesProp, onGamesUpdate]);

  // Elite Optimization: Memoized preload routine replacing simple side effects
  useEffect(() => {
    let isMounted = true;
    const preloadAssets = async () => {
      const p1 = new Promise((resolve) => setTimeout(resolve, 600)); // Minimum splash delay
      
      const imageUrls = gamesProp.flatMap(g => [g.coverArt, g.fanArt]).filter(Boolean);
      const BATCH_SIZE = 5;
      
      for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
        if (!isMounted) break;
        const batch = imageUrls.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(url => {
          return new Promise((res) => {
            const img = new Image();
            img.onload = img.onerror = res;
            img.src = url;
          });
        }));
      }
      
      await p1; // Wait for minimum splash
      if (isMounted) setIsPreloading(false);
    };
    
    preloadAssets();
    return () => { isMounted = false; };
  }, [gamesProp]);

  const launchGame = async () => {
    if (isLaunching) return;
    const path = gamesProp[selectedIndex].id + '.rom';
    const platform = gamesProp[selectedIndex].platform;
    const mode = localStorage.getItem('fliper_perf_mode') || 'ultra';
    
    // Comprehensive platform-to-core mapping
    let coreId = gamesProp[selectedIndex].suggestedCore?.toLowerCase() || 'mame';
    
    if (!gamesProp[selectedIndex].suggestedCore) {
      const p = platform.toLowerCase();
      if (p.includes('playstation 2') || p.includes('ps2')) coreId = localStorage.getItem('fliper_core_ps2') || 'pcsx2';
      else if (p.includes('playstation 3') || p.includes('ps3')) coreId = localStorage.getItem('fliper_core_ps3') || 'rpcs3';
      else if (p.includes('playstation') || p.includes('psx') || p.includes('ps1')) coreId = localStorage.getItem('fliper_core_psx') || 'duckstation';
      else if (p.includes('nintendo 64') || p.includes('n64')) coreId = localStorage.getItem('fliper_core_n64') || 'mupen64plus_next';
      else if (p.includes('gamecube') || p.includes('wii')) coreId = localStorage.getItem('fliper_core_gc_wii') || 'dolphin';
      else if (p.includes('switch')) coreId = localStorage.getItem('fliper_core_switch') || 'ryujinx';
      else if (p.includes('3ds')) coreId = localStorage.getItem('fliper_core_3ds') || 'citra';
      else if (p.includes('dreamcast')) coreId = localStorage.getItem('fliper_core_dreamcast') || 'flycast';
      else if (p.includes('saturn')) coreId = localStorage.getItem('fliper_core_saturn') || 'beetle_saturn';
      else if (p.includes('snes') || p.includes('super nintendo')) coreId = localStorage.getItem('fliper_core_snes') || 'snes9x';
      else if (p.includes('nes') || p.includes('nintendo entertainment system')) coreId = localStorage.getItem('fliper_core_nes') || 'nestopia';
      else if (p.includes('genesis') || p.includes('mega drive')) coreId = localStorage.getItem('fliper_core_genesis') || 'genesis_plus_gx';
      else if (p.includes('game boy advance') || p.includes('gba')) coreId = localStorage.getItem('fliper_core_gba') || 'mgba';
      else if (p.includes('neogeo')) coreId = localStorage.getItem('fliper_core_neogeo') || 'fbneo';
      else coreId = localStorage.getItem('fliper_core_arcade') || 'mame';
    }

    setIsLaunching(true);
    console.log(`[Action] Invoking API launcher ${path} ${platform} ${mode.toUpperCase()} Core:${coreId}`);
    
    fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, platform, mode: mode.toUpperCase(), core: coreId })
    }).catch(err => console.error("Launcher API error", err));
  };

  useEffect(() => {
    if (!isLaunching) return;
    const timer = setTimeout(() => {
      setIsLaunching(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [isLaunching]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLaunching) return;
      if (e.key === 'ArrowRight') setSelectedIndex((prev) => (prev + 1) % gamesProp.length);
      else if (e.key === 'ArrowLeft') setSelectedIndex((prev) => (prev - 1 + gamesProp.length) % gamesProp.length);
      else if (e.key === 'Escape') onExit();
      else if (e.key === 'Enter') launchGame();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gamesProp.length, onExit, selectedIndex, isLaunching]);

  const selectedGame = gamesProp[selectedIndex];

  if (isPreloading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center font-mono">
        <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
        <span className="text-zinc-500 tracking-widest uppercase text-sm">Loading RAM Cache (64GB)...</span>
        <CrtOverlay />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-white overflow-hidden select-none font-sans flex flex-col">
      <CrtOverlay />
      {/* Launching Sequence Overlay */}
      <AnimatePresence>
        {isLaunching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center font-mono"
          >
            <motion.div
               animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
               transition={{ duration: 0.5, repeat: Infinity }}
               className="text-indigo-500 mb-8"
            >
               <Gamepad2 size={64} />
            </motion.div>
            <h1 className="text-4xl font-bold tracking-widest text-white mb-2 animate-pulse">{t('booting')}</h1>
            <p className="text-zinc-500 uppercase tracking-widest text-sm mb-8">{selectedGame.title}</p>
            <div className="w-64 h-1 bg-zinc-900 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: "100%" }}
                 transition={{ duration: 3.5, ease: "easeInOut" }}
                 className="h-full bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)]"
               />
            </div>
            <p className="text-zinc-600 mt-4 text-xs">Initializing WSL2 Virtual Display...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background artwork animado (10ft UI) */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={selectedGame.id}
          initial={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
          animate={{ opacity: 0.6, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${selectedGame.fanArt})` }}
        >
          <div className="absolute inset-0 bg-[#0a0a0a]/40 backdrop-blur-[2px]" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0a0a_100%)] opacity-60 pointer-events-none" />

      {/* Retro Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] opacity-20" />

      {/* Top HUD */}
      <div className="absolute top-0 w-full px-16 py-10 flex justify-between items-center z-20 backdrop-blur-md border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-6">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/40 border border-white/30"
          >
            <Gamepad2 size={32} className="text-white drop-shadow-lg" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-3xl font-black tracking-tighter text-white leading-none italic">FLIPER PRO</span>
            <div className="flex items-center gap-2 mt-1.5">
               <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em]">Sovereign Kernel OS</span>
               <div className="px-2 py-0.5 bg-indigo-500/20 rounded-md text-[8px] font-black text-white border border-indigo-500/20">v2.5.5</div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
            <div className="flex gap-8 items-center text-[10px] font-black uppercase tracking-widest bg-white/5 backdrop-blur-2xl px-8 py-4 rounded-2xl border border-white/10 shadow-2xl relative group overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
               <div className="flex items-center gap-3">
                 <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                 </div>
                 <span className="text-zinc-500">System:</span> <span className="text-white">OPTIMAL</span>
               </div>
               <div className="w-px h-6 bg-white/10" />
               <div className="flex items-center gap-3">
                 <Cpu size={14} className="text-indigo-400" />
                 <span className="text-zinc-500">Core:</span> <span className="text-white">64-THREAD</span>
               </div>
               <div className="w-px h-6 bg-white/10" />
               <div className="flex items-center gap-3">
                 <Zap size={14} className="text-amber-400" />
                 <span className="text-zinc-500">Neural:</span> <span className="text-white">ACTIVE</span>
               </div>
            </div>
            
            <motion.div 
               whileHover={{ scale: 1.05 }}
               className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 p-0.5 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 shadow-xl cursor-pointer"
            >
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=FliperOS" className="w-full h-full rounded-2xl bg-zinc-900" />
            </motion.div>
        </div>
      </div>

      {/* Main Layout - Bento Grid inspirated */}
      <div className="relative z-10 w-full h-full px-16 pb-16 pt-32 flex flex-col justify-between">
        
        <div className="flex gap-12 items-start h-full mt-10">
          {/* Game Info Panel */}
          <div className="flex-1 max-w-3xl flex flex-col">
            <motion.div
              key={`info-${selectedGame.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="inline-flex px-4 py-2 bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 rounded-lg text-[10px] uppercase tracking-[0.4em] font-black mb-6 text-indigo-400">
                {selectedGame.platform} // 01. SYSTEMS_CHECK
              </div>
              <h1 className="text-7xl md:text-9xl font-black tracking-[calc(-0.05em)] leading-[0.85] mb-6 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
                {selectedGame.title}
              </h1>

              <div className="flex items-center gap-6 mb-10">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Year</span>
                    <span className="text-2xl font-black text-white">{selectedGame.releaseYear}</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Genre</span>
                    <span className="text-2xl font-black text-zinc-300">{selectedGame.genre}</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Dev</span>
                    <span className="text-2xl font-black text-zinc-300">{selectedGame.developer}</span>
                </div>
                
                {isAiLoading && (
                  <div className="flex items-center gap-3 ml-6 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                    <Loader2 size={16} className="text-indigo-400 animate-spin" />
                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] animate-pulse">Neural Enrichment In Progress...</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 mb-10">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex gap-5 pr-16 hover:bg-white/10 transition-colors">
                   <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                     <Clock className="text-zinc-300" size={20} />
                   </div>
                   <div>
                     <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">Total Playtime</p>
                     <p className="font-black text-xl text-white">24h 12m</p>
                   </div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex gap-5 pr-16 hover:bg-white/10 transition-colors">
                   <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                     <Trophy className="text-amber-500" size={20} />
                   </div>
                   <div>
                     <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">Elite Trophies</p>
                     <p className="font-black text-xl text-white">12 / 48</p>
                   </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-6 top-0 bottom-0 w-1 bg-indigo-500/50 rounded-full" />
                <p className="text-2xl text-zinc-400/90 leading-relaxed max-w-3xl font-medium tracking-tight">
                    {selectedGame.description}
                </p>
              </div>
            </motion.div>
          </div>
          
          {/* Cover Art Bento */}
          <div className="w-96 perspective-1000 hidden xl:block">
            <motion.div
               key={`cover-${selectedGame.id}`}
               initial={{ rotateY: -15, opacity: 0, x: 50, z: -100 }}
               animate={{ rotateY: -5, opacity: 1, x: 0, z: 0 }}
               transition={{ type: "spring", stiffness: 100, damping: 20 }}
               className="w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(99,102,241,0.2)] border border-white/20 relative group"
            >
               {/* Internal Bevel */}
               <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none z-20" />
               <div className="absolute inset-[1px] border border-black/40 rounded-2xl pointer-events-none z-20" />
               
               <img src={selectedGame.coverArt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms]" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80'; }} />
               
               {/* Surface Glare */}
               <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/20 z-10" />
               
               {/* Moving Shine Animation */}
               <motion.div 
                 animate={{ x: ['-100%', '200%'] }}
                 transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                 className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 z-20 pointer-events-none"
               />
            </motion.div>
          </div>
        </div>

        {/* Action Bar (Steam Deck Inspired) */}
        <div className="flex items-end justify-between mt-auto">
          {/* Cover Flow Carousel */}
          <div className="flex items-end gap-4 overflow-visible ml-4">
            {gamesProp.map((game, idx) => {
              const checkSelected = idx === selectedIndex;
              const diff = idx - selectedIndex;
              if (diff < -2 || diff > 6) return null;

              return (
                <motion.div
                  key={game.id}
                  layout
                  onClick={() => setSelectedIndex(idx)}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ 
                    opacity: checkSelected ? 1 : 0.5, 
                    scale: checkSelected ? 1 : 0.8,
                    y: checkSelected ? 0 : 25,
                    rotateY: checkSelected ? 0 : (idx < selectedIndex ? 15 : -15),
                    z: checkSelected ? 0 : -50
                  }}
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className={`relative rounded-xl overflow-hidden shadow-2xl shrink-0 cursor-pointer origin-bottom group perspective-500 ${
                    checkSelected 
                      ? 'w-56 ring-4 ring-indigo-500/50 border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
                      : 'w-40 border border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="aspect-[2/3] relative">
                    <img src={game.coverArt} loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80'; }} />
                    
                    {/* Glossy Overlay for Carousel */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20 z-10" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {!checkSelected && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] group-hover:bg-black/20 transition-all" />
                    )}
                    
                    {/* Active Scanline Effect for Selected */}
                    {checkSelected && (
                      <motion.div 
                        animate={{ y: ['0%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-x-0 h-1 bg-white/20 z-20 pointer-events-none blur-sm"
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* D-Pad Hint Menu */}
          <div className="bg-[#121212] border border-white/10 rounded-full px-8 py-4 flex gap-8 shadow-2xl backdrop-blur-2xl">
            <button onClick={launchGame} className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-black border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]">A</div>
              <span className="font-semibold text-sm">{t('app_play')}</span>
            </button>
            <div className="w-px h-6 bg-white/10" />
            <button className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] flex items-center justify-center font-bold text-white">X</div>
              <span className="font-semibold text-sm text-zinc-200">{t('options')} / Cocktail (R)</span>
            </button>
            <div className="w-px h-6 bg-white/10" />
            <button onClick={onExit} className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center justify-center font-bold text-white">B</div>
              <span className="font-semibold text-sm text-zinc-200">{t('desktop')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
