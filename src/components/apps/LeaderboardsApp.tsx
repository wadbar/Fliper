import React, { useState } from 'react';
import { Trophy, Medal, Star, Target, Crown } from 'lucide-react';

export const LeaderboardsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'global' | 'friends'>('global');
  
  const mockScores = [
    { rank: 1, name: "OMNI_PLAYER", score: "9,999,990", game: "Metal Slug X", icon: <Crown size={16} className="text-yellow-400" /> },
    { rank: 2, name: "ARCADE_KING", score: "8,540,200", game: "Metal Slug X", icon: <Medal size={16} className="text-zinc-300" /> },
    { rank: 3, name: "speedrun_br", score: "7,120,400", game: "Metal Slug X", icon: <Medal size={16} className="text-amber-700" /> },
    { rank: 4, name: "CoinOp_Maniac", score: "5,444,300", game: "Metal Slug X", icon: <Star size={14} className="text-zinc-500" /> },
    { rank: 5, name: "RetroGamer88", score: "4,200,000", game: "Metal Slug X", icon: <Star size={14} className="text-zinc-500" /> },
  ];

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
           <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg cursor-pointer">
              <div className="text-sm font-bold text-indigo-400">Metal Slug X</div>
              <div className="text-xs text-zinc-500">Neo-Geo / MAME</div>
           </div>
           <div className="p-3 bg-transparent hover:bg-zinc-800 border border-transparent rounded-lg cursor-pointer transition-all">
              <div className="text-sm font-bold text-zinc-300">Street Fighter III</div>
              <div className="text-xs text-zinc-600">CPS-III</div>
           </div>
           <div className="p-3 bg-transparent hover:bg-zinc-800 border border-transparent rounded-lg cursor-pointer transition-all">
              <div className="text-sm font-bold text-zinc-300">Cadillacs and Dinosaurs</div>
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
               {mockScores.map((score) => (
                 <div key={score.rank} className="flex items-center px-6 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-all group relative overflow-hidden">
                    {score.rank === 1 && (
                       <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent pointer-events-none" />
                    )}
                    <div className="w-16 font-mono text-zinc-500 group-hover:text-white flex items-center gap-2">
                       {score.icon} #{score.rank}
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                       <span className="font-bold text-zinc-300 group-hover:text-white">{score.name}</span>
                       {score.rank <= 3 && <div className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded border border-emerald-500/20 uppercase tracking-tighter">Verified Run</div>}
                    </div>
                    <div className="w-32 text-right font-mono text-indigo-400 font-bold">
                       {score.score}
                    </div>
                    <div className="w-24 flex justify-end">
                       <span className="px-2 py-1 rounded bg-zinc-800 text-[10px] text-zinc-500 uppercase font-bold">ARCADE_V3</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg border border-zinc-800">
             <div className="flex items-center gap-3">
               <Target className="text-emerald-500" />
               <div>
                  <div className="text-sm font-bold text-white">Your Rank: #1,204</div>
                  <div className="text-xs text-zinc-500">Top 12% globally</div>
               </div>
             </div>
             <button className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm font-bold text-white transition-all">
                Submit Run Replay
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};
