/**
 * Fliper - SQLite Database Schema & Init
 * Language: Rust / SQL
 */

use rusqlite::{Connection, Result};

pub fn init_db_in_ram(disk_db_path: &str) -> Result<Connection> {
    println!("Iniciando carregamento do DB (64GB RAM mode)...");
    let mut mem_conn = Connection::open_in_memory()?;

    // Se o banco mapeado existe no disco, copia tudo de uma vez para a RAM
    // Isso garante busca e indexação globais de milhares de mídias a ~0ms de latência
    if std::path::Path::new(disk_db_path).exists() {
        let disk_conn = Connection::open(disk_db_path)?;
        let backup = rusqlite::backup::Backup::new(&disk_conn, &mut mem_conn)?;
        backup.step(-1)?; // -1 lê todas as páginas e bloqueia até terminar a cópia pro :memory:
        println!("Backup para RAM concluído com sucesso!");
    } else {
        // Inicializa o banco vazio do zero na RAM
        mem_conn.execute_batch(
            "
            -- Tabela de Plataformas (Consoles/Sistemas)
            CREATE TABLE IF NOT EXISTS platforms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                launch_year INTEGER
            );

            -- Tabela de Jogos
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                developer TEXT,
                publisher TEXT,
                release_date TEXT,
                genre TEXT,
                description TEXT,
                rom_path TEXT UNIQUE NOT NULL,
                rom_hash TEXT,
                play_count INTEGER DEFAULT 0,
                last_played DATETIME,
                high_score INTEGER DEFAULT 0,
                FOREIGN KEY(platform_id) REFERENCES platforms(id)
            );

            -- Tabela de Mídia (Assets locais após download do scraper)
            CREATE TABLE IF NOT EXISTS game_media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                media_type TEXT NOT NULL,
                local_path TEXT NOT NULL,
                file_hash TEXT,
                FOREIGN KEY(game_id) REFERENCES games(id),
                UNIQUE(game_id, media_type)
            );

            -- Tabela de Tarefas e Otimização de ROMs (Fila de Processamento)
            CREATE TABLE IF NOT EXISTS rom_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'pending', -- pending, hashing, compressing, scraping, done, error
                target_format TEXT, -- chd, rvz, qcow2
                hash_md5 TEXT,
                verified_no_intro BOOLEAN DEFAULT 0,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Índices em RAM para buscas instantâneas
            CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
            CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform_id);
            "
        )?;
    }

    // PRAGMAs Otimizados para banco puro em memória
    mem_conn.execute_batch(
        "PRAGMA synchronous = OFF;
         PRAGMA temp_store = MEMORY;"
    )?;

    Ok(mem_conn)
}

/// Exemplo de Query de Busca Rápida via API
pub fn get_games_by_platform(conn: &Connection, p_slug: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare("
        SELECT g.title FROM games g 
        JOIN platforms p ON g.platform_id = p.id 
        WHERE p.slug = ? ORDER BY g.title ASC
    ")?;
    
    let games_iter = stmt.query_map([p_slug], |row| row.get(0))?;
    
    let mut results = Vec::new();
    for game in games_iter {
        results.push(game?);
    }
    
    Ok(results)
}
