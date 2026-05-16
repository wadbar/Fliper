/**
 * Fliper - RAM Disk & Memory Management
 * Language: Rust
 */
use std::process::Command;
use std::path::Path;

/// Cria um RAM Disk de 8GB via ImDisk toolkit ou solução similar de backend no Windows
pub fn create_ram_disk() -> Result<String, String> {
    let drive_letter = "R:"; // R: de RAM
    
    // Verifica se já existe
    if Path::new(drive_letter).exists() {
        return Ok(drive_letter.to_string());
    }

    println!("[Sistema] Alocando 8GB de RAM Disk para SQLite e Modelos IA...");
    
    // Comando hipotético utilizando o utilitário imdisk
    // imdisk -a -s 8G -m R: -p "/fs:ntfs /q /y"
    let status = Command::new("imdisk")
        .args(&["-a", "-s", "8G", "-m", drive_letter, "-p", "/fs:ntfs /q /y"])
        .status();
        
    match status {
        Ok(s) if s.success() => {
            println!("[Sistema] RAM Disk ({}) montado com sucesso.", drive_letter);
            Ok(drive_letter.to_string())
        },
        _ => Err("Falha ao instanciar RAM Disk. O ImDisk Toolkit está instalado?".to_string())
    }
}

/// Clona o banco de dados do SSD para a RAM no boot
pub fn preload_database_to_ram(source_db: &str, ram_db: &str) {
    println!("[Cache] Copiando Banco de Dados Mestre para o RAM Disk (Zero-latency)...");
    let _ = std::fs::copy(source_db, ram_db);
}
