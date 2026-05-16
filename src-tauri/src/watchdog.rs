/**
 * Fliper - Watchdog Process (System Monitoring)
 * Language: Rust
 */
use std::process::Command;
use std::thread;
use std::time::Duration;

/// Monitora o processo do Fliper e, caso caia (e a flag de arcade estiver ativa), o reinicia.
pub fn start_watchdog(arcade_mode_active: bool) {
    if !arcade_mode_active {
        return;
    }

    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_millis(2000));
            // Lógica fictícia para checar se fliper_app.exe está rodando
            // Na prática, como isso está dentro do App Tauri, um processo externo seria melhor.
            // Para efeito de protótipo: o próprio watchdog externo (C#) chamaria o rust.
        }
    });
}
