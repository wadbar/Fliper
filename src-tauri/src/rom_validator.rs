
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, BufReader};
use md5::{Md5, Digest};
use sha1::{Sha1};

#[derive(Serialize, Deserialize)]
pub struct ValidationResult {
    pub title: String,
    pub md5: String,
    pub sha1: String,
    pub is_valid: bool,
}

pub struct RomValidator;

impl RomValidator {
    pub async fn calculate_hashes(path: &str) -> Result<(String, String), String> {
        let path = Path::new(path);
        if !path.exists() {
            return Err("File not found".to_string());
        }

        let file = File::open(path).await.map_err(|e| e.to_string())?;
        let mut reader = BufReader::new(file);
        
        let mut md5_hasher = Md5::new();
        let mut sha1_hasher = Sha1::new();
        
        let mut buffer = [0; 8192];
        while let Ok(n) = reader.read(&mut buffer).await {
            if n == 0 { break; }
            md5_hasher.update(&buffer[..n]);
            sha1_hasher.update(&buffer[..n]);
        }

        let md5_final = format!("{:x}", md5_hasher.finalize());
        let sha1_final = format!("{:x}", sha1_hasher.finalize());
        
        Ok((md5_final, sha1_final))
    }
}

#[tauri::command]
pub async fn validate_rom_integrity(title: String, path: String) -> Result<ValidationResult, String> {
    let (md5_hash, sha1_hash) = RomValidator::calculate_hashes(&path).await?;
    
    // Mock database check
    let is_valid = true; 

    Ok(ValidationResult {
        title,
        md5: md5_hash,
        sha1: sha1_hash,
        is_valid,
    })
}
