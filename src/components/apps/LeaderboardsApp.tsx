import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Target, Crown, Loader2, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

interface ScoreEntry {
  id: string;
  rank: number;
  name: string;
  score: string | number;
  scoreValue: number;
  gameId: string;
  game: string;
  verified: boolean;
  status: string;
}

export const LeaderboardsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'global' | 'friends'>('global');
  const [activeGame, setActiveGame] = useState('mslugx');
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<{ rank: number; score: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const scoresRef = collection(db, 'leaderboards');
      const q = query(
        scoresRef,
        where('gameId', '==', activeGame),
        orderBy('scoreValue', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedScores: ScoreEntry[] = [];
        let pRank = 1;

        snapshot.forEach((doc) => {
          const data = doc.data();
          const entry: ScoreEntry = {
            id: doc.id,
            rank: pRank++,
            name: data.playerName || 'Unknown',
            score: new Intl.NumberFormat('en-US').format(data.scoreValue || 0),
            scoreValue: data.scoreValue || 0,
            gameId: data.gameId || activeGame,
            game: data.gameTitle || 'Arcade Title',
            verified: data.verified || false,
            status: data.clientVersion || 'ARCADE_V3'
          };
          fetchedScores.push(entry);
        });

        setScores(fetchedScores);
        setLoading(false);

        // Compute local pseudo-rank for logged in user if applicable
        if (auth.currentUser) {
          const userEntryIndex = fetchedScores.findIndex(s => s.name === auth.currentUser?.displayName);
          if (userEntryIndex !== -1) {
            setUserRank({ rank: userEntryIndex + 1, score: fetchedScores[userEntryIndex].scoreValue });
          } else {
            setUserRank(null);
          }
        }
      }, (err) => {
        console.error("[Leaderboards Datalink Error]", err);
        setError("Failed to synchronize with neural global registry.");
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("[Leaderboards Init Fault]", err);
      setError("Initialization fault in data streams.");
      setLoading(false);
    }
  }, [activeGame, activeTab]);

  const selectGame = (gameId: string) => {
    setActiveGame(gameId);
  };

  const renderIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown size={16} className="text-yellow-400" />;
      case 2: return <Medal size={16} className="text-zinc-300" />;
      case 3: return <Medal size={16} className="text-amber-700" />;
      default: return <Star size={14} className="text-zinc-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#111] text-zinc-300 font-sans p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            Global Hall of Fame
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Cross-platform arcade high scores</p>
        </div>
        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
          <button 
            onClick={() => setActiveTab('global')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'global' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            Global
          </button>
          <button 
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'friends' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            Friends
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 flex-1">
        
        {/* Game Selection */}
        <div className="col-span-1 border-r border-zinc-800 pr-4 flex flex-col gap-2">
           <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Featured Games</h3>
           <div 
             onClick={() => selectGame('mslugx')}
             className={`p-3 border rounded-lg cursor-pointer transition-all ${activeGame === 'mslugx' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-transparent hover:bg-zinc-800 border-transparent'}`}
           >
              <div className={`text-sm font-bold ${activeGame === 'mslugx' ? 'text-indigo-400' : 'text-zinc-300'}`}>Metal Slug X</div>
              <div className="text-xs text-zinc-500">Neo-Geo / MAME</div>
           </div>
           <div 
             onClick={() => selectGame('sf3')}
             className={`p-3 border rounded-lg cursor-pointer transition-all ${activeGame === 'sf3' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-transparent hover:bg-zinc-800 border-transparent'}`}
           >
              <div className={`text-sm font-bold ${activeGame === 'sf3' ? 'text-indigo-400' : 'text-zinc-300'}`}>Street Fighter III</div>
              <div className="text-xs text-zinc-600">CPS-III</div>
           </div>
           <div 
             onClick={() => selectGame('caddinos')}
             className={`p-3 border rounded-lg cursor-pointer transition-all ${activeGame === 'caddinos' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-transparent hover:bg-zinc-800 border-transparent'}`}
           >
              <div className={`text-sm font-bold ${activeGame === 'caddinos' ? 'text-indigo-400' : 'text-zinc-300'}`}>Cadillacs and Dinosaurs</div>
              <div className="text-xs text-zinc-600">CPS-1</div>
           </div>
        </div>

        {/* High Score Table */}
        <div className="col-span-3 flex flex-col">
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center px-6 py-3 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase tracking-wider">
               <div className="w-16">Rank</div>
               <div className="flex-1">Player Identity</div>
               <div className="w-32 text-right">Score</div>
               <div className="w-24 text-right">Status</div>
            </div>
            
             <div className="flex-1 overflow-y-auto">
               {loading ? (
                   <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                      <Loader2 size={32} className="animate-spin text-indigo-500 mb-2" />
                      <p className="text-xs font-mono uppercase tracking-widest">Syncing Global Matrices...</p>
                   </div>
               ) : error ? (
                   <div className="flex flex-col items-center justify-center h-full text-rose-500/80">
                      <AlertCircle size={32} className="mb-2" />
                      <p className="text-xs font-mono uppercase tracking-widest">{error}</p>
                   </div>
               ) : scores.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full text-zinc-600 font-mono text-xs uppercase tracking-widest">
                      [ No records found for active title ]
                   </div>
               ) : (
                 scores.map((score) => (
                   <div key={score.id} className="flex items-center px-6 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-all group relative overflow-hidden">
                      {score.rank === 1 && (
                         <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent pointer-events-none" />
                      )}
                      <div className="w-16 font-mono text-zinc-500 group-hover:text-white flex items-center gap-2">
                         {renderIcon(score.rank)} #{score.rank}
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                         <span className="font-bold text-zinc-300 group-hover:text-white">{score.name}</span>
                         {score.verified && <div className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded border border-emerald-500/20 uppercase tracking-tighter">Verified Run</div>}
                      </div>
                      <div className="w-32 text-right font-mono text-indigo-400 font-bold">
                         {score.score}
                      </div>
                      <div className="w-24 flex justify-end">
                         <span className="px-2 py-1 rounded bg-zinc-800 text-[10px] text-zinc-500 uppercase font-bold">{score.status}</span>
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg border border-zinc-800">
             <div className="flex items-center gap-3">
               <Target className="text-emerald-500" />
               <div>
                  <div className="text-sm font-bold text-white">Your Rank: {userRank ? `#${userRank.rank}` : 'Unranked'}</div>
                  <div className="text-xs text-zinc-500">{userRank ? `Current Score: ${new Intl.NumberFormat('en-US').format(userRank.score)}` : 'Play a verified run to enter the global ladder'}</div>
               </div>
             </div>
             <button disabled={!auth.currentUser} className="px-4 py-2 bg-zinc-700 hover:bg-indigo-600 rounded text-sm font-bold text-white transition-all disabled:opacity-50 disabled:hover:bg-zinc-700 cursor-pointer disabled:cursor-not-allowed">
                Submit Run Replay
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};
