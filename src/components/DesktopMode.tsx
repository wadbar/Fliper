import React, { useState, useEffect, useCallback } from 'react';
import { Game } from '../data/games';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, Settings, Terminal, Plus, Download, HardDrive, Cpu, Activity, Clock, ShoppingBag, Loader2, Radio, Trophy } from 'lucide-react';
import { OsWindow } from './os/Window';
import { useLanguage } from '../contexts/LanguageContext';
import { useKernel } from '../contexts/KernelContext';

// We implement simple Desktop Apps here
import { GameManagerApp } from './apps/GameManagerApp';
import { KernelShellApp } from './apps/KernelShellApp';
import { DownloaderApp } from './apps/DownloaderApp';
import { SettingsApp } from './apps/SettingsApp';
import { SystemMonitorApp } from './apps/SystemMonitorApp';
import { BiosManagerApp } from './apps/BiosManagerApp';
import { StorageApp } from './apps/StorageApp';
import { CustomizerApp } from './apps/CustomizerApp';
import { StreamApp } from './apps/StreamApp';
import { LeaderboardsApp } from './apps/LeaderboardsApp';
import { WikiApp } from './apps/WikiApp';
import { NeuralCoreApp } from './apps/NeuralCoreApp';

// Advanced UI Component
import { CrtOverlay } from './CrtOverlay';
import { Shield, Book, Brain, LogIn, LogOut, User as UserIcon, History } from 'lucide-react';
import { User } from 'firebase/auth';
import { ControlCenter } from './ui/ControlCenter';
import { LayoutGrid, Globe } from 'lucide-react';
import { NetplayApp } from './apps/NetplayApp';

// Strategy Pattern: Externalized custom hook for Window Management
function useWindowManager() {
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  const [activeWindow, setActiveWindow] = useState<string>('');

  const bringToFront = useCallback((id: string) => {
    setOpenWindows(prev => {
      const filtered = prev.filter(w => w !== id);
      return [...filtered, id];
    });
    setActiveWindow(id);
  }, []);

  const toggleWindow = useCallback((id: string) => {
    if (openWindows.includes(id)) {
      if (activeWindow !== id) {
        bringToFront(id);
      }
    } else {
      setOpenWindows(prev => [...prev, id]);
      setActiveWindow(id);
    }
  }, [openWindows, activeWindow, bringToFront]);

  const closeWindow = useCallback((id: string) => {
    setOpenWindows(prev => {
      const remaining = prev.filter(w => w !== id);
      if (activeWindow === id && remaining.length > 0) {
        setActiveWindow(remaining[remaining.length - 1]);
      } else if (remaining.length === 0) {
        setActiveWindow('');
      }
      return remaining;
    });
  }, [activeWindow]);

  const getZIndex = useCallback((id: string) => {
    const index = openWindows.indexOf(id);
    return index === -1 ? 10 : 10 + index;
  }, [openWindows]);

  return { openWindows, activeWindow, bringToFront, toggleWindow, closeWindow, getZIndex };
}

// Observer Pattern hook for Telemetry
function useHardwareStats() {
  const [stats, setStats] = useState({ cpu: 12, ram: 14.5 });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    const fetchStats = async () => {
       if (!isMounted) return;
       try {
          const res = await fetch('/api/system/metrics', { signal: abortController.signal });
          const data = await res.json();
          if (data && data.overallCpuUsage !== undefined && isMounted) {
             setStats({
                cpu: data.overallCpuUsage,
                ram: data.memoryUsage ? Math.round(data.memoryUsage.rss / 1024 / 1024 / 1024 * 10) / 10 : 14.5
             });
          }
       } catch (err: any) {
          if (err.name !== 'AbortError' && isMounted) console.warn('Desktop Telemetry error');
       }
    };
    fetchStats();
    
    const interval = setInterval(fetchStats, 2000);
    return () => {
       isMounted = false;
       abortController.abort();
       clearInterval(interval);
    };
  }, []);

  return stats;
}

interface DesktopModeProps {
  games: Game[];
  onGamesUpdate: React.Dispatch<React.SetStateAction<Game[]>>;
  onSwitchMode: () => void;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  stats: Record<string, any>;
  onRecordLaunch: (game: Game) => void;
  settings: any;
  updateSetting: (key: string, value: any) => void;
}

