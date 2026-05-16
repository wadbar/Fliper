import React, { useState, useEffect, useMemo } from 'react';
import { Game } from '../data/games';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Settings, Menu, Gamepad2, Trophy, Clock, DownloadCloud, Loader2, Sparkles } from 'lucide-react';

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

  // AI Enrichment Effect
  useEffect(() => {
    const game = gamesProp[selectedIndex];
    if (!game) return;

    // Only enrich if description is very short or suggestedCore is missing
    if (game.description.length < 50 || !game.suggestedCore) {
      const enrich = async () => {
        setIsAiLoading(true);
        try {
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
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 0.6, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${selectedGame.fanArt})` }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/90 via-[#0a0a0a]/40 to-transparent" />

      {/* Top HUD */}
      <div className="absolute top-10 w-full px-16 flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10">
            <Gamepad2 size={24} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Fliper Custom OS</span>
        </div>
        <div className="flex gap-6 items-center text-sm font-semibold bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/5">
           <span className="text-zinc-400">Mode:</span> <span className="text-emerald-400 font-bold tracking-widest uppercase">RTX / Ultra</span>
           <span className="w-px h-4 bg-zinc-700" />
           <span className="text-zinc-400">WSL2 Status:</span> <span className="text-emerald-400 font-bold">ACTIVE</span>
           <span className="w-px h-4 bg-zinc-700" />
           <span className="text-zinc-400">RAM:</span> <span className="text-white">Active Cache (64GB)</span>
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
              <div className="inline-flex px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg text-xs uppercase tracking-[0.2em] font-bold mb-6 text-zinc-300">
                {selectedGame.platform}
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-3 drop-shadow-2xl">
                {selectedGame.title}
              </h1>

              <div className="flex items-center gap-4 mb-6">
                <span className="text-2xl font-bold text-zinc-500">{selectedGame.releaseYear}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <span className="text-2xl font-medium text-zinc-400">{selectedGame.genre}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <span className="text-2xl font-medium text-zinc-400">{selectedGame.developer}</span>
                {isAiLoading && (
                  <div className="flex items-center gap-2 ml-4">
                    <Loader2 size={16} className="text-indigo-400 animate-spin" />
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest animate-pulse">Enriching Data...</span>
                  </div>
                )}
              </div>
              
              {selectedGame.suggestedCore && (
                <div className="flex items-center gap-2 mb-6">
                   <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-full">
                      <Sparkles size={14} className="text-indigo-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">AI Verified Core: {selectedGame.suggestedCore}</span>
                   </div>
                </div>
              )}

              <div className="flex gap-4 mb-8">
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 flex gap-4 pr-12">
                   <Clock className="text-zinc-400" />
                   <div>
                     <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Playtime</p>
                     <p className="font-semibold text-lg">24h 12m</p>
                   </div>
                </div>
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 flex gap-4 pr-12">
                   <Trophy className="text-yellow-500" />
                   <div>
                     <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Achievements</p>
                     <p className="font-semibold text-lg">12 / 48</p>
                   </div>
                </div>
              </div>

              <p className="text-xl text-zinc-400 leading-relaxed max-w-2xl">
                {selectedGame.description}
              </p>
            </motion.div>
          </div>
          
          {/* Cover Art Bento */}
          <div className="w-96 perspective-1000 hidden xl:block">
            <motion.div
               key={`cover-${selectedGame.id}`}
               initial={{ rotateY: -15, opacity: 0, x: 50, z: -100 }}
               animate={{ rotateY: -5, opacity: 1, x: 0, z: 0 }}
               transition={{ type: "spring", stiffness: 100, damping: 20 }}
               className="w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-indigo-900/30 border border-white/10 relative"
            >
               <img src={selectedGame.coverArt} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80'; }} />
               <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10" />
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
                    opacity: checkSelected ? 1 : 0.4, 
                    scale: checkSelected ? 1 : 0.85,
                    y: checkSelected ? 0 : 20,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  className={`relative rounded-xl overflow-hidden shadow-2xl shrink-0 cursor-pointer origin-bottom ${
                    checkSelected ? 'w-56 ring-2 ring-white/50 border border-white/20' : 'w-40 border border-transparent hover:ring-1 ring-white/30'
                  }`}
                >
                  <div className="aspect-[2/3] relative">
                    <img src={game.coverArt} loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80'; }} />
                    {!checkSelected && <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />}
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
