import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Game } from '../../data/games';
import { Play, Star, Search, Settings, FolderSync, Sparkles, Loader2, Database, Info, Zap, CheckCircle2, Heart, Clock, X, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { aiOrchestrator } from '../../services/ai/orchestrator';
import { GameDetailsModal } from '../modals/GameDetailsModal';
import { GameImportModal } from '../modals/GameImportModal';
import Fuse from 'fuse.js';
import { Plus } from 'lucide-react';

interface GameManagerAppProps {
  gamesProp: Game[];
  onGamesUpdate: React.Dispatch<React.SetStateAction<Game[]>>;
  onSwitchMode: () => void;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  stats: Record<string, any>;
  onRecordLaunch: (game: Game) => void;
}

// M3 Component: Industrial Grade Game Card
const GameCard = React.memo(({ game, isSelected, onClick, onDoubleClick, onEnrich, isEnriching, isFavorite, onToggleFavorite, stats }: { game: Game; isSelected: boolean; onClick: (g: Game) => void; onDoubleClick: (g: Game) => void; onEnrich?: (e: React.MouseEvent, g: Game) => void; isEnriching?: boolean; isFavorite: boolean; onToggleFavorite: (id: string) => void; stats?: any }) => {
  const needsEnrichment = !game.description || game.description.length < 50 || !game.suggestedCore || !game.releaseYear || !game.genre;
  const playCount = stats?.playCount || 0;
  
  return (
    <motion.div 
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(game)}
      onDoubleClick={() => onDoubleClick(game)}
      className={`group cursor-pointer rounded-[32px] overflow-hidden border transition-all duration-300 relative ${
        isSelected 
          ? 'border-m3-primary bg-m3-primary/5 shadow-2xl z-10' 
          : 'border-m3-outline/10 bg-m3-surface-variant/10 hover:border-m3-outline/30 shadow-lg'
      }`}
    >
      {/* Play Count Badge */}
      {playCount > 0 && (
        <div className="absolute top-4 right-4 px-3 py-1 bg-m3-surface/60 border border-m3-outline/20 rounded-full backdrop-blur-xl z-40">
           <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Clock size={12} className="text-emerald-400" /> {playCount}
           </span>
        </div>
      )}
      
      <div className="aspect-[3/4] relative bg-m3-surface-variant/20 overflow-hidden">
        <img 
          src={game.coverArt} 
          loading="lazy" 
          alt={game.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
          onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80'; }} 
        />
        
        {/* Enrichment Pulse Overlay */}
        <AnimatePresence>
          {isEnriching && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-m3-primary/20 backdrop-blur-[4px] flex flex-col items-center justify-center p-4 text-center z-30"
            >
              <Loader2 size={36} className="text-m3-primary animate-spin mb-3" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-m3-primary">Analyzing Core...</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="absolute inset-0 bg-gradient-to-t from-m3-surface via-transparent to-transparent opacity-80" />
        
        <div className="absolute inset-0 bg-m3-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          {!isEnriching && (
            <div className="w-16 h-16 rounded-full bg-m3-primary text-m3-on-primary flex items-center justify-center shadow-2xl">
                <Play size={32} className="ml-1" fill="currentColor" />
            </div>
          )}
        </div>

        {isSelected && (
            <div className="absolute top-4 left-4 p-2 bg-m3-primary rounded-[16px] shadow-xl">
               <CheckCircle2 size={16} className="text-m3-on-primary" />
            </div>
        )}

        {isFavorite && (
            <div className="absolute top-4 left-14 p-2 bg-m3-tertiary rounded-[16px] shadow-xl">
               <Heart size={16} className="text-m3-on-tertiary fill-current" />
            </div>
        )}
      </div>
      
      <div className={`p-5 transition-colors duration-300 ${isSelected ? 'bg-m3-primary/10' : 'bg-transparent'} border-t border-m3-outline/10 relative`}>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className={`font-black text-sm truncate uppercase tracking-tight mb-1 ${isSelected ? 'text-m3-primary' : 'text-white'}`}>
              {game.title}
            </h3>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-m3-outline uppercase tracking-widest">{game.platform}</span>
            </div>
          </div>
          {needsEnrichment && onEnrich && (
            <button
              onClick={(e) => onEnrich(e, game)}
              disabled={isEnriching}
              className="p-2 bg-m3-primary/10 text-m3-primary rounded-full hover:bg-m3-primary/20 transition-all disabled:opacity-50"
            >
               {isEnriching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export const GameManagerApp: React.FC<GameManagerAppProps> = (props) => {
  const { gamesProp, onGamesUpdate, onSwitchMode, favorites, toggleFavorite, stats, onRecordLaunch } = props;
  const [selectedGame, setSelectedGame] = useState<Game | null>(gamesProp[0] || null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { t } = useLanguage();

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const platforms = useMemo(() => {
    return Array.from(new Set(gamesProp.map(g => g.platform))).sort();
  }, [gamesProp]);

  // V9 Fuzzy Search Engine
  const fuse = useMemo(() => {
    return new Fuse(gamesProp, {
      keys: ['title', 'platform', 'developer', 'genre'],
      threshold: 0.35,
      includeScore: true
    });
  }, [gamesProp]);

  const filteredGames = useMemo(() => {
    let result = gamesProp;
    if (filterPlatform) {
       if (filterPlatform === 'FAVORITES') result = result.filter(g => favorites.has(g.id));
       else if (filterPlatform === 'RECENT') result = result.filter(g => stats[g.id]?.lastPlayed).sort((a,b) => (stats[b.id]?.lastPlayed?.seconds || 0) - (stats[a.id]?.lastPlayed?.seconds || 0));
       else if (filterPlatform === 'MOST_PLAYED') result = result.filter(g => stats[g.id]?.playCount > 0).sort((a,b) => (stats[b.id]?.playCount || 0) - (stats[a.id]?.playCount || 0));
       else result = result.filter(g => g.platform.includes(filterPlatform));
    }
    if (searchQuery) {
      result = fuse.search(searchQuery).map(r => r.item);
    } else {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }
    return result;
  }, [gamesProp, searchQuery, filterPlatform, fuse, favorites, stats]);

  const handleAiScrape = useCallback(async (gameToScrape: Game, force = false) => {
    if (enrichingIds.has(gameToScrape.id)) return;
    setEnrichingIds(prev => new Set(prev).add(gameToScrape.id));
    try {
      const data = await aiOrchestrator.enrichGame(gameToScrape.title, gameToScrape.platform);
      if (isMounted.current && data) {
        onGamesUpdate(prev => prev.map(g => g.id === gameToScrape.id ? {
          ...g,
          releaseYear: parseInt(data.year || '0') || g.releaseYear,
          developer: data.developer || g.developer,
          genre: data.genre || g.genre,
          description: data.description || g.description,
          suggestedCore: data.suggested_core || g.suggestedCore,
        } : g));
      }
    } catch(err) {
      console.error(err);
    } finally {
      if (isMounted.current) setEnrichingIds(prev => { const n = new Set(prev); n.delete(gameToScrape.id); return n; });
    }
  }, [enrichingIds, onGamesUpdate]);

  const handleLaunch = useCallback(async () => {
    if (!selectedGame) return;
    try {
      await fetch('/api/games/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: selectedGame.id, platform: selectedGame.platform, title: selectedGame.title })
      });
      onRecordLaunch(selectedGame);
    } catch(err) { console.warn(err); }
  }, [selectedGame, onRecordLaunch]);

  return (
    <div className="flex h-full w-full bg-m3-surface text-m3-on-surface">
      {/* M3 Sidebar */}
      <div className="w-80 bg-m3-surface-variant/20 border-r border-m3-outline/10 flex flex-col z-10">
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[16px] bg-m3-primary flex items-center justify-center shadow-lg">
               <Database size={24} className="text-m3-on-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-widest uppercase">Console Hub</h1>
              <p className="text-[10px] font-black text-m3-primary tracking-[0.2em] uppercase">V9 Runtime</p>
            </div>
          </div>

          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-m3-outline" />
            <input 
              type="text" 
              placeholder="Filter Library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-m3-surface-variant/40 rounded-full py-4 pl-12 pr-12 text-sm text-white placeholder-m3-outline focus:outline-none focus:ring-2 focus:ring-m3-primary/50 border border-m3-outline/10 transition-all font-bold"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-m3-outline hover:text-white">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2 no-scrollbar">
          <p className="text-[11px] font-black text-m3-outline uppercase tracking-[0.2em] px-4 mb-4 mt-4">Smart Playlists</p>
          {[
            { id: '', label: 'Full Library', count: gamesProp.length, icon: Database },
            { id: 'FAVORITES', label: 'Bookmarks', count: favorites.size, icon: Heart, iconColor: 'text-m3-tertiary' },
            { id: 'RECENT', label: 'Recent Activity', count: Object.values(stats).filter((s:any) => s.lastPlayed).length, icon: Clock },
            { id: 'MOST_PLAYED', label: 'Hall of Fame', count: Object.values(stats).filter((s:any) => s.playCount > 0).length, icon: Star, iconColor: 'text-amber-400' },
          ].map((pt) => (
            <button 
              key={pt.label}
              onClick={() => setFilterPlatform(pt.id)} 
              className={`m3-navigation-item w-full ${filterPlatform === pt.id ? 'active' : ''}`}
            >
              <div className="flex items-center gap-4">
                <pt.icon size={20} className={pt.iconColor || 'text-m3-on-surface-variant'} />
                <span className="text-sm font-bold tracking-tight">{pt.label}</span>
              </div>
              <span className="text-xs font-black opacity-40">{pt.count}</span>
            </button>
          ))}

          <p className="text-[11px] font-black text-m3-outline uppercase tracking-[0.2em] px-4 mb-4 mt-8">Hardware Nodes</p>
          {platforms.slice(0, 8).map(platform => (
            <button 
              key={platform}
              onClick={() => setFilterPlatform(platform)}
              className={`m3-navigation-item w-full ${filterPlatform === platform ? 'active' : ''}`}
            >
               <div className="flex items-center gap-4">
                  <Zap size={20} className="text-m3-outline" />
                  <span className="text-sm font-bold tracking-tight">{platform}</span>
               </div>
            </button>
          ))}
        </div>

        <div className="p-8 border-t border-m3-outline/10 space-y-4">
           <button 
              onClick={() => setIsImportModalOpen(true)}
              className="m3-button-outline w-full py-4 text-xs tracking-widest"
           >
              <Plus size={16} /> Import New ROM
           </button>
           <button 
              onClick={onSwitchMode}
              className="m3-button-filled w-full py-4 text-xs tracking-widest shadow-xl shadow-m3-primary/20"
           >
              <Play size={16} fill="currentColor" /> Switch to TV
           </button>
        </div>
      </div>

      {/* Main Library Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Modern M3 Hero Section */}
        <AnimatePresence mode="wait">
          {selectedGame ? (
            <motion.div 
              key={selectedGame.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-[450px] relative shrink-0"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${selectedGame.fanArt})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-m3-surface via-m3-surface/70 to-transparent" />
              <div className="absolute inset-0 bg-black/40" />

              <div className="absolute inset-0 p-12 flex items-end">
                <div className="flex items-start gap-12 max-w-5xl">
                   <div className="w-56 h-72 rounded-[32px] overflow-hidden border border-m3-outline/30 shadow-2xl shrink-0 hidden md:block">
                      <img src={selectedGame.coverArt} alt={selectedGame.title} className="w-full h-full object-cover" />
                   </div>
                    
                   <div className="flex-1 pb-4">
                       <div className="flex items-center gap-4 mb-4">
                          <span className="px-4 py-1.5 bg-m3-primary/20 text-m3-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-m3-primary/20">
                             {selectedGame.platform}
                          </span>
                          <span className="text-xs font-black text-m3-outline uppercase tracking-widest">{selectedGame.developer} | {selectedGame.releaseYear}</span>
                       </div>
                       
                       <h2 className="text-7xl font-black text-white tracking-tighter leading-[0.9] mb-6">
                          {selectedGame.title}
                       </h2>
                       
                       <p className="text-m3-on-surface-variant text-lg leading-relaxed line-clamp-3 max-w-3xl mb-10 font-medium">
                          {selectedGame.description}
                       </p>

                       <div className="flex items-center gap-6">
                          <button 
                            onClick={handleLaunch}
                            className="m3-button-filled px-12 py-5 text-sm tracking-[0.2em] shadow-2xl shadow-m3-primary/30"
                          >
                             <Play size={20} fill="currentColor" /> Initialize Activity
                          </button>
                          
                          <button 
                            onClick={() => setIsDetailModalOpen(true)}
                            className="m3-button-tonal px-10 py-5 text-sm tracking-[0.2em]"
                          >
                            Game Parameters
                          </button>

                          {selectedGame.suggestedCore && (
                             <div className="flex items-center gap-3 ml-6 opacity-80 bg-m3-surface-variant/30 px-4 py-2 rounded-full border border-m3-outline/10">
                                <Zap size={18} className="text-amber-400" />
                                <span className="text-xs font-black text-amber-500 uppercase tracking-widest">{selectedGame.suggestedCore} Core</span>
                             </div>
                          )}
                       </div>
                   </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-[450px] flex items-center justify-center bg-m3-surface">
               <Loader2 size={40} className="text-m3-primary animate-spin" />
            </div>
          )}
        </AnimatePresence>

        {/* Action Bar */}
        <div className="px-10 py-6 border-y border-m3-outline/10 flex items-center justify-between bg-m3-surface/50 backdrop-blur-2xl shrink-0">
           <div className="flex items-center gap-8">
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-black text-m3-outline uppercase tracking-[0.2em]">Display Mode</span>
                 <div className="flex bg-m3-surface-variant/30 rounded-full p-1 border border-m3-outline/10">
                    <button onClick={() => setViewMode('grid')} className={`px-5 py-2 rounded-full text-xs font-black transition-all ${viewMode === 'grid' ? 'bg-m3-primary text-m3-on-primary' : 'text-m3-outline hover:text-white'}`}>
                       <LayoutGrid size={16} />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`px-5 py-2 rounded-full text-xs font-black transition-all ${viewMode === 'list' ? 'bg-m3-primary text-m3-on-primary' : 'text-m3-outline hover:text-white'}`}>
                       <List size={16} />
                    </button>
                 </div>
              </div>

              <div className="w-px h-10 bg-m3-outline/10" />

              <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-black text-m3-outline uppercase tracking-[0.2em]">Quick Filter</span>
                 <select 
                    value={filterPlatform} 
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className="bg-transparent text-sm font-black text-white outline-none cursor-pointer uppercase tracking-tighter"
                 >
                    <option value="">All Repositories</option>
                    {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
              </div>
           </div>

           <div className="flex items-center gap-4 text-right">
              <div>
                 <p className="text-sm font-black text-white uppercase tracking-tighter">{filteredGames.length} Assets Indexed</p>
                 <p className="text-[10px] font-black text-m3-outline uppercase tracking-[0.2em]">Neural Cache Shared</p>
              </div>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
              {filteredGames.map(game => (
                <GameCard 
                  key={game.id} 
                  game={game} 
                  isSelected={selectedGame?.id === game.id} 
                  onClick={setSelectedGame} 
                  onDoubleClick={() => setIsDetailModalOpen(true)}
                  onEnrich={(e, g) => { e.stopPropagation(); setSelectedGame(g); handleAiScrape(g, true); }}
                  isEnriching={enrichingIds.has(game.id)}
                  isFavorite={favorites.has(game.id)}
                  onToggleFavorite={toggleFavorite}
                  stats={stats[game.id]}
                />
              ))}
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-3">
               {filteredGames.map(game => (
                 <div 
                   key={game.id}
                   onClick={() => setSelectedGame(game)}
                   className={`flex items-center gap-6 p-4 rounded-[24px] cursor-pointer transition-all border ${
                     selectedGame?.id === game.id ? 'bg-m3-primary/10 border-m3-primary shadow-lg' : 'bg-m3-surface-variant/10 border-transparent hover:bg-m3-surface-variant/20'
                   }`}
                 >
                    <div className="w-12 h-16 bg-m3-surface-variant/30 rounded-[12px] overflow-hidden shrink-0 border border-m3-outline/10">
                       <img src={game.coverArt} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className={`text-base font-black uppercase tracking-tight truncate ${selectedGame?.id === game.id ? 'text-m3-primary' : 'text-white'}`}>
                          {game.title}
                       </h4>
                       <p className="text-xs font-bold text-m3-outline uppercase tracking-[0.1em]">{game.platform} | {game.developer}</p>
                    </div>
                    <div className="flex items-center gap-8 px-6 shrink-0">
                        {stats[game.id]?.playCount > 0 && (
                          <div className="text-right">
                             <div className="text-xs font-black text-emerald-400">{stats[game.id].playCount} Runs</div>
                             <div className="text-[10px] font-bold text-m3-outline uppercase">{new Date(stats[game.id].lastPlayed?.seconds * 1000).toLocaleDateString()}</div>
                          </div>
                        )}
                        <div className="w-px h-8 bg-m3-outline/10" />
                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(game.id); }} className={`p-3 rounded-full transition-all ${favorites.has(game.id) ? 'bg-m3-tertiary-container text-m3-on-tertiary-container' : 'text-m3-outline hover:text-white'}`}>
                           <Heart size={20} fill={favorites.has(game.id) ? "currentColor" : "none"} />
                        </button>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals Integrated */}
      <GameDetailsModal 
        isOpen={isDetailModalOpen}
        game={selectedGame}
        onClose={() => setIsDetailModalOpen(false)}
        onLaunch={handleLaunch}
        onEnrich={async () => { if(selectedGame) handleAiScrape(selectedGame, true); }}
        isEnriching={selectedGame ? enrichingIds.has(selectedGame.id) : false}
        onUpdateCover={(id, url) => onGamesUpdate(prev => prev.map(g => g.id === id ? { ...g, coverArt: url } : g))}
        isFavorite={selectedGame ? favorites.has(selectedGame.id) : false}
        onToggleFavorite={toggleFavorite}
        stats={selectedGame ? stats[selectedGame.id] : null}
      />

      <GameImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(newGame) => { onGamesUpdate(prev => [newGame, ...prev]); setSelectedGame(newGame); }}
      />
    </div>
  );
};
