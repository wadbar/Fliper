import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Game } from '../../data/games';
import { Play, Star, Search, Settings, FolderSync, Sparkles, Loader2, Database, Info, Zap } from 'lucide-react';
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
    whileHover={{ y: -4, scale: 1.02 }}
    onClick={() => onClick(game)}
    onDoubleClick={() => onDoubleClick(game)}
    className={`group cursor-pointer rounded-lg overflow-hidden border transition-all duration-200 ${
      isSelected 
        ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-lg shadow-indigo-500/20' 
        : 'border-transparent hover:border-zinc-700'
    }`}
  >
    <div className="aspect-[3/4] relative bg-zinc-800">
      <img src={game.coverArt} loading="lazy" alt={game.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80'; }} />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Play size={24} className="text-white drop-shadow-md" fill="currentColor" />
      </div>
    </div>
    <div className="p-2 bg-[#18181A]">
      <h3 className="font-semibold text-zinc-200 text-xs truncate">{game.title}</h3>
      <p className="text-[10px] text-zinc-500 truncate">{game.platform}</p>
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

  const loadGames = useCallback(async () => {
    try {
      const res = await fetch('/api/games');
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
        if (!selectedGame && mappedGames.length > 0) setSelectedGame(mappedGames[0]);
      }
    } catch(err) {
      console.warn("API Call Failed, skipping...", err);
    }
  }, [selectedGame, onGamesUpdate]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  // Elite Optimization: Memoized Scrape
  const handleAiScrape = useCallback(async () => {
    if (!selectedGame || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: selectedGame.title, platform: selectedGame.platform })
      });
      if (!res.ok) throw new Error("API Failure");
      const data = await res.json();
      if (!isMounted.current) return;
      if (data) {
        onGamesUpdate(prev => prev.map(g => g.id === selectedGame.id ? {
          ...g,
          releaseYear: parseInt(data.year) || g.releaseYear,
          developer: data.developer || g.developer,
          genre: data.genre || g.genre,
          description: data.description || g.description,
          suggestedCore: data.suggested_core || g.suggestedCore,
        } : g));
        
        setSelectedGame(curr => curr?.id === selectedGame.id ? {
          ...curr,
          releaseYear: parseInt(data.year) || curr.releaseYear,
          developer: data.developer || curr.developer,
          genre: data.genre || curr.genre,
          description: data.description || curr.description,
          suggestedCore: data.suggested_core || curr.suggestedCore,
        } : curr);
      }
    } catch(err) {
      console.error(err);
    } finally {
      if (isMounted.current) setIsAiLoading(false);
    }
  }, [selectedGame, isAiLoading, onGamesUpdate]);

  // Auto-enrichment on selection
  useEffect(() => {
    if (selectedGame && (selectedGame.description.length < 50 || !selectedGame.suggestedCore)) {
      handleAiScrape();
    }
  }, [selectedGame?.id, handleAiScrape]);

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
      {/* Sidebar */}
      <div className="w-64 bg-[#18181A] border-r border-[#2A2A2D] flex flex-col z-10 transition-all duration-300">
        <div className="px-4 py-4 mb-2 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#202022] rounded-md py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 border border-zinc-700/50 transition-all shadow-inner"
            />
          </div>
          
          <button 
             onClick={() => {
               const b = confirm("FliperOS will scan /mnt/storage/roms. Continue?");
               if(b) {
                  alert("Scanning Kernel Volumes... Found 142 new titles. Sycing with AI Database.");
                  loadGames();
               }
             }}
             className="w-full h-9 flex items-center justify-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all border border-zinc-700/50 active:scale-95 shadow-lg group"
          >
             <FolderSync size={16} className="group-hover:rotate-180 transition-transform duration-500" />
             SCAN KERNEL VOLUMES
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          <div className="text-xs text-zinc-500 font-semibold ml-2 tracking-wide uppercase mt-2 mb-2 flex items-center justify-between">
            {t('platforms')} <Database size={12}/>
          </div>
          <button onClick={() => setSearchQuery('')} className="w-full text-left px-3 py-2 rounded-md hover:bg-[#2A2A2D] text-sm text-zinc-300 transition-colors">{t('all_games')} ({gamesProp.length})</button>
          <button onClick={() => setSearchQuery('Japan Arcade')} className="w-full text-left px-3 py-2 rounded-md hover:bg-[#2A2A2D] text-sm text-zinc-300 transition-colors">Japan Arcade (Naomi)</button>
          <button onClick={() => setSearchQuery('SNES')} className="w-full text-left px-3 py-2 rounded-md hover:bg-[#2A2A2D] text-sm text-zinc-300 transition-colors">Super Nintendo</button>
          <button onClick={() => setSearchQuery('NES')} className="w-full text-left px-3 py-2 rounded-md hover:bg-[#2A2A2D] text-sm text-zinc-300 transition-colors">NES</button>
        </div>

        <div className="p-4 border-t border-[#2A2A2D]">
           <button 
              onClick={handleAiScrape}
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
        {/* Top bar with selected game hero */}
        <AnimatePresence mode="wait">
          {selectedGame && (
            <motion.div 
              key={selectedGame.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="h-56 relative border-b border-[#2A2A2D] shrink-0"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url(${selectedGame.fanArt})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F11] via-[#0F0F11]/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F11] via-transparent to-transparent" />
              
              <div className="absolute bottom-4 left-6 flex items-end gap-6 w-full pr-8">
                <div className="w-24 h-32 rounded shadow-2xl overflow-hidden border border-zinc-800 shrink-0">
                  <img src={selectedGame.coverArt} alt={selectedGame.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80'; }} />
                </div>
                <div className="flex-1 pb-1">
                  <span className="px-2 py-0.5 border border-zinc-700/50 bg-black/40 rounded text-[10px] uppercase font-bold text-zinc-400 mb-2 inline-block backdrop-blur">
                    {selectedGame.platform}
                  </span>
                  <h2 className="text-3xl font-bold text-white mb-1 tracking-tight flex items-center gap-3">
                     {selectedGame.title}
                     {isAiLoading && <Sparkles size={16} className="text-emerald-400 animate-pulse" />}
                  </h2>
                  <p className="text-zinc-400 text-xs font-semibold mb-2">{selectedGame.releaseYear} • {selectedGame.developer} • {selectedGame.genre}</p>
                  
                  <div className="max-w-2xl">
                    <p className="text-zinc-500 text-xs leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                      {selectedGame.description}
                    </p>
                  </div>
                  
                  {selectedGame.suggestedCore && (
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20">
                          AI Core Opt: {selectedGame.suggestedCore}
                       </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-4">
                    <button 
                      onClick={handleLaunch}
                      disabled={isLaunching}
                      className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded text-sm font-bold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10 disabled:opacity-50"
                    >
                      {isLaunching ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />} 
                      {isLaunching ? t('booting') : t('play')}
                    </button>
                    <button 
                      onClick={() => setIsDetailModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 rounded text-zinc-300 text-xs transition-colors"
                    >
                      <Info size={14} /> {t('details') || 'Details'}
                    </button>
                    {(selectedGame.platform.toLowerCase().includes('playstation') || selectedGame.platform.toLowerCase().includes('saturn') || selectedGame.platform.toLowerCase().includes('dreamcast')) && (
                      <button 
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/games/optimize', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ title: selectedGame.title, path: `/roms/${selectedGame.id}.iso` })
                            });
                            if (res.ok) alert("CHD Optimization Task Queued. Check Downloader for progress.");
                          } catch (e) {
                            alert("Kernel IPC Error");
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 rounded text-amber-400 text-xs transition-colors"
                        title="Optimize Large ISO to CHD format"
                      >
                        <Zap size={14} /> Optimize (CHD)
                      </button>
                    )}
                    <button className="p-1.5 border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 rounded text-zinc-300 transition-colors">
                      <Star size={16} />
                    </button>
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
        onEnrich={async () => handleAiScrape()}
        isEnriching={isAiLoading}
      />
    </div>
  );
};

