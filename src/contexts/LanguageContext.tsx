import React, { createContext, useState, useContext, ReactNode } from 'react';

type Language = 'en' | 'pt-br';

interface Translations {
  [key: string]: {
    en: string;
    'pt-br': string;
  };
}

export const translations: Translations = {
  play: { en: 'Play', 'pt-br': 'Jogar' },
  options: { en: 'Options', 'pt-br': 'Opções' },
  desktop: { en: 'Desktop', 'pt-br': 'Área de Trabalho' },
  all_games: { en: 'All Games', 'pt-br': 'Todos os Jogos' },
  platforms: { en: 'Platforms', 'pt-br': 'Plataformas' },
  settings: { en: 'Settings', 'pt-br': 'Configurações' },
  import_roms: { en: 'Import ROMs', 'pt-br': 'Importar ROMs' },
  system_status: { en: 'System Status', 'pt-br': 'Status do Sistema' },
  search_placeholder: { en: 'Search games, platforms...', 'pt-br': 'Buscar jogos, plataformas...' },
  launch_arcade: { en: 'Launch Fliper Mode', 'pt-br': 'Modo Fliperama' },
  select_game: {en: 'Select Game', 'pt-br': 'Selecione o Jogo'},
  video_driver: {en: 'Video Driver', 'pt-br': 'Driver de Vídeo'},
  language: {en: 'Language', 'pt-br': 'Idioma'},
  performance_mode: {en: 'Performance Mode', 'pt-br': 'Modo de Performance'},
  ultra_mode: {en: 'Ultra (RTX/64GB)', 'pt-br': 'Ultra (RTX/64GB)'},
  lite_mode: {en: 'Lite (Old PC)', 'pt-br': 'Lite (PC Antigo)'},
  close: {en: 'Close', 'pt-br': 'Fechar'},
  // Toolbar Menus
  menu_tools: { en: 'TOOLS', 'pt-br': 'FERRAMENTAS' },
  menu_view: { en: 'VIEW', 'pt-br': 'VISUALIZAÇÃO' },
  menu_arrange: { en: 'ARRANGE BY', 'pt-br': 'ORGANIZADO POR' },
  menu_import: { en: 'Import', 'pt-br': 'Importar' },
  menu_manage: { en: 'Manage Emulators', 'pt-br': 'Gerenciar Emuladores' },
  menu_audit: { en: 'Deep Audit', 'pt-br': 'Auditoria Pesada' },
  menu_achievements: { en: 'Achievements', 'pt-br': 'Conquistas' },
  menu_scrape: { en: 'Scrape', 'pt-br': 'Escanear' },
  menu_download: { en: 'Download Content', 'pt-br': 'Central de Downloads' },
  downloader_title: { en: 'Media & Asset Downloader', 'pt-br': 'Download de Mídias e Emuladores' },
  dl_covers: { en: 'Scrape Covers (Libretro)', 'pt-br': 'Baixar Capas (Libretro)' },
  dl_emulators: { en: 'Emulators & Cores', 'pt-br': 'Emuladores e Cores' },
  sub_rom_files: { en: 'ROM Files', 'pt-br': 'Arquivos ROM' },
  sub_mame_set: { en: 'Full set of MAME ROMs', 'pt-br': 'Pacote Completo de Roms do MAME' },
  // Arrange By Options
  sort_title: { en: 'Title', 'pt-br': 'Título' },
  sort_release_date: { en: 'Release Date', 'pt-br': 'Data de Lançamento' },
  sort_play_count: { en: 'Play Count', 'pt-br': 'Contagem de Partidas' },
  sort_mame_support: { en: 'MAME Support', 'pt-br': 'Pontuações do MAME' },
  sort_hardware_mode: { en: 'Hardware Mode', 'pt-br': 'Modo de Hardware' },
  // Settings
  lb_path: { en: 'LaunchBox Directory', 'pt-br': 'Diretório do LaunchBox' },
  
  // OS & Apps New Additions
  os_library: { en: 'Library', 'pt-br': 'Biblioteca' },
  os_terminal: { en: 'Terminal', 'pt-br': 'Terminal' },
  os_store: { en: 'Hub Store', 'pt-br': 'Loja Hub' },
  os_settings: { en: 'System Settings', 'pt-br': 'Configurações do Sistema' },
  win_library: { en: 'Library & Bridge', 'pt-br': 'Biblioteca e Ponte' },
  win_store: { en: 'Software Hub', 'pt-br': 'Central de Software' },
  ai_enhance: { en: 'AI Enhance Game', 'pt-br': 'Melhorar com IA' },
  ai_search_title: { en: 'AI Intelligent Search', 'pt-br': 'Busca Inteligente por IA' },
  ai_search_placeholder: { en: 'Ask AI: "Download Street Fighter Alpha 3 for MAME..."', 'pt-br': 'Pergunte à IA: "Baixar Street Fighter Alpha 3 para MAME..."' },
  ai_search_btn: { en: 'Search', 'pt-br': 'Buscar' },
  enter_fliper: { en: 'Enter Fliper Mode', 'pt-br': 'Entrar no Modo Fliper' },
  dl_queue: { en: 'Download Queue', 'pt-br': 'Fila de Downloads' },
  dl_active_threads: { en: 'ACTIVE THREADS', 'pt-br': 'THREADS ATIVAS' },
  dl_empty: { en: 'No active downloads in queue.', 'pt-br': 'Nenhum download ativo na fila.' },
  dl_global_log: { en: 'Global Task Log', 'pt-br': 'Log Global de Tarefas' },
  app_play: { en: 'Play / Resume', 'pt-br': 'Jogar / Continuar' },
  tasks: { en: 'Tasks', 'pt-br': 'Tarefas' },
  booting: { en: 'BOOTING', 'pt-br': 'INICIALIZANDO' },
  term_help: { en: 'Show this message', 'pt-br': 'Mostrar esta mensagem' },
  term_clear: { en: 'Clear terminal', 'pt-br': 'Limpar terminal' },
  term_neofetch: { en: 'Show system info', 'pt-br': 'Mostrar informações do sistema' },
  term_ls: { en: 'List files', 'pt-br': 'Listar arquivos' },
  term_scan: { en: 'Scan ROMs directory', 'pt-br': 'Escanear diretório de ROMs' },
  term_build: { en: 'Generate bootable USB Image (.iso)', 'pt-br': 'Gerar Imagem USB bootável (.iso)' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return (translations as any)[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
