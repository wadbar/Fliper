export interface Game {
  id: string;
  title: string;
  platform: string;
  developer: string;
  releaseYear: number;
  genre: string;
  coverArt: string;
  fanArt: string;
  description: string;
  suggestedCore?: string;
}

// Função helper para montar a URL raw do github (Libretro Thumbnails)
const getLibretroImage = (repo: string, type: 'Boxarts' | 'Snaps' | 'Titles', filename: string) => {
  return `https://raw.githubusercontent.com/libretro-thumbnails/${repo}/master/Named_${type}/${encodeURIComponent(filename)}.png`;
}

export const games: Game[] = [
  {
    id: "smw",
    title: "Super Mario World",
    platform: "SNES",
    developer: "Nintendo",
    releaseYear: 1990,
    genre: "Platformer",
    coverArt: getLibretroImage("Nintendo_-_Super_Nintendo_Entertainment_System", "Boxarts", "Super Mario World (USA)"),
    fanArt: "https://picsum.photos/seed/mario/1920/1080",
    description: "Junte-se a Mario e Luigi para salvar a Ilha dos Dinossauros! O clássico absoluto do SNES."
  },
  {
    id: "sonic",
    title: "Sonic the Hedgehog",
    platform: "Sega Genesis",
    developer: "Sonic Team",
    releaseYear: 1991,
    genre: "Platformer",
    coverArt: getLibretroImage("Sega_-_Mega_Drive_-_Genesis", "Boxarts", "Sonic The Hedgehog (USA, Europe)"),
    fanArt: "https://picsum.photos/seed/sonic/1920/1080",
    description: "Corra na velocidade da luz como Sonic para impedir o Dr. Robotnik de dominar o mundo."
  },
  {
    id: "zelda_oot",
    title: "The Legend of Zelda Ocarina of Time",
    platform: "Nintendo 64",
    developer: "Nintendo",
    releaseYear: 1998,
    genre: "Action-Adventure",
    coverArt: getLibretroImage("Nintendo_-_Nintendo_64", "Boxarts", "Legend of Zelda, The - Ocarina of Time (USA)"),
    fanArt: "https://picsum.photos/seed/zelda/1920/1080",
    description: "Viaje pelo tempo para impedir Ganondorf e salvar o reino de Hyrule, considerado um dos maiores jogos já feitos."
  },
  {
    id: "ff7",
    title: "Final Fantasy VII",
    platform: "PlayStation",
    developer: "Square",
    releaseYear: 1997,
    genre: "RPG",
    coverArt: getLibretroImage("Sony_-_PlayStation", "Boxarts", "Final Fantasy VII (USA) (Disc 1)"),
    fanArt: "https://picsum.photos/seed/finalfantasy/1920/1080",
    description: "Junte-se a Cloud Strife e o grupo rebelde AVALANCHE para deter a terrível corporação Shinra."
  },
  {
    id: "sotn",
    title: "Castlevania Symphony of the Night",
    platform: "PlayStation",
    developer: "Konami",
    releaseYear: 1997,
    genre: "Metroidvania",
    coverArt: getLibretroImage("Sony_-_PlayStation", "Boxarts", "Castlevania - Symphony of the Night (USA)"),
    fanArt: "https://picsum.photos/seed/castlevania/1920/1080",
    description: "Explore o castelo do Drácula como Alucard, enfrentando monstros e descobrindo todos os segredos."
  },
  {
    id: "sfiii3",
    title: "Street Fighter III 3rd Strike",
    platform: "Arcade_JP",
    developer: "Capcom",
    releaseYear: 1999,
    genre: "Fighting (2D)",
    coverArt: getLibretroImage("MAME", "Titles", "Street Fighter III 3rd Strike_ Fight for the Future (Japan 990608)"),
    fanArt: "https://picsum.photos/seed/streetfighter/1920/1080",
    description: "O suprassumo dos jogos de luta 2D. Domine a técnica do Parry (Evo Moment 37) neste clássico da Capcom.",
  },
  {
    id: "mvc2",
    title: "Marvel vs. Capcom 2",
    platform: "Naomi",
    developer: "Capcom",
    releaseYear: 2000,
    genre: "Fighting (2D)",
    coverArt: getLibretroImage("MAME", "Titles", "Marvel Vs. Capcom 2 New Age of Heroes (Export, Korea, Rev A)"),
    fanArt: "https://picsum.photos/seed/marvel/1920/1080",
    description: "I wanna take you for a ride! Combos aéreos infinitos e hyper combos insanos neste gigantesco crossover."
  },
  {
    id: "mslug",
    title: "Metal Slug",
    platform: "NeoGeo",
    developer: "Nazca Corporation",
    releaseYear: 1996,
    genre: "Run and Gun",
    coverArt: getLibretroImage("MAME", "Titles", "Metal Slug - Super Vehicle-001"),
    fanArt: "https://picsum.photos/seed/metalslug/1920/1080",
    description: "O auge da pixel art e ação frenética co-op side-scrolling dos Arcades nos anos 90."
  },
  {
    id: "pbobble2",
    title: "Puzzle Bobble 2",
    platform: "Arcade_JP",
    developer: "Taito F3 System",
    releaseYear: 1995,
    genre: "Puzzle",
    coverArt: getLibretroImage("MAME", "Titles", "Puzzle Bobble 2 (Japan)"),
    fanArt: "https://picsum.photos/seed/bubble/1920/1080",
    description: "Junte bolhas da mesma cor! O mais divertido jogo competitivo de Puzzle dos Arcades originais."
  },
  {
    id: "kof2002",
    title: "The King of Fighters 2002",
    platform: "NeoGeo",
    developer: "Playmore",
    releaseYear: 2002,
    genre: "Fighting (2D)",
    coverArt: getLibretroImage("MAME", "Titles", "The King of Fighters 2002"),
    fanArt: "https://picsum.photos/seed/kof/1920/1080",
    description: "A clássica série da SNK num formato dream-match. Uma das melhores jogabilidades competitivas do Neo Geo."
  },
  {
    id: "gow2",
    title: "God of War II",
    platform: "PlayStation 2",
    developer: "Santa Monica Studio",
    releaseYear: 2007,
    genre: "Action-Adventure",
    coverArt: getLibretroImage("Sony_-_PlayStation_2", "Boxarts", "God of War II (USA)"),
    fanArt: "https://picsum.photos/seed/kratos/1920/1080",
    description: "Kratos desafia os próprios Deuses do Olimpo nesta obra-prima técnica do PS2."
  },
  {
    id: "mprime",
    title: "Metroid Prime",
    platform: "GameCube",
    developer: "Retro Studios",
    releaseYear: 2002,
    genre: "First-Person Adventure",
    coverArt: getLibretroImage("Nintendo_-_GameCube", "Boxarts", "Metroid Prime (USA)"),
    fanArt: "https://picsum.photos/seed/metroid/1920/1080",
    description: "A transição perfeita da Samus para o 3D. Exploração e atmosfera inigualáveis."
  },
  {
    id: "mario_odyssey",
    title: "Super Mario Odyssey",
    platform: "Switch",
    developer: "Nintendo",
    releaseYear: 2017,
    genre: "Platformer",
    coverArt: "https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Switch/master/Named_Boxarts/Super%20Mario%20Odyssey%20(World).png",
    fanArt: "https://picsum.photos/seed/odyssey/1920/1080",
    description: "Uma jornada global com Cappy para impedir o casamento de Bowser."
  }
];
