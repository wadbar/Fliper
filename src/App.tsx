import React, { useState, useEffect, useCallback } from 'react';
import { DesktopMode } from './components/DesktopMode';
import { FliperMode } from './components/FliperMode';
import { games } from './data/games';
import { AnimatePresence, motion } from 'motion/react';
import { Terminal } from 'lucide-react';
import { TelemetryWidget } from './components/TelemetryWidget';
import { TaskMonitor } from './components/ui/TaskMonitor';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useGamepad } from './hooks/useGamepad';
import { useSystemSettings } from './hooks/useSystemSettings';
import { useTheme } from './contexts/ThemeContext';
import { audioEngine } from './services/audioEngine';
import { EmulatorOverlay } from './components/EmulatorOverlay';
import { CommandPalette } from './components/ui/CommandPalette';
import { Game } from './data/games';

type AppMode = 'boot' | 'desktop' | 'fliper';

export default function App() {
  const [mode, setMode] = useState<AppMode>('boot');
  const [cocktailMode, setCocktailMode] = useState(false);
  const [gamesList, setGamesList] = useState(games);
  
  const { user, favorites, stats, loading, login, logout, toggleFavorite, recordLaunch } = useFirebaseSync();
  const { settings, updateSetting } = useSystemSettings();
  const { theme } = useTheme();
  const [runningGame, setRunningGame] = useState<Game | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // V9: Gamepad & Audio Integration
  const handleGamepadAction = useCallback((action: string) => {
    if (runningGame && action === 'B') {
      setRunningGame(null);
      return;
    }
    
    switch(action) {
      case 'A':
      case 'START':
        audioEngine.play('click');
        break;
      case 'B':
      case 'SELECT':
        audioEngine.play('hover');
        break;
      case 'UP':
      case 'DOWN':
      case 'LEFT':
      case 'RIGHT':
        audioEngine.play('hover');
        break;
    }
  }, []);

  useGamepad(handleGamepadAction);

  useEffect(() => {
    const handleGlobalClick = () => {
      audioEngine.play('click');
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [bootProgress, setBootProgress] = useState(0);

  useEffect(() => {
    if (mode === 'boot') {
      const logs = [
        "Fliper kernel initializing...",
        "CPU: Zen 4 Architecture detected",
        "VRAM: 24GB GDDR6X optimized for LLM",
        "Mounting /dev/nvme0n1p3 as arcade root",
        "Loading LaunchBox Bridge v4.2...",
        "Checking backend availability...",
        "FliperOS Shell starting..."
      ];
      
      let currentIdx = 0;
      const interval = setInterval(() => {
        if (currentIdx < logs.length) {
          setBootLogs(prev => [...prev, logs[currentIdx]]);
          setBootProgress(Math.min(100, Math.floor((currentIdx / logs.length) * 100)));
          currentIdx++;
        } else {
          clearInterval(interval);
          checkHealthAndBoot();
        }
      }, 400);

      const checkHealthAndBoot = async () => {
        try {
          const res = await fetch('/api/health');
          if (res.ok) {
            setTimeout(() => setMode('fliper'), 800);
          } else {
            setBootLogs(prev => [...prev, "[ ERROR ] Backend unresponsive. Retrying..."]);
            setTimeout(checkHealthAndBoot, 2000);
          }
        } catch (e) {
          setBootLogs(prev => [...prev, "[ FAIL ] Network connection failure."]);
          setTimeout(checkHealthAndBoot, 5000);
        }
      };

      return () => clearInterval(interval);
    }
  }, [mode]);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Neural Command Palette (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        audioEngine.play('nav');
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        setCocktailMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const handleLaunchGame = async (game: Game) => {
    setRunningGame(game);
    await recordLaunch(game.id);
  };

  return (
    <div 
      className={`w-full h-screen bg-m3-surface overflow-hidden font-sans transition-all duration-1000 ${cocktailMode ? 'rotate-180' : ''}`}
      style={{ filter: `brightness(${settings.brightness})` }}
    >
      <div className="absolute inset-0 arcade-grid pointer-events-none opacity-10" />
      <div className="absolute inset-0 kernel-gradient pointer-events-none" />
      <div className="scanline absolute inset-0 opacity-5" />

      <AnimatePresence mode="wait">
        {mode === 'boot' ? (
           <motion.div
              key="boot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full flex flex-col items-center justify-center p-8 font-mono text-xs text-m3-on-surface-variant z-50 relative"
           >
              <div className="max-w-md w-full m3-card-elevated p-10 bg-m3-surface-variant/40 border-m3-outline/30">
                <div className="flex items-center gap-4 mb-8 text-m3-primary font-display font-bold tracking-widest uppercase text-base">
                   <div className="w-10 h-10 bg-m3-primary/10 rounded-xl flex items-center justify-center">
                     <Terminal size={22} className="animate-pulse" />
                   </div>
                   <span>FliperOS System Initializer</span>
                </div>
                
                <div className="space-y-2 h-48 overflow-hidden mb-8 flex flex-col justify-end">
                   {bootLogs.map((log, i) => (
                     <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }}
                        className={(log && typeof log === 'string' && log.startsWith('[')) ? 'text-m3-error' : 'text-m3-on-surface-variant'}
                      >
                       <span className="text-m3-outline mr-2 opacity-50">{'>'}</span>{log}
                     </motion.div>
                   ))}
                </div>

                <div className="relative w-full h-1.5 bg-m3-surface-variant rounded-full overflow-hidden mb-4">
                   <motion.div 
                      className="absolute top-0 left-0 h-full bg-m3-primary" 
                      initial={{ width: 0 }}
                      animate={{ width: `${bootProgress}%` }}
                   />
                </div>
                <div className="flex justify-between items-center text-[11px] text-m3-outline font-black tracking-widest uppercase">
                   <span className="opacity-60">Subsystem v6.8.zen1</span>
                   <span className="text-m3-primary font-bold">{bootProgress}%</span>
                </div>
              </div>
              
              <div className="mt-12 flex items-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                 <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-black tracking-widest uppercase">Powered by</span>
                    <div className="text-sm font-display font-bold">FLIPEROS ARCH</div>
                 </div>
              </div>
           </motion.div>
        ) : mode === 'desktop' ? (
          <motion.div
            key="desktop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            <DesktopMode 
              games={gamesList} 
              onGamesUpdate={setGamesList} 
              onSwitchMode={() => setMode('fliper')}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              user={user}
              onLogin={login}
              onLogout={logout}
              stats={stats}
              onRecordLaunch={handleLaunchGame}
              settings={settings}
              updateSetting={updateSetting}
            />
          </motion.div>
        ) : (
          <motion.div
            key="fliper"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full h-full"
          >
            <FliperMode 
              games={gamesList} 
              onGamesUpdate={setGamesList} 
              onExit={() => setMode('desktop')}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              user={user}
              onLogin={login}
              stats={stats}
              onRecordLaunch={handleLaunchGame}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {runningGame && (
          <EmulatorOverlay 
            game={runningGame} 
            onClose={() => setRunningGame(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCommandPaletteOpen && (
          <CommandPalette 
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onLaunch={handleLaunchGame}
          />
        )}
      </AnimatePresence>

      <TelemetryWidget />
      <TaskMonitor />
    </div>
  );
}
