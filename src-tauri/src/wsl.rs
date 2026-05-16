/**
 * Fliper - WSL2 Orchestration & Path Mapping
 * Language: Rust (Tauri Backend)
 */

use std::process::{Command, Stdio};
use std::path::{Path, PathBuf};

/// Converte um caminho Windows para o formato WSL (Mapeamento Automático).
/// Ex: C:\Roms\SNES\game.smc -> /mnt/c/Roms/SNES/game.smc
pub fn translate_to_wsl_path(win_path: &str) -> String {
    let path = Path::new(win_path);
    let mut wsl_path = String::from("/mnt/");
    
    let w_str = path.to_string_lossy().replace('\\', "/");
    
    if w_str.len() > 2 && &w_str[1..2] == ":" {
        let drive_letter = w_str[0..1].to_lowercase();
        wsl_path.push_str(&drive_letter);
        wsl_path.push_str(&w_str[2..]);
    } else {
        return w_str; 
    }
    
    wsl_path
}

/// Bidirecionalidade do Path Mapper:
/// Retorna arquivos de save/linux para o ecosistema Windows
pub fn translate_to_win_path(wsl_path: &str) -> String {
    // /mnt/c/Saves/game.srm -> C:\Saves\game.srm
    if wsl_path.starts_with("/mnt/") {
        let chars: Vec<char> = wsl_path.chars().collect();
        if chars.len() > 5 {
            let drive_letter = chars[5].to_ascii_uppercase();
            let mut win_path = format!("{}:\\", drive_letter);
            let rest = &wsl_path[7..].replace("/", "\\");
            win_path.push_str(rest);
            return win_path;
        }
    }
    wsl_path.to_string()
}

/// Lança o emulador via WSL2, aguardando execução (bloqueando a thread para manter foco).
#[tauri::command]
pub async fn launch_game_wsl(emulator_cmd: &str, rom_path: &str, core_path: Option<&str>) -> Result<(), String> {
    let wsl_rom_path = translate_to_wsl_path(rom_path);
    
    let mut args = vec!["--exec", emulator_cmd];
    
    if let Some(core) = core_path {
        args.push("-L");
        args.push(core);
    }
    
    args.push(&wsl_rom_path);

    println!("Executando no WSL: wsl.exe {}", args.join(" "));

    // Usa std::process::Command para aguardar o fim da execução do WSLg
    let mut child = Command::new("wsl.exe")
        .args(&args)
        // Redirecionamento pode ser necessário dependendo do RetroArch/Emulador no Linux
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("Falha ao iniciar processo WSL: {}", e))?;

    // Bloqueia até que o emulador seja fechado pelo usuário.
    // Assim que fechar, o backend retorna ao frontend, que recupera o foco.
    let status = child.wait().map_err(|e| format!("Erro ao aguardar processo: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Emulador finalizou com erro: {:?}", status.code()))
    }
}

/// Dynamic Java multi-version switcher for WSL2 based on game version (ex: Minecraft)
pub fn switch_java_version(version: &str) -> String {
    let jdk_path = match version {
        "1.16" | "1.8" => "/usr/lib/jvm/java-8-openjdk-amd64/bin/java",
        "1.17" | "1.18" => "/usr/lib/jvm/java-17-openjdk-amd64/bin/java",
        "1.21.1" | "1.21" | "latest" => "/usr/lib/jvm/java-21-openjdk-amd64/bin/java",
        _ => "/usr/lib/jvm/java-21-openjdk-amd64/bin/java"
    };
    
    println!("[WSL2] Switched Java to {}", jdk_path);
    jdk_path.to_string()
}
