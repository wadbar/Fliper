import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const TerminalApp: React.FC = () => {
  const { t } = useLanguage();
  const [output, setOutput] = useState<string[]>([
    "FliperOS v1.0.0 (Arch Linux Base - Kernel 6.8.zen1-1-zen x86_64)",
    "Display Server: Gamescope (Wayland) - Kiosk Mode",
    "Type 'help' for a list of built-in commands.",
    ""
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const activeEventSources = useRef<EventSource[]>([]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  useEffect(() => {
    return () => {
      activeEventSources.current.forEach(es => es.close());
    };
  }, []);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();
    setOutput(prev => [...prev, `arcade@fliperos:~$ ${cmd}`]);
    setInput('');

    if (cmd === 'clear') {
      setOutput([]);
      return;
    }

    if (cmd === 'help') {
      setOutput(prev => [...prev, 
        "Commands:",
        `  help      - ${t('term_help')}`,
        `  clear     - ${t('term_clear')}`,
        `  neofetch  - ${t('term_neofetch')}`,
        `  ls        - ${t('term_ls')}`,
        `  scan      - ${t('term_scan')}`,
        `  tail      - Stream system logs in real-time`,
        `  build-iso - ${t('term_build')}`,
        `  wsl-check - Check Windows Subsystem for Linux 2 Integration`
      ]);
      return;
    }

    if (cmd === 'wsl-check') {
        setOutput(prev => [...prev, 
            "[ OK ] Checking WSL2 Environment...",
            "[ OK ] Microsoft-Standard WSL2 Kernel detected.",
            "[ OK ] WSLg (Wayland for Windows) is active.",
            "[ OK ] /mnt/c/ mapping found. LaunchBox host bridging is available.",
            "System is fully optimized to run FliperOS natively on Windows via WSL2."
        ]);
        return;
    }

    if (cmd === 'build-iso') {
        setOutput(prev => [...prev, 
            "[ OK ] Initiating Archiso build process (Rolling Release)...",
            "[ OK ] Compiling FliperOS-Shell (React/Vite Engine)...",
            "[ OK ] Optimized for Vulkan API / Wayland Compositor.",
            "[ OK ] Injecting Nitro-Boost Kernel patches...",
            "[ OK ] Packing squashfs image with Gamescope & Cage...",
            "SUCCESS: FliperOS v1.0 ISO ready for flashing.",
            "Flash to USB for dedicated cabinet/handheld experience."
        ]);
        return;
    }

    if (cmd === 'tail') {
        setOutput(prev => [...prev, "Streaming logs... Press Ctrl+C would stop (unimplemented), for now it streams 20 logs."]);
        const eventSource = new EventSource('/api/system/logs/stream');
        activeEventSources.current.push(eventSource);
        let count = 0;
        eventSource.onmessage = (event) => {
            const log = JSON.parse(event.data);
            setOutput(prev => [...prev, `[LOG] ${log.level}: ${log.message}`]);
            count++;
            if (count > 20) eventSource.close();
        };
        return;
    }

    if (cmd === 'neofetch') {
      setOutput(prev => [...prev, 
        "                   -`             arcade@fliperos",
        "                  .o+`            -------",
        "                 `ooo/            OS: FliperOS 1.0 (Arch Linux x86_64)",
        "                `+oooo:           Host: AI Studio Custom Arcade Build",
        "               `+oooooo:          Kernel: 6.8.zen1-1-zen",
        "               -+oooooo+:         Uptime: 2 hours, 14 mins",
        "             `/:-:++oooo+:        Packages: 843 (pacman)",
        "            `/++++/+++++++:       Shell: bash 5.2.26",
        "           `/++++++++++++++:      DE: Web Desktop (Kiosk)",
        "          `/+++ooooooooooooo/`    WM: Gamescope (Wayland)",
        "         ./ooosssso++osssssso+`   CPU: Intel Core i9-14900K (32) @ 6.0GHz",
        "        .oossssso-````/ossssss+`  GPU: NVIDIA GeForce RTX 5060",
        "       -osssssso.      :ssssssso. Memory: 12480MiB / 65536MiB",
        "      :osssssss/        osssso+++.",
        "     /ossssssss/        +ssssooo/-",
        "   `/ossssso+/:-        -:/+osssso+-",
        "  `+sso+:-`                 `.-/+oso:",
        " `++:.                           `-/+/",
        " .`                                 `/"
      ]);
      return;
    }

    if (cmd === 'ls') {
        setOutput(prev => [...prev, 
          ".               .emulationstation   roms",
          "..              media               scripts",
          ".config         LaunchBox           downloads"
        ]);
        return;
    }

    if (cmd === 'scan') {
        setOutput(prev => [...prev, "Scanning /home/arcade/roms..."]);
        try {
            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lbPath: 'C:\\LaunchBox' })
            });
            const data = await res.json();
            setOutput(prev => [...prev, `Scan complete. Found resources.`]);
        } catch(err) {
            setOutput(prev => [...prev, "Error scanning: connection failed."]);
        }
        return;
    }

    setOutput(prev => [...prev, `bash: ${cmd}: command not found`]);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] font-mono text-xs text-zinc-300 p-2 overflow-hidden">
      <div className="flex-1 overflow-y-auto whitespace-pre-wrap">
        {output.map((line, i) => (
          <div key={i} className="min-h-[1.2em]">{line}</div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleCommand} className="flex mt-2">
        <span className="text-emerald-400 mr-2">arcade@fliperos:~$</span>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none text-zinc-300 focus:ring-0 select-text"
          autoFocus
          spellCheck={false}
        />
      </form>
    </div>
  );
};
