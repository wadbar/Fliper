import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Clock, Trophy, Award, Calendar, User, Tag, Sparkles, Cpu, Zap, ShieldCheck, Palette, Heart, Loader2 } from 'lucide-react';
import { Game } from '../../data/games';
import { AiArtGenerator } from '../apps/AiArtGenerator';
import { ThreeDGameCartridge } from '../ui/ThreeDGameCartridge';

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
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'info' | 'achievements' | '3d' | 'controller'>('info');

  React.useEffect(() => {
    if (isOpen && game && activeInfoTab === 'achievements' && achievements.length === 0) {
      const fetchAchievements = async () => {
        setLoadingAchievements(true);
        try {
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
  }, [isOpen, game, activeInfoTab, achievements.length]);

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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl bg-[#18181B] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            {/* Hero Image */}
            <div className="h-64 relative">
              <img src={game.fanArt} alt={game.title} className="w-full h-full object-cover opacity-40" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80'; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#18181B] to-transparent" />
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>

             <div className="px-8 pb-8 -mt-20 relative flex flex-col md:flex-row gap-8">
              {/* Box Art */}
              <div className="w-48 shrink-0">
                <div className="aspect-[3/4] rounded-lg overflow-hidden border border-zinc-700 shadow-2xl relative group">
                  <img src={game.coverArt} alt={game.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <button 
                  onClick={onLaunch}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-white text-black py-3 rounded-lg font-bold hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
                >
                  <Play size={18} fill="currentColor" /> Play Now
                </button>

                <button 
                  onClick={() => game && onToggleFavorite(game.id)}
                  className={`w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all active:scale-95 border ${isFavorite ? 'bg-rose-600/20 border-rose-600 text-rose-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'}`}
                >
                  <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'Favorited' : 'Add to Favs'}
                </button>
                
                {/* Advanced Actions */}
                <div className="mt-6 space-y-2">
                   <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Advanced</p>
                    
                    <button 
                      onClick={() => setShowGenerator(!showGenerator)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group ${showGenerator ? 'bg-indigo-600 text-white' : 'bg-zinc-800/50 hover:bg-indigo-600/20 border border-zinc-700 hover:border-indigo-500/50 text-zinc-300 hover:text-indigo-300'}`}
                    >
                      <Palette size={16} className={`group-hover:rotate-12 transition-transform ${showGenerator ? 'text-white' : 'text-indigo-400'}`} />
                      <div className="text-left">
                         <p className="text-xs font-bold leading-none mb-1">AI Cover Art</p>
                         <p className={`text-[9px] font-medium tracking-tighter uppercase whitespace-nowrap ${showGenerator ? 'text-indigo-200' : 'text-zinc-500'}`}>Generate Box Art</p>
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
              <div className="flex-1 pt-20 md:pt-24">
                <div className="flex items-center gap-2 mb-2">
                   <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                     {game.platform}
                   </span>
                   {game.suggestedCore && (
                     <div className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 rounded flex items-center gap-2">
                        <Sparkles size={12} className="text-indigo-400" />
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                           AI Optimize: {game.suggestedCore}
                        </span>
                     </div>
                   )}
                </div>
                <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">{game.title}</h2>
                
                <div className="flex items-center gap-6 border-b border-zinc-800 mb-6">
                   <button 
                     onClick={() => setActiveInfoTab('info')}
                     className={`pb-2 text-sm font-bold uppercase tracking-widest transition-all relative ${activeInfoTab === 'info' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                   >
                     General Info
                     {activeInfoTab === 'info' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                   </button>
                   <button 
                     onClick={() => setActiveInfoTab('achievements')}
                     className={`pb-2 text-sm font-bold uppercase tracking-widest transition-all relative flex items-center gap-2 ${activeInfoTab === 'achievements' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                   >
                     Achievements
                     <Trophy size={14} className={activeInfoTab === 'achievements' ? 'text-yellow-500' : 'text-zinc-600'} />
                     {activeInfoTab === 'achievements' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                   </button>
                   <button 
                     onClick={() => setActiveInfoTab('3d')}
                     className={`pb-2 text-sm font-bold uppercase tracking-widest transition-all relative flex items-center gap-2 ${activeInfoTab === '3d' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                   >
                     3D Model
                     <Cpu size={14} className={activeInfoTab === '3d' ? 'text-indigo-400' : 'text-zinc-600'} />
                     {activeInfoTab === '3d' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                   </button>
                </div>

                <AnimatePresence mode="wait">
                  {activeInfoTab === 'info' ? (
                    <motion.div 
                      key="info"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                         <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                               <Calendar size={14} />
                               <span className="text-[10px] uppercase font-bold">Year</span>
                            </div>
                            <p className="text-white font-semibold">{game.releaseYear}</p>
                         </div>
                         <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                               <Tag size={14} />
                               <span className="text-[10px] uppercase font-bold">Genre</span>
                            </div>
                            <p className="text-white font-semibold">{game.genre}</p>
                         </div>
                         <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                               <User size={14} />
                               <span className="text-[10px] uppercase font-bold">Maker</span>
                            </div>
                            <p className="text-white font-semibold truncate">{game.developer}</p>
                         </div>
                         <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                               <Award size={14} />
                               <span className="text-[10px] uppercase font-bold">Rating</span>
                            </div>
                            <p className="text-white font-semibold">9.5 / 10</p>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest border-b border-zinc-800 pb-2">Description</h3>
                         <p className="text-zinc-400 leading-relaxed text-sm">
                            {game.description}
                         </p>
                      </div>
                    </motion.div>
                  ) : activeInfoTab === '3d' ? (
                    <motion.div 
                      key="3d"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-zinc-950 rounded-2xl border border-white/5 overflow-hidden ring-1 ring-white/10"
                    >
                       <ThreeDGameCartridge coverUrl={game.coverArt || ''} />
                    </motion.div>
                  ) : activeInfoTab === 'controller' ? (
                    <motion.div 
                      key="controller"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-4"
                    >
                       <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                          <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2"><Zap size={14} className="text-amber-500" /> Per-Game Joypad Overrides</h3>
                          <p className="text-[10px] text-zinc-500 mb-4">You can remap standard retro pad buttons specifically for {game.title}. This bypasses the global input configuration and injects directly into the core retroarch layer when launched.</p>
                          
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                             {['D-Pad Up', 'D-Pad Down', 'D-Pad Left', 'D-Pad Right', 'A Button (Right)', 'B Button (Down)', 'X Button (Top)', 'Y Button (Left)', 'L1 / L', 'R1 / R', 'Start', 'Select'].map(btn => (
                               <div key={btn} className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                  <span className="text-xs font-bold text-zinc-400">{btn}</span>
                                  <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] rounded transition-colors uppercase tracking-widest">
                                     Listen...
                                  </button>
                               </div>
                             ))}
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-end gap-3">
                             <button className="px-4 py-2 bg-transparent text-zinc-400 hover:text-white text-xs font-bold transition-colors">Reset Defaults</button>
                             <button className="px-4 py-2 bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white rounded text-xs font-bold transition-colors">Save Override</button>
                          </div>
                       </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="achievements"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-4"
                    >
                      {loadingAchievements ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-4">
                           <Loader2 size={32} className="text-indigo-500 animate-spin" />
                           <p className="text-xs font-mono text-zinc-500 animate-pulse">Consulting Neural Archives for Game Milestones...</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {achievements.map((ach: any) => (
                            <div key={ach.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center gap-4 group hover:bg-zinc-800/50 transition-all">
                               <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border ${
                                 ach.difficulty === 'legendary' ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' :
                                 ach.difficulty === 'hard' ? 'bg-rose-500/20 border-rose-500' :
                                 ach.difficulty === 'medium' ? 'bg-indigo-500/20 border-indigo-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                               }`}>
                                  {ach.difficulty === 'legendary' ? <Trophy size={20} className="text-amber-500" /> : <Award size={20} className={ach.difficulty === 'hard' ? 'text-rose-500' : ach.difficulty === 'medium' ? 'text-indigo-400' : 'text-zinc-500'} />}
                               </div>
                               <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                     <h4 className="font-bold text-sm text-white">{ach.title}</h4>
                                     <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                        ach.difficulty === 'legendary' ? 'bg-amber-500 text-black' :
                                        ach.difficulty === 'hard' ? 'bg-rose-500 text-white' :
                                        ach.difficulty === 'medium' ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-300'
                                     }`}>{ach.difficulty}</span>
                                  </div>
                                  <p className="text-xs text-zinc-400 line-clamp-1">{ach.description}</p>
                               </div>
                            </div>
                          ))}
                          <div className="p-4 rounded-xl border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em]">
                             More Secrets to be Discovered
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-8 grid grid-cols-2 gap-4">
                   <div className="flex items-center gap-4 text-zinc-500">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                         <Play size={18} className="text-emerald-400" />
                      </div>
                      <div>
                         <p className="text-[10px] uppercase font-bold">Launch Count</p>
                         <p className="text-zinc-300 text-sm">{stats?.playCount || 0} times</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 text-zinc-500">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                         <Clock size={18} />
                      </div>
                      <div>
                         <p className="text-[10px] uppercase font-bold">Last Played</p>
                         <p className="text-zinc-300 text-sm italic">{stats?.lastPlayed ? new Date(stats.lastPlayed.seconds * 1000).toLocaleDateString() : 'Never'}</p>
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
