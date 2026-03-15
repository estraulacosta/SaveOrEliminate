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

export function findAndRemovePlayerFromAllRooms(playerId: string): { roomId: string; room: Room; playerName: string } | null {
  for (const [roomId, room] of rooms.entries()) {
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      removePlayer(roomId, playerId);
      return { roomId, room, playerName: player.name };
    }
  }
  return null;
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

export async function startGame(roomId: string, config: GameConfig, onProgress?: (loaded: number, total: number) => void): Promise<boolean> {
  const room = rooms.get(roomId);
  if (!room || room.players.length < 1) return false;
  
  room.gameConfig = config;
  room.isGameStarted = true;
  
  // Fetch todas las canciones
  const allSongs = await fetchSongsForConfig(config);
  
  console.log(`Fetched ${allSongs.length} songs for config`);
  
  // Filtrar solo con preview
  room.allSongs = allSongs.filter(song => song.previewUrl !== null);
  
  console.log(`Songs with preview: ${room.allSongs.length}/${allSongs.length}`);
  
  room.totalRounds = calculateTotalRounds(config, room.allSongs.length);
  
  onProgress?.(0, allSongs.length);
  
  return true;
}

export async function generateRound(roomId: string): Promise<Round | null> {
  const room = rooms.get(roomId);
  if (!room || !room.gameConfig) return null;
  
  const { songsPerRound, selectionType, yearRange, decadeRange } = room.gameConfig;
  const roundNumber = room.currentRound ? room.currentRound.roundNumber + 1 : 1;
  
  let availableSongs: Song[];
  
  // Para year mode, obtener SOLO las canciones del año actual de esa ronda
  if (selectionType === 'year' && yearRange) {
    const currentYear = yearRange.start + (roundNumber - 1);
    if (currentYear > yearRange.end) {
      console.log(`End of year range. Current year ${currentYear} exceeds end ${yearRange.end}`);
      return null; // Ya pasamos el rango de años
    }
    console.log(`[Ronda ${roundNumber}] Fetching songs for year ${currentYear}...`);
    availableSongs = await deezer.searchByYear(currentYear, 100);
    console.log(`[Ronda ${roundNumber}] Got ${availableSongs.length} songs for year ${currentYear}`);
  } 
  // Para decade mode, obtener SOLO las canciones de la década actual de esa ronda
  else if (selectionType === 'decade' && decadeRange) {
    const currentDecade = decadeRange.start + (roundNumber - 1) * 10;
    if (currentDecade > decadeRange.end) {
      console.log(`End of decade range. Current decade ${currentDecade} exceeds end ${decadeRange.end}`);
      return null; // Ya pasamos el rango de décadas
    }
    console.log(`[Ronda ${roundNumber}] Fetching songs for decade ${currentDecade}s...`);
    availableSongs = await deezer.searchByDecade(currentDecade, currentDecade + 9, 100);
    console.log(`[Ronda ${roundNumber}] Got ${availableSongs.length} songs for decade ${currentDecade}s`);
  }
  else {
    // Para otros modos, usar las canciones pre-cargadas
    availableSongs = room.allSongs.filter(song => !room.usedSongIds.has(song.id));
  }
  
  if (availableSongs.length < songsPerRound) {
    console.log(`Not enough songs: ${availableSongs.length} < ${songsPerRound}`);
    return null;
  }
  
  // Seleccionar canciones aleatorias
  const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
  const selectedSongs = shuffled.slice(0, songsPerRound);
  
  // Marcar como usadas (solo para no-year modes)
  if (selectionType !== 'year') {
    selectedSongs.forEach(song => room.usedSongIds.add(song.id));
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
  room.totalRounds = 0;
  room.isGameStarted = false;
  
  return true;
}
