import React, { useState } from 'react';
import { Book, Cpu, Smartphone, Monitor, Zap, Terminal, Shield, HardDrive, Info, Share2, Download, ExternalLink, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GuideSection {
    id: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    tags: string[];
    content: React.ReactNode;
}

export const WikiApp: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string>('top-pc');

    const sections: GuideSection[] = [
        {
            id: 'top-pc',
            title: 'Modern High-End PC',
            icon: <Zap size={18} />,
            color: 'text-indigo-400',
            tags: ['RTX/Vulkan', 'NVMe', 'DDR5'],
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        Optimized for modern hardware with discrete GPUs and multi-core processors. Focuses on maximum visual fidelity and lowest possible input lag.
                    </p>
                    <div className="grid gap-4">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Terminal size={12} /> Installation Strategy
                            </h5>
                            <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4">
                                <li>Use the <span className="text-white font-bold">x86_64 Nitro ISO</span> for native performance.</li>
                                <li>Enable <span className="text-white font-bold">Resizable BAR (Re-Size BAR)</span> in BIOS.</li>
                                <li>Install on NVMe Gen4/5 for zero-load times in massive ROM sets.</li>
                                <li>Drivers: FliperOS automatically detects NVIDIA or AMD and injects the <span className="text-indigo-300">ZEN-optimized blobs</span>.</li>
                            </ul>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                            <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Monitor size={12} /> Windows/Steam Gaming (Proton)
                            </h5>
                            <p className="text-xs text-zinc-400 mb-2">
                                For high-end gaming, use the following Proton overrides in `fliper.conf`:
                            </p>
                            <code className="block bg-black p-3 rounded font-mono text-[10px] text-zinc-500 border border-zinc-800">
                                PROTON_NO_ESYNC=0<br />
                                PROTON_USE_FSYNC=1<br />
                                DXVK_ASYNC=1<br />
                                __GL_SHADER_DISK_CACHE_SKIP_CLEANUP=1
                            </code>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'old-pc',
            title: 'Prehistoric PC (Legacy)',
            icon: <Cpu size={18} />,
            color: 'text-amber-400',
            tags: ['i686', '2GB RAM', 'BIOS'],
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        For hardware older than 15 years (Pentium 4, Core 2 Duo, ancient Atoms). The goal is to maximize performance by removing all "eye-candy".
                    </p>
                    <div className="grid gap-4">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                            <h5 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Terminal size={12} /> The "Lite" Strategy
                            </h5>
                            <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4">
                                <li>Use the <span className="text-white font-bold">i686 (32-bit) Legacy ISO</span>.</li>
                                <li>Boot in <span className="text-white font-bold">KMS TTY Mode</span> (No Wayland/X11). Native RetroArch can run directly on the Linux Framebuffer.</li>
                                <li>Create a Large <span className="text-white font-bold">Swap Partition</span> (minimum 4GB) to avoid OOM (Out Of Memory) crashes.</li>
                                <li>Sound: Use <span className="text-amber-300">ALSA native</span> instead of Pipewire/PulseAudio to save CPU cycles.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'phone',
            title: 'Old Mobile Phone',
            icon: <Smartphone size={18} />,
            color: 'text-emerald-400',
            tags: ['ARM', 'Waydroid', 'Touch'],
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        Repurposing old Android devices as dedicated arcade monitors or portable consoles.
                    </p>
                    <div className="grid gap-4">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                            <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Terminal size={12} /> Bridge Mode
                            </h5>
                            <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4">
                                <li>If the bootloader is locked, use <span className="text-white font-bold">FliperOS APK Bridge</span> - it runs as a high-priority service inside Android.</li>
                                <li>If unlocked, flash the <span className="text-white font-bold">ARM64 Kernel Wrapper</span>. This replaces the Android stack with FliperOS Base.</li>
                                <li>Use <span className="text-emerald-300">Waydroid Integration</span> to run legacy APKs alongside native Linux emulators.</li>
                                <li>Recommendation: Disable Android "Battery Optimization" to prevent CPU throttling.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'embedded',
            title: 'Embedded / Raspberry Pi',
            icon: <HardDrive size={18} />,
            color: 'text-rose-400',
            tags: ['SD Card', 'GPIO', 'Overclock'],
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        For Raspberri Pi 4/5, Orange Pi, and similar SBCs (Single Board Computers).
                    </p>
                    <div className="grid gap-4">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                            <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Terminal size={12} /> Micro-Kernel Setup
                            </h5>
                            <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4">
                                <li>Flash using <span className="text-white font-bold">Etcher/Raspberry Pi Imager</span>.</li>
                                <li>Enable <span className="text-white font-bold">GPU Memory Overlay</span> (dtoverlay=vc4-kms-v3d) for full hardware acceleration.</li>
                                <li>GPIO: FliperOS maps arcade buttons directly to GPIO pins without an encoder. Config file: `/etc/fliper/gpio.json`.</li>
                                <li>Overclock: Pi 4 stable at 2.1GHz with active cooling. High-end emulators (GameCube/PS2) require this.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'proxmox',
            title: 'Proxmox / Virtualization',
            icon: <Share2 size={18} />,
            color: 'text-sky-400',
            tags: ['IOMMU', 'PCI Passthrough'],
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        Running FliperOS as a Virtual Machine for centralized gaming servers.
                    </p>
                    <div className="grid gap-4">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                            <h5 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Terminal size={12} /> High-Performance VM
                            </h5>
                            <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4">
                                <li>Hardware: Enable <span className="text-white font-bold">IOMMU (Intel VT-d / AMD-Vi)</span> in host BIOS.</li>
                                <li>GPU: You MUST use <span className="text-white font-bold">PCI Passthrough</span> for the graphics card. Virtualized drivers (VirtIO-GPU) do NOT support low-latency Vulkan.</li>
                                <li>CPU Type: Set to <span className="text-white font-bold">'host'</span> to expose all instructions (AES, AVX) to the guest.</li>
                                <li>Network: Use VirtIO-Net for lowest latency when using the Steam Link / Sunshine bridge.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'dualboot',
            title: 'Windows Dual-Boot',
            icon: <ExternalLink size={18} />,
            color: 'text-zinc-400',
            tags: ['GRUB', 'EFI', 'NTFS'],
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        Keeping your productivity OS alongside your gaming beast.
                    </p>
                    <div className="grid gap-4">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                            <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Terminal size={12} /> The Safe Path
                            </h5>
                            <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4">
                                <li>Shrink your Windows partition using "Disk Management" before booting FliperOS.</li>
                                <li>Install FliperOS on the <span className="text-white font-bold">Unallocated Space</span>.</li>
                                <li>FliperOS will automatically detect Windows and add it to the <span className="text-white font-bold">Grub Boot Menu</span>.</li>
                                <li>Pro-Tip: Use <span className="text-indigo-400 font-bold">Shared NTFS Mount</span> to access your existing ROM library directly from your Windows partition.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'frank',
            title: 'Frankenstein Hybrid',
            icon: <Box size={18} />,
            color: 'text-purple-400',
            tags: ['Modular', 'Cross-Arch', 'Custom'],
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        The ultimate "Build-Your-Own" experience. Combine components from different systems to create a monster that runs everything.
                    </p>
                    <div className="grid gap-4">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                            <h5 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Zap size={12} /> Modular Assembly
                            </h5>
                            <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4">
                                <li><span className="text-white font-bold">Binary Stitching:</span> Use Box64/86 to run x86 core-heavy games on powerful ARM boards.</li>
                                <li><span className="text-white font-bold">Filesystem Merging:</span> Mount remote NAS ROM folders as local VFS nodes for "infinite" storage.</li>
                                <li><span className="text-white font-bold">Network Kernel:</span> Offload heavy shader compilation to a high-end PC via the internal Nitro-Bus.</li>
                                <li><span className="text-purple-300 italic">"Functionality first, aesthetics next."</span> Focus on ensuring emulators run fluidly before activating high-end composition layers.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const activeGuide = sections.find(s => s.id === activeSection) || sections[0];

    return (
        <div className="h-full flex flex-col bg-[#0A0A0C] text-zinc-200">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Book className="text-indigo-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tighter">Installation Codex</h2>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Master Hardware Guides</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-500 text-[10px] font-black">
                        LATEST_V2.5
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 border-r border-zinc-800 p-4 space-y-2 bg-zinc-900/10 overflow-y-auto">
                    <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-2 mb-4">Choose Target Hardware</h3>
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                                activeSection === section.id
                                    ? 'bg-indigo-600/10 border border-indigo-500/40 text-white shadow-[0_0_15px_rgba(79,70,229,0.1)]'
                                    : 'hover:bg-zinc-800/40 border border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <div className={activeSection === section.id ? section.color : 'text-zinc-500'}>
                                {section.icon}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-bold truncate">{section.title}</p>
                                <div className="flex gap-1 mt-1">
                                    {section.tags.slice(0, 1).map(tag => (
                                        <span key={tag} className="text-[8px] opacity-50 uppercase">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </button>
                    ))}

                    <div className="mt-8 pt-8 border-t border-zinc-800/50 space-y-4">
                        <div className="px-2">
                            <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">Quick Resources</h4>
                            <div className="space-y-2">
                                <button className="w-full flex items-center gap-2 text-[10px] text-zinc-500 hover:text-indigo-400 transition-colors">
                                    <Download size={12} /> Download ISO Mirrors
                                </button>
                                <button className="w-full flex items-center gap-2 text-[10px] text-zinc-500 hover:text-indigo-400 transition-colors">
                                    <ExternalLink size={12} /> Community Wiki
                                </button>
                                <button className="w-full flex items-center gap-2 text-[10px] text-zinc-500 hover:text-indigo-400 transition-colors">
                                    <Share2 size={12} /> Export Current Config
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="mb-6 flex items-center gap-4">
                                <div className={`p-4 rounded-2xl bg-zinc-900 border border-zinc-800 ${activeGuide.color}`}>
                                    {activeGuide.icon}
                                </div>
                                <div>
                                    <div className="flex gap-2 mb-1">
                                        {activeGuide.tags.map(tag => (
                                            <span key={tag} className="px-1.5 py-0.5 bg-zinc-800 rounded text-[9px] font-mono text-zinc-500 uppercase">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                                        {activeGuide.title}
                                    </h1>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none">
                                {activeGuide.content}
                            </div>

                            {/* Info Box */}
                            <div className="mt-12 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-start gap-4">
                                <Info className="text-indigo-400 shrink-0" size={20} />
                                <div>
                                    <p className="text-xs font-bold text-white uppercase mb-1">Expert Advice</p>
                                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                                        FliperOS is a <span className="text-indigo-300">Non-Destructive Installation</span> by default. It will attempt to resize your existing partitions to create a safe space for the Kernel, but we always recommend a full backup before operating on a "Franken-PC".
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Shield size={16} className="text-emerald-500" /> Philosophical Protocol: 100% Linux
                                </h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-zinc-300">Freedom to Tinker</h4>
                                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                                            Everything you see is open. From the bootloader scripts to the Wayland compositor hooks. We believe gaming hardware should never be a "black box".
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-zinc-300">Privacy by Design</h4>
                                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                                            The Installation AI is a localized heuristic engine. It never phones home. Your hardware profile stays on your machine, always.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/10 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-4 text-zinc-500">
                    <span className="flex items-center gap-1"><Terminal size={12} /> SHA-256 Verified</span>
                    <span className="flex items-center gap-1"><Shield size={12} /> Secure Boot Compatible</span>
                </div>
                <div className="text-zinc-600 font-mono">
                    REF: GUID_INSTALL_FACTORY_V2
                </div>
            </div>
        </div>
    );
};
