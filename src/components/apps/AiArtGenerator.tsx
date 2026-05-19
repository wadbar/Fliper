import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Image as ImageIcon, RefreshCw, Wand2, Check, X, Loader2 } from 'lucide-react';

interface AiArtGeneratorProps {
  gameTitle: string;
  genre: string;
  platform: string;
  onImageGenerated: (url: string) => void;
  className?: string;
}

export const AiArtGenerator: React.FC<AiArtGeneratorProps> = ({ gameTitle, genre, platform, onImageGenerated, className }) => {
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [style, setStyle] = useState('modern cinematic');

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const generateAIPrompt = useCallback(async () => {
    setIsGeneratingPrompt(true);
    setError(null);
    try {
      const systemInstruction = `You are a professional concept artist and prompt engineer for high-end video game box art. 
      Generate a detailed, evocative prompt for the game cover of "${gameTitle}". 
      Genre: ${genre}. Platform: ${platform}. 
      The style should be "${style}". 
      Important: Your response must be ONLY the prompt itself, optimized for high-quality image generation models like Stable Diffusion or Flux. 
      Do not include "Prompt:", "Style:", or quotes.`;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a game box art prompt for "${gameTitle}" (${genre}).`,
          systemInstruction,
          temperature: 0.9
        })
      });

      const result = await response.json();
      if (!isMountedRef.current) return;

      if (result.success) {
        setPrompt(result.content as string);
      } else {
         throw new Error(result.error || "Failed to reach neural core");
      }
    } catch (err: any) {
      if (isMountedRef.current) setError(err.message || "Prompt generation failed");
    } finally {
      if (isMountedRef.current) setIsGeneratingPrompt(false);
    }
  }, [gameTitle, genre, platform, style]);

  const generateArt = useCallback(async () => {
    if (!prompt) return;
    setIsGeneratingImage(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          width: 600,
          height: 800
        })
      });

      const result = await response.json();
      if (!isMountedRef.current) return;

      if (result.success && result.url) {
        setPreviewUrl(result.url);
      } else {
        throw new Error(result.error || "Visualization node collapse");
      }
    } catch (err: any) {
      if (isMountedRef.current) setError(err.message || "Image generation failed");
    } finally {
      if (isMountedRef.current) setIsGeneratingImage(false);
    }
  }, [prompt]);

  const confirmArt = () => {
    if (previewUrl) {
      onImageGenerated(previewUrl);
      setPreviewUrl(null);
      setPrompt('');
    }
  };

  return (
    <div className={`space-y-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            <h4 className="text-[11px] font-black uppercase tracking-widest text-white italic">AI Illustrator Core</h4>
         </div>
         <div className="flex gap-2">
            {['classic', 'modern cinematic', 'retro pixel', 'dark fantasy'].map(s => (
               <button 
                 key={s}
                 onClick={() => setStyle(s)}
                 className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold transition-all ${style === s ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
               >
                 {s}
               </button>
            ))}
         </div>
      </div>

      {!prompt && !previewUrl && (
        <button
          onClick={generateAIPrompt}
          disabled={isGeneratingPrompt}
          className="w-full flex items-center justify-center gap-3 py-6 border-2 border-dashed border-zinc-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-xl transition-all group"
        >
          {isGeneratingPrompt ? (
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          ) : (
            <>
              <Wand2 size={24} className="text-zinc-600 group-hover:text-indigo-400 group-hover:rotate-12 transition-all" />
              <div className="text-left">
                <p className="text-sm font-black text-white uppercase italic">Initialize Neural Vision</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Generate prompt from game metadata</p>
              </div>
            </>
          )}
        </button>
      )}

      {prompt && !previewUrl && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="relative group">
            <div className="absolute top-2 right-2 flex gap-1">
               <button 
                 onClick={() => setPrompt('')}
                 className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-md"
               >
                 <RefreshCw size={14} />
               </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Refine the visual seeds..."
              className="w-full bg-[#0C0C0E] border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 font-mono min-h-[100px] focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>

          <button
            onClick={generateArt}
            disabled={isGeneratingImage || !prompt}
            className="w-full h-12 flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
          >
            {isGeneratingImage ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <ImageIcon size={18} /> Visualize Now
              </>
            )}
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {previewUrl && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 group shadow-2xl">
               <img src={previewUrl} alt="AI Generated" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setPreviewUrl(null)}
                    className="w-12 h-12 rounded-full bg-zinc-800/80 hover:bg-red-500 flex items-center justify-center text-white backdrop-blur-md transition-all"
                  >
                    <X size={20} />
                  </button>
                  <button 
                    onClick={confirmArt}
                    className="w-12 h-12 rounded-full bg-emerald-500/80 hover:bg-emerald-500 flex items-center justify-center text-white backdrop-blur-md transition-all"
                  >
                    <Check size={20} />
                  </button>
               </div>
               
               {isGeneratingImage && (
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                 </div>
               )}
            </div>

            <div className="flex gap-2">
               <button 
                 onClick={generateArt}
                 disabled={isGeneratingImage}
                 className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-10 rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50"
               >
                 <RefreshCw size={14} className={isGeneratingImage ? 'animate-spin' : ''} /> Regenerate
               </button>
               <button 
                 onClick={confirmArt}
                 className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white h-10 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20"
               >
                 <Check size={14} /> Accept Art
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
           <X size={14} />
           <p className="text-[10px] font-bold uppercase tracking-tight">{error}</p>
        </div>
      )}
    </div>
  );
};
