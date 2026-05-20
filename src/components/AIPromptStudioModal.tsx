import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Copy, Type, Settings, Download, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AIPromptStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTheme?: string;
}

export const AIPromptStudioModal: React.FC<AIPromptStudioModalProps> = ({ isOpen, onClose, gameTheme = '' }) => {
  const { t } = useLanguage();
  const [theme, setTheme] = useState(gameTheme);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const generationTimeout = useRef<number | NodeJS.Timeout | null>(null);
  const copyTimeout = useRef<number | NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (generationTimeout.current) clearTimeout(generationTimeout.current as number);
      if (copyTimeout.current) clearTimeout(copyTimeout.current as number);
    };
  }, []);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/refine-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawPrompt: theme || 'sci-fi game cover', category: 'cover_art' })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedPrompt(data.refinedPrompt);
      } else {
        const base = `A photorealistic video game cover art featuring an epic protagonist in a hyper-detailed ${theme || 'sci-fi and cyberpunk'} setting. The main character is wearing intricate, battle-worn tactical armor with glowing LED accents. Cinematic lighting, dramatic neon blue and orange color grading, volumetric smoke, ray-traced reflections, 8k resolution, Unreal Engine 5 render style, cinematic composition, ultra-detailed textures, depth of field. A clean space reserved for the game title at the top, professional graphic design, masterpiece, 35mm lens, sharp focus. --ar 3:4`;
        setGeneratedPrompt(base + " (FALLBACK - API ERROR)");
      }
    } catch(err) {
      console.error(err);
      setGeneratedPrompt("Error connecting to NeuralCore.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    if (copyTimeout.current) clearTimeout(copyTimeout.current as number);
    copyTimeout.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-[#1A1A1D] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-900/40 to-transparent border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                <Sparkles size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">AI Prompt Studio</h2>
                <p className="text-sm text-zinc-400">Advanced Prompt Generation for Game Covers & Assets</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 flex-1">

            {/* Input Area */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Theme / Genre (e.g. "Dark Fantasy", "Racing")
              </label>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Describe your game's genre or theme..."
                  className="flex-1 bg-[#2A2A2D] border border-zinc-700 rounded-md px-4 py-3 text-sm text-zinc-200 outline-none focus:border-purple-500 shadow-inner"
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !theme}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? <Sparkles size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  Generate Prompt
                </button>
              </div>
            </div>

            {/* Result Area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  Professional Prompt Result
                </label>
                {generatedPrompt && (
                   <button onClick={handleCopy} className="text-xs flex items-center gap-1.5 text-purple-400 hover:text-purple-300">
                     <Copy size={14} />
                     {copied ? 'Copied!' : 'Copy to Clipboard'}
                   </button>
                )}
              </div>
              <div className={`p-4 rounded-xl border ${generatedPrompt ? 'border-purple-500/30 bg-purple-500/10' : 'border-zinc-800 bg-[#2A2A2D]'} min-h-[120px]`}>
                 {generatedPrompt ? (
                    <p className="text-sm text-zinc-300 leading-relaxed font-mono">
                      {generatedPrompt}
                    </p>
                 ) : (
                    <p className="text-sm text-zinc-500 italic flex items-center justify-center h-full">
                      Your highly optimized prompt will appear here...
                    </p>
                 )}
              </div>
            </div>

            <div className="bg-zinc-800/50 p-4 rounded-lg flex items-start gap-3">
               <ImageIcon className="text-zinc-400 shrink-0 mt-0.5" size={18} />
               <div>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-1">
                     <strong className="text-zinc-300">How to use:</strong> Copy the prompt above and paste it directly into an AI image generator (like Google Gemini, Midjourney, or DALL-E) to generate a high-quality, photorealistic game cover.
                  </p>
               </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
