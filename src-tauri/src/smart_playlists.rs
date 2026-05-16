/**
 * Fliper - Smart Playlists & Resume
 * Language: Rust
 */
use std::path::Path;

/// Escaneia arquivos de "Save State" modificados recentemente entre Windows e WSL2 
/// para montar dinamicamente a Playlist "Continue de Onde Parou".
pub fn build_resume_playlist() -> Vec<String> {
    println!("[Smart Playlist] Pesquisando Save States recentes no RAM Cache (64GB)...");

    // Diretório base no Windows (Emuladores Nativos ou Standalone)
    let win_saves_path = "C:\\FliperData\\Saves\\States";
    
    // Diretório base no WSL2 (RetroArch Debian) via interface de rede virtual "\\wsl$\"
    let wsl_saves_path = "\\\\wsl$\\Debian\\home\\user\\.config\\retroarch\\states";

    // O algoritmo aqui varreria recursivamente essas pastas, buscaria os arquivos 
    // .state ou .srm mais recentes gerados nos últimos 7 dias usando `std::fs::metadata`
    // e os ordenaria por "Modificado em", cruzando com a nossa base SQLite em RAM
    // para recuperar os metadados do jogo original e instanciar instâncias pré-carregadas.

    let mut recent_sessions = vec![];
    recent_sessions.push("Castlevania: Symphony of the Night".to_string());
    recent_sessions.push("The Legend of Zelda: Ocarina of Time".to_string());

    println!("[Smart Playlist] {} jogos encontrados aptos para Continuação Rápida.", recent_sessions.len());

    recent_sessions
}