export const DesktopMode: React.FC<DesktopModeProps> = ({ 
  games, 
  onGamesUpdate, 
  onSwitchMode, 
  favorites, 
  toggleFavorite,
  user,
  onLogin,
  onLogout,
  stats,
  onRecordLaunch,
  settings,
  updateSetting
}) => {
  const { t } = useLanguage();
  const { dispatch, lastCommand } = useKernel();
  const { openWindows, activeWindow, bringToFront, toggleWindow, closeWindow, getZIndex } = useWindowManager();
  const hardwareStats = useHardwareStats();
  const [activeTasks, setActiveTasks] = useState(0);
  const [isControlCenterOpen, setIsControlCenterOpen] = useState(false);

  // Kernel Command Listener
  useEffect(() => {
    if (lastCommand?.action === 'open_window') {
      const windowId = lastCommand.payload as string;
      toggleWindow(windowId);
    }
  }, [lastCommand, toggleWindow]);

  // Monitor SSE Backend Tasks (Observer)
  useEffect(() => {
    let isMounted = true;
    const eventSource = new EventSource('/api/system/download/status');
    eventSource.onmessage = (event) => {
      if (!isMounted) return;
      try {
         const data = JSON.parse(event.data);
         const active = data.filter((t: any) => ['downloading', 'hashing', 'compressing'].includes(t.status)).length;
         setActiveTasks(active);
      } catch (err) { console.error("SSE parse error", err); }
    };
    
    // Auto-reconnect handling (Native browser EventSource reconnects automatically, but we want to ensure no state updates on error)
    eventSource.onerror = () => {
       // Minimal handle since native EventSource will try to reconnect.
    };

    return () => {
      isMounted = false;
      eventSource.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-m3-surface font-sans text-m3-on-surface overflow-hidden flex flex-col relative select-none">
      <CrtOverlay />

      {/* Desktop Background / Wallpaper */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=2560&q=80')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-tr from-m3-surface via-m3-surface/60 to-transparent pointer-events-none" />
      
      {/* Quick Access Tiles - Jump Back In */}
      <div className="absolute bottom-24 left-12 right-12 z-0 hidden lg:block">
         <div className="flex items-center gap-4 mb-5 px-2">
            <div className="w-8 h-8 rounded-full bg-m3-primary/10 flex items-center justify-center">
              <History size={16} className="text-m3-primary" />
            </div>
            <h3 className="text-xs font-black text-m3-on-surface-variant uppercase tracking-[0.2em]">Jump Back In</h3>
         </div>
         <div className="flex gap-6">
            {Object.entries(stats)
              .filter(([_, s]: any) => s.lastPlayed)
              .sort((a: any, b: any) => b[1].lastPlayed.seconds - a[1].lastPlayed.seconds)
              .slice(0, 4)
              .map(([id, s]: any) => {
                const game = games.find(g => g.id === id);
                if (!game) return null;
                return (
                  <motion.button
                    key={id}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onRecordLaunch(game)}
                    className="group relative w-72 h-40 m3-card bg-m3-surface-variant/40 hover:bg-m3-surface-variant/60 shadow-xl transition-all"
                  >
                    <img src={game.fanArt} className="w-full h-full object-cover opacity-50 group-hover:opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-m3-surface via-m3-surface/20 to-transparent" />
                    <div className="absolute bottom-5 left-5 text-left">
                       <p className="text-[9px] font-black text-m3-primary uppercase tracking-[0.15em] mb-1.5">{game.platform}</p>
                       <h4 className="text-base font-bold text-white tracking-tight truncate w-60">{game.title}</h4>
                    </div>
                  </motion.button>
                );
              })}
         </div>
      </div>

      {/* Desktop Icons - Grid Layout */}
      <div className="absolute inset-0 p-8 flex flex-col flex-wrap gap-8 items-start z-0 max-h-[calc(100vh-120px)]">
        {[
          { id: 'gameManager', icon: Gamepad2, label: t('os_library'), color: 'text-m3-primary', bg: 'bg-m3-primary/10' },
          { id: 'terminal', icon: Terminal, label: t('os_terminal'), color: 'text-m3-on-surface-variant', bg: 'bg-m3-surface-variant' },
          { id: 'store', icon: ShoppingBag, label: t('os_store'), color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { id: 'monitor', icon: Activity, label: 'Monitor', color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { id: 'bios', icon: Shield, label: 'BIOS', color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { id: 'storage', icon: HardDrive, label: 'Storage', color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { id: 'customizer', icon: Cpu, label: 'OS Factory', color: 'text-m3-primary', bg: 'bg-m3-primary/10' },
          { id: 'stream', icon: Radio, label: 'Stream', color: 'text-red-400', bg: 'bg-red-500/10' },
          { id: 'netplay', icon: Globe, label: 'Netplay', color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { id: 'leaderboards', icon: Trophy, label: 'Hall of Fame', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { id: 'wiki', icon: Book, label: 'Wiki', color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { id: 'neural', icon: Brain, label: 'Neural', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
        ].map(app => (
          <button 
            key={app.id}
            onDoubleClick={() => toggleWindow(app.id)} 
            className="flex flex-col items-center gap-2 group w-24"
          >
            <div className={`w-16 h-16 rounded-[24px] ${app.bg} border border-m3-outline/20 ${app.color} flex items-center justify-center backdrop-blur-md shadow-lg group-hover:bg-opacity-30 group-hover:scale-110 transition-all duration-300`}>
              <app.icon size={30} />
            </div>
            <span className="text-white text-[11px] font-bold drop-shadow-md text-center leading-tight transition-all group-hover:text-m3-primary">{app.label}</span>
          </button>
        ))}
        
        <button onDoubleClick={() => toggleWindow('settings')} className="flex flex-col items-center gap-2 group w-24 mt-auto">
          <div className="w-16 h-16 rounded-[24px] bg-m3-surface-variant border border-m3-outline/20 text-m3-on-surface-variant flex items-center justify-center backdrop-blur-md shadow-lg group-hover:bg-m3-on-surface-variant/80 group-hover:scale-110 transition-all duration-300">
            <Settings size={30} />
          </div>
          <span className="text-white text-[11px] font-bold drop-shadow-md transition-all group-hover:text-m3-primary">{t('os_settings')}</span>
        </button>
      </div>

      {/* Taskbar Redesign */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[98%] max-w-7xl h-16 bg-m3-surface-variant/60 backdrop-blur-2xl border border-m3-outline/20 rounded-full flex items-center px-2 z-50 shadow-2xl">
        <button 
          onClick={onSwitchMode} 
          className="flex items-center gap-3 px-6 h-12 m3-button-filled shadow-lg shadow-m3-primary/20 shrink-0"
        >
          <Gamepad2 size={18} /> 
          <span className="text-xs uppercase tracking-widest font-black">Fliper Mode</span>
        </button>

        <div className="w-px h-8 bg-m3-outline/20 mx-4" />

        <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {openWindows.map(id => (
            <button 
              key={id}
              onClick={() => bringToFront(id)}
              className={`px-5 h-12 flex items-center gap-2.5 rounded-full text-xs font-bold transition-all min-w-[140px] max-w-[200px] shrink-0 border ${
                activeWindow === id 
                ? 'bg-m3-primary-container text-m3-on-primary-container border-m3-primary/30 shadow-inner' 
                : 'bg-m3-surface/20 border-m3-outline/10 text-m3-on-surface-variant hover:bg-m3-surface/40 hover:text-white'
              }`}
            >
              <div className="shrink-0">
                {id === 'gameManager' && <Gamepad2 size={16} />}
                {id === 'terminal' && <Terminal size={16} />}
                {id === 'store' && <ShoppingBag size={16} />}
                {id === 'monitor' && <Activity size={16} />}
                {id === 'bios' && <Shield size={16} />}
                {id === 'storage' && <HardDrive size={16} />}
                {id === 'customizer' && <Cpu size={16} />}
                {id === 'stream' && <Radio size={16} />}
                {id === 'leaderboards' && <Trophy size={16} />}
                {id === 'wiki' && <Book size={16} />}
                {id === 'neural' && <Brain size={16} />}
                {id === 'settings' && <Settings size={16} />}
              </div>
              <span className="truncate capitalize">{id}</span>
              {activeWindow === id && <div className="w-1.5 h-1.5 rounded-full bg-m3-primary ml-auto shadow-[0_0_8px_rgba(208,188,255,0.5)]" />}
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-m3-outline/20 mx-4" />

        {/* System User Tray */}
        <div className="flex items-center gap-2">
          {user ? (
            <button 
              onClick={setIsControlCenterOpen.bind(null, !isControlCenterOpen)}
              className="flex items-center gap-3 pr-2 pl-3 h-12 bg-m3-secondary-container text-m3-on-secondary-container rounded-full border border-m3-outline/20 hover:bg-m3-secondary-container/80 transition-all group overflow-hidden"
            >
               {user.photoURL ? (
                 <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
               ) : (
                 <div className="w-8 h-8 rounded-full bg-m3-primary/20 flex items-center justify-center">
                   <UserIcon size={16} className="text-m3-primary" />
                 </div>
               )}
               <div className="flex flex-col items-start pr-2">
                  <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-0.5">Operator</span>
                  <span className="text-xs font-bold truncate max-w-[80px] leading-none">{user.displayName || 'Guest'}</span>
               </div>
            </button>
          ) : (
            <button 
              onClick={onLogin}
              className="m3-button-tonal h-12 px-6"
            >
              <LogIn size={18} />
              <span className="text-[11px] font-black uppercase tracking-widest">Connect</span>
            </button>
          )}

           <button 
             onClick={() => setIsControlCenterOpen(!isControlCenterOpen)}
             className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isControlCenterOpen ? 'bg-m3-primary text-m3-on-primary shadow-lg shadow-m3-primary/30' : 'bg-m3-surface/40 hover:bg-m3-surface/60 text-m3-on-surface-variant'}`}
           >
              <LayoutGrid size={22} />
           </button>
        </div>

        <div className="hidden xl:flex items-center gap-5 text-xs font-mono text-m3-on-surface-variant px-6 ml-2">
          <div className="flex items-center gap-2" title="CPU">
            <Cpu size={14} className="text-m3-primary" />
            <span className="font-bold">{hardwareStats.cpu}%</span>
          </div>
          <div className="flex items-center gap-2" title="RAM">
            <HardDrive size={14} className="text-emerald-400" />
            <span className="font-bold">{hardwareStats.ram.toFixed(1)}GB</span>
          </div>
        </div>
      </div>
    </div>

  );
};
