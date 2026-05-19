import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Game } from '../../data/games';
import { Play, Star, Search, Settings, FolderSync, Sparkles, Loader2, Database, Info, Zap, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { GameDetailsModal } from '../modals/GameDetailsModal';

interface GameManagerAppProps {
  gamesProp: Game[];
  onGamesUpdate: React.Dispatch<React.SetStateAction<Game[]>>;
  onSwitchMode: () => void;
}

// Elite Optimization: Memoized Card for high-volume rendering
const GameCard = React.memo(({ game, isSelected, onClick, onDoubleClick }: { game: Game; isSelected: boolean; onClick: (g: Game) => void; onDoubleClick: (g: Game) => void }) => (
  <motion.div 
    whileHover={{ y: -8, scale: 1.05 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => onClick(game)}
    onDoubleClick={() => onDoubleClick(game)}
    className={`group cursor-pointer rounded-xl overflow-hidden border transition-all duration-500 relative perspective-1000 ${
      isSelected 
        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.3)] z-10' 
        : 'border-zinc-800 hover:border-zinc-500/50 shadow-xl'
    }`}
  >
    <div className="aspect-[3/4] relative bg-zinc-900 overflow-hidden">
      {/* Texture Overlay for real box feel */}
      <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/dust.png')]" />
      
      <img 
        src={game.coverArt} 
        loading="lazy" 
        alt={game.title} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80'; }} 
      />
      
      {/* Dynamic Shine Sweep */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
      
      {/* Edge Reflection */}
      <div className="absolute inset-0 border border-white/10 rounded-xl pointer-events-none" />
      <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/20" />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
      
      <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          whileHover={{ scale: 1, opacity: 1 }}
          className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.4)]"
        >
            <Play size={28} className="text-black ml-1" fill="currentColor" />
        </motion.div>
      </div>

      {isSelected && (
          <div className="absolute top-3 right-3 p-1.5 bg-indigo-500 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse">
             <CheckCircle2 size={14} className="text-white" />
          </div>
      )}
    </div>
    
    <div className={`p-3 transition-colors duration-300 ${isSelected ? 'bg-indigo-950/20' : 'bg-[#0E0E10]'} border-t border-zinc-800`}>
      <h3 className={`font-black text-[11px] truncate uppercase tracking-wider ${isSelected ? 'text-indigo-300' : 'text-white'}`}>
        {game.title}
      </h3>
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1.5">
           <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-500' : 'bg-zinc-700'}`} />
           <p className="text-[9px] text-zinc-500 truncate font-bold tracking-tight">{game.platform}</p>
        </div>
        <span className="text-[9px] text-zinc-600 font-mono italic opacity-60">{game.releaseYear}</span>
      </div>
    </div>
  </motion.div>
));

export const GameManagerApp: React.FC<GameManagerAppProps> = ({ gamesProp, onGamesUpdate, onSwitchMode }) => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(gamesProp[0] || null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { t } = useLanguage();
  
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const loadGames = useCallback(async (abortSignal?: AbortSignal) => {
    try {
      const res = await fetch('/api/games', { signal: abortSignal });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data && data.length > 0) {
        const mappedGames: Game[] = data.map((g: any) => ({
           id: g.id,
           title: g.title,
           platform: g.path.includes('Nintendo') ? 'Super Nintendo' : (g.path.includes('NES') ? 'NES' : 'Arcade'),
           developer: g.developer,
           releaseYear: g.releaseYear || 1990, 
           genre: g.genre || "Unknown",
           coverArt: g.coverArt || `file:///C:/LaunchBox/Images/${g.path.includes('Nintendo') ? 'Super Nintendo' : 'Arcade'}/Box - Front/${g.title.replace(/:/g, '')}.jpg`,
           fanArt: g.fanArt || `file:///C:/LaunchBox/Images/${g.path.includes('Nintendo') ? 'Super Nintendo' : 'Arcade'}/Fanart/${g.title.replace(/:/g, '')}.jpg`,
           description: g.description || `From LaunchBox: ${g.title}`
        }));
        onGamesUpdate(mappedGames);
        setSelectedGame(prev => {
           if (!prev && mappedGames.length > 0) return mappedGames[0];
           return prev;
        });
      }
    } catch(err: any) {
      if (err.name !== 'AbortError') console.warn("API Call Failed, skipping...", err);
    }
  }, [onGamesUpdate]);

  useEffect(() => {
    const abortController = new AbortController();
    loadGames(abortController.signal);
    return () => abortController.abort();
  }, [loadGames]);

  // Elite Optimization: Memoized Scrape
  const enrichedGamesRef = useRef<Set<string>>(new Set());

  const handleAiScrape = useCallback(async (gameToScrape: Game, force = false) => {
    if (isAiLoading || (!force && enrichedGamesRef.current.has(gameToScrape.id))) return;
    setIsAiLoading(true);
    try {
      enrichedGamesRef.current.add(gameToScrape.id);
      const res = await fetch('/api/ai/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: gameToScrape.title, platform: gameToScrape.platform })
      });
      if (!res.ok) throw new Error("API Failure");
      const data = await res.json();
      if (!isMounted.current) return;
      if (data) {
        onGamesUpdate(prev => prev.map(g => g.id === gameToScrape.id ? {
          ...g,
          releaseYear: parseInt(data.year) || g.releaseYear,
          developer: data.developer || g.developer,
          genre: data.genre || g.genre,
          description: data.description || g.description,
          suggestedCore: data.suggested_core || g.suggestedCore,
        } : g));
        
        setSelectedGame(curr => curr?.id === gameToScrape.id ? {
          ...curr,
          releaseYear: parseInt(data.year) || curr.releaseYear,
          developer: data.developer || curr.developer,
          genre: data.genre || curr.genre,
          description: data.description || curr.description,
          suggestedCore: data.suggested_core || curr.suggestedCore,
        } : curr);
      }
    } catch(err) {
      console.error("AI Scrape error: ", err);
    } finally {
      if (isMounted.current) setIsAiLoading(false);
    }
  }, [isAiLoading, onGamesUpdate]);

  // Auto-enrichment on selection
  useEffect(() => {
    if (selectedGame && (selectedGame.description.length < 50 || !selectedGame.suggestedCore)) {
      handleAiScrape(selectedGame);
    }
  }, [selectedGame?.id, handleAiScrape]);
  
  const handleUpdateCover = useCallback((gameId: string, newUrl: string) => {
    onGamesUpdate(prev => prev.map(g => g.id === gameId ? { ...g, coverArt: newUrl } : g));
    if (selectedGame?.id === gameId) {
      setSelectedGame(prev => prev ? { ...prev, coverArt: newUrl } : prev);
    }
  }, [selectedGame?.id, onGamesUpdate]);

  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = useCallback(async () => {
    if (!selectedGame || isLaunching) return;
    setIsLaunching(true);
    try {
      const mode = localStorage.getItem('fliper_perf_mode') || 'ultra';
      let coreId = selectedGame.suggestedCore?.toLowerCase() || 'mame';
      
      if (!selectedGame.suggestedCore) {
        const p = selectedGame.platform.toLowerCase();
        
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

      await fetch('/api/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: selectedGame.id + '.rom', platform: selectedGame.platform, mode: mode.toUpperCase(), core: coreId })
      });
    } catch(err) {
      console.warn(err);
    } finally {
      setTimeout(() => {
         if (isMounted.current) setIsLaunching(false);
      }, 2000);
    }
  }, [selectedGame, isLaunching]);

  // Elite Optimization: Memoized filter to prevent layout thrashing on re-renders
  const filteredGames = useMemo(() => {
    return gamesProp.filter(g => 
      searchQuery === 'Japan Arcade' ? ['Arcade_JP', 'Naomi', 'NeoGeo'].includes(g.platform) :
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.platform.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.title.localeCompare(b.title));
  }, [gamesProp, searchQuery]);

  return (
    <div className="flex h-full w-full bg-[#121212] text-zinc-300">
      {/* Sidebar - Technical Grid Style */}
      <div className="w-64 bg-[#0A0A0B] border-r border-zinc-800 flex flex-col z-10 transition-all duration-300">
        <div className="px-4 py-6 border-b border-zinc-800 bg-[#0C0C0E]">
          <h1 className="text-xl font-black text-white italic tracking-tighter mb-4 flex items-center gap-2">
            <Database size={20} className="text-indigo-500" /> FLIPER.OS
          </h1>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input 
              type="text" 
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121214] rounded-lg py-2 pl-9 pr-4 text-[11px] text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 border border-zinc-800 transition-all font-mono"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-hide">
          <div className="text-[10px] text-zinc-700 font-black px-5 py-2 uppercase tracking-[0.2em] flex items-center justify-between">
            {t('platforms')}
          </div>
          {[
            { id: '', label: t('all_games'), count: gamesProp.length },
            { id: 'Japan Arcade', label: 'Japan Arcade', count: gamesProp.filter(g => ['Arcade_JP', 'Naomi', 'NeoGeo'].includes(g.platform)).length },
            { id: 'SNES', label: 'Super Nintendo', count: gamesProp.filter(g => g.platform.includes('SNES')).length },
            { id: 'NES', label: 'NES', count: gamesProp.filter(g => g.platform.includes('NES')).length },
          ].map((pt) => (
            <button 
              key={pt.label}
              onClick={() => setSearchQuery(pt.id)} 
              className={`w-full text-left px-5 py-2.5 flex items-center justify-between group transition-all ${
                searchQuery === pt.id 
                  ? 'bg-zinc-800/40 border-r-2 border-indigo-500 text-white' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20'
              }`}
            >
              <span className="text-[11px] font-bold tracking-tight">{pt.label}</span>
              <span className="text-[9px] font-mono opacity-40 group-hover:opacity-100">{pt.count}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[#2A2A2D]">
           <button 
              onClick={() => { if(selectedGame) handleAiScrape(selectedGame, true); }}
              disabled={isAiLoading || !selectedGame}
              title="(Pro Feature) Enriquecer Metadata via LLM Local/Remota"
              className="w-full flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white py-2 rounded-md text-sm font-medium transition-colors mb-2 disabled:opacity-50"
           >
              {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 
              {isAiLoading ? 'Processando (AI)...': t('ai_enhance')}
           </button>
           <button 
              onClick={onSwitchMode}
              className="w-full flex items-center justify-center gap-2 bg-[#2A2A2D] hover:bg-white/10 text-white py-2 rounded-md text-sm font-medium transition-colors"
           >
              <Play size={16} /> {t('enter_fliper')}
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0F0F11]">
        {/* Editorial-Style Hero */}
        <AnimatePresence mode="wait">
          {selectedGame && (
            <motion.div 
              key={selectedGame.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-80 relative border-b border-zinc-800 shrink-0 overflow-hidden"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-linear scale-110 group-hover:scale-100"
                style={{ backgroundImage: `url(${selectedGame.fanArt})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F11] via-[#0F0F11]/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0F0F11] to-transparent" />
              <div className="absolute inset-0 bg-black/40" />

              <div className="absolute inset-0 p-10 flex flex-col justify-end">
                <div className="flex items-start gap-10">
                   <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      className="w-32 h-44 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 shrink-0 hidden md:block relative group"
                    >
                      {/* Bevel and Reflection */}
                      <div className="absolute inset-0 border border-white/5 rounded-xl z-20 pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent z-10" />
                      
                      <img src={selectedGame.coverArt} alt={selectedGame.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80'; }} />
                      
                      {/* Active Shine */}
                      <motion.div 
                         animate={{ x: ['-100%', '200%'] }}
                         transition={{ duration: 5, repeat: Infinity, repeatDelay: 2 }}
                         className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 z-20 pointer-events-none"
                      />
                    </motion.div>
                    
                    <div className="flex-1">
                       <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                             {selectedGame.platform}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">{selectedGame.developer}</span>
                       </div>
                       
                       <h2 className="text-6xl font-black text-white italic tracking-tighter uppercase leading-[0.85] mb-4">
                          {selectedGame.title}
                       </h2>
                       
                       <div className="max-w-2xl">
                          <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2 italic font-serif">
                             {selectedGame.description}
                          </p>
                       </div>

                       <div className="flex items-center gap-4 mt-8">
                          <button 
                            onClick={handleLaunch}
                            disabled={isLaunching}
                            className="h-10 px-8 bg-white hover:bg-zinc-200 text-black rounded text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center gap-3 active:scale-95"
                          >
                            {isLaunching ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />} 
                            {isLaunching ? t('booting') : t('play')}
                          </button>
                          
                          <button 
                            onClick={() => setIsDetailModalOpen(true)}
                            className="h-10 px-6 border border-zinc-700 hover:bg-zinc-800 rounded text-zinc-300 text-[11px] font-black uppercase tracking-widest transition-all"
                          >
                            {t('details') || 'Metadata'}
                          </button>

                          {selectedGame.suggestedCore && (
                             <div className="flex items-center gap-2 ml-4 opacity-60">
                                <Zap size={14} className="text-amber-400" />
                                <span className="text-[10px] font-mono text-amber-500 uppercase font-black">{selectedGame.suggestedCore}</span>
                             </div>
                          )}
                       </div>
                    </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredGames.map(game => (
               <GameCard 
                 key={game.id} 
                 game={game} 
                 isSelected={selectedGame?.id === game.id} 
                 onClick={setSelectedGame} 
                 onDoubleClick={() => setIsDetailModalOpen(true)}
               />
            ))}
          </div>
        </div>
      </div>

      <GameDetailsModal 
        isOpen={isDetailModalOpen}
        game={selectedGame}
        onClose={() => setIsDetailModalOpen(false)}
        onLaunch={handleLaunch}
        onEnrich={async () => { if(selectedGame) handleAiScrape(selectedGame, true); }}
        isEnriching={isAiLoading}
        onUpdateCover={handleUpdateCover}
      />
    </div>
  );
};

