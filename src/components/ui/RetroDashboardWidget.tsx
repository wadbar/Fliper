import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Activity, Award, Loader2, Sparkles, RefreshCw } from 'lucide-react';

interface RetroUserSummary {
  TotalPoints: number;
  AchievementCount?: number;
  Awards?: number;
  Rank?: string;
  User?: string;
  Status?: string;
  RecentAchievements?: Array<{
    ID: string;
    Title: string;
    Description: string;
    Points: string;
    BadgeName: string;
    DateEarned: string;
    GameTitle: string;
    GameIcon: string;
  }>;
}

export const RetroDashboardWidget: React.FC = () => {
  const [data, setData] = useState<RetroUserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/retro/user');
      if (!response.ok) throw new Error('Kernel link failed');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Telemetry Offline');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (error && !data) {
    return (
      <div className="p-6 bg-m3-surface border border-m3-error/20 rounded-[24px] flex flex-col items-center justify-center gap-3">
        <Activity size={24} className="text-m3-error" />
        <p className="text-xs font-black text-m3-error uppercase tracking-widest">{error}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-m3-surface-variant/40 rounded-full text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest hover:bg-m3-surface-variant transition-all"
        >
          Retry Link
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Background Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-m3-primary/20 to-m3-tertiary/20 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-m3-surface/80 backdrop-blur-xl border border-m3-outline/10 rounded-[28px] overflow-hidden shadow-2xl"
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-m3-primary" />
                <h3 className="text-xs font-black text-m3-outline uppercase tracking-[0.2em]">Neural Profile</h3>
              </div>
              <p className="text-lg font-black text-white tracking-tight">
                {data?.User || 'Syncing Metadata...'}
              </p>
            </div>
            <button 
              onClick={fetchData}
              disabled={loading}
              className={`p-2 rounded-full bg-m3-surface-variant/30 text-m3-outline hover:text-white transition-all ${loading ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 flex flex-col items-center gap-4"
              >
                <Loader2 size={32} className="text-m3-primary animate-spin" />
                <span className="text-[10px] font-black text-m3-outline uppercase tracking-widest animate-pulse">Consulting Core Database...</span>
              </motion.div>
            ) : (
              <motion.div 
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-m3-primary-container/20 border border-m3-primary/10 rounded-[20px] flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-m3-primary">
                      <Star size={12} fill="currentColor" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Total Points</span>
                    </div>
                    <span className="text-xl font-black text-white">
                      {data?.TotalPoints?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="p-4 bg-m3-secondary-container/20 border border-m3-secondary/10 rounded-[20px] flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-m3-secondary">
                      <Award size={12} fill="currentColor" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Achievements</span>
                    </div>
                    <span className="text-xl font-black text-white">
                      {data?.AchievementCount || '0'}
                    </span>
                  </div>
                </div>

                {/* Recent Badges */}
                {data?.RecentAchievements && Object.keys(data.RecentAchievements).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-m3-outline uppercase tracking-[0.2em] flex items-center gap-2">
                        <Sparkles size={12} className="text-amber-400" /> Recent Extractions
                      </h4>
                      <span className="text-[9px] font-bold text-m3-primary uppercase">v6.8.zen1</span>
                    </div>
                    
                    <div className="space-y-2">
                      {Object.values(data.RecentAchievements).slice(0, 3).map((ach: any) => (
                        <div 
                          key={ach.ID} 
                          className="flex items-center gap-3 p-3 bg-m3-surface-variant/20 rounded-[16px] border border-m3-outline/5 hover:bg-m3-surface-variant/30 transition-all cursor-pointer group/item"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-m3-surface-variant shrink-0 border border-m3-outline/10 group-hover/item:scale-105 transition-transform">
                            <img 
                              src={`https://media.retroachievements.org/Badge/${ach.BadgeName}.png`}
                              alt={ach.Title} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">{ach.Title}</p>
                            <p className="text-[9px] font-black text-m3-outline uppercase tracking-tight truncate">{ach.GameTitle}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-emerald-400">+{ach.Points}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-m3-surface-variant/10 border-t border-m3-outline/5 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-m3-outline uppercase tracking-[0.1em]">Kernel Link Secure</span>
           </div>
           <span className="text-[9px] font-mono text-m3-outline opacity-50">Node: {data?.Status || 'ACTIVE'}</span>
        </div>
      </motion.div>
    </div>
  );
};
