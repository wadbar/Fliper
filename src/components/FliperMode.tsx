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
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [metrics, setMetrics] = useState({ cpu: 0, ram: 0, mode: 'STABLE' });

  const [activeView, setActiveView] = useState<'library' | 'achievements' | 'history' | 'settings'>('library');
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);

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

  // Fetch Achievements
  useEffect(() => {
    if (activeView === 'achievements' && activeGame) {
      const fetchAchievements = async () => {
        setLoadingAchievements(true);
        try {
          const res = await fetch('/api/ai/achievements/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              title: activeGame.title, 
              platform: activeGame.platform, 
              gameId: activeGame.id 
            })
          });
          if (res.ok) {
            const data = await res.json();
            setAchievements(data.list || []);
          }
        } catch (err) {
          console.error("[Achievements] Fault:", err);
        } finally {
          setLoadingAchievements(false);
        }
      };
      fetchAchievements();
    }
  }, [activeView, activeGame]);

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
  const launchGame = useCallback(() => {
    if (isLaunching || !activeGame) return;
    audioEngine.playSelect();
    setShowLaunchConfirm(true);
  }, [activeGame, isLaunching]);

  const confirmLaunch = useCallback(async () => {
    if (isLaunching || !activeGame) return;
    setShowLaunchConfirm(false);
    audioEngine.playLaunch();
    setIsLaunching(true);
    
    const path = activeGame.id + '.rom';
    const platform = activeGame.platform;
    const mode = localStorage.getItem('fliper_perf_mode') || 'ultra';
    
    // RAM Disk Caching Logic for Arcade (MAME/NeoGeo/Naomi)
    if (['Arcade_JP', 'NeoGeo', 'Naomi'].includes(platform)) {
        // Cache ROM
        await fetch('/api/system/cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: `roms/${platform.toLowerCase()}/${activeGame.id}` })
        });
        // Cache Samples (Audio)
        await fetch('/api/system/cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: `samples/${activeGame.id}` })
        });
    }

    // MAME HLSL Shader optimization for high-end session
    if (platform === 'Arcade_JP' || platform === 'NeoGeo') {
        await fetch('/api/system/mame-optimize', { method: 'POST' });
    }

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
    let lastGamepadState = { up: false, down: false, left: false, right: false, a: false, b: false, y: false, x: false, options: false };

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      if (gp && !isLaunching && !showLaunchConfirm) {
        // D-Pad or Left Stick
        const up = gp.buttons[12]?.pressed || gp.axes[1] < -0.5;
        const down = gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
        const left = gp.buttons[14]?.pressed || gp.axes[0] < -0.5;
        const right = gp.buttons[15]?.pressed || gp.axes[0] > 0.5;
        const aBtn = gp.buttons[0]?.pressed;
        const bBtn = gp.buttons[1]?.pressed;
        const yBtn = gp.buttons[3]?.pressed;
        const xBtn = gp.buttons[2]?.pressed;
        const optBtn = gp.buttons[9]?.pressed;

        if (up && !lastGamepadState.up) handleNav('up');
        if (down && !lastGamepadState.down) handleNav('down');
        if (left && !lastGamepadState.left) handleNav('left');
        if (right && !lastGamepadState.right) handleNav('right');
        
        if (aBtn && !lastGamepadState.a) {
           launchGame();
        }
        if (bBtn && !lastGamepadState.b) {
           audioEngine.playSelect();
           if (activeView !== 'library') setActiveView('library');
           else onExit();
        }
        if (yBtn && !lastGamepadState.y && activeGame) {
           toggleFavorite(activeGame.id);
        }
        // View Switches (X and Menu buttons)
        if (xBtn && !lastGamepadState.x) { // X or Square
           setActiveView(prev => prev === 'achievements' ? 'library' : 'achievements');
        }
        if (optBtn && !lastGamepadState.options) { // Select/Options
           setActiveView(prev => prev === 'history' ? 'library' : 'history');
        }

        lastGamepadState = { up, down, left, right, a: !!aBtn, b: !!bBtn, y: !!yBtn, x: !!xBtn, options: !!optBtn };
      }
      animationFrameId = requestAnimationFrame(pollGamepad);
    };
    pollGamepad();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLaunching) return;

      if (showLaunchConfirm) {
        if (e.key === 'Enter') confirmLaunch();
        if (e.key === 'Escape' || e.key === 'Backspace') setShowLaunchConfirm(false);
        return;
      }
      
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
         if (activeView !== 'library') setActiveView('library');
         else onExit();
      }
      else if (e.key === 't') {
         setActiveView(prev => prev === 'achievements' ? 'library' : 'achievements');
      }
      else if (e.key === 'r') {
         setActiveView(prev => prev === 'history' ? 'library' : 'history');
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
           
           <div className="flex items-center gap-8">
              <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                 <button 
                   onClick={() => setActiveView('library')}
                   className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'library' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-white'}`}
                 >
                    LIBRARY
                 </button>
                 <button 
                   onClick={() => setActiveView('achievements')}
                   className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'achievements' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-white'}`}
                 >
                    ACHIEVEMENTS
                 </button>
                 <button 
                   onClick={() => setActiveView('history')}
                   className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-white'}`}
                 >
                    HISTORY
                 </button>
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
           </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex px-12 pb-12 gap-12 mt-8 overflow-hidden">
           
           <AnimatePresence mode="wait">
             {activeView === 'library' ? (
               <motion.div 
                 key="library"
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 className="flex-1 flex gap-12 h-full"
               >
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
                                   {stats[game.id]?.playCount > 0 && (
                                     <span className="text-[9px] font-black text-emerald-400/80 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                       {stats[game.id].playCount}x
                                     </span>
                                   )}
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
                             <div className="flex flex-col items-start text-left mr-6">
                                <span className="text-[10px] font-black tracking-[0.5em] text-zinc-500 uppercase">Publisher</span>
                                <span className="text-xl font-bold text-zinc-300 uppercase tracking-tighter italic">{activeGame?.developer}</span>
                             </div>
                             <div className="w-1.5 h-10 bg-indigo-500" />
                             <div className="flex flex-col items-start text-left">
                                <span className="text-[10px] font-black tracking-[0.5em] text-zinc-500 uppercase">Platform Architecture</span>
                                <span className="text-xl font-bold text-white uppercase tracking-tighter italic">{activeGame?.platform}</span>
                             </div>
                          </div>

                          <h2 className="text-8xl font-black italic tracking-tighter leading-none mb-8 drop-shadow-2xl text-white uppercase">
                             {activeGame?.title}
                          </h2>

                          {/* Metadata Grid */}
                          <div className="grid grid-cols-5 gap-8 mb-12 bg-black/60 backdrop-blur-3xl px-10 py-6 rounded-3xl border border-white/5 shadow-2xl skew-x-[-10deg]">
                             <div className="flex flex-col items-center skew-x-[10deg]">
                                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">Established</span>
                                <span className="font-mono text-2xl font-black text-white">{activeGame?.releaseYear}</span>
                             </div>
                             <div className="flex flex-col items-center skew-x-[10deg]">
                                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">Genre</span>
                                <span className="font-mono text-lg font-black text-indigo-400 truncate max-w-[100px] text-center">{activeGame?.genre}</span>
                             </div>
                             <div className="flex flex-col items-center skew-x-[10deg]">
                                <span className="text-[9px] text-emerald-500 uppercase tracking-widest font-black mb-1">CPU Core</span>
                                <span className="font-mono text-lg font-black text-emerald-400">{activeGame?.suggestedCore || 'MAME'}</span>
                             </div>
                             <div className="flex flex-col items-center skew-x-[10deg]">
                                <span className="text-[9px] text-amber-500 uppercase tracking-widest font-black mb-1">Cycles</span>
                                <span className="font-mono text-xl font-black text-amber-400">{stats[activeGame?.id]?.playCount || 0}</span>
                             </div>
                             <div className="flex flex-col items-center skew-x-[10deg]">
                                <span className="text-[9px] text-rose-500 uppercase tracking-widest font-black mb-1">Last Log</span>
                                <span className="font-mono text-xs font-black text-rose-400">
                                   {stats[activeGame?.id]?.lastPlayed ? new Date(stats[activeGame.id].lastPlayed.seconds * 1000).toLocaleDateString() : 'NEVER'}
                                </span>
                             </div>
                          </div>

                          <div className="flex flex-col items-end">
                             <p className="text-zinc-400 text-xl leading-snug italic max-w-xl font-medium mb-12 drop-shadow-lg">
                                {activeGame?.description || "Initializing system description matrix..."}
                             </p>

                             <button 
                               onClick={launchGame}
                               className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl flex items-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(99,102,241,0.5)] group mb-12 pointer-events-auto"
                             >
                                <Play size={24} className="text-white fill-white" />
                                <div className="flex flex-col items-start text-left">
                                   <span className="text-white font-black text-xl uppercase tracking-widest leading-none">Initialize</span>
                                   <span className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mt-1">Engage Subsystem</span>
                                </div>
                             </button>

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
                                   <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none" />
                                </motion.div>
                             </div>
                          </div>
                       </motion.div>
                    </AnimatePresence>
                 </div>
               </motion.div>
             ) : activeView === 'achievements' ? (
               <motion.div 
                 key="achievements"
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="flex-1 flex flex-col items-center justify-center"
               >
                 <div className="flex items-center gap-6 mb-12">
                    <Trophy size={64} className="text-amber-500" />
                    <div className="text-left">
                       <h2 className="text-5xl font-black italic tracking-tighter uppercase text-white">Neural Trophies</h2>
                       <p className="text-zinc-500 font-mono tracking-widest uppercase text-xs mt-1">Acquired from AI synthesis of: {activeGame?.title}</p>
                    </div>
                 </div>

                 {loadingAchievements ? (
                   <div className="flex flex-col items-center gap-4 text-zinc-600">
                      <Loader2 size={32} className="animate-spin text-amber-500" />
                      <p className="font-mono text-xs uppercase animate-pulse">Consulting World Records Metadata...</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                      {achievements.map((ach, i) => (
                         <motion.div 
                           key={ach.id || i}
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: i * 0.1 }}
                           className="p-6 bg-zinc-900/60 border border-white/5 rounded-3xl backdrop-blur-3xl group hover:border-amber-500/30 transition-all cursor-pointer"
                         >
                            <div className="flex items-start justify-between mb-4">
                               <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all">
                                  <Zap size={24} />
                               </div>
                               <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${
                                  ach.difficulty === 'legendary' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'
                               }`}>{ach.difficulty}</span>
                            </div>
                            <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">{ach.title}</h3>
                            <p className="text-zinc-500 text-xs leading-relaxed">{ach.description}</p>
                         </motion.div>
                      ))}
                   </div>
                 )}
               </motion.div>
             ) : (
               <motion.div 
                 key="history"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="flex-1 overflow-y-auto custom-scrollbar pr-4"
               >
                 <div className="flex items-center gap-6 mb-12 px-4">
                    <Clock size={64} className="text-indigo-400" />
                    <div className="text-left">
                       <h2 className="text-5xl font-black italic tracking-tighter uppercase text-white">Execution Logs</h2>
                       <p className="text-zinc-500 font-mono tracking-widest uppercase text-xs mt-1">
                          {Object.values(stats).reduce((acc: number, curr: any) => acc + (curr.playCount || 0), 0)} Sessions Registered in Neural Core
                       </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.values(stats).sort((a: any, b: any) => (b.lastPlayed?.seconds || 0) - (a.lastPlayed?.seconds || 0)).map((stat: any) => {
                       const game = gamesProp.find(g => g.id === stat.gameId);
                       if (!game) return null;
                       return (
                          <div 
                            key={stat.gameId}
                            className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl flex gap-6 hover:bg-zinc-900/60 transition-all border-l-4 border-l-indigo-600"
                          >
                             <img src={game.coverArt} className="w-20 h-28 object-cover rounded shadow-lg" />
                             <div className="flex-1 flex flex-col justify-between">
                                <div>
                                   <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-tight">{game.title}</h3>
                                   <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest italic">{game.platform}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 mt-4">
                                   <div>
                                      <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">Total Cycles</p>
                                      <p className="text-lg font-mono text-white">{stat.playCount} launches</p>
                                   </div>
                                   <div>
                                      <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">Last Sync</p>
                                      <p className="text-xs font-mono text-zinc-400">{stat.lastPlayed?.seconds ? new Date(stat.lastPlayed.seconds * 1000).toLocaleDateString() : 'Unknown'}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                       );
                    })}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
           
        </div>

        {/* Action Bar Guidance */}
        <div className="bg-[#090909] border-t border-white/5 py-3 px-12 flex justify-between items-center fixed bottom-0 left-0 right-0 z-50">
           <div className="flex gap-8">
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white border border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]">T</div>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Trophies</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-zinc-600 flex items-center justify-center font-bold text-xs text-white border border-zinc-400 shadow-[0_0_10px_rgba(255,255,255,0.1)]">R</div>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">History</span>
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

        {/* Launch Confirm Modal */}
        <AnimatePresence>
          {showLaunchConfirm && activeGame && !isLaunching && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
            >
               <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden max-w-xl w-full flex flex-col p-8 items-center text-center">
                  <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
                     <Play size={36} className="text-indigo-400 ml-1" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">Ready to Launch?</h2>
                  <p className="text-zinc-400 mb-8 max-w-md">You are about to boot <span className="text-indigo-300 font-bold">{activeGame.title}</span> on the <span className="uppercase text-amber-500 font-bold">{activeGame.platform}</span> core pipeline.</p>
                  
                  <div className="flex gap-4 w-full">
                     <button 
                       onClick={() => setShowLaunchConfirm(false)}
                       className="flex-1 py-3 px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors uppercase tracking-widest text-xs"
                     >
                        Cancel (B)
                     </button>
                     <button 
                       onClick={confirmLaunch}
                       className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20"
                     >
                        Engage (A)
                     </button>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

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
