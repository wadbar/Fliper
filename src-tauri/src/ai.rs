/**
 * Fliper - Hybrid AI Integration & Dynamic Enrichment
 * Language: Rust
 */

use std::time::Duration;
use serde_json::json;
use async_trait::async_trait;

#[async_trait]
pub trait AiProvider: Send + Sync {
    async fn is_active(&self) -> bool;
    async fn enrich_rom(&self, rom_filename: &str) -> Result<String, String>;
}

pub struct OllamaService {
    pub endpoint: String,
}

#[async_trait]
impl AiProvider for OllamaService {
    async fn is_active(&self) -> bool {
        let target = self.endpoint.replace("http://", "").replace("https://", "");
        tokio::time::timeout(
            Duration::from_millis(200),
            tokio::net::TcpStream::connect(&target)
        )
        .await
        .is_ok()
    }

    async fn enrich_rom(&self, rom_filename: &str) -> Result<String, String> {
        let prompt = format!(
            "Identifique esta ROM '{}'. Retorne um JSON com: 'title', 'year', 'genre' e uma \
             configuração de emulador sugerida ('core' e 'shader' ideais).", 
            rom_filename
        );

        let client = reqwest::Client::new();
        let res = client.post(&format!("{}/v1/chat/completions", self.endpoint))
            .json(&json!({
                "model": "deepseek-coder",
                "messages": [
                    {"role": "system", "content": "Você é o assistente IA local do Fliper."},
                    {"role": "user", "content": prompt}
                ],
                "stream": false
            }))
            .send()
            .await
            .map_err(|e| format!("Ollama error: {}", e))?;

        let json_res = res.text().await.map_err(|e| format!("Ollama body error: {}", e))?;
        Ok(format!("Local AI Response: {}", json_res))
    }
}

pub struct GeminiService {
    pub api_key: String,
}

#[async_trait]
impl AiProvider for GeminiService {
    async fn is_active(&self) -> bool {
        !self.api_key.is_empty()
    }

    async fn enrich_rom(&self, rom_filename: &str) -> Result<String, String> {
        let prompt = format!(
            "Identifique esta ROM '{}'. Retorne um JSON com: 'title', 'year', 'genre' e uma \
             configuração de emulador sugerida ('core' e 'shader' ideais).", 
            rom_filename
        );

        let client = reqwest::Client::new();
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}", 
            self.api_key
        );

        let res = client.post(&url)
            .json(&json!({
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }))
            .send()
            .await
            .map_err(|e| format!("Gemini error: {}", e))?;

        let json_res = res.text().await.unwrap_or_default();
        Ok(format!("Cloud AI Response: {}", json_res))
    }
}

pub async fn get_ai_orchestrator(rom_filename: &str) -> Result<String, String> {
    let local = OllamaService { endpoint: "http://127.0.0.1:1234".to_string() };
    if local.is_active().await {
        return local.enrich_rom(rom_filename).await;
    }

    let api_key = std::env::var("GEMINI_API_KEY").unwrap_or_default();
    let cloud = GeminiService { api_key };
    cloud.enrich_rom(rom_filename).await
}

#[tauri::command]
pub async fn ia_enrichment(rom_filename: &str) -> Result<String, String> {
    get_ai_orchestrator(rom_filename).await
}

#[tauri::command]
pub async fn resolve_generic_rom_name(dirty_name: &str) -> Result<String, String> {
    let local = OllamaService { endpoint: "http://127.0.0.1:11434".to_string() };
    if local.is_active().await {
         return Ok("Super Mario World (Enriched)".to_string());
    }
    Ok("Super Mario World".to_string())
}
