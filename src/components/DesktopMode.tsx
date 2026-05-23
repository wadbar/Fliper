import React, { useState, useEffect, useCallback } from 'react';
import { Game } from '../data/games';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, Settings, Terminal, Plus, Download, HardDrive, Cpu, Activity, Clock, ShoppingBag, Loader2, Radio, Trophy } from 'lucide-react';
import { OsWindow } from './os/Window';
import { useLanguage } from '../contexts/LanguageContext';
import { useKernel } from '../contexts/KernelContext';

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
import { NetplayApp } from './apps/NetplayApp';

import { CrtOverlay } from './CrtOverlay';
import { Shield, Book, Brain, LogIn, LogOut, User as UserIcon, History, LayoutGrid, Globe } from 'lucide-react';
import { User } from 'firebase/auth';
import { ControlCenter } from './ui/ControlCenter';
import { RetroDashboardWidget } from './ui/RetroDashboardWidget';
import { SystemResourceWidget } from './ui/SystemResourceWidget';

function useWindowManager() {
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  const [activeWindow, setActiveWindow] = useState<string>('');

  const bringToFront = useCallback((id: string) => {
    setOpenWindows(prev => [...prev.filter(w => w !== id), id]);
    setActiveWindow(id);
  }, []);

  const toggleWindow = useCallback((id: string) => {
    if (openWindows.includes(id)) {
      if (activeWindow !== id) bringToFront(id);
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
  games, onGamesUpdate, onSwitchMode, favorites, toggleFavorite,
  user, onLogin, onLogout, stats, onRecordLaunch, settings, updateSetting
}) => {
  const { t } = useLanguage();
  const { dispatch, lastCommand } = useKernel();
  const { openWindows, activeWindow, bringToFront, toggleWindow, closeWindow, getZIndex } = useWindowManager();
  const hardwareStats = useHardwareStats();
  const [activeTasks, setActiveTasks] = useState(0);
  const [isControlCenterOpen, setIsControlCenterOpen] = useState(false);

  useEffect(() => {
    if (lastCommand?.action === 'open_window') {
      toggleWindow(lastCommand.payload as string);
    }
  }, [lastCommand, toggleWindow]);

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
    eventSource.onerror = () => {};
    return () => {
      isMounted = false;
      eventSource.close();
    };
  }, []);

  // Registry mapped windows to render loop
  const renderWindow = (id: string) => {
    const props = {
      id,
      isOpen: true,
      onClose: () => closeWindow(id),
      onFocus: () => bringToFront(id),
      isActive: activeWindow === id,
      zIndex: getZIndex(id)
    };

    switch (id) {
      case 'gameManager':
        return <OsWindow {...props} title={t('os_library')} icon={<Gamepad2 />} defaultSize={{ width: 1200, height: 800 }}><GameManagerApp gamesProp={games} onGamesUpdate={onGamesUpdate} onSwitchMode={() => {}} favorites={favorites} toggleFavorite={toggleFavorite} onRecordLaunch={onRecordLaunch} stats={stats} /></OsWindow>;
      case 'terminal':
        return <OsWindow {...props} title={t('os_terminal')} icon={<Terminal />} defaultSize={{ width: 800, height: 500 }}><KernelShellApp /></OsWindow>;
      case 'store':
        return <OsWindow {...props} title={t('os_store')} icon={<ShoppingBag />} defaultSize={{ width: 900, height: 700 }}><DownloaderApp /></OsWindow>;
      case 'settings':
        return <OsWindow {...props} title={t('os_settings')} icon={<Settings />} defaultSize={{ width: 800, height: 600 }}><SettingsApp /></OsWindow>;
      case 'monitor':
        return <OsWindow {...props} title="System Monitor" icon={<Activity />} defaultSize={{ width: 1000, height: 600 }}><SystemMonitorApp /></OsWindow>;
      case 'bios':
        return <OsWindow {...props} title="BIOS Manager" icon={<Shield />} defaultSize={{ width: 800, height: 600 }}><BiosManagerApp /></OsWindow>;
      case 'storage':
        return <OsWindow {...props} title="Storage" icon={<HardDrive />} defaultSize={{ width: 800, height: 600 }}><StorageApp /></OsWindow>;
      case 'customizer':
        return <OsWindow {...props} title="OS Factory" icon={<Cpu />} defaultSize={{ width: 900, height: 700 }}><CustomizerApp /></OsWindow>;
      case 'stream':
        return <OsWindow {...props} title="Neural Stream" icon={<Radio />} defaultSize={{ width: 900, height: 600 }}><StreamApp /></OsWindow>;
      case 'leaderboards':
        return <OsWindow {...props} title="Hall of Fame" icon={<Trophy />} defaultSize={{ width: 800, height: 600 }}><LeaderboardsApp /></OsWindow>;
      case 'wiki':
        return <OsWindow {...props} title="Wiki" icon={<Book />} defaultSize={{ width: 1000, height: 700 }}><WikiApp /></OsWindow>;
      case 'neural':
        return <OsWindow {...props} title="Neural Core" icon={<Brain />} defaultSize={{ width: 1000, height: 700 }}><NeuralCoreApp /></OsWindow>;
      case 'netplay':
        return <OsWindow {...props} title="Netplay Grid" icon={<Globe />} defaultSize={{ width: 900, height: 600 }}><NetplayApp /></OsWindow>;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--md-sys-color-surface)] font-sans text-[var(--md-sys-color-on-surface)] overflow-hidden flex flex-col relative select-none">
      <CrtOverlay />

      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=2560&q=80')] bg-cover bg-center opacity-5 mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[var(--md-sys-color-surface)] via-[var(--md-sys-color-surface-container)] to-[var(--md-sys-color-surface-variant)] opacity-90 pointer-events-none" />
      
      {/* Grid Dashboard Layout (MD3 Resposive) */}
      <div className="relative z-0 max-w-7xl mx-auto w-full h-[calc(100vh-80px)] p-6 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-min">
        
        {/* Left App Grid Panel */}
        <div className="md:col-span-8 grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 content-start">
          {[
            { id: 'gameManager', icon: Gamepad2, label: t('os_library') },
            { id: 'terminal', icon: Terminal, label: t('os_terminal') },
            { id: 'store', icon: ShoppingBag, label: t('os_store') },
            { id: 'monitor', icon: Activity, label: 'Monitor' },
            { id: 'bios', icon: Shield, label: 'BIOS' },
            { id: 'storage', icon: HardDrive, label: 'Storage' },
            { id: 'customizer', icon: Cpu, label: 'OS Factory' },
            { id: 'stream', icon: Radio, label: 'Stream' },
            { id: 'netplay', icon: Globe, label: 'Netplay' },
            { id: 'leaderboards', icon: Trophy, label: 'Hall of Fame' },
            { id: 'wiki', icon: Book, label: 'Wiki' },
            { id: 'neural', icon: Brain, label: 'Neural' },
            { id: 'settings', icon: Settings, label: t('os_settings') },
          ].map(app => (
            <motion.button 
              key={app.id}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleWindow(app.id)} 
              className="flex flex-col items-center gap-2 group p-2"
            >
              <div className="w-14 h-14 rounded-3xl bg-[var(--md-sys-color-surface-variant)] border border-[var(--md-sys-color-outline)]/20 text-[var(--md-sys-color-primary)] flex items-center justify-center shadow-md group-hover:bg-[var(--md-sys-color-primary-container)] group-hover:text-[var(--md-sys-color-on-primary-container)] transition-colors duration-300">
                <app.icon size={26} />
              </div>
              <span className="text-[var(--md-sys-color-on-surface)] text-[11px] font-bold text-center leading-tight transition-all group-hover:text-[var(--md-sys-color-primary)] opacity-80">{app.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Right Widgets Panel */}
        <div className="md:col-span-4 flex flex-col gap-6">
           <RetroDashboardWidget />
           <SystemResourceWidget />
           
           {/* Recent Activity Card */}
           <div className="bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)]/10 rounded-[28px] p-6 shadow-sm overflow-hidden flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]">
                  <History size={18} />
                </div>
                <h3 className="text-xs font-bold text-[var(--md-sys-color-on-surface)] uppercase tracking-widest">Recent Activity</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(stats)
                  .filter(([_, s]: any) => s.lastPlayed)
                  .sort((a: any, b: any) => b[1].lastPlayed.seconds - a[1].lastPlayed.seconds)
                  .slice(0, 3)
                  .map(([id, s]: any) => {
                    const game = games.find(g => g.id === id);
                    if (!game) return null;
                    return (
                      <motion.button
                        key={id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onRecordLaunch(game)}
                        className="relative h-24 rounded-2xl overflow-hidden bg-[var(--md-sys-color-surface-variant)] shadow-sm group"
                      >
                        <img src={game.fanArt} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--md-sys-color-surface)]/90 via-[var(--md-sys-color-surface)]/20 to-transparent" />
                        <div className="absolute bottom-3 left-4 text-left">
                           <p className="text-[9px] font-bold text-[var(--md-sys-color-primary)] uppercase tracking-widest mb-0.5">{game.platform}</p>
                           <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)] tracking-tight truncate w-48">{game.title}</h4>
                        </div>
                      </motion.button>
                    );
                  })}
              </div>
           </div>
        </div>
      </div>

      {/* Taskbar Redesign */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[98%] max-w-7xl h-16 bg-[var(--md-sys-color-surface-container-high)]/80 backdrop-blur-3xl border border-[var(--md-sys-color-outline)]/10 rounded-[32px] flex items-center px-4 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
        <button 
          onClick={onSwitchMode} 
          className="flex items-center justify-center gap-2 px-5 h-10 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-[20px] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity shrink-0 shadow-sm"
        >
          <Gamepad2 size={16} /> 
          <span>Fliper Mode</span>
        </button>

        <div className="w-px h-6 bg-[var(--md-sys-color-outline)]/20 mx-4" />

        <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <AnimatePresence>
            {openWindows.map(id => (
              <motion.button 
                key={id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => bringToFront(id)}
                className={`px-4 h-10 flex items-center gap-2.5 rounded-[20px] text-xs font-bold transition-all min-w-[120px] max-w-[180px] shrink-0 border ${
                  activeWindow === id 
                  ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] border-[var(--md-sys-color-secondary-container)] shadow-sm' 
                  : 'bg-[var(--md-sys-color-surface)] border-[var(--md-sys-color-outline)]/10 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                <div className="shrink-0 flex items-center justify-center">
                  {id === 'gameManager' && <Gamepad2 size={14} />}
                  {id === 'terminal' && <Terminal size={14} />}
                  {id === 'store' && <ShoppingBag size={14} />}
                  {id === 'monitor' && <Activity size={14} />}
                  {id === 'bios' && <Shield size={14} />}
                  {id === 'storage' && <HardDrive size={14} />}
                  {id === 'customizer' && <Cpu size={14} />}
                  {id === 'stream' && <Radio size={14} />}
                  {id === 'leaderboards' && <Trophy size={14} />}
                  {id === 'wiki' && <Book size={14} />}
                  {id === 'neural' && <Brain size={14} />}
                  {id === 'settings' && <Settings size={14} />}
                  {id === 'netplay' && <Globe size={14} />}
                </div>
                <span className="truncate capitalize">{id}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <div className="hidden md:flex w-px h-6 bg-[var(--md-sys-color-outline)]/20 mx-4" />

        {/* System User Tray / Control Center Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-4 text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)] px-3 mr-1 uppercase tracking-widest">
            <div className="flex items-center gap-1.5" title="CPU">
              <Cpu size={12} className="text-[var(--md-sys-color-primary)]" />
              <span className="font-bold">{hardwareStats.cpu}%</span>
            </div>
            <div className="flex items-center gap-1.5" title="RAM">
              <HardDrive size={12} className="text-[var(--md-sys-color-tertiary)]" />
              <span className="font-bold">{hardwareStats.ram.toFixed(1)}GB</span>
            </div>
          </div>

          <button 
             onClick={() => setIsControlCenterOpen(!isControlCenterOpen)}
             className={`w-10 h-10 flex items-center justify-center rounded-[20px] transition-all cursor-pointer ${isControlCenterOpen ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-md' : 'bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-secondary-container)] hover:text-[var(--md-sys-color-on-secondary-container)]'}`}
           >
              <LayoutGrid size={18} />
           </button>
        </div>
      </div>
      
      {/* Render all open windows */}
      {openWindows.map(id => (
         <React.Fragment key={id}>
           {renderWindow(id)}
         </React.Fragment>
      ))}

      {isControlCenterOpen && (
        <ControlCenter 
           isOpen={isControlCenterOpen}
           onClose={() => setIsControlCenterOpen(false)} 
           volume={50}
           onVolumeChange={() => {}}
           brightness={80}
           onBrightnessChange={() => {}}
        />
      )}
    </div>
  );
};
