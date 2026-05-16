import React, { useState } from 'react';
import { Play, Square, Settings, Radio, Video, Mic, MonitorUp } from 'lucide-react';

export const StreamApp: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamQuality, setStreamQuality] = useState('1080p60');
  const [streamPlatform, setStreamPlatform] = useState('twitch');
  const [bitrate, setBitrate] = useState(0);

  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setBitrate(Math.floor(Math.random() * 500) + 5800);
      }, 1000);
      return () => clearInterval(interval);
    }
    setBitrate(0);
  }, [isStreaming]);

  return (
    <div className="h-full flex flex-col bg-[#111] text-zinc-300 font-sans p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className={isStreaming ? "text-red-500 animate-pulse" : "text-zinc-500"} />
            FliperCast Studio [OBS Bridge]
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Native Kernel-Level capture for Edge/WSL2</p>
        </div>
        <button
          onClick={() => setIsStreaming(!isStreaming)}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow-lg transition-all ${
            isStreaming
              ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500/50'
          }`}
        >
          {isStreaming ? (
            <>
              <Square size={16} /> END STREAM
            </>
          ) : (
            <>
              <Play size={16} /> GO LIVE
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1">
        {/* Preview Frame */}
        <div className="col-span-2 bg-black rounded-xl border border-zinc-800 relative overflow-hidden flex flex-col group">
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-mono border border-white/10 z-10 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-red-500 animate-pulse' : 'bg-zinc-500'}`} />
            Preview {isStreaming ? <span className="text-red-400 font-bold ml-1">LIVE · {bitrate} kbps</span> : ''}
          </div>
          
          <div className="flex-1 flex items-center justify-center text-zinc-700 bg-zinc-950">
            <div className="flex flex-col items-center">
              <Video size={48} className={`transition-all duration-1000 ${isStreaming ? 'text-indigo-500 opacity-50 scale-110' : 'opacity-20 translate-y-0'}`} />
              {!isStreaming && <span className="text-[10px] uppercase tracking-widest mt-4 font-black">Standby Mode</span>}
            </div>
            
            {isStreaming && (
              <div className="absolute right-4 top-4 bottom-4 w-48 bg-black/40 backdrop-blur-md border border-white/5 rounded-lg p-2 overflow-hidden flex flex-col pointer-events-none">
                 <div className="text-[8px] font-black text-zinc-500 mb-2 uppercase tracking-tighter">Live Chat Simulator</div>
                 <div className="space-y-2 flex-1">
                    <div className="text-[9px]"><span className="text-indigo-400 font-bold">RetroGamer:</span> Let's goooo! 🔥</div>
                    <div className="text-[9px]"><span className="text-amber-400 font-bold">Speedy:</span> Metal Slug logic is insane</div>
                    <div className="text-[9px]"><span className="text-zinc-400 font-bold">Bot_01:</span> Welcome to the stream!</div>
                 </div>
              </div>
            )}
          </div>

          {/* Minimal Audio Mixer */}
          <div className="h-16 border-t border-zinc-800 bg-zinc-900/50 flex flex-col justify-center px-4">
             <div className="text-[10px] font-mono text-zinc-400 mb-1 flex justify-between">
               <span>MASTER AUDIO</span><span>-12 dB</span>
             </div>
             <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 w-[60%] animate-pulse" />
             </div>
          </div>
        </div>

        {/* Controls Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-800/20 border border-zinc-800 rounded-lg p-4">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Settings size={14} className="text-indigo-400" /> Encoder Settings
            </h3>
            <div className="space-y-3">
              <div>
                 <label className="text-xs text-zinc-500 block mb-1">Platform</label>
                 <select 
                    value={streamPlatform}
                    onChange={(e) => setStreamPlatform(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded p-1.5 text-xs focus:border-indigo-500 outline-none"
                 >
                    <option value="twitch">Twitch.tv</option>
                    <option value="youtube">YouTube Live</option>
                    <option value="rtmp">Custom RTMP</option>
                 </select>
              </div>
              <div>
                 <label className="text-xs text-zinc-500 block mb-1">Quality Profile</label>
                 <select 
                    value={streamQuality}
                    onChange={(e) => setStreamQuality(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded p-1.5 text-xs focus:border-indigo-500 outline-none"
                 >
                    <option value="1080p60">1080p / 60 FPS (NVENC)</option>
                    <option value="720p60">720p / 60 FPS (Fast)</option>
                    <option value="4k60">4K / 60 FPS (Extreme)</option>
                 </select>
              </div>
            </div>
          </div>

          <div className="bg-zinc-800/20 border border-zinc-800 rounded-lg p-4 flex-1">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <MonitorUp size={14} className="text-indigo-400" /> Hardware Capture
            </h3>
            <div className="space-y-2">
               <div className="flex items-center justify-between p-2 bg-black/40 rounded border border-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <Video size={14} className="text-emerald-400" />
                    <span className="text-xs">X11 Display :0</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
               </div>
               <div className="flex items-center justify-between p-2 bg-black/40 rounded border border-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <Mic size={14} className="text-amber-400" />
                    <span className="text-xs">ALSA / PulseAudio</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
               </div>
            </div>
            
            <div className="mt-4 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded text-[10px] text-indigo-200">
               Direct KMS/DRM capture enabled for zero-latency framing.
            </div>

            <div className="mt-auto pt-4 flex flex-col gap-2">
               <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                  <span>GPU ENCODER (NVENC)</span>
                  <span className="text-emerald-500">22.4% LOAD</span>
               </div>
               <div className="h-1 bg-zinc-800 rounded-full">
                  <div className="h-full bg-emerald-500 w-[22%]" />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
