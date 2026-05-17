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
import { Shield, Book, Brain } from 'lucide-react';

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
    const interval = setInterval(() => {
      setStats({
        cpu: Math.floor(Math.random() * 15) + 5,
        ram: 14.5 + (Math.random() * 0.5 - 0.25)
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return stats;
}

interface DesktopModeProps {
  games: Game[];
  onGamesUpdate: React.Dispatch<React.SetStateAction<Game[]>>;
  onSwitchMode: () => void;
}

export const DesktopMode: React.FC<DesktopModeProps> = ({ games, onGamesUpdate, onSwitchMode }) => {
  const { t } = useLanguage();
  const { dispatch, lastCommand } = useKernel();
  const { openWindows, activeWindow, bringToFront, toggleWindow, closeWindow, getZIndex } = useWindowManager();
  const hardwareStats = useHardwareStats();
  const [activeTasks, setActiveTasks] = useState(0);

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
    <div className="fixed inset-0 bg-[#0F0F11] font-sans text-white overflow-hidden flex flex-col relative select-none">
      <CrtOverlay />

      {/* Desktop Background / Wallpaper */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=2560&q=80')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/40 to-transparent pointer-events-none" />
      
      {/* Desktop Icons */}
      <div className="absolute inset-0 p-6 flex flex-col gap-6 items-start z-0">
        <button onDoubleClick={() => toggleWindow('gameManager')} className="flex flex-col items-center gap-1 group w-24">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/40 text-indigo-400 flex items-center justify-center backdrop-blur shadow-lg shadow-indigo-500/10 group-hover:bg-indigo-500/30 group-hover:scale-105 transition-all">
            <Gamepad2 size={28} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pb-1 border-b-2 border-transparent group-hover:border-indigo-400">{t('os_library')}</span>
        </button>

        <button onDoubleClick={() => toggleWindow('terminal')} className="flex flex-col items-center gap-1 group w-24">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-600/60 text-zinc-300 flex items-center justify-center backdrop-blur shadow-lg shadow-black/20 group-hover:bg-zinc-700/80 group-hover:scale-105 transition-all">
            <Terminal size={28} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pb-1 border-b-2 border-transparent group-hover:border-zinc-400">{t('os_terminal')}</span>
        </button>

        <button onDoubleClick={() => toggleWindow('store')} className="flex flex-col items-center gap-1 group w-24">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center backdrop-blur shadow-lg shadow-emerald-500/10 group-hover:bg-emerald-500/30 group-hover:scale-105 transition-all">
            <ShoppingBag size={28} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pb-1 border-b-2 border-transparent group-hover:border-emerald-400">{t('os_store')}</span>
        </button>

        <button onDoubleClick={() => toggleWindow('monitor')} className="flex flex-col items-center gap-1 group w-24">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-400 flex items-center justify-center backdrop-blur shadow-lg shadow-rose-500/10 group-hover:bg-rose-500/30 group-hover:scale-105 transition-all">
            <Activity size={28} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pb-1 border-b-2 border-transparent group-hover:border-rose-400">System Monitor</span>
        </button>

        <button onDoubleClick={() => toggleWindow('bios')} className="flex flex-col items-center gap-1 group w-24">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center backdrop-blur shadow-lg shadow-amber-500/10 group-hover:bg-amber-500/30 group-hover:scale-105 transition-all">
            <Shield size={28} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pb-1 border-b-2 border-transparent group-hover:border-amber-400">BIOS Shields</span>
        </button>

        <button onDoubleClick={() => toggleWindow('storage')} className="flex flex-col items-center gap-1 group w-24">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/40 text-sky-400 flex items-center justify-center backdrop-blur shadow-lg shadow-sky-500/10 group-hover:bg-sky-500/30 group-hover:scale-105 transition-all">
            <HardDrive size={28} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pb-1 border-b-2 border-transparent group-hover:border-sky-400">Storage VFS</span>
        </button>

        <button onDoubleClick={() => toggleWindow('customizer')} className="flex flex-col items-center gap-1 group w-24">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/40 text-indigo-400 flex items-center justify-center backdrop-blur shadow-lg shadow-indigo-500/10 group-hover:bg-indigo-500/30 group-hover:scale-105 transition-all">
            <Cpu size={28} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pb-1 border-b-2 border-transparent group-hover:border-indigo-400">OS Factory</span>
        </button>

        <button onDoubleClick={() => toggleWindow('stream')} className="flex flex-col items-center gap-1 group w-24">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-500 flex items-center justify-center backdrop-blur shadow-lg shadow-red-500/10 group-hover:bg-red-500/30 group-hover:scale-105 transition-all">
            <Radio size={28} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pb-1 border-b-2 border-transparent group-hover:border-red-500">Stream [OBS]</span>
        </button>

        <button onDoubleClick={() => toggleWindow('leaderboards')} className="flex flex-col items-center gap-1 group w-24">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/40 text-yellow-500 flex items-center justify-center backdrop-blur shadow-lg shadow-yellow-500/10 group-hover:bg-yellow-500/30 group-hover:scale-105 transition-all">
            <Trophy size={28} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pb-1 border-b-2 border-transparent group-hover:border-yellow-500">Leaderboards</span>
        </button>

        <button onDoubleClick={() => toggleWindow('wiki')} className="flex flex-col items-center gap-1 group w-24">
          <div className="w-14 h-14 rounded-2xl bg-sky-600/10 border border-sky-500/40 text-sky-400 flex items-center justify-center backdrop-blur shadow-lg shadow-sky-500/10 group-hover:bg-sky-500/30 group-hover:scale-105 transition-all">
            <Book size={28} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pb-1 border-b-2 border-transparent group-hover:border-sky-400">Install Wiki</span>
        </button>

        <button onDoubleClick={() => toggleWindow('neural')} className="flex flex-col items-center gap-1 group w-24">
          <div className="w-14 h-14 rounded-2xl bg-fuchsia-600/10 border border-fuchsia-500/40 text-fuchsia-400 flex items-center justify-center backdrop-blur shadow-lg shadow-fuchsia-500/10 group-hover:bg-fuchsia-500/30 group-hover:scale-105 transition-all">
            <Brain size={28} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pb-1 border-b-2 border-transparent group-hover:border-fuchsia-400">Neural Core</span>
        </button>
        
        <button onDoubleClick={() => toggleWindow('settings')} className="flex flex-col items-center gap-1 group w-24 mt-auto">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-600/60 text-zinc-300 flex items-center justify-center backdrop-blur shadow-lg shadow-black/20 group-hover:bg-zinc-700/80 group-hover:scale-105 transition-all">
            <Settings size={28} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pb-1 border-b-2 border-transparent group-hover:border-zinc-400">{t('os_settings')}</span>
        </button>
      </div>

      {/* Windows Layer */}
      <AnimatePresence>
        {openWindows.includes('gameManager') && (
          <OsWindow
            key="gameManager"
            id="gameManager"
            title={t('win_library')}
            icon={<Gamepad2 size={16} className="text-indigo-400" />}
            isActive={activeWindow === 'gameManager'}
            onFocus={() => bringToFront('gameManager')}
            onClose={() => closeWindow('gameManager')}
            defaultSize={{ width: 1100, height: 650 }}
            defaultPosition={{ x: 80, y: 40 }}
            zIndex={getZIndex('gameManager')}
          >
            <GameManagerApp gamesProp={games} onGamesUpdate={onGamesUpdate} onSwitchMode={onSwitchMode} />
          </OsWindow>
        )}
        {openWindows.includes('store') && (
          <OsWindow
            key="store"
            id="store"
            title={t('win_store')}
            icon={<ShoppingBag size={16} className="text-emerald-400" />}
            isActive={activeWindow === 'store'}
            onFocus={() => bringToFront('store')}
            onClose={() => closeWindow('store')}
            defaultSize={{ width: 850, height: 650 }}
            defaultPosition={{ x: 200, y: 80 }}
            zIndex={getZIndex('store')}
          >
            <DownloaderApp />
          </OsWindow>
        )}
        {openWindows.includes('settings') && (
          <OsWindow
            key="settings"
            id="settings"
            title={t('os_settings')}
            icon={<Settings size={16} className="text-zinc-400" />}
            isActive={activeWindow === 'settings'}
            onFocus={() => bringToFront('settings')}
            onClose={() => closeWindow('settings')}
            defaultSize={{ width: 650, height: 500 }}
            defaultPosition={{ x: 300, y: 150 }}
            zIndex={getZIndex('settings')}
          >
            <SettingsApp />
          </OsWindow>
        )}
        {openWindows.includes('terminal') && (
          <OsWindow
            key="terminal"
            id="terminal"
            title="Kernel Shell [AI-Ready] - User: arcade"
            icon={<Terminal size={16} className="text-zinc-400" />}
            isActive={activeWindow === 'terminal'}
            onFocus={() => bringToFront('terminal')}
            onClose={() => closeWindow('terminal')}
            defaultSize={{ width: 750, height: 480 }}
            defaultPosition={{ x: 250, y: 120 }}
            zIndex={getZIndex('terminal')}
          >
            <KernelShellApp />
          </OsWindow>
        )}
        {openWindows.includes('monitor') && (
          <OsWindow
            key="monitor"
            id="monitor"
            title="System Monitor - Core Telemetry"
            icon={<Activity size={16} className="text-rose-400" />}
            isActive={activeWindow === 'monitor'}
            onFocus={() => bringToFront('monitor')}
            onClose={() => closeWindow('monitor')}
            defaultSize={{ width: 850, height: 580 }}
            defaultPosition={{ x: 180, y: 60 }}
            zIndex={getZIndex('monitor')}
          >
            <SystemMonitorApp />
          </OsWindow>
        )}
        {openWindows.includes('bios') && (
          <OsWindow
            key="bios"
            id="bios"
            title="BIOS Integrity Shield"
            icon={<Shield size={16} className="text-amber-400" />}
            isActive={activeWindow === 'bios'}
            onFocus={() => bringToFront('bios')}
            onClose={() => closeWindow('bios')}
            defaultSize={{ width: 700, height: 520 }}
            defaultPosition={{ x: 220, y: 100 }}
            zIndex={getZIndex('bios')}
          >
            <BiosManagerApp />
          </OsWindow>
        )}
        {openWindows.includes('storage') && (
          <OsWindow
            key="storage"
            id="storage"
            title="VFS Explorer [/database]"
            icon={<HardDrive size={16} className="text-sky-400" />}
            isActive={activeWindow === 'storage'}
            onFocus={() => bringToFront('storage')}
            onClose={() => closeWindow('storage')}
            defaultSize={{ width: 600, height: 450 }}
            defaultPosition={{ x: 380, y: 160 }}
            zIndex={getZIndex('storage')}
          >
            <StorageApp />
          </OsWindow>
        )}
        {openWindows.includes('customizer') && (
          <OsWindow
            key="customizer"
            id="customizer"
            title="Sovereign Distro Factory"
            icon={<Cpu size={16} className="text-indigo-400" />}
            isActive={activeWindow === 'customizer'}
            onFocus={() => bringToFront('customizer')}
            onClose={() => closeWindow('customizer')}
            defaultSize={{ width: 800, height: 600 }}
            defaultPosition={{ x: 150, y: 50 }}
            zIndex={getZIndex('customizer')}
          >
            <CustomizerApp />
          </OsWindow>
        )}
        {openWindows.includes('stream') && (
          <OsWindow
            key="stream"
            id="stream"
            title="FliperCast Studio [OBS Bridge]"
            icon={<Radio size={16} className="text-red-500" />}
            isActive={activeWindow === 'stream'}
            onFocus={() => bringToFront('stream')}
            onClose={() => closeWindow('stream')}
            defaultSize={{ width: 850, height: 600 }}
            defaultPosition={{ x: 200, y: 80 }}
            zIndex={getZIndex('stream')}
          >
            <StreamApp />
          </OsWindow>
        )}
        {openWindows.includes('leaderboards') && (
          <OsWindow
            key="leaderboards"
            id="leaderboards"
            title="Global Hall of Fame"
            icon={<Trophy size={16} className="text-yellow-500" />}
            isActive={activeWindow === 'leaderboards'}
            onFocus={() => bringToFront('leaderboards')}
            onClose={() => closeWindow('leaderboards')}
            defaultSize={{ width: 900, height: 600 }}
            defaultPosition={{ x: 190, y: 70 }}
            zIndex={getZIndex('leaderboards')}
          >
            <LeaderboardsApp />
          </OsWindow>
        )}
        {openWindows.includes('wiki') && (
          <OsWindow
            key="wiki"
            id="wiki"
            title="Sovereign Hardware Codex"
            icon={<Book size={16} className="text-sky-400" />}
            isActive={activeWindow === 'wiki'}
            onFocus={() => bringToFront('wiki')}
            onClose={() => closeWindow('wiki')}
            defaultSize={{ width: 950, height: 650 }}
            defaultPosition={{ x: 120, y: 40 }}
            zIndex={getZIndex('wiki')}
          >
            <WikiApp />
          </OsWindow>
        )}
        {openWindows.includes('neural') && (
          <OsWindow
            key="neural"
            id="neural"
            title="Sovereign Neural Core Monitor"
            icon={<Brain size={16} className="text-fuchsia-400" />}
            isActive={activeWindow === 'neural'}
            onFocus={() => bringToFront('neural')}
            onClose={() => closeWindow('neural')}
            defaultSize={{ width: 850, height: 580 }}
            defaultPosition={{ x: 180, y: 80 }}
            zIndex={getZIndex('neural')}
          >
            <NeuralCoreApp />
          </OsWindow>
        )}
      </AnimatePresence>
      <div className="absolute bottom-0 w-full h-12 bg-black/80 backdrop-blur-3xl border-t border-white/10 flex items-center px-4 z-50">
        <button onClick={onSwitchMode} className="flex items-center gap-2 px-4 h-9 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm font-bold text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all">
          <Gamepad2 size={16} /> Enter Fliper Mode
        </button>

        <div className="w-px h-5 bg-white/10 mx-4" />

        <div className="flex-1 flex items-center gap-2">
          {openWindows.map(id => (
            <button 
              key={id}
              onClick={() => bringToFront(id)}
              className={`px-4 h-9 flex items-center gap-2 rounded-md border text-sm font-medium transition-all max-w-[180px] ${
                activeWindow === id 
                ? 'bg-white/10 border-white/20 text-white shadow-inner' 
                : 'bg-transparent border-transparent text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {activeWindow === id && <div className="absolute top-0 left-0 w-full h-0.5 bg-white/20" />}
              {id === 'gameManager' && <Gamepad2 size={14} className={activeWindow === id ? 'text-indigo-400' : ''} />}
              {id === 'terminal' && <Terminal size={14} />}
              {id === 'store' && <ShoppingBag size={14} className={activeWindow === id ? 'text-emerald-400' : ''} />}
              {id === 'monitor' && <Activity size={14} className={activeWindow === id ? 'text-rose-400' : ''} />}
              {id === 'bios' && <Shield size={14} className={activeWindow === id ? 'text-amber-400' : ''} />}
              {id === 'storage' && <HardDrive size={14} className={activeWindow === id ? 'text-sky-400' : ''} />}
              {id === 'customizer' && <Cpu size={14} className={activeWindow === id ? 'text-indigo-400' : ''} />}
              {id === 'stream' && <Radio size={14} className={activeWindow === id ? 'text-red-500' : ''} />}
              {id === 'leaderboards' && <Trophy size={14} className={activeWindow === id ? 'text-yellow-500' : ''} />}
              {id === 'wiki' && <Book size={14} className={activeWindow === id ? 'text-sky-400' : ''} />}
              {id === 'neural' && <Brain size={14} className={activeWindow === id ? 'text-fuchsia-400' : ''} />}
              {id === 'settings' && <Settings size={14} />}
              <span className="truncate capitalize">{id}</span>
            </button>
          ))}
        </div>

        {/* System Tray & Telemetry */}
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 bg-black/40 px-4 py-1.5 rounded-full border border-white/5 shadow-inner">
          {activeTasks > 0 && (
             <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
               <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
               <span>{activeTasks} {t('tasks')}</span>
             </div>
          )}
          
          <div className="flex items-center gap-1.5" title="CPU Usage">
            <Cpu size={14} className="text-indigo-400" />
            <span>{hardwareStats.cpu}%</span>
          </div>
          
          <div className="flex items-center gap-1.5" title="RAM Usage (64GB Total)">
            <HardDrive size={14} className="text-emerald-400" />
            <span>{hardwareStats.ram.toFixed(1)} GB</span>
          </div>

          <div className="w-px h-4 bg-white/10" />
          
          <div className="flex items-center gap-1.5">
            <Activity size={14} className="text-zinc-500" />
            <span>6.8.zen1-1 (WSL2)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
