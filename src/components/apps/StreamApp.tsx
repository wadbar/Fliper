import React, { useState, useEffect } from 'react';
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
    <div className="h-full flex flex-col bg-m3-surface text-m3-on-surface font-sans p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-m3-on-surface">
            <Radio className={isStreaming ? "text-m3-error animate-pulse" : "text-m3-on-surface-variant"} />
            FliperCast Studio [OBS Bridge]
          </h2>
          <p className="text-xs text-m3-on-surface-variant mt-1">Native Kernel-Level capture for Edge/WSL2</p>
        </div>
        <button
          onClick={() => setIsStreaming(!isStreaming)}
          className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all ${
            isStreaming
              ? 'bg-m3-error text-m3-on-error hover:scale-105 active:scale-95 shadow-md border-none'
              : 'bg-m3-primary text-m3-on-primary hover:scale-105 active:scale-95 shadow-md border-none'
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

      <div className="grid grid-cols-3 gap-4 flex-1 h-full">
        {/* Preview Frame */}
        <div className="col-span-2 m3-card bg-m3-surface-variant/10 !p-0 relative overflow-hidden flex flex-col group justify-between">
          <div className="absolute top-4 left-4 bg-m3-surface/80 backdrop-blur px-2 py-1 rounded-lg text-xs font-mono border border-m3-outline/20 z-10 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-m3-error animate-pulse' : 'bg-m3-on-surface-variant/50'}`} />
            <span className="text-m3-on-surface">Preview</span> {isStreaming && <span className="text-m3-error font-bold ml-1">LIVE · {bitrate} kbps</span>}
          </div>
          
          <div className="flex-1 flex items-center justify-center relative w-full h-full">
            <div className="flex flex-col items-center">
              <Video size={48} className={`transition-all duration-1000 ${isStreaming ? 'text-m3-primary opacity-50 scale-110' : 'text-m3-on-surface-variant opacity-20 translate-y-0'}`} />
              {!isStreaming && <span className="text-[10px] text-m3-on-surface-variant uppercase tracking-widest mt-4 font-black">Standby Mode</span>}
            </div>
            
            {isStreaming && (
              <div className="absolute right-4 top-4 bottom-4 w-48 m3-card bg-m3-surface/80 !p-3 backdrop-blur-md pointer-events-none">
                 <div className="text-[8px] font-black text-m3-on-surface-variant mb-2 uppercase tracking-tighter">Live Chat Simulator</div>
                 <div className="space-y-2 flex-1">
                    <div className="text-[9px]"><span className="text-m3-primary font-bold">RetroGamer:</span> Let's goooo! 🔥</div>
                    <div className="text-[9px]"><span className="text-m3-secondary font-bold">Speedy:</span> Metal Slug logic is insane</div>
                    <div className="text-[9px]"><span className="text-m3-on-surface-variant font-bold">Bot_01:</span> Welcome to the stream!</div>
                 </div>
              </div>
            )}
          </div>

          {/* Minimal Audio Mixer */}
          <div className="h-16 border-t border-m3-outline/10 bg-m3-surface-variant/10 flex flex-col justify-center px-6">
             <div className="text-[10px] font-mono text-m3-on-surface-variant mb-2 flex justify-between">
               <span>MASTER AUDIO</span><span className="font-bold">-12 dB</span>
             </div>
             <div className="h-2 m3-card !p-0 !rounded-full bg-m3-surface overflow-hidden border-none shadow-inner">
               <div className={`h-full bg-m3-primary ${isStreaming ? 'w-[60%] animate-pulse' : 'w-[5%]'} transition-all duration-300`} />
             </div>
          </div>
        </div>

        {/* Controls Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="m3-card bg-m3-surface-variant/5">
            <h3 className="text-sm font-bold text-m3-on-surface mb-3 flex items-center gap-2">
              <Settings size={16} className="text-m3-primary" /> Encoder Settings
            </h3>
            <div className="space-y-3">
              <div>
                 <label className="text-xs text-m3-on-surface-variant block mb-1">Platform</label>
                 <select 
                    value={streamPlatform}
                    onChange={(e) => setStreamPlatform(e.target.value)}
                    className="m3-input w-full !py-2"
                 >
                    <option value="twitch">Twitch.tv</option>
                    <option value="youtube">YouTube Live</option>
                    <option value="rtmp">Custom RTMP</option>
                 </select>
              </div>
              <div>
                 <label className="text-xs text-m3-on-surface-variant block mb-1">Quality Profile</label>
                 <select 
                    value={streamQuality}
                    onChange={(e) => setStreamQuality(e.target.value)}
                    className="m3-input w-full !py-2"
                 >
                    <option value="1080p60">1080p / 60 FPS (NVENC)</option>
                    <option value="720p60">720p / 60 FPS (Fast)</option>
                    <option value="4k60">4K / 60 FPS (Extreme)</option>
                 </select>
              </div>
            </div>
          </div>

          <div className="m3-card bg-m3-surface-variant/5 flex-1">
            <h3 className="text-sm font-bold text-m3-on-surface mb-3 flex items-center gap-2">
              <MonitorUp size={16} className="text-m3-primary" /> Hardware Capture
            </h3>
            <div className="space-y-2">
               <div className="flex items-center justify-between p-3 m3-card !rounded-xl !bg-m3-surface !border-m3-outline/10">
                  <div className="flex items-center gap-2 text-m3-on-surface">
                    <Video size={14} className="text-m3-primary" />
                    <span className="text-xs font-bold">X11 Display :0</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
               </div>
               <div className="flex items-center justify-between p-3 m3-card !rounded-xl !bg-m3-surface !border-m3-outline/10">
                  <div className="flex items-center gap-2 text-m3-on-surface">
                    <Mic size={14} className="text-m3-primary" />
                    <span className="text-xs font-bold">ALSA / PulseAudio</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
               </div>
            </div>
            
            <div className="mt-4 p-3 bg-m3-primary-container text-m3-on-primary-container rounded-xl text-[10px] font-bold">
               Direct KMS/DRM capture enabled for zero-latency framing.
            </div>

            <div className="mt-auto pt-4 flex flex-col gap-2">
               <div className="flex justify-between text-[9px] text-m3-on-surface-variant font-mono font-bold">
                  <span>GPU ENCODER (NVENC)</span>
                  <span className="text-m3-primary">22.4% LOAD</span>
               </div>
               <div className="h-1.5 m3-card !p-0 !rounded-full bg-m3-surface border-none overflow-hidden">
                  <div className="h-full bg-m3-primary w-[22%]" />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
