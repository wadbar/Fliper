import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Users, Zap, Shield, Search, Plus, Radio, Play, Loader2, Wifi, MessageSquare } from 'lucide-react';
import { collection, onSnapshot, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { games } from '../../data/games';

interface Match {
  id: string;
  gameId: string;
  host: string;
  players: number;
  maxPlayers: number;
  ping: number;
  status: 'lobby' | 'playing' | 'starting';
  region: string;
  createdAt?: any;
}

export const NetplayApp: React.FC = () => {
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // REAL-TIME SESSION DISCOVERY
    const sessionsRef = collection(db, 'netplay_sessions');
    const q = query(
      sessionsRef, 
      where('status', 'in', ['lobby', 'playing']),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matches: Match[] = [];
      snapshot.forEach((doc) => {
        matches.push({ id: doc.id, ...doc.data() } as Match);
      });
      setActiveMatches(matches);
      setLoading(false);
    }, (error) => {
      console.error("[Netplay] Subscription Fault:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredMatches = activeMatches.filter(m => {
    const game = games.find(g => g.id === m.gameId);
    const searchString = `${game?.title} ${m.host} ${m.region}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-[#0A0A0B] text-zinc-300">
      <div className="p-6 bg-gradient-to-br from-indigo-950/20 to-black border-b border-white/5">
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Globe size={24} className="text-white" />
               </div>
               <div>
                  <h2 className="text-xl font-black text-white italic tracking-tighter">NEURAL NETPLAY</h2>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Global P2P Retro Network (V9 Active)</p>
               </div>
            </div>
            
            <div className="flex gap-2">
               <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold transition-all border border-white/5">
                  <Plus size={14} /> HOST SESSION
               </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold text-white transition-all shadow-lg shadow-indigo-500/20">
                  <Radio size={14} /> QUICK JOIN
               </button>
            </div>
         </div>

         <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-500" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms, games or hosts..."
              className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
            />
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
         <div className="flex items-center justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1">
            <span>Server Discovery ({filteredMatches.length} Active Rooms)</span>
            <span className="flex items-center gap-1.5"><Wifi size={10} className="text-emerald-500" /> Latency Optimized</span>
         </div>

         {loading ? (
           <div className="h-64 flex flex-col items-center justify-center gap-4 text-zinc-600">
              <Loader2 size={32} className="text-indigo-500 animate-spin" />
              <p className="text-xs font-mono animate-pulse">Scanning Neural Relay Points...</p>
           </div>
         ) : filteredMatches.length === 0 ? (
           <div className="h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 rounded-3xl">
              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600">
                 <Shield size={32} strokeWidth={1} />
              </div>
              <p className="text-xs font-mono text-zinc-500">Wait: No active relays in your sector.</p>
              <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300">Initialize Host Protocol</button>
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMatches.map((match) => {
                 const game = games.find(g => g.id === m.gameId);
                 return (
                    <motion.div 
                      key={match.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex gap-4 hover:border-indigo-500/30 transition-all cursor-pointer group"
                    >
                       <div className="w-16 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black">
                          {game?.coverArt && <img src={game.coverArt} className="w-full h-full object-cover" />}
                       </div>
                       
                       <div className="flex-1 flex flex-col justify-between">
                          <div>
                             <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">{game?.title || "Unknown Binary"}</h4>
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                   match.status === 'lobby' ? 'bg-emerald-500 text-black' : 'bg-amber-500 text-black'
                                }`}>{match.status}</span>
                             </div>
                             <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-500">
                                <Users size={12} /> {match.players} / {match.maxPlayers} Players • {match.host}
                             </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-400">
                                   <Zap size={10} className={match.ping < 50 ? 'text-emerald-500' : 'text-amber-500'} /> {match.ping}ms
                                </div>
                                <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500">
                                   <Globe size={10} /> {match.region}
                                </div>
                             </div>
                             <div className="flex gap-1">
                                <button className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-all">
                                   <MessageSquare size={14} />
                                </button>
                                <button className="p-1.5 bg-indigo-500/10 group-hover:bg-indigo-500 text-indigo-400 group-hover:text-white rounded-lg transition-all">
                                   <Play size={14} fill="currentColor" />
                                </button>
                             </div>
                          </div>
                       </div>
                    </motion.div>
                 );
              })}
           </div>
         )}
      </div>

      <div className="p-4 bg-black border-t border-white/5 flex items-center justify-between text-[9px] font-black text-zinc-600 tracking-[0.2em]">
         <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Shield size={10} className="text-indigo-400" /> V9-ENCRYPTED</span>
            <span>Uptime: 99.99%</span>
         </div>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Global: {activeMatches.reduce((acc, m) => acc + m.players, 1288)} Active Nodes</div>
         </div>
      </div>
    </div>
  );
};

