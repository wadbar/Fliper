import os
import subprocess

def launch_game(rom_path, system, mode="ULTRA"):
    # Caminhos baseados no seu setup Debian/WSL2
    emu_config = {
        "MAME": {
            "ULTRA": "mame -video bgfx -hlsl_enable 1",
            "LITE": "mame -video ddraw -nosound -frameskip 2" # Foco em PC antigo
        },
        "ARCADE_JP": {
            "ULTRA": "teknoparrot_loader.exe --profile", # Requer RTX 5060
            "LITE": "fba_lite.exe" # FinalBurn Alpha para leveza
        },
        "NAOMI": {
            "ULTRA": "retroarch -L flycast_libretro.so",
            "LITE": "retroarch -L flycast_libretro.so" 
        },
        "NEOGEO": {
            "ULTRA": "mame neogeo",
            "LITE": "fba_lite.exe"
        }
    }

    # Default fallback
    if system not in emu_config:
        system = "MAME"

    cmd = f"{emu_config[system][mode]} {rom_path}"
    print(f"[Core Bridge] Launching {system} in {mode} mode: {cmd}")
    
    # Se estiver no modo Cocktail, mata o explorer antes
    if os.getenv("FLIPER_MODE") == "ARCADE":
        print("[Core Bridge] Arcade Mode detected. Killing Explorer...")
        # subprocess.run(["taskkill", "/f", "/im", "explorer.exe"]) # Disabled for safety during dev
    
    # subprocess.Popen(cmd, shell=True)
    return cmd

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 3:
        launch_game(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print("Usage: python core_bridge.py <rom_path> <system> <mode>")
