import { parseStringPromise } from 'xml2js';
import fs from 'fs/promises';

// Simulando banco em RAM dinâmico para evitar problemas de compilação C++ / GLIBC no ambiente web
export const ramDatabase: any[] = [
    {
        id: "pd_1",
        title: "Super Boss Gaiden",
        path: "Super Nintendo",
        developer: "SFC Homebrew",
        star_rating: "5",
        releaseYear: 2016,
        genre: "Action/Brawler",
        description: "A fantastic homebrew brawler for the Super Nintendo. Fast-paced action with great sprite work.",
        coverArt: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x3t.png",
        fanArt: "https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8f5s.jpg"
    },
    {
        id: "pd_2",
        title: "Anguna: Warriors of Virtue",
        path: "Game Boy Advance",
        developer: "Bite the Chili",
        star_rating: "4",
        releaseYear: 2008,
        genre: "Action/RPG",
        description: "An open source top-down action RPG for the Game Boy Advance, featuring 6 dungeons and various items and enemies.",
        coverArt: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2k36.png",
        fanArt: "https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8f5m.jpg"
    },
    {
        id: "pd_3",
        title: "Micro Mages",
        path: "NES",
        developer: "Morphcat Games",
        star_rating: "5",
        releaseYear: 2019,
        genre: "Platformer",
        description: "A homebrew NES game with highly optimized 8-bit graphics, focusing on 4-player co-op climbing and shooting action.",
        coverArt: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1wxw.png",
        fanArt: "https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc6ntj.jpg"
    },
    {
        id: "pd_4",
        title: "New Super Mario Land",
        path: "Super Nintendo",
        developer: "Homebrew",
        star_rating: "4",
        releaseYear: 2019,
        genre: "Platformer",
        description: "A remake of the Game Boy classic Super Mario Land 1 running on the Super Nintendo, featuring 4 player multiplayer.",
        coverArt: "https://images.igdb.com/igdb/image/upload/t_cover_big/co26bx.png",
        fanArt: "https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8f5r.jpg"
    },
    {
        id: "pd_5",
        title: "Witch n' Wiz",
        path: "NES",
        developer: "Matt Hughson",
        star_rating: "4",
        releaseYear: 2021,
        genre: "Puzzle",
        description: "A puzzle game for the NES featuring over 100 levels of magical block-pushing puzzles.",
        coverArt: "https://images.igdb.com/igdb/image/upload/t_cover_big/co41z0.png",
        fanArt: "https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8f5p.jpg"
    }
];

export async function syncLaunchBoxData(lbPath: string) {
    console.log(`[LaunchBox Bridge] Syncing data from ${lbPath}`);
    
    try {
        // Leitura direta do XML de Plataformas do LaunchBox
        const xmlData = await fs.readFile(`${lbPath}/Data/Platforms/Super Nintendo.xml`, 'utf-8');
        const result = await parseStringPromise(xmlData);

        // Limpeza e normalização de dados (Coding Pesado)
        if (result && result.LaunchBox && result.LaunchBox.Game) {
            // Keep homebrews, append Launchbox
            for (const game of result.LaunchBox.Game) {
                ramDatabase.push({
                    id: game.ID?.[0] || 'Unknown',
                    title: game.Title?.[0] || 'Unknown',
                    path: game.ApplicationPath?.[0] || '',
                    developer: game.Developer?.[0] || 'Unknown',
                    star_rating: game.StarRating?.[0] || '0',
                    releaseYear: game.ReleaseDate?.[0] ? new Date(game.ReleaseDate[0]).getFullYear() : (game.ReleaseYear?.[0] || 'Unknown'),
                    genre: game.Genre?.[0] || 'Unknown',
                    description: game.Notes?.[0] || game.Description?.[0] || 'No description available.',
                    coverArt: game.FrontImage?.[0] || game.Box3DImagePath?.[0] || '',
                    fanArt: game.FanartImage?.[0] || game.BackgroundImagePath?.[0] || ''
                });
            }
        }
        console.log(`DB Loaded into RAM: 100% Reality Mode. Items: ${ramDatabase.length}`);
    } catch (error) {
        console.error("Error syncing Launchbox data:", error);
    }
}

