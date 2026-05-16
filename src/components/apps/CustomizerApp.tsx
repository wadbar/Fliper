import React, { useState } from 'react';
import { Settings, Cpu, Package, HardDrive, Play, Shield, Terminal, Loader2, Save, Box, Layers, Smartphone, Radio, Trophy, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CustomizerApp: React.FC = () => {
    const [base, setBase] = useState<'arch' | 'debian' | 'alpine'>('arch');
    const [kernel, setKernel] = useState<'zen' | 'hardened' | 'lts' | 'realtime'>('zen');
    const [arch, setArch] = useState<'x86_64' | 'i686' | 'aarch64' | 'armhf'>('x86_64');
    const [profile, setProfile] = useState<'adaptive' | 'legacy_lite' | 'extreme_workstation'>('adaptive');
    const [desktop, setDesktop] = useState<'fliper-shell' | 'minimal' | 'plasma'>('fliper-shell');
    const [packages, setPackages] = useState<string>("retroarch, mesa, vulkan-intel, networkmanager, wine-staging, flatpak, appimage-run");
    const [extensions, setExtensions] = useState<string[]>([]);
    const [compatibilityLayers, setCompatibilityLayers] = useState<string[]>(['wine', 'appimage']);
    const [building, setBuilding] = useState(false);

    const toggleExtension = (ext: string) => {
        setExtensions(prev => 
            prev.includes(ext) ? prev.filter(e => e !== ext) : [...prev, ext]
        );
    };

    const toggleLayer = (layer: string) => {
        setCompatibilityLayers(prev => 
            prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
        );
    };
    const [aiProbing, setAiProbing] = useState(false);
    const [probeLogs, setProbeLogs] = useState<string[]>([]);
    const [isLiveMedia, setIsLiveMedia] = useState(true); // Default behavior in installation phase

    const runAiHardwareProbe = async () => {
        setAiProbing(true);
        setProbeLogs([]);
        const logs = [
            "Initializing FliperOS Kernel AI (Live Media Mode)...",
            "Checking boot source logic: Path identified as /dev/sdb1 (External USB)",
            "Executing 'lspci -nnk' via KernelProxy bridge...",
            "Detected GPU: [8086:9b41] Intel UHD Graphics 620 (Whiskey Lake)",
            "Detected CPU: Intel Core i7-8565U (8) @ 4.600GHz",
            "Hardware Class: ULTRABOOK_MOBILE_GEN8",
            "AI DECISION: Remote Brain unreachable? No problem. Using local heuristics...",
            "Applying Intel P-State scaling fix for extreme energy efficiency...",
            "COMPATIBILITY_ORACLE: Proton 9.0 (Experimental) + Proton-GE identified as primary runtimes.",
            "PROTON_TUNER: Injecting DXVK-Cache and Fsync patches for [Nitro] efficiency.",
            "Injected: Box64/Box86 wrapper for legacy x86 binary support on non-standard ISA (Phone/Pi).",
            "STEAM_INTEGRATION: Activating Steam-Native and pressure-vessel isolation.",
            "AI DECISION: Recommending 'BOOTLOADER_PROXIMITY' install.",
            "Reason: Strong CPU detected, but USB 2.0 bottleneck found in source.",
            "Optimizing: Compressing image before disk transfer to bypass bus bottleneck."
        ];

        for (const log of logs) {
            setProbeLogs(prev => [...prev, `[AI] ${log}`]);
            await new Promise(r => setTimeout(r, 600));
        }
        setProfile('adaptive');
        setBase('arch');
        setAiProbing(false);
    };

    const applyElitePreset = () => {
        setBase('arch');
        setKernel('zen');
        setArch('x86_64');
        setProfile('adaptive');
        setDesktop('fliper-shell');
        setPackages('mesa, vulkan-radeon, gamescope, steam-native, retroarch');
    };

    const applyUniversalPreset = () => {
        setBase('universal-hybrid');
        setKernel('adaptive-multikernel');
        setArch('multi-arch-wrap');
        setProfile('sovereign-universal');
        setDesktop('fluid-dynamic');
        setPackages('fliper-core, auto-probe, vulkan-dynamic, hybrid-accel');
    };

    const applyLegacyPreset = () => {
        setBase('alpine');
        setKernel('lts');
        setArch('i686');
        setProfile('legacy_lite');
        setDesktop('minimal');
        setPackages('retroarch-core-mame2003, alsa-lib, tinyxserver');
    };

    const startBuild = async () => {
        setBuilding(true);
        try {
            const recipe = {
                id: `fliper-${Date.now().toString(36)}`,
                base,
                kernel,
                arch,
                profile,
                desktop,
                packages: packages.split(',').map(p => p.trim()),
                optimizeFor: arch.startsWith('arm') ? 'mobile_phone' : 'desktop'
            };

            const res = await fetch('/api/distro/build', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recipe)
            });

            if (res.ok) {
                alert("Build protocol initiated. Monitor 'Downloader' for progress.");
            }
        } catch (e) {
            alert("BUILD_INIT_FAULT");
        } finally {
            setBuilding(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-zinc-300 font-mono text-[11px] overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                        <Cpu size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-100 uppercase tracking-tighter">Distro Factory v2.5</h3>
                        <p className="text-[10px] text-indigo-400 font-black">FRANKENSTEIN ARCHITECT MODE</p>
                    </div>
                </div>
                {isLiveMedia && (
                    <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-500 text-[9px] font-bold flex items-center gap-1">
                        <Radio size={8} className="animate-pulse" /> LIVE_INSTALL_MODE
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar pb-24">
                {/* 0. Core Foundations */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Play size={12} className="text-emerald-500" /> 00. Core Foundations (Mandatory)
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-emerald-500/50 uppercase">Active</span>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-white uppercase tracking-tighter">FliperOS Retro-Kernel</p>
                                <p className="text-[9px] text-emerald-500/60 font-mono tracking-tight">KMS/DRM + Libretro Runtime + Hardware Acceleration</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] text-zinc-600 uppercase font-bold">Priority</p>
                                <p className="text-[10px] text-zinc-400 font-black">CRITICAL</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 1. The Frankenstein Lab */}
                <section>
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Box size={12} className="text-orange-500" /> 01. Extension Lab (The Frankenstein Pack)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                            { id: 'proton', name: 'Steam Proton / GE', desc: 'Elite Windows Gaming', icon: <Layers size={14} />, color: 'text-indigo-400' },
                            { id: 'waydroid', name: 'Waydroid Android', desc: 'Native APK Runtime', icon: <Smartphone size={14} />, color: 'text-emerald-400' },
                            { id: 'stream', name: 'Stream Studio', desc: 'Direct KMS Encode', icon: <Radio size={14} />, color: 'text-rose-400' },
                            { id: 'box64', name: 'Box64 Hybrid', desc: 'x86 apps on ARM/Mobile', icon: <Cpu size={14} />, color: 'text-amber-400' },
                            { id: 'leader', name: 'Cloud Leaderboards', desc: 'Verified World Scores', icon: <Trophy size={14} />, color: 'text-sky-400' },
                            { id: 'flatpak', name: 'Universal Apps', desc: 'Flatpak/AppImage Hub', icon: <Package size={14} />, color: 'text-violet-400' },
                        ].map(ext => (
                            <button
                                key={ext.id}
                                onClick={() => toggleExtension(ext.id)}
                                className={`p-3 rounded-xl border text-left transition-all group ${
                                    extensions.includes(ext.id)
                                        ? 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-1">
                                    <div className={`${extensions.includes(ext.id) ? ext.color : 'text-zinc-500'}`}>
                                        {ext.icon}
                                    </div>
                                    <span className={`text-[10px] font-bold ${extensions.includes(ext.id) ? 'text-white' : 'text-zinc-400'}`}>
                                        {ext.name}
                                    </span>
                                </div>
                                <p className="text-[9px] text-zinc-500 leading-tight">{ext.desc}</p>
                            </button>
                        ))}
                    </div>
                </section>

                {/* 2. Hardware Oracle */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Shield size={12} className="text-blue-400" /> 02. Hardware Oracle & AI Probing
                        </h4>
                        <button 
                            onClick={runAiHardwareProbe}
                            disabled={aiProbing}
                            className="bg-indigo-600/20 border border-indigo-500/40 px-3 py-1 rounded text-[9px] font-black text-indigo-400 hover:bg-indigo-500/30 transition-all flex items-center gap-1.5"
                        >
                            {aiProbing ? <Loader2 size={10} className="animate-spin" /> : <Shield size={10} />}
                            {aiProbing ? 'PROBING...' : 'RUN AI PROBE'}
                        </button>
                    </div>

                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                        {probeLogs.length > 0 && (
                            <div className="mb-4 bg-black/60 border border-zinc-800 rounded-lg p-3 font-mono text-[9px] text-emerald-500/80 max-h-40 overflow-y-auto custom-scrollbar">
                               <AnimatePresence>
                                 {probeLogs.map((log, idx) => (
                                    <motion.div 
                                        key={idx}
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="mb-1"
                                    >
                                       <span className="text-zinc-600 mr-2">[{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}]</span>
                                       {log}
                                    </motion.div>
                                 ))}
                               </AnimatePresence>
                               {aiProbing && <div className="w-1 h-3 bg-emerald-500 animate-pulse inline-block ml-1" />}
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-zinc-500 uppercase pb-1 block">Architecture</label>
                                <select value={arch} onChange={e => setArch(e.target.value as any)} className="w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500">
                                    <option value="x86_64">x86_64 PC</option>
                                    <option value="aarch64">ARM64 (Pi/Mobile)</option>
                                    <option value="i686">Legacy i686</option>
                                    <option value="armhf">Legacy ARM</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-zinc-500 uppercase pb-1 block">Base System</label>
                                <select value={base} onChange={e => setBase(e.target.value as any)} className="w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500">
                                    <option value="arch">Arch Linux</option>
                                    <option value="debian">Debian Stable</option>
                                    <option value="alpine">Alpine (Minimal)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-zinc-500 uppercase pb-1 block">Performance</label>
                                <select value={profile} onChange={e => setProfile(e.target.value as any)} className="w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500">
                                    <option value="adaptive">AI Adaptive</option>
                                    <option value="legacy_lite">Ultra-Lite</option>
                                    <option value="extreme_workstation">Nitro Overdrive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. UX Shell */}
                <section>
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Settings size={12} /> 03. Shell & UX Layer
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                         {[
                            { id: 'fliper-shell', name: 'Fliper Shell', icon: <Terminal size={12} /> },
                            { id: 'minimal', name: 'Pure TTY', icon: <Terminal size={12} /> },
                            { id: 'plasma', name: 'KDE Plasma', icon: <Settings size={12} /> },
                            { id: 'fluid-dynamic', name: 'Dynamic', icon: <Activity size={12} /> }
                         ].map(gui => (
                            <button
                                key={gui.id}
                                onClick={() => setDesktop(gui.id as any)}
                                className={`p-2 rounded-lg border text-center transition-all ${
                                    desktop === gui.id
                                        ? 'bg-purple-500/10 border-purple-500/50 text-white'
                                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
                                }`}
                            >
                                <span className="text-[9px] font-bold block">{gui.name}</span>
                            </button>
                         ))}
                    </div>
                </section>

                {/* 4. Package Registry */}
                <section>
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Package size={12} /> 04. Kernel Package Injections
                    </h4>
                    <div className="bg-black/40 border border-zinc-800 rounded-xl p-3">
                        <textarea
                            value={packages}
                            onChange={(e) => setPackages(e.target.value)}
                            className="w-full bg-transparent border-none outline-none text-zinc-400 min-h-[50px] resize-none leading-relaxed text-[10px] font-mono"
                            placeholder="comma-separated packages..."
                        />
                    </div>
                </section>
            </div>

            {/* Build Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-xl flex items-center justify-between z-20">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[10px] text-zinc-200 font-bold uppercase tracking-tighter">Frankenstein Build Ready</span>
                    </div>
                    <p className="text-[9px] text-zinc-500 truncate max-w-[200px]">Base: {base} | Modules: {extensions.length + compatibilityLayers.length} | ISA: {arch}</p>
                </div>
                <button
                    onClick={startBuild}
                    disabled={building}
                    className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-[10px] uppercase rounded-full transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                >
                    {building ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    Assemble My Frank
                </button>
            </div>
        </div>
    );
};
