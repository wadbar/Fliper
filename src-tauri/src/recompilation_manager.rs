/**
 * Fliper - Static Recompilation Engine Support
 * Language: Rust
 */

/// Identifica se um jogo suporta projetos de recompilação estática como Ship of Harkinian ou OpenGOAL.
pub fn detect_and_offer_recompilation(rom_name: &str) -> bool {
    // Zelda 64 Recomp / Ship of Harkinian
    if rom_name.to_lowercase().contains("zelda") && rom_name.to_lowercase().contains("ocarina") {
        println!("[Recompilation] ROM de Zelda 64 detectada.");
        println!("[Recompilation] Sugerindo e baixando o PC Port Nativo (Ship of Harkinian) com suporte a 144Hz e Ray Tracing.");
        return true;
    }
    
    // Jak and Daxter - OpenGOAL
    if rom_name.to_lowercase().contains("jak") && rom_name.to_lowercase().contains("daxter") {
        println!("[Recompilation] ISO de Jak and Daxter detectada.");
        println!("[Recompilation] Sugerindo o port OpenGOAL (Projeto de Recompilação Nativ).");
        return true;
    }
    
    // Super Mario 64 PC
    if rom_name.to_lowercase().contains("super mario 64") {
        println!("[Recompilation] ROM de Super Mario 64 detectada.");
        println!("[Recompilation] Redirecionando suporte de engine nativa SM64 PC.");
        return true;
    }

    false
}
