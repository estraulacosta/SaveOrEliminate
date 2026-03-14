import type { Room, Player, GameConfig, Round, Vote, Song } from './types.js';
import * as deezer from './deezer.js';

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createRoom(playerName: string, playerId: string): Room {
  const roomId = generateRoomId();
  
  const room: Room = {
    id: roomId,
    players: [{
      id: playerId,
      name: playerName,
      isHost: true,
    }],
    gameConfig: null,
    currentRound: null,
    allSongs: [],
    usedSongIds: new Set(),
    totalRounds: 0,
    isGameStarted: false,
    createdAt: Date.now(),
  };
  
  rooms.set(roomId, room);
  setTimeout(() => rooms.delete(roomId), 4 * 60 * 60 * 1000); // 4 horas
  
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function joinRoom(roomId: string, playerName: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  // Limitar a 8 jugadores
  if (room.players.length >= 8) return null;
  
  // Verificar que no exista ya
  const existingPlayer = room.players.find(p => p.id === playerId);
  if (existingPlayer) return room;
  
  room.players.push({
    id: playerId,
    name: playerName,
    isHost: false,
  });
  
  return room;
}

export function removePlayer(roomId: string, playerId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  room.players = room.players.filter(p => p.id !== playerId);
  
  // Si sale el host, asignar a otro
  if (room.players.length > 0 && !room.players.some(p => p.isHost)) {
    room.players[0].isHost = true;
  }
  
  // Si no quedan jugadores, eliminar sala
  if (room.players.length === 0) {
    rooms.delete(roomId);
  }
  
  return true;
}

async function fetchSongsForConfig(config: GameConfig): Promise<Song[]> {
  try {
    switch (config.selectionType) {
      case 'genre':
        if (config.genre) {
          return await deezer.searchByGenre(config.genre, 100);
        }
        break;
        
      case 'artist':
        if (config.artist) {
          return await deezer.searchByArtist(config.artist, 100);
        }
        break;
        
      case 'year':
        if (config.yearRange) {
          const allSongs: Song[] = [];
          const { start, end } = config.yearRange;
          for (let year = start; year <= end; year++) {
            const songs = await deezer.searchByYear(year, 50);
            allSongs.push(...songs);
          }
          return allSongs;
        }
        break;
        
      case 'decade':
        if (config.decadeRange) {
          const allSongs: Song[] = [];
          const { start, end } = config.decadeRange;
          for (let decade = start; decade <= end; decade += 10) {
            const songs = await deezer.searchByDecade(decade, decade + 9, 50);
            allSongs.push(...songs);
          }
          return allSongs;
        }
        break;
        
      case 'versus':
        if (config.versusConfig) {
          const songs1 = await fetchSongsForVersus(config.versusConfig.type, config.versusConfig.option1);
          const songs2 = await fetchSongsForVersus(config.versusConfig.type, config.versusConfig.option2);
          return [...songs1, ...songs2];
        }
        break;
    }
    
    return await deezer.getTopTracks(100);
  } catch (error) {
    console.error('Error fetching songs:', error);
    return [];
  }
}

async function fetchSongsForVersus(type: string, value: string): Promise<Song[]> {
  switch (type) {
    case 'artist':
      return await deezer.searchByArtist(value, 50);
    case 'year':
      return await deezer.searchByYear(parseInt(value), 50);
    case 'genre':
      return await deezer.searchByGenre(value, 50);
    case 'decade':
      const decade = parseInt(value);
      return await deezer.searchByDecade(decade, decade + 9, 50);
    default:
      return [];
  }
}

function calculateTotalRounds(config: GameConfig, totalSongs: number): number {
  switch (config.selectionType) {
    case 'genre':
    case 'artist':
      return 20; // 20 rondas fijas
      
    case 'year':
      if (config.yearRange) {
        return config.yearRange.end - config.yearRange.start + 1;
      }
      return 10;
      
    case 'decade':
      if (config.decadeRange) {
        return ((config.decadeRange.end - config.decadeRange.start) / 10) + 1;
      }
      return 5;
      
    case 'versus':
      return 20; // 20 rondas de versus
      
    default:
      return Math.min(20, Math.floor(totalSongs / config.songsPerRound));
  }
}

export async function startGame(roomId: string, config: GameConfig): Promise<boolean> {
  const room = rooms.get(roomId);
  if (!room || room.players.length < 1) return false;
  
  room.gameConfig = config;
  room.isGameStarted = true;
  
  // Para modo versus artista, cargar canciones de ambos artistas por separado
  if (config.selectionType === 'versus' && config.versusConfig?.type === 'artist') {
    console.log(`Starting versus mode with artists: ${config.versusConfig.option1} vs ${config.versusConfig.option2}`);
    
    const songs1 = await deezer.searchByArtist(config.versusConfig.option1, 100);
    const songs2 = await deezer.searchByArtist(config.versusConfig.option2, 100);
    
    // Filtrar solo con preview
    const songs1WithPreview = songs1.filter(song => song.previewUrl !== null);
    const songs2WithPreview = songs2.filter(song => song.previewUrl !== null);
    
    console.log(`Artist 1 (${config.versusConfig.option1}): ${songs1WithPreview.length} songs with preview`);
    console.log(`Artist 2 (${config.versusConfig.option2}): ${songs2WithPreview.length} songs with preview`);
    
    room.artistSongs = {
      artist1: songs1WithPreview,
      artist2: songs2WithPreview,
    };
    
    room.usedSongsByArtist = {
      artist1: new Set(),
      artist2: new Set(),
    };
    
    // Total rounds es el mínimo de canciones disponibles de ambos artistas, máximo 20
    room.totalRounds = Math.min(20, Math.min(songs1WithPreview.length, songs2WithPreview.length));
    console.log(`Total rounds for versus: ${room.totalRounds}`);
  }
  // Para modo versus año, cargar canciones de ambos años por separado
  else if (config.selectionType === 'versus' && config.versusConfig?.type === 'year') {
    console.log(`Starting versus mode with years: ${config.versusConfig.option1} vs ${config.versusConfig.option2}`);
    
    const year1 = parseInt(config.versusConfig.option1);
    const year2 = parseInt(config.versusConfig.option2);
    
    const songs1 = await deezer.searchByYear(year1, 100);
    const songs2 = await deezer.searchByYear(year2, 100);
    
    // Filtrar solo con preview
    const songs1WithPreview = songs1.filter(song => song.previewUrl !== null);
    const songs2WithPreview = songs2.filter(song => song.previewUrl !== null);
    
    console.log(`Year 1 (${year1}): ${songs1WithPreview.length} songs with preview`);
    console.log(`Year 2 (${year2}): ${songs2WithPreview.length} songs with preview`);
    
    room.yearSongs = {
      year1: songs1WithPreview,
      year2: songs2WithPreview,
    };
    
    room.usedSongsByYear = {
      year1: new Set(),
      year2: new Set(),
    };
    
    // Total rounds es el mínimo de canciones disponibles de ambos años, máximo 20
    room.totalRounds = Math.min(20, Math.min(songs1WithPreview.length, songs2WithPreview.length));
    console.log(`Total rounds for versus year: ${room.totalRounds}`);
  }
  // Para modo versus género, cargar canciones de ambos géneros por separado
  else if (config.selectionType === 'versus' && config.versusConfig?.type === 'genre') {
    console.log(`Starting versus mode with genres: ${config.versusConfig.option1} vs ${config.versusConfig.option2}`);
    
    const songs1 = await deezer.searchByGenre(config.versusConfig.option1, 100);
    const songs2 = await deezer.searchByGenre(config.versusConfig.option2, 100);
    
    // Filtrar solo con preview
    const songs1WithPreview = songs1.filter(song => song.previewUrl !== null);
    const songs2WithPreview = songs2.filter(song => song.previewUrl !== null);
    
    console.log(`Genre 1 (${config.versusConfig.option1}): ${songs1WithPreview.length} songs with preview`);
    console.log(`Genre 2 (${config.versusConfig.option2}): ${songs2WithPreview.length} songs with preview`);
    
    room.genreSongs = {
      genre1: songs1WithPreview,
      genre2: songs2WithPreview,
    };
    
    room.usedSongsByGenre = {
      genre1: new Set(),
      genre2: new Set(),
    };
    
    // Total rounds es el mínimo de canciones disponibles de ambos géneros, máximo 20
    room.totalRounds = Math.min(20, Math.min(songs1WithPreview.length, songs2WithPreview.length));
    console.log(`Total rounds for versus genre: ${room.totalRounds}`);
  }
  // Para modo versus década, cargar canciones de ambas décadas por separado
  else if (config.selectionType === 'versus' && config.versusConfig?.type === 'decade') {
    console.log(`Starting versus mode with decades: ${config.versusConfig.option1} vs ${config.versusConfig.option2}`);
    
    const decade1 = parseInt(config.versusConfig.option1);
    const decade2 = parseInt(config.versusConfig.option2);
    
    const songs1 = await deezer.searchByDecade(decade1, decade1 + 9, 100);
    const songs2 = await deezer.searchByDecade(decade2, decade2 + 9, 100);
    
    // Filtrar solo con preview
    const songs1WithPreview = songs1.filter(song => song.previewUrl !== null);
    const songs2WithPreview = songs2.filter(song => song.previewUrl !== null);
    
    console.log(`Decade 1 (${decade1}s): ${songs1WithPreview.length} songs with preview`);
    console.log(`Decade 2 (${decade2}s): ${songs2WithPreview.length} songs with preview`);
    
    room.decadeSongs = {
      decade1: songs1WithPreview,
      decade2: songs2WithPreview,
    };
    
    room.usedSongsByDecade = {
      decade1: new Set(),
      decade2: new Set(),
    };
    
    // Total rounds es el mínimo de canciones disponibles de ambas décadas, máximo 20
    room.totalRounds = Math.min(20, Math.min(songs1WithPreview.length, songs2WithPreview.length));
    console.log(`Total rounds for versus decade: ${room.totalRounds}`);
  } else {
    // Para otros modos, usar la lógica existente
    const allSongs = await fetchSongsForConfig(config);
    console.log(`Fetched ${allSongs.length} songs for config`);
    
    // Filtrar solo con preview
    room.allSongs = allSongs.filter(song => song.previewUrl !== null);
    console.log(`Songs with preview: ${room.allSongs.length}/${allSongs.length}`);
    room.totalRounds = calculateTotalRounds(config, room.allSongs.length);
  }
  
  return true;
}

export async function generateRound(roomId: string): Promise<Round | null> {
  const room = rooms.get(roomId);
  if (!room || !room.gameConfig) return null;
  
  const { selectionType, yearRange, decadeRange, versusConfig } = room.gameConfig;
  const roundNumber = room.currentRound ? room.currentRound.roundNumber + 1 : 1;
  
  let selectedSongs: Song[] = [];
  
  // Modo versus artista: 1 canción de cada artista
  if (selectionType === 'versus' && versusConfig?.type === 'artist' && room.artistSongs && room.usedSongsByArtist) {
    console.log(`[Ronda ${roundNumber}] Generating versus round for artists`);
    
    // Obtener canciones disponibles (no usadas)
    const available1 = room.artistSongs.artist1.filter(s => !room.usedSongsByArtist!.artist1.has(s.id));
    const available2 = room.artistSongs.artist2.filter(s => !room.usedSongsByArtist!.artist2.has(s.id));
    
    if (available1.length === 0 || available2.length === 0) {
      console.log(`No more songs available. Artist 1: ${available1.length}, Artist 2: ${available2.length}`);
      return null;
    }
    
    // Seleccionar aleatoriamente 1 de cada artista
    const song1 = available1[Math.floor(Math.random() * available1.length)];
    const song2 = available2[Math.floor(Math.random() * available2.length)];
    
    // Marcar como usadas
    room.usedSongsByArtist.artist1.add(song1.id);
    room.usedSongsByArtist.artist2.add(song2.id);
    
    selectedSongs = [song1, song2];
    console.log(`[Ronda ${roundNumber}] Selected: ${song1.artist} - ${song1.name} vs ${song2.artist} - ${song2.name}`);
  }
  // Modo versus año: 1 canción de cada año
  else if (selectionType === 'versus' && versusConfig?.type === 'year' && room.yearSongs && room.usedSongsByYear) {
    console.log(`[Ronda ${roundNumber}] Generating versus round for years`);
    
    // Obtener canciones disponibles (no usadas)
    const available1 = room.yearSongs.year1.filter(s => !room.usedSongsByYear!.year1.has(s.id));
    const available2 = room.yearSongs.year2.filter(s => !room.usedSongsByYear!.year2.has(s.id));
    
    if (available1.length === 0 || available2.length === 0) {
      console.log(`No more songs available. Year 1: ${available1.length}, Year 2: ${available2.length}`);
      return null;
    }
    
    // Seleccionar aleatoriamente 1 de cada año
    const song1 = available1[Math.floor(Math.random() * available1.length)];
    const song2 = available2[Math.floor(Math.random() * available2.length)];
    
    // Marcar como usadas
    room.usedSongsByYear.year1.add(song1.id);
    room.usedSongsByYear.year2.add(song2.id);
    
    selectedSongs = [song1, song2];
    console.log(`[Ronda ${roundNumber}] Selected: ${song1.name} (${versusConfig.option1}) vs ${song2.name} (${versusConfig.option2})`);
  }
  // Modo versus género: 1 canción de cada género
  else if (selectionType === 'versus' && versusConfig?.type === 'genre' && room.genreSongs && room.usedSongsByGenre) {
    console.log(`[Ronda ${roundNumber}] Generating versus round for genres`);
    
    // Obtener canciones disponibles (no usadas)
    const available1 = room.genreSongs.genre1.filter(s => !room.usedSongsByGenre!.genre1.has(s.id));
    const available2 = room.genreSongs.genre2.filter(s => !room.usedSongsByGenre!.genre2.has(s.id));
    
    if (available1.length === 0 || available2.length === 0) {
      console.log(`No more songs available. Genre 1: ${available1.length}, Genre 2: ${available2.length}`);
      return null;
    }
    
    // Seleccionar aleatoriamente 1 de cada género
    const song1 = available1[Math.floor(Math.random() * available1.length)];
    const song2 = available2[Math.floor(Math.random() * available2.length)];
    
    // Marcar como usadas
    room.usedSongsByGenre.genre1.add(song1.id);
    room.usedSongsByGenre.genre2.add(song2.id);
    
    selectedSongs = [song1, song2];
    console.log(`[Ronda ${roundNumber}] Selected: ${song1.name} (${versusConfig.option1}) vs ${song2.name} (${versusConfig.option2})`);
  }
  // Modo versus década: 1 canción de cada década
  else if (selectionType === 'versus' && versusConfig?.type === 'decade' && room.decadeSongs && room.usedSongsByDecade) {
    console.log(`[Ronda ${roundNumber}] Generating versus round for decades`);
    
    // Obtener canciones disponibles (no usadas)
    const available1 = room.decadeSongs.decade1.filter(s => !room.usedSongsByDecade!.decade1.has(s.id));
    const available2 = room.decadeSongs.decade2.filter(s => !room.usedSongsByDecade!.decade2.has(s.id));
    
    if (available1.length === 0 || available2.length === 0) {
      console.log(`No more songs available. Decade 1: ${available1.length}, Decade 2: ${available2.length}`);
      return null;
    }
    
    // Seleccionar aleatoriamente 1 de cada década
    const song1 = available1[Math.floor(Math.random() * available1.length)];
    const song2 = available2[Math.floor(Math.random() * available2.length)];
    
    // Marcar como usadas
    room.usedSongsByDecade.decade1.add(song1.id);
    room.usedSongsByDecade.decade2.add(song2.id);
    
    selectedSongs = [song1, song2];
    console.log(`[Ronda ${roundNumber}] Selected: ${song1.name} (${versusConfig.option1}s) vs ${song2.name} (${versusConfig.option2}s)`);
  }
  // Modo year
  else if (selectionType === 'year' && yearRange) {
    const currentYear = yearRange.start + (roundNumber - 1);
    if (currentYear > yearRange.end) {
      console.log(`End of year range. Current year ${currentYear} exceeds end ${yearRange.end}`);
      return null;
    }
    console.log(`[Ronda ${roundNumber}] Fetching songs for year ${currentYear}...`);
    const availableSongs = await deezer.searchByYear(currentYear, 100);
    console.log(`[Ronda ${roundNumber}] Got ${availableSongs.length} songs for year ${currentYear}`);
    
    if (availableSongs.length < room.gameConfig.songsPerRound) {
      console.log(`Not enough songs: ${availableSongs.length} < ${room.gameConfig.songsPerRound}`);
      return null;
    }
    
    const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
    selectedSongs = shuffled.slice(0, room.gameConfig.songsPerRound);
  }
  // Modo decade
  else if (selectionType === 'decade' && decadeRange) {
    const currentDecade = decadeRange.start + (roundNumber - 1) * 10;
    if (currentDecade > decadeRange.end) {
      console.log(`End of decade range. Current decade ${currentDecade} exceeds end ${decadeRange.end}`);
      return null;
    }
    console.log(`[Ronda ${roundNumber}] Fetching songs for decade ${currentDecade}s...`);
    const availableSongs = await deezer.searchByDecade(currentDecade, currentDecade + 9, 100);
    console.log(`[Ronda ${roundNumber}] Got ${availableSongs.length} songs for decade ${currentDecade}s`);
    
    if (availableSongs.length < room.gameConfig.songsPerRound) {
      console.log(`Not enough songs: ${availableSongs.length} < ${room.gameConfig.songsPerRound}`);
      return null;
    }
    
    const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
    selectedSongs = shuffled.slice(0, room.gameConfig.songsPerRound);
  }
  // Otros modos
  else {
    const availableSongs = room.allSongs.filter(song => !room.usedSongIds.has(song.id));
    
    if (availableSongs.length < room.gameConfig.songsPerRound) {
      console.log(`Not enough songs: ${availableSongs.length} < ${room.gameConfig.songsPerRound}`);
      return null;
    }
    
    const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
    selectedSongs = shuffled.slice(0, room.gameConfig.songsPerRound);
    
    // Marcar como usadas (solo para no-year/decade modes)
    if (selectionType !== 'year' && selectionType !== 'decade') {
      selectedSongs.forEach(song => room.usedSongIds.add(song.id));
    }
  }
  
  const round: Round = {
    roundNumber,
    songs: selectedSongs,
    votes: [],
    isPaused: false,
    timerStarted: false,
  };
  
  room.currentRound = round;
  console.log(`Created round ${roundNumber} with ${selectedSongs.length} songs`);
  return round;
}

export function submitVote(roomId: string, playerId: string, songId: string): boolean {
  const room = rooms.get(roomId);
  if (!room || !room.currentRound) return false;
  
  // Remover voto anterior del jugador
  room.currentRound.votes = room.currentRound.votes.filter(v => v.playerId !== playerId);
  
  // Agregar nuevo voto
  room.currentRound.votes.push({ playerId, songId });
  
  return true;
}

export function togglePause(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room || !room.currentRound) return false;
  
  room.currentRound.isPaused = !room.currentRound.isPaused;
  return true;
}

export function startTimer(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room || !room.currentRound) return false;
  
  room.currentRound.timerStarted = true;
  return true;
}

export function resetGame(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  room.gameConfig = null;
  room.currentRound = null;
  room.allSongs = [];
  room.usedSongIds.clear();
  room.artistSongs = undefined;
  room.usedSongsByArtist = undefined;
  room.yearSongs = undefined;
  room.usedSongsByYear = undefined;
  room.genreSongs = undefined;
  room.usedSongsByGenre = undefined;
  room.decadeSongs = undefined;
  room.usedSongsByDecade = undefined;
  room.totalRounds = 0;
  room.isGameStarted = false;
  
  return true;
}