export async function syncBatoceraData(gamelistPath: string) {
    console.log(`[Batocera Bridge] Syncing data from ${gamelistPath}`);
    try {
        const xmlData = await fs.readFile(gamelistPath, 'utf-8');
        const result = await parseStringPromise(xmlData);

        if (result && result.gameList && result.gameList.game) {
            for (const game of result.gameList.game) {
                ramDatabase.push({
                    id: game.path?.[0] || `batocera_${Date.now()}_${Math.random()}`,
                    title: game.name?.[0] || 'Unknown',
                    path: game.path?.[0] || '',
                    developer: game.developer?.[0] || game.publisher?.[0] || 'Unknown',
                    star_rating: game.rating?.[0] || '0',
                    releaseYear: game.releasedate?.[0] ? game.releasedate[0].substring(0, 4) : 'Unknown',
                    genre: game.genre?.[0] || 'Unknown',
                    description: game.desc?.[0] || 'No description available.',
                    coverArt: game.image?.[0] || game.thumbnail?.[0] || '',
                    fanArt: game.marquee?.[0] || game.video?.[0] || ''
                });
            }
        }
        console.log(`[Batocera] DB Loaded into RAM. Total Items: ${ramDatabase.length}`);
    } catch (error) {
        console.error("Error syncing Batocera data:", error);
    }
}

export async function syncRetrobatData(gamelistPath: string) {
    console.log(`[Retrobat Bridge] Syncing data from ${gamelistPath}`);
    try {
        // Retrobat shares the same EmulationStation XML format as Batocera
        const xmlData = await fs.readFile(gamelistPath, 'utf-8');
        const result = await parseStringPromise(xmlData);

        if (result && result.gameList && result.gameList.game) {
            for (const game of result.gameList.game) {
                ramDatabase.push({
                    id: game.path?.[0] || `retrobat_${Date.now()}_${Math.random()}`,
                    title: game.name?.[0] || 'Unknown',
                    path: game.path?.[0] || '',
                    developer: game.developer?.[0] || game.publisher?.[0] || 'Unknown',
                    star_rating: game.rating?.[0] || '0',
                    releaseYear: game.releasedate?.[0] ? game.releasedate[0].substring(0, 4) : 'Unknown',
                    genre: game.genre?.[0] || 'Unknown',
                    description: game.desc?.[0] || 'No description available.',
                    coverArt: game.image?.[0] || game.thumbnail?.[0] || '',
                    fanArt: game.marquee?.[0] || game.video?.[0] || ''
                });
            }
        }
        console.log(`[Retrobat] DB Loaded into RAM. Total Items: ${ramDatabase.length}`);
    } catch (error) {
        console.error("Error syncing Retrobat data:", error);
    }
}

export async function syncLemuroidData(jsonPath: string) {
    console.log(`[Lemuroid Bridge] Syncing data from ${jsonPath}`);
    try {
        // Lemuroid typically maps local SQL to JSON dumps for frontend consumption in these setups
        const jsonData = await fs.readFile(jsonPath, 'utf-8');
        const result = JSON.parse(jsonData);

        if (Array.isArray(result)) {
            for (const game of result) {
                ramDatabase.push({
                    id: game.id || `lemuroid_${Date.now()}_${Math.random()}`,
                    title: game.title || game.name || 'Unknown',
                    path: game.file_path || game.path || '',
                    developer: game.developer || game.publisher || 'Unknown',
                    star_rating: game.rating ? game.rating.toString() : '0',
                    releaseYear: game.release_year || game.year || 'Unknown',
                    genre: game.genre || 'Unknown',
                    description: game.description || game.summary || 'No description available.',
                    coverArt: game.cover || game.boxart || '',
                    fanArt: game.fanart || game.screenshot || ''
                });
            }
        }
        console.log(`[Lemuroid] DB Loaded into RAM. Total Items: ${ramDatabase.length}`);
    } catch (error) {
        console.error("Error syncing Lemuroid data:", error);
    }
}
