/**
 * Fliper - Windows Shell Management & Watchdog ("God-Mode" Arcade)
 * Language: Rust (Tauri Backend)
 */

use std::process::Command;
use winreg::enums::*;
use winreg::RegKey;
use std::path::PathBuf;
use crate::ai_manager::{AI_CORE, ResourcePriority};

const WINLOGON_KEY: &str = "Software\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon";
const POLICIES_KEY: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System";
const STICKY_KEYS: &str = "Control Panel\\Accessibility\\StickyKeys";

/// Ativa o modo Arcade (Shell Lock).
/// Define o executável atual como o Shell do Windows e bloqueia saídas.
#[tauri::command]
pub fn enable_arcade_mode(executable_path: &str) -> Result<(), String> {
    
    // AI PRE-FLIGHT CHECK (Modo Stealth de Recuperação)
    if let Ok(core_ai) = AI_CORE.lock() {
        core_ai.trigger_skill("PRE_FLIGHT_COCKTAIL", executable_path);
        // A IA poderia ler chaves de registro aqui e avisar se algo estiver corrompido, resolvendo silenciosamente
    }

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    
    // 1. Substitui o Shell
    let (winlogon, _) = hkcu.create_subkey(WINLOGON_KEY)
        .map_err(|e| format!("Falha ao acessar Winlogon: {}", e))?;
    winlogon.set_value("Shell", &executable_path)
        .map_err(|e| format!("Falha ao alterar Shell: {}", e))?;
        
    // 2. Desativa o Gerenciador de Tarefas (God-Mode Lock)
    if let Ok((policies, _)) = hkcu.create_subkey(POLICIES_KEY) {
        let _ = policies.set_value("DisableTaskMgr", &1u32);
    }

    // 3. Desativa as Sticky Keys (Teclas de Aderência)
    if let Ok((sticky, _)) = hkcu.create_subkey(STICKY_KEYS) {
        // Flags "506" geralmente desativa o atalho da tecla Shift
        let _ = sticky.set_value("Flags", &"506");
    }
    
    // Matar o explorer.exe se estiver rodando
    let _ = Command::new("taskkill")
        .args(["/F", "/IM", "explorer.exe"])
        .output();
        
    Ok(())
}

/// Desativa o modo Arcade e restaura o sistema ao normal (Câmbio de Shell).
#[tauri::command]
pub fn restore_windows_shell() -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    
    // 1. Restaura o Shell
    if let Ok(key) = hkcu.open_subkey_with_flags(WINLOGON_KEY, KEY_SET_VALUE) {
        let _ = key.delete_value("Shell");
    }

    // 2. Restaura o Gerenciador de Tarefas
    if let Ok(policies) = hkcu.open_subkey_with_flags(POLICIES_KEY, KEY_SET_VALUE) {
        let _ = policies.delete_value("DisableTaskMgr");
    }

    // 3. Restaura as Sticky Keys para o padrão
    if let Ok(sticky) = hkcu.open_subkey_with_flags(STICKY_KEYS, KEY_SET_VALUE) {
        let _ = sticky.set_value("Flags", &"510");
    }

    // Reiniciar o explorer.exe imediatamente na sessão
    Command::new("explorer.exe")
        .spawn()
        .map_err(|e| format!("Falha ao iniciar o Explorer: {}", e))?;

    // Opcional: Encerrar o Fliper
    std::process::exit(0);
}

/// Watchdog Agressivo: Monitora crash do Fliper e mata processos intrusivos.
pub fn spawn_with_watchdog(exe_path: PathBuf) {
    std::thread::spawn(move || {
        let mut crash_count = 0;
        const MAX_CRASHES: u8 = 3;

        loop {
            println!("Watchdog: Iniciando processo principal...");
            let mut child = Command::new(&exe_path)
                .spawn()
                .expect("Falha ao iniciar o executável principal");

            // Thread paralela para matar processos que roubam o foco no modo Arcade
            let kill_intrusive = std::thread::spawn(|| {
                loop {
                    // Exemplo: Mata pop-ups de atualização do Java/Adobe
                    let _ = Command::new("taskkill").args(["/F", "/IM", "jusched.exe"]).output();
                    let _ = Command::new("taskkill").args(["/F", "/IM", "AdobeARM.exe"]).output();
                    std::thread::sleep(std::time::Duration::from_secs(10));
                }
            });

            let status = child.wait().expect("Falha ao aguardar o processo");

            if status.success() {
                println!("Encerramento gracioso detectado. Saindo do Watchdog.");
                break; 
            } else {
                crash_count += 1;
                eprintln!("Crash detectado! ({}/{}) Código {:?}.", crash_count, MAX_CRASHES, status.code());
                
                if crash_count >= MAX_CRASHES {
                    eprintln!("Limite crítico de crashes. Escape Hatch acionado: Restaurando Windows!");
                    let _ = restore_windows_shell();
                    break;
                }
                
                std::thread::sleep(std::time::Duration::from_secs(1));
            }
        }
    });
}
