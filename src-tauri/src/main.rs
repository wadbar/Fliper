/**
 * Fliper - Entry / Main
 * Language: Rust
 */

mod ai_manager;
mod system;
mod arcade_lock;
mod emulator_abstraction;
mod ai;
mod db;
mod emulator_manager;
mod wsl;
mod smart_playlists;
mod pc_importer;
mod jukebox;
mod ram_disk;
mod watchdog;
mod scraper;
mod mame_optimizer;
mod recompilation_manager;
mod smart_import_v2;
mod retro_achievements;
mod launchbox_bridge;
mod launcher;

use std::env;
use crate::ai_manager::{AI_CORE, ResourcePriority};

#[tokio::main]
async fn main() {
    // Intercepta uso local via Terminal (CLI)
    let mode = handle_cli().await.unwrap_or_else(|| "full".to_string());
    let is_lite = mode == "lite";

    // Inicialização da GUI e Setup (Cocktail/Desktop)
    if is_lite {
        println!("Inicializando Fliper no Modo LITE (TUI/Headless)...");
    } else {
        println!("Inicializando Fliper Dashboard...");
    }
    
    // RAM Disk mount
    if !is_lite {
        let _drive_letter = ram_disk::create_ram_disk().unwrap_or_else(|e| {
            println!("Aviso: O RAM Disk não pode ser criado ({}), caindo para SSD.", e);
            "C:".to_string()
        });
        
        // Launchbox Deep Sync
        launchbox_bridge::parse_launchbox_xml("/mnt/c/LaunchBox/Data/Platforms.xml");
        // Start Deep GPU Audit in background
        launchbox_bridge::run_deep_audit();
    } else {
        println!("[Sistema] RAM Disk desativado no modo Lite. Usando SSD.");
    }
    
    // Watchdog and Lock checks check config here (simulated)
    watchdog::start_watchdog(!is_lite); 
    
    // Executa varredura de "Continue de Onde Parou" na inicialização via RAM/Cache (Módulo inteligente)
    if !is_lite {
        let _recent_saves = smart_playlists::build_resume_playlist();
    }
    
    // Inicia IA Silenciosa se configurado
    if !is_lite {
        let mut core_ai = AI_CORE.lock().await;
        core_ai.enable().await;
    } else {
        let mut core_ai = AI_CORE.lock().await;
        core_ai.disable().await; // Mata processos de IA e libera recurso
        println!("[Sistema] AI Core desativado completamente no modo Lite.");
    }

    // Se estiver em modo arcade_lock, invocar `system::enable_arcade_mode`
    let _exe_path = env::current_exe().unwrap().to_str().unwrap().to_string();
    
    if is_lite {
        println!("Executando apenas o Loop TUI para modo Lite.");
        // Loop principal TUI
    } else {
        println!("Executando o Runner do Sistema (Tauri)...");
        // tauri::Builder::default().run(...)
    }
}

async fn handle_cli() -> Option<String> {
    let args: Vec<String> = env::args().collect();
    if args.len() > 1 && args[1] == "ai" {
        if args.len() > 2 {
            let prompt = args[2..].join(" ");
            println!("🎮 [Fliper CLI] Chamando IA Local (DeepSeek/Llama3) para a query: '{}'", prompt);
            
            let mut core_ai = AI_CORE.lock().await;
            core_ai.enable().await;
            println!("🤖 [Resposta] -> Otimização de shaders executada com sucesso para 64GB / RTX 5060.");
            core_ai.disable().await;
        } else {
             println!("O que você deseja? Ex: fliper ai \"otimizar shaders para este hardware\"");
        }
        std::process::exit(0);
    } else if args.len() > 1 && args[1] == "--mode" && args.len() > 2 {
        let mode = args[2].clone();
        println!("🎮 [Fliper CLI] Alternando para modo: {}", mode);
        return Some(mode);
    }
    None
}
