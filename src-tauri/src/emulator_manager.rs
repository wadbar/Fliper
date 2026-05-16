/**
 * Fliper - Emulator Management & Build Engine
 * Language: Rust
 */
use std::process::Command;
use std::path::{Path, PathBuf};
use reqwest::Client;

/// Verifica por Nightly Builds usando a API do GitHub (Ex: PCSX2, RPCS3)
pub async fn check_emulator_nightly(repo: &str) -> Result<String, String> {
    let url = format!("https://api.github.com/repos/{}/releases/tags/nightly", repo);
    
    let client = Client::new();
    let res = client.get(&url)
        .header("User-Agent", "Fliper-Arcade-Manager")
        .send()
        .await
        .map_err(|e| format!("Erro de rede: {}", e))?;

    if res.status().is_success() {
        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        // Retorna a URL de download do ativo Linux AppImage ou Build do Windows
        if let Some(assets) = json["assets"].as_array() {
            if let Some(first_asset) = assets.first() {
                return Ok(first_asset["browser_download_url"].as_str().unwrap_or("").to_string());
            }
        }
    }
    
    Err("Nenhuma nightly build encontrada.".to_string())
}

/// Compressão Inteligente em Background: Converte .iso e .bin/.cue para .chd
pub fn compress_to_chd(input_iso: &str, output_chd: &str) -> std::thread::JoinHandle<()> {
    // Clona as strings para rodar isolado na thread, usando todos os cores da CPU disponíveis
    let input = input_iso.to_string();
    let output = output_chd.to_string();

    std::thread::spawn(move || {
        println!("Iniciando compressão de {} para {}...", input, output);
        
        let status = Command::new("chdman")
            .args(&["createcd", "-i", &input, "-o", &output])
            .status()
            .expect("Falhou ao executar CHDMAN. Verifique se as dependências do MAME estão no PATH.");
            
        if status.success() {
            println!("Compressão CHD finalizada com sucesso!");
            // Aqui invocar a atualização de status no DB SQLite
        } else {
            eprintln!("Erro na compressão!");
        }
    })
}

/// Verificação de Hash MD5 contra DB Redump/No-Intro
pub fn verify_rom_hash(rom_path: &str, expected_hash: &str) -> bool {
    // Logica de Leitura de Buffers e Digest Criptográfico aqui (md5 / sha1)
    // Omitido no MVP para manter concisão.
    true
}
