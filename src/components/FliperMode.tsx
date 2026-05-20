import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Game } from '../data/games';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Settings, Menu, Gamepad2, Trophy, Clock, Search, ListFilter, Cpu, Zap, Activity, Loader2, Sparkles, Info, Heart, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { CrtOverlay } from './CrtOverlay';

import { User } from 'firebase/auth';
import { aiOrchestrator } from '../services/ai/orchestrator';

interface FliperModeProps {
  games: Game[];
  onGamesUpdate: React.Dispatch<React.SetStateAction<Game[]>>;
  onExit: () => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  user: User | null;
  onLogin: () => void;
  stats: Record<string, any>;
  onRecordLaunch: (game: Game) => void;
}

// ----------------------------------------------------------------------
// Audio Engine for UI Sounds (Web Audio API Synthesizer)
// ----------------------------------------------------------------------
class UIResourceEngine {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playNav() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playSelect() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playLaunch() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }
}
const audioEngine = new UIResourceEngine();

export const FliperMode: React.FC<FliperModeProps> = ({ 
  games: gamesProp, 
  onGamesUpdate, 
  onExit, 
  favorites, 
  onToggleFavorite: toggleFavorite,
  user,
  onLogin,
  stats,
  onRecordLaunch 
}) => {
  const { t } = useLanguage();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPreloading, setIsPreloading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [metrics, setMetrics] = useState({ cpu: 0, ram: 0, mode: 'STABLE' });

  // Filter games based on selected platform and search query
  const platforms = useMemo(() => ['All', ...Array.from(new Set(gamesProp.map(g => g.platform)))].sort(), [gamesProp]);
  
  const filteredGames = useMemo(() => {
    let result = selectedPlatform === 'All' ? gamesProp : gamesProp.filter(g => g.platform === selectedPlatform);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => 
        g.title.toLowerCase().includes(q) || 
        g.platform.toLowerCase().includes(q) || 
        (g.genre && g.genre.toLowerCase().includes(q))
      );
    }
    return result;
  }, [gamesProp, selectedPlatform, searchQuery]);

  // Initialize constraints
  const activeGame = filteredGames[selectedIndex] || filteredGames[0];
  const enrichedGamesRef = useRef<Set<string>>(new Set());

  // ----------------------------------------------------------------------
  // Audio Initialization
  // ----------------------------------------------------------------------
  useEffect(() => {
    const initAudio = () => {
      audioEngine.init();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('keydown', initAudio);
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
  }, []);

  // ----------------------------------------------------------------------
  // Telemetry Fetching (Real Backend)
  // ----------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    const ac = new AbortController();
    const fetchStats = async () => {
      if (!isMounted) return;
      try {
        const res = await fetch('/api/system/metrics', { signal: ac.signal });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setMetrics({
              cpu: data.overallCpuUsage || 0,
              ram: data.memoryUsage ? Math.round(data.memoryUsage.rss / 1024 / 1024 / 1024 * 10) / 10 : 0,
              mode: data.overallCpuUsage > 80 ? 'OVERLOAD' : 'STABLE'
            });
          }
        }
      } catch (err: any) {
        // Silently ignore ping aborts
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => {
      isMounted = false;
      ac.abort();
      clearInterval(interval);
    };
  }, []);

  // ----------------------------------------------------------------------
  // Smart AI Enrichment (Neural Orchestrator Integration)
  // ----------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    if (!activeGame) return;
    
    const needsEnrichment = !activeGame.description || 
                           activeGame.description.length < 50 || 
                           !activeGame.suggestedCore || 
                           !activeGame.genre || 
                           activeGame.releaseYear === 0;

    // Only attempt enrichment if missing data and not already attempted in this session
    if (needsEnrichment && !enrichedGamesRef.current.has(activeGame.id)) {
      
      const timer = setTimeout(async () => {
        try {
          setIsEnriching(true);
          enrichedGamesRef.current.add(activeGame.id);
          
          const data = await aiOrchestrator.enrichGame(activeGame.title, activeGame.platform);
          
          if (data && isMounted) {
            onGamesUpdate(prev => prev.map(g => g.id === activeGame.id ? {
              ...g,
              releaseYear: parseInt(data.year || '0') || g.releaseYear,
              developer: data.developer || g.developer,
              genre: data.genre || g.genre,
              description: data.description || g.description,
              suggestedCore: data.suggested_core || g.suggestedCore
            } : g));
          }
        } catch (err) {
          if (isMounted) console.error("Neural Enrichment Fault:", err);
        } finally {
          if (isMounted) setIsEnriching(false);
        }
      }, 800); // Debounce to prevent 429 spam while scrolling
      
      return () => { 
        isMounted = false; 
        clearTimeout(timer);
      };
    }
    
    return () => { isMounted = false; };
  }, [selectedIndex, selectedPlatform, gamesProp, onGamesUpdate, activeGame]);

  // ----------------------------------------------------------------------
  // Preloading Assets
  // ----------------------------------------------------------------------
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

  // ----------------------------------------------------------------------
  // Gamepad & Keyboard Navigation
  // ----------------------------------------------------------------------
  const handleNav = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (isLaunching) return;
    audioEngine.playNav();
    if (dir === 'left') {
      setSelectedPlatform(prev => {
        const idx = platforms.indexOf(prev);
        const newIdx = (idx - 1 + platforms.length) % platforms.length;
        setSelectedIndex(0);
        return platforms[newIdx];
      });
    } else if (dir === 'right') {
      setSelectedPlatform(prev => {
        const idx = platforms.indexOf(prev);
        const newIdx = (idx + 1) % platforms.length;
        setSelectedIndex(0);
        return platforms[newIdx];
      });
    } else if (dir === 'down') {
      setSelectedIndex(prev => (prev + 1) % filteredGames.length);
    } else if (dir === 'up') {
      setSelectedIndex(prev => (prev - 1 + filteredGames.length) % filteredGames.length);
    }
  }, [isLaunching, platforms, filteredGames.length]);

  // ----------------------------------------------------------------------
  // Launch Logic
  // ----------------------------------------------------------------------
  const launchGame = useCallback(async () => {
    if (isLaunching || !activeGame) return;
    audioEngine.playLaunch();
    setIsLaunching(true);
    
    const path = activeGame.id + '.rom';
    const platform = activeGame.platform;
    const mode = localStorage.getItem('fliper_perf_mode') || 'ultra';
    
    // Core Resolution
    let coreId = activeGame.suggestedCore?.toLowerCase() || 'mame';

    // V9: Cloud Sync - Record Launch
    await onRecordLaunch(activeGame);
    
    // Fallback overrides
    if (!activeGame.suggestedCore) {
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

    console.log(`[Action] Invoking API launcher ${path} ${platform} ${mode.toUpperCase()} Core:${coreId}`);
    
    // Real System Call
    fetch('/api/system/kernel/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `retroarch -L ${coreId}_libretro.so /roms/${path}` })
    }).catch(err => console.error("Launcher API error", err));
    
    setTimeout(() => { setIsLaunching(false); }, 4000);
  }, [activeGame, isLaunching]);

  useEffect(() => {
    let animationFrameId: number;
    let lastGamepadState = { up: false, down: false, left: false, right: false, a: false, b: false, y: false };

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      if (gp && !isLaunching) {
        // D-Pad or Left Stick
        const up = gp.buttons[12]?.pressed || gp.axes[1] < -0.5;
        const down = gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
        const left = gp.buttons[14]?.pressed || gp.axes[0] < -0.5;
        const right = gp.buttons[15]?.pressed || gp.axes[0] > 0.5;
        const aBtn = gp.buttons[0]?.pressed;
        const bBtn = gp.buttons[1]?.pressed;
        const yBtn = gp.buttons[3]?.pressed;

        if (up && !lastGamepadState.up) handleNav('up');
        if (down && !lastGamepadState.down) handleNav('down');
        if (left && !lastGamepadState.left) handleNav('left');
        if (right && !lastGamepadState.right) handleNav('right');
        
        if (aBtn && !lastGamepadState.a) {
           launchGame();
        }
        if (bBtn && !lastGamepadState.b) {
           audioEngine.playSelect();
           onExit();
        }
        if (yBtn && !lastGamepadState.y && activeGame) {
           toggleFavorite(activeGame.id);
        }

        lastGamepadState = { up, down, left, right, a: aBtn, b: bBtn, y: yBtn };
      }
      animationFrameId = requestAnimationFrame(pollGamepad);
    };
    pollGamepad();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLaunching) return;
      
      // Handle search toggle
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        return;
      }

      if (isSearchOpen) {
        if (e.key === 'Escape') {
          setIsSearchOpen(false);
          setSearchQuery('');
        }
        return;
      }

      if (e.key === 'ArrowDown') { e.preventDefault(); handleNav('down'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); handleNav('up'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handleNav('left'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleNav('right'); }
      else if (e.key === 'f' || e.key === '/') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      else if (e.key === 'Escape' || e.key === 'Backspace') {
         audioEngine.playSelect();
         onExit();
      }
      else if (e.key === 'Enter') {
         launchGame();
      }
      else if (e.key === 'h' && activeGame) {
         toggleFavorite(activeGame.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [handleNav, isLaunching, onExit, launchGame]);

  if (isPreloading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a09] flex flex-col items-center justify-center font-mono">
        <Loader2 size={64} className="text-white animate-spin mb-6" />
        <span className="text-zinc-500 tracking-[0.3em] uppercase text-sm font-bold">Initializing BigBox Architecture...</span>
        <CrtOverlay />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#050505] text-white overflow-hidden select-none font-sans flex flex-col">
      <CrtOverlay />

      {/* Dynamic Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeGame?.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 0.4, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${activeGame?.fanArt || activeGame?.coverArt})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Main Grid Layout */}
      <div className="relative z-10 w-full h-full flex flex-col">
        
        {/* Header HUD */}
        <header className="px-12 py-8 flex justify-between items-center backdrop-blur-sm border-b border-white/5">
           <div className="flex items-center gap-6">
              <Gamepad2 size={42} className="text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              <div>
                <h1 className="text-4xl font-black italic tracking-tighter leading-none">FLIPER OS <span className="text-indigo-500">PRO</span></h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold mt-1">Sovereign Multicade Environment</p>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ opacity: 0, width: 0, x: 20 }}
                    animate={{ opacity: 1, width: 'auto', x: 0 }}
                    exit={{ opacity: 0, width: 0, x: 20 }}
                    className="relative flex items-center"
                  >
                    <Search size={16} className="absolute left-4 text-zinc-500" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search title, platform, genre..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedIndex(0);
                      }}
                      className="bg-zinc-900/80 border border-indigo-500/30 rounded-full py-2 pl-12 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-72 text-white placeholder-zinc-500 font-bold tracking-tight backdrop-blur-xl"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedIndex(0);
                        }}
                        className="absolute right-4 text-zinc-500 hover:text-white transition-colors"
                      >
                         <Info size={14} className="rotate-45" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-3 rounded-full transition-all ${isSearchOpen ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
              >
                <Search size={20} />
              </button>

              <div className="flex gap-8 items-center bg-white/5 border border-white/10 rounded-full px-8 py-3 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-3 relative group">
                   <ListFilter size={16} className="text-zinc-400" />
                   <select 
                     value={selectedPlatform}
                     onChange={(e) => {
                       setSelectedPlatform(e.target.value);
                       setSelectedIndex(0);
                     }}
                     className="bg-transparent text-xs font-black text-zinc-300 uppercase tracking-widest outline-none appearance-none cursor-pointer pr-4 hover:text-white transition-colors"
                   >
                     {platforms.map(p => (
                       <option key={p} value={p} className="bg-zinc-900 text-white">{p}</option>
                     ))}
                   </select>
                   <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                      <Zap size={8} />
                   </div>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="flex items-center gap-3">
                   <Cpu size={16} className="text-emerald-400" />
                   <span className="text-xs font-bold text-white tracking-widest">{metrics.cpu.toFixed(1)}%</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="flex items-center gap-3">
                   <Activity size={16} className={metrics.mode === 'STABLE' ? 'text-indigo-400' : 'text-rose-400'} />
                   <span className="text-xs font-bold text-white tracking-widest">{metrics.mode}</span>
                </div>
              </div>
           </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex px-12 pb-12 gap-12 mt-8 overflow-hidden">
           
           {/* Left Sidebar - Curved Wheel */}
           <div className="w-1/4 flex flex-col gap-2 relative h-full">
              <div className="flex-1 overflow-visible relative flex flex-col justify-center perspective-1000">
                 {filteredGames.map((game, idx) => {
                    const diff = idx - selectedIndex;
                    // Extended window for smoother wheel curvature
                    if (diff < -5 || diff > 6) return null;
                    
                    const isSelected = diff === 0;
                    
                    // V9: Wheel Curvature Calculation
                    const rotateX = diff * -12; // Angle on the wheel
                    const translateY = diff * 70; // Vertical spacing
                    const translateZ = Math.abs(diff) * -40; // Depth for curve effect
                    const opacity = Math.max(0, 1 - Math.abs(diff) * 0.2);

                    const needsEnrichment = !game.description || game.description.length < 50 || !game.suggestedCore || !game.releaseYear || !game.genre;
                    
                    return (
                      <motion.div
                        key={game.id}
                        initial={false}
                        animate={{
                          rotateX,
                          y: translateY,
                          z: translateZ,
                          x: isSelected ? 40 : 0,
                          opacity,
                          scale: isSelected ? 1.1 : 0.9,
                        }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        onClick={() => {
                          audioEngine.playNav();
                          setSelectedIndex(idx);
                        }}
                        className={`py-3 px-6 rounded-xl cursor-pointer absolute w-full transition-all duration-300 ${
                          isSelected 
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-800 shadow-[0_0_50px_rgba(79,70,229,0.4)] border-y border-white/20' 
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                        style={{ backfaceVisibility: 'hidden' }}
                      >
                         <h2 className={`font-black uppercase tracking-[0.15em] truncate py-1 flex items-center justify-between ${isSelected ? 'text-xl text-white' : 'text-lg text-zinc-500'}`}>
                           {game.title}
                           <div className="flex items-center gap-2">
                             {favorites.has(game.id) && <Heart size={14} className="fill-rose-500 text-rose-500" />}
                             {isSelected && isEnriching ? (
                               <div className="flex items-center gap-1.5 ml-2">
                                 <Loader2 size={12} className="animate-spin text-white" />
                                 <Sparkles size={10} className="text-indigo-300 animate-pulse" />
                               </div>
                             ) : (
                               <>
                                 {!needsEnrichment && (
                                   <CheckCircle2 size={14} className="text-emerald-500 opacity-60" />
                                 )}
                               </>
                             )}
                           </div>
                         </h2>
                      </motion.div>
                    );
                 })}
              </div>
           </div>

           {/* Right Area - Big Box Cinematic Spread */}
           <div className="flex-1 flex flex-col justify-center items-end pr-8">
              <AnimatePresence mode="wait">
                 <motion.div
                    key={activeGame?.id}
                    initial={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
                    transition={{ duration: 0.5, ease: "circOut" }}
                    className="flex flex-col items-end text-right max-w-3xl"
                 >
                    {/* Platform Logo-style Badge */}
                    <div className="flex items-center gap-3 mb-4">
                       <div className="w-1.5 h-10 bg-indigo-500" />
                       <div className="flex flex-col items-start text-left">
                          <span className="text-[10px] font-black tracking-[0.5em] text-zinc-500 uppercase">Platform Architecture</span>
                          <span className="text-xl font-bold text-white uppercase tracking-tighter italic">{activeGame?.platform}</span>
                       </div>
                    </div>

                    <h2 className="text-8xl font-black italic tracking-tighter leading-none mb-8 drop-shadow-2xl text-white uppercase">
                       {activeGame?.title}
                    </h2>

                    {/* Metadata Grid Inspired by Big Box Cinematic Themes */}
                    <div className="grid grid-cols-4 gap-12 mb-12 bg-black/60 backdrop-blur-3xl px-12 py-6 rounded-3xl border border-white/5 shadow-2xl skew-x-[-10deg]">
                       <div className="flex flex-col items-center skew-x-[10deg]">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">Established</span>
                          <span className="font-mono text-2xl font-black text-white">{activeGame?.releaseYear}</span>
                       </div>
                       <div className="flex flex-col items-center skew-x-[10deg]">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">Genre</span>
                          <span className="font-mono text-lg font-black text-indigo-400 truncate max-w-[100px] text-center">{activeGame?.genre}</span>
                       </div>
                       <div className="flex flex-col items-center skew-x-[10deg]">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">Developer</span>
                          <span className="font-mono text-lg font-black text-zinc-300 truncate max-w-[120px] text-center">{activeGame?.developer}</span>
                       </div>
                       <div className="flex flex-col items-center skew-x-[10deg]">
                          <span className="text-[9px] text-emerald-500 uppercase tracking-widest font-black mb-1">CPU Core</span>
                          <span className="font-mono text-lg font-black text-emerald-400">{activeGame?.suggestedCore || 'MAME'}</span>
                       </div>
                    </div>

                    <div className="flex flex-col items-end">
                       <p className="text-zinc-400 text-xl leading-snug italic max-w-xl font-medium mb-12 drop-shadow-lg">
                          {activeGame?.description || "Initializing system description matrix..."}
                       </p>

                       {/* Large Box Art Hovering Perspective */}
                       <div className="relative group">
                          <motion.div
                            animate={{ 
                              rotateY: [-5, 5],
                              rotateX: [2, -2],
                            }}
                            transition={{ duration: 4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                            className="w-80 aspect-[3/4] rounded-2xl overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/20 transform-gpu"
                          >
                             <img src={activeGame?.coverArt} className="w-full h-full object-cover" />
                             {/* Scanline overlay on the box art for retro feel */}
                             <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none" />
                          </motion.div>
                       </div>
                    </div>
                 </motion.div>
              </AnimatePresence>
           </div>
           
        </div>

        {/* Action Bar Guidance */}
        <div className="bg-[#090909] border-t border-white/5 py-3 px-12 flex justify-between items-center fixed bottom-0 left-0 right-0 z-50">
           <div className="flex gap-8">
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white border border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]">F</div>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Search</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-black border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">A</div>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Launch</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center font-bold text-xs text-black border border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]">B</div>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Back / Exit</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center font-bold text-xs text-black border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]">H</div>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Favorite</span>
               </div>
           </div>
           <div className="flex items-center gap-3">
               <div className="flex gap-1 border border-white/20 rounded-md p-1 bg-white/5">
                 <div className="w-4 h-4 bg-zinc-300 rounded-sm flex items-center justify-center text-[8px] font-black pointer-events-none text-black">◀</div>
                 <div className="w-4 h-4 bg-zinc-300 rounded-sm flex items-center justify-center text-[8px] font-black pointer-events-none text-black">▶</div>
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Change Platform</span>
           </div>
        </div>

        {/* Launching Sequence Overlay */}
        <AnimatePresence>
          {isLaunching && activeGame && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center font-mono"
            >
              <div className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-xl" style={{ backgroundImage: `url(${activeGame.fanArt})` }} />
              <motion.div
                 animate={{ scale: [1, 1.1, 1] }}
                 transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                 className="relative z-10 p-6 rounded-full bg-indigo-600/20 border border-indigo-400/50 mb-12 shadow-[0_0_80px_rgba(99,102,241,0.5)]"
              >
                 <Gamepad2 size={80} className="text-indigo-400" />
              </motion.div>
              <h1 className="text-4xl font-black tracking-widest text-white mb-4 animate-pulse relative z-10 uppercase text-center max-w-4xl">
                 BOOTING: {activeGame.title}
              </h1>
              <p className="text-emerald-400 font-mono text-sm uppercase tracking-widest relative z-10 mb-12 bg-black/50 px-4 py-1 rounded">
                 Target Core: {activeGame.suggestedCore || 'AUTO RESOLVE'}
              </p>
              
              <div className="w-96 h-1 bg-zinc-900 rounded-full overflow-hidden relative z-10">
                 <motion.div 
                   initial={{ x: "-100%" }}
                   animate={{ x: "100%" }}
                   transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                   className="h-full w-1/3 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                 />
              </div>
              <p className="text-zinc-500 mt-6 text-xs uppercase tracking-[0.2em] relative z-10">Initializing Execution Pipeline...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
