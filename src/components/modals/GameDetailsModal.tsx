import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Clock, Trophy, Award, Calendar, User, Tag, Sparkles, Cpu, Zap, ShieldCheck, Palette, Heart, Loader2, Book } from 'lucide-react';
import { Game } from '../../data/games';
import { AiArtGenerator } from '../apps/AiArtGenerator';
import { ThreeDGameCartridge } from '../ui/ThreeDGameCartridge';
import { EmulatorShaderManager } from '../ui/EmulatorShaderManager';

interface GameDetailsModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunch: () => void;
  onEnrich?: (gameId: string) => Promise<void>;
  isEnriching?: boolean;
  onUpdateCover?: (gameId: string, newUrl: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  stats?: any;
}

export const GameDetailsModal: React.FC<GameDetailsModalProps> = ({ 
  game, 
  isOpen, 
  onClose, 
  onLaunch, 
  onEnrich, 
  isEnriching,
  onUpdateCover,
  isFavorite,
  onToggleFavorite,
  stats
}) => {
  const [showGenerator, setShowGenerator] = useState(false);
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'info' | 'achievements' | '3d' | 'controller' | 'shaders'>('info');
  const [selectedShader, setSelectedShader] = useState('crt-royale');
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [raStatus, setRaStatus] = useState<{ enabled: boolean, username: string | null }>({ enabled: false, username: null });
  const [achievementSource, setAchievementSource] = useState<'ai' | 'retro'>('ai');

  React.useEffect(() => {
    fetch('/api/retro/status')
      .then(res => res.json())
      .then(data => setRaStatus(data))
      .catch(err => console.error("RA status fetch failed", err));
  }, []);

  React.useEffect(() => {
    if (isOpen && activeInfoTab === 'info') {
      fetch('/api/ai/cache/stats')
        .then(res => res.json())
        .then(data => setCacheStats(data))
        .catch(err => console.error("Cache stats fetch failed", err));
    }
  }, [isOpen, activeInfoTab]);

  const handleClearCache = async () => {
    if (!confirm("Are you sure you want to purge all Neural Metadata cache? This will force AI re-enrichment for all titles.")) return;
    try {
      await fetch('/api/ai/cache/clear', { method: 'POST' });
      setCacheStats(prev => ({ ...prev, entries: 0, formattedSize: "0.00 KB" }));
      alert("Neural cache purged successfully.");
    } catch (e) {
      console.error("Cache purge failed", e);
    }
  };

  React.useEffect(() => {
    if (isOpen && game && activeInfoTab === 'achievements' && achievements.length === 0) {
      const fetchAchievements = async () => {
        setLoadingAchievements(true);
        try {
          // Try RetroAchievements first if enabled
          if (raStatus.enabled) {
            const raRes = await fetch(`/api/retro/game/${encodeURIComponent(game.title)}`);
            if (raRes.ok) {
              const raData = await raRes.json();
              if (raData.achievements && raData.achievements.length > 0) {
                setAchievements(raData.achievements);
                setAchievementSource('retro');
                setLoadingAchievements(false);
                return;
              }
            }
          }

          // Fallback to AI
          setAchievementSource('ai');
          const res = await fetch('/api/ai/achievements/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: game.title, platform: game.platform, gameId: game.id })
          });
          const data = await res.json();
          if (data && data.list) setAchievements(data.list);
        } catch (e) {
          console.error("Achieve load failed", e);
        } finally {
          setLoadingAchievements(false);
        }
      };
      fetchAchievements();
    }
  }, [isOpen, game, activeInfoTab, achievements.length, raStatus.enabled]);

  const handleEnrich = async () => {
    if (onEnrich) {
      await onEnrich(game.id);
    }
  };

  const handleUpdateCover = (newUrl: string) => {
    if (onUpdateCover) {
      onUpdateCover(game.id, newUrl);
    }
    setShowGenerator(false);
  };

  const handleVerifyIntegrity = async () => {
    try {
      await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: game.title,
          path: game.id + '.rom'
        })
      });
    } catch (error) {
      console.error('Validation failed to queue', error);
    }
  };

  const handleOptimize = async () => {
    try {
      const format = game.platform.toLowerCase().includes('gamecube') || game.platform.toLowerCase().includes('wii') ? 'RVZ' : 'CHD';
      await fetch('/api/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: game.id, 
          format, 
          fileName: game.title 
        })
      });
      // TaskMonitor will pick it up automatically via SSE
    } catch (error) {
      console.error('Optimization failed to queue', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-full max-w-5xl bg-m3-surface border border-m3-outline/20 rounded-[32px] overflow-hidden shadow-2xl overflow-y-auto max-h-[95vh]"
          >
            {/* Launch Confirmation Overlay */}
            <AnimatePresence>
              {showLaunchConfirm && game && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-m3-surface/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center"
                  >
                    <div className="w-24 h-24 bg-m3-primary/20 border border-m3-primary/30 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl">
                        <Play size={44} className="text-m3-primary fill-m3-primary ml-2 animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-3 tracking-tighter uppercase">Initialize Neural Link?</h3>
                    <p className="text-m3-on-surface-variant text-base mb-10 max-w-sm">Launching <span className="text-m3-primary font-bold">{game.title}</span> on the <span className="text-emerald-400 font-bold">{game.platform}</span> subsystem.</p>
                    
                    <div className="flex flex-col gap-4 w-full max-w-xs">
                        <button 
                          onClick={() => {
                            setShowLaunchConfirm(false);
                            onLaunch();
                          }}
                          className="m3-button-filled w-full py-5 text-sm tracking-[0.2em]"
                        >
                          Authorize Execution
                        </button>
                        <button 
                          onClick={() => setShowLaunchConfirm(false)}
                          className="w-full bg-m3-surface-variant/40 border border-m3-outline/20 text-m3-outline py-5 rounded-full font-black uppercase tracking-[0.2em] text-xs hover:text-white hover:bg-m3-surface-variant transition-all"
                        >
                          Abort Session
                        </button>
                    </div>

                    <div className="mt-16 grid grid-cols-3 gap-8 opacity-40 pointer-events-none">
                        <div className="flex flex-col items-center">
                          <Zap size={20} className="text-amber-400 mb-2" />
                          <span className="text-[10px] font-black uppercase text-m3-outline">Overclocking</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Cpu size={20} className="text-m3-primary mb-2" />
                          <span className="text-[10px] font-black uppercase text-m3-outline">Vulkan Core</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Clock size={20} className="text-emerald-400 mb-2" />
                          <span className="text-[10px] font-black uppercase text-m3-outline">Zero Latency</span>
                        </div>
                    </div>
                  </motion.div>
              )}
            </AnimatePresence>

            {/* Hero Image */}
            <div className="h-72 relative">
              <img src={game.fanArt} alt={game.title} className="w-full h-full object-cover opacity-30" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80'; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-m3-surface to-transparent" />
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 w-12 h-12 bg-m3-surface-variant/40 hover:bg-m3-surface-variant text-white rounded-full backdrop-blur-xl transition-all border border-m3-outline/20 flex items-center justify-center"
              >
                <X size={24} />
              </button>
            </div>

             <div className="px-10 pb-10 -mt-24 relative flex flex-col md:flex-row gap-10">
              {/* Box Art */}
              <div className="w-56 shrink-0">
                <div className="aspect-[3/4] rounded-[24px] overflow-hidden border border-m3-outline/30 shadow-2xl relative group">
                  <img src={game.coverArt} alt={game.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-m3-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <button 
                  onClick={() => setShowLaunchConfirm(true)}
                  className="m3-button-filled w-full mt-6 py-4 shadow-xl shadow-m3-primary/20"
                >
                  <Play size={20} fill="currentColor" /> Launch Activity
                </button>

                <button 
                  onClick={() => game && onToggleFavorite(game.id)}
                  className={`w-full mt-3 flex items-center justify-center gap-2 py-4 rounded-full font-bold transition-all border ${isFavorite ? 'bg-m3-tertiary-container border-m3-tertiary text-m3-on-tertiary-container' : 'bg-m3-surface-variant/20 border-m3-outline/20 text-m3-outline hover:text-white'}`}
                >
                  <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'Favorited' : 'Bookmark Title'}
                </button>
                
                {/* Advanced Actions */}
                <div className="mt-8 space-y-3">
                   <p className="text-[11px] font-black text-m3-outline uppercase tracking-[0.2em] pl-2">System Tools</p>
                    
                    <button 
                      onClick={() => setShowGenerator(!showGenerator)}
                      className={`w-full flex items-center gap-4 px-5 py-3 rounded-[20px] transition-all group ${showGenerator ? 'bg-m3-primary text-m3-on-primary' : 'bg-m3-surface-variant/30 hover:bg-m3-surface-variant/50 border border-m3-outline/10 text-m3-on-surface-variant'}`}
                    >
                      <Palette size={18} className={`group-hover:rotate-12 transition-transform ${showGenerator ? 'text-m3-on-primary' : 'text-m3-primary'}`} />
                      <div className="text-left">
                         <p className="text-xs font-bold leading-none mb-1">AI GenArt</p>
                         <p className={`text-[10px] font-black tracking-tighter uppercase whitespace-nowrap opacity-60`}>Box Art Engine</p>
                      </div>
                    </button>

                    <AnimatePresence>
                      {showGenerator && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <AiArtGenerator 
                             gameTitle={game.title}
                             genre={game.genre}
                             platform={game.platform}
                             onImageGenerated={handleUpdateCover}
                             className="mt-2"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button 
                      onClick={handleEnrich}
                      disabled={isEnriching}
                      className="w-full flex items-center gap-3 px-4 py-2.5 bg-zinc-800/50 hover:bg-emerald-600/20 border border-zinc-700 hover:border-emerald-500/50 rounded-lg text-zinc-300 hover:text-emerald-300 transition-all group disabled:opacity-50"
                    >
                      <Sparkles size={16} className={`group-hover:animate-bounce text-emerald-400 ${isEnriching ? 'animate-spin' : ''}`} />
                      <div className="text-left">
                         <p className="text-xs font-bold leading-none mb-1">AI Enrich Data</p>
                         <p className="text-[9px] text-zinc-500 font-medium tracking-tighter uppercase whitespace-nowrap">Gemini Flash Analysis</p>
                      </div>
                    </button>

                    <button 
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/ai/tag', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filename: game.id + '.rom' })
                          });
                          const data = await res.json();
                          if (data.title) {
                            alert(`Neural Tag Found:\nTitle: ${data.title}\nRegion: ${data.region}\nVersion: ${data.version}`);
                          }
                        } catch (e) {
                          console.error("Tagging failed", e);
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 bg-zinc-800/50 hover:bg-amber-600/20 border border-zinc-700 hover:border-amber-500/50 rounded-lg text-zinc-300 hover:text-amber-300 transition-all group"
                    >
                      <Zap size={16} className="text-amber-400 group-hover:scale-125 transition-transform" />
                      <div className="text-left">
                         <p className="text-xs font-bold leading-none mb-1">AI ROM Tagger</p>
                         <p className="text-[9px] text-zinc-500 font-medium whitespace-nowrap">Analysis: Clean Filename</p>
                      </div>
                    </button>
                   <button 
                     onClick={handleOptimize}
                     className="w-full flex items-center gap-3 px-4 py-2.5 bg-zinc-800/50 hover:bg-indigo-600/20 border border-zinc-700 hover:border-indigo-500/50 rounded-lg text-zinc-300 hover:text-indigo-300 transition-all group"
                   >
                     <Cpu size={16} className="group-hover:animate-pulse" />
                     <div className="text-left">
                        <p className="text-xs font-bold leading-none mb-1">Optimize ROM</p>
                        <p className="text-[9px] text-zinc-500 font-medium">To CHD/RVZ Format</p>
                     </div>
                   </button>

                   <button 
                     onClick={handleVerifyIntegrity}
                     className="w-full flex items-center gap-3 px-4 py-2.5 bg-zinc-800/50 hover:bg-emerald-600/20 border border-zinc-700 hover:border-emerald-500/50 rounded-lg text-zinc-300 hover:text-emerald-300 transition-all group"
                   >
                     <ShieldCheck size={16} className="group-hover:scale-110 transition-transform text-emerald-400" />
                     <div className="text-left">
                        <p className="text-xs font-bold leading-none mb-1">Verify Integrity</p>
                        <p className="text-[9px] text-zinc-500 font-medium whitespace-nowrap">MD5/SHA1 Hash Match</p>
                     </div>
                   </button>
                   <button 
                     onClick={() => setActiveInfoTab('controller')}
                     className={`w-full flex items-center gap-3 px-4 py-2.5 bg-zinc-800/50 hover:bg-amber-600/20 border border-zinc-700 hover:border-amber-500/50 rounded-lg transition-all group ${activeInfoTab === 'controller' ? 'border-amber-500 text-amber-300' : 'text-zinc-300 hover:text-amber-300'}`}
                   >
                     <Zap size={16} className="group-hover:scale-110 transition-transform text-amber-400" />
                     <div className="text-left">
                        <p className="text-xs font-bold leading-none mb-1">Joypad Mapping</p>
                        <p className="text-[9px] text-zinc-500 font-medium">Override Standard Input</p>
                     </div>
                   </button>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 pt-24">
                <div className="flex items-center gap-3 mb-3">
                   <span className="px-3 py-1 bg-m3-surface-variant text-[11px] font-black text-m3-primary uppercase tracking-[0.2em] rounded-full border border-m3-outline/10">
                     {game.platform}
                   </span>
                   {game.suggestedCore && (
                     <div className="px-3 py-1 bg-m3-secondary-container rounded-full flex items-center gap-2 border border-m3-outline/10">
                        <Sparkles size={12} className="text-m3-secondary" />
                        <span className="text-[11px] font-black text-m3-on-secondary-container uppercase tracking-widest">
                           AI CORE: {game.suggestedCore}
                        </span>
                     </div>
                   )}
                </div>
                <h2 className="text-5xl font-black text-white mb-6 tracking-tighter leading-tight">{game.title}</h2>
                
                <div className="flex items-center gap-8 border-b border-m3-outline/10 mb-8 overflow-x-auto no-scrollbar">
                   {[
                     { id: 'info', label: 'Summary', icon: Book },
                     { id: 'achievements', label: 'Trophies', icon: Trophy },
                     { id: '3d', label: 'Hardware', icon: Cpu },
                     { id: 'shaders', label: 'Visuals', icon: Palette },
                     { id: 'controller', label: 'Inputs', icon: Zap },
                   ].map(tab => (
                     <button 
                       key={tab.id}
                       onClick={() => setActiveInfoTab(tab.id as any)}
                       className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-3 shrink-0 ${activeInfoTab === tab.id ? 'text-m3-primary' : 'text-m3-outline hover:text-m3-on-surface-variant'}`}
                     >
                       <tab.icon size={16} />
                       {tab.label}
                       {activeInfoTab === tab.id && <motion.div layoutId="activeTabDetails" className="absolute bottom-0 left-0 right-0 h-1 bg-m3-primary rounded-full" />}
                     </button>
                   ))}
                </div>

                <AnimatePresence mode="wait">
                  {activeInfoTab === 'info' ? (
                    <motion.div 
                      key="info"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-8"
                    >
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { icon: Calendar, label: 'Release', val: game.releaseYear },
                            { icon: Tag, label: 'Genre', val: game.genre },
                            { icon: User, label: 'Maker', val: game.developer },
                            { icon: Award, label: 'Rating', val: '9.5 / 10' },
                          ].map((item, i) => (
                            <div key={i} className="bg-m3-surface-variant/20 p-5 rounded-[24px] border border-m3-outline/5">
                               <div className="flex items-center gap-2 text-m3-outline mb-2">
                                  <item.icon size={14} />
                                  <span className="text-[10px] uppercase font-black tracking-widest">{item.label}</span>
                               </div>
                               <p className="text-white font-bold truncate">{item.val}</p>
                            </div>
                          ))}
                       </div>

                       <div className="space-y-4">
                          <h3 className="text-xs font-black text-m3-outline uppercase tracking-[0.2em]">Abstract</h3>
                          <p className="text-m3-on-surface-variant leading-relaxed text-sm lg:text-base">
                             {game.description}
                          </p>
                       </div>
                    </motion.div>
                  ) : activeInfoTab === 'achievements' ? (
                    <motion.div 
                      key="achievements"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-4"
                    >
                      {loadingAchievements ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-6">
                           <Loader2 size={40} className="text-m3-primary animate-spin" />
                           <p className="text-xs font-black text-m3-outline uppercase tracking-widest animate-pulse">Syncing Hall of Fame...</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {achievements.map((ach: any) => (
                            <div key={ach.id} className="p-5 bg-m3-surface-variant/10 border border-m3-outline/5 rounded-[24px] flex items-center gap-5 group hover:bg-m3-surface-variant/20 transition-all">
                               <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center shrink-0 shadow-lg ${
                                 ach.difficulty === 'legendary' ? 'bg-amber-500/20 text-amber-500' :
                                 ach.difficulty === 'hard' ? 'bg-m3-error-container text-m3-on-error-container' :
                                 ach.difficulty === 'medium' ? 'bg-m3-primary-container text-m3-on-primary-container' : 'bg-m3-surface-variant text-m3-outline'
                               }`}>
                                  <Trophy size={24} />
                               </div>
                               <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-1">
                                     <h4 className="font-bold text-base text-white">{ach.title}</h4>
                                     <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-m3-surface-variant/50 text-m3-outline border border-m3-outline/10">{ach.difficulty}</span>
                                  </div>
                                  <p className="text-sm text-m3-outline line-clamp-1">{ach.description}</p>
                               </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ) : activeInfoTab === 'shaders' ? (
                    <motion.div 
                      key="shaders"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-6"
                    >
                       <EmulatorShaderManager 
                         currentShader={selectedShader} 
                         onShaderChange={setSelectedShader} 
                         previewImage={game?.fanArt || game?.coverArt || ''} 
                       />
                    </motion.div>
                  ) : (
                    <div className="py-20 flex items-center justify-center text-m3-outline uppercase font-black tracking-widest text-xs opacity-50">
                       Subsystem Module Initializing...
                    </div>
                  )}
                </AnimatePresence>

                <div className="mt-12 grid grid-cols-2 gap-6 pb-6">
                   <div className="flex items-center gap-5 p-5 bg-m3-surface-variant/20 rounded-[24px] border border-m3-outline/5">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                         <Play size={20} className="text-emerald-400" />
                      </div>
                      <div>
                         <p className="text-[10px] uppercase font-black text-m3-outline tracking-widest">Sessions</p>
                         <p className="text-white text-base font-bold">{stats?.playCount || 0} Runs</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-5 p-5 bg-m3-surface-variant/20 rounded-[24px] border border-m3-outline/5">
                      <div className="w-12 h-12 rounded-full bg-m3-primary/10 flex items-center justify-center">
                         <Clock size={20} className="text-m3-primary" />
                      </div>
                      <div>
                         <p className="text-[10px] uppercase font-black text-m3-outline tracking-widest">Last Entry</p>
                         <p className="text-white text-base font-bold italic">{stats?.lastPlayed ? new Date(stats.lastPlayed.seconds * 1000).toLocaleDateString() : 'New Media'}</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
