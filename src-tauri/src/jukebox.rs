/**
 * Fliper - Background Jukebox
 * Language: Rust
 */

/// Se o frontend estiver focado em um jogo e possuir BGM/Midi, esta thread tocará o áudio
pub fn play_background_midi(file_path: &str) {
    println!("Jukebox: Reproduzindo {} em volume ambiente...", file_path);
    // Aqui usariamos rodio ou uma biblioteca similar do Rust
    // para tocar a BGM em loop com transições fade-in e fade-out.
}

pub fn stop_background_midi() {
    println!("Jukebox: Desvanecendo áudio (Fade-out) para início do Emulador...");
}
