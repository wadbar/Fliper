/**
 * Fliper - Executor de Processos (Rust / Tauri)
 * Engine de Orquestração RTX 5060 + WSL2
 */
use std::process::Command;
use std::path::Path;

pub fn check_executable(exec_path: &str) -> bool {
    Path::new(exec_path).exists()
}

pub fn launch_game(path: String, _platform: String, mode: String) -> Result<(), String> {
    println!("[Launcher] Iniciando jogo {} no modo {}", path, mode);
    
    // Watchdog: Verifica se o WSL está acessível (simulado no Windows)
    if !check_executable("C:\\Windows\\System32\\wsl.exe") {
         println!("[Watchdog] AVISO: wsl.exe não encontrado! Certifique-se de estar em um ambiente Windows válido.");
    }

    let mut command = Command::new("wsl.exe");
    
    // Configuração de ambiente para Arcades Japoneses e MAME
    match mode.as_str() {
        "ULTRA" => {
            // Usa RTX 5060, BGFX Shaders e latência zero
            println!("[Launcher] Modo ULTRA selecionado. Usando bgfx shaders e RTX 5060.");
            command.args(&["-e", "mame", "-video", "bgfx", "-hlsl_enable", "1", &path]);
        },
        "LITE" => {
            // Otimização radical para PC antigo (sem som, frameskip alto)
            println!("[Launcher] Modo LITE selecionado. Foco em performance bruta (sem som/filtros).");
            command.args(&["-e", "mame", "-video", "gdi", "-nosound", "-frameskip", "2", &path]);
        },
        _ => return Err("Invalid Mode".to_string()),
    }

    match command.spawn() {
        Ok(_) => {
            println!("[Launcher] Processo WSL2 disparado com sucesso!");
            Ok(())
        },
        Err(e) => Err(e.to_string())
    }
}
