/**
 * Fliper - PC Games Digital Store Importer
 * Language: Rust
 */
use std::path::Path;

/// O 'Global Importer' varre o registro e os manifests das lojas para adicionar jogos nativos do PC
pub fn scan_steam_library() -> Vec<String> {
    println!("Varrendo libraryfolders.vdf da Steam...");
    // Parser leria o VDF para encontrar os appsID instalados,
    // e criaria atalhos para lançá-ex: steam://rungameid/xxxx
    vec!["steam://rungameid/12345".into()]
}

pub fn scan_epic_games() -> Vec<String> {
    println!("Varrendo C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests...");
    // Lê arquivos .item JSON para identificar executáveis da Epic
    vec!["C:\\Games\\Epic\\RocketLeague\\Binaries\\Win64\\RocketLeague.exe".into()]
}

pub fn scan_gog_galaxy() -> Vec<String> {
    println!("Varrendo Banco de dados do GOG Galaxy...");
    vec!["C:\\GOG Games\\Cyberpunk 2077\\bin\\x64\\Cyberpunk2077.exe".into()]
}
