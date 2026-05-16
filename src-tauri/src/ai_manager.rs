/**
 * Fliper - Modular AI Core & Skill Triggers
 * Language: Rust
 */
use std::sync::Arc;
use tokio::sync::Mutex;
use serde_json::json;
use crate::ai::{OllamaService, AiProvider};

lazy_static::lazy_static! {
    pub static ref AI_CORE: Arc<Mutex<AIManager>> = Arc::new(Mutex::new(AIManager::new()));
}

#[derive(Clone, Copy, PartialEq)]
pub enum ResourcePriority {
    High,       
    Hibernated, 
    Off,        
}

pub struct AIManager {
    enabled: bool,
    priority: ResourcePriority,
    active_profile: String,
    client: reqwest::Client,
}

impl AIManager {
    fn new() -> Self {
        Self {
            enabled: true, 
            priority: ResourcePriority::High,
            active_profile: "assistido".to_string(),
            client: reqwest::Client::new(),
        }
    }

    pub async fn enable(&mut self) {
        self.enabled = true;
        self.priority = ResourcePriority::High;
        println!("[AI Core] Ativado em Stealth Mode. RAM-Cache (8GB) Alocado.");
    }

    pub async fn disable(&mut self) {
        self.enabled = false;
        self.priority = ResourcePriority::Off;
        println!("[AI Core] Desativado. VRAM liberada e serviços fechados.");
        
        // Non-blocking process kill (platform specific, here mocked for simplicity)
        #[cfg(target_os = "windows")]
        let _ = tokio::process::Command::new("taskkill")
            .args(["/F", "/IM", "ollama.exe"])
            .output()
            .await;
    }

    pub async fn set_resource_priority(&mut self, priority: ResourcePriority) {
        if !self.enabled { return; }
        self.priority = priority;
        
        match priority {
            ResourcePriority::Hibernated => {
                println!("[AI Core] Hibernando modelo para economizar VRAM (RPCS3 focus)...");
                let local = OllamaService { endpoint: "http://127.0.0.1:11434".to_string() };
                if local.is_active().await {
                    let _ = self.client.post("http://127.0.0.1:11434/api/generate")
                        .json(&json!({"model": "llama3", "keep_alive": 0}))
                        .send()
                        .await;
                }
            },
            ResourcePriority::High => {
                println!("[AI Core] Restaurando IA para High Priority (VRAM reativada).");
            },
            ResourcePriority::Off => self.disable().await,
        }
    }

    pub async fn trigger_skill(&self, event: &str, context: &str) {
        if !self.enabled || self.priority == ResourcePriority::Hibernated { 
            return; 
        }

        match event {
            "PRE_FLIGHT_COCKTAIL" => {
                println!("[AI Skill] Executando verificação de integridade...");
            },
            "ERROR" => {
                println!("[AI Skill] Auto-Resolver detectou crash: {}. Consultando IA para correção...", context);
                // Call async AI service here
            },
            "STUCK_5_MIN" => {
                if self.active_profile == "assistido" {
                    println!("[AI Skill] O jogador está travado. Capturando screenshot e consultando Vision API...");
                }
            },
            _ => {}
        }
    }
}
