import type { Room, Player, GameConfig, Round, Vote, Song } from './types.js';
import * as deezer from './deezer.js';

const rooms = new Map<string, Room>();
const globalYearSongsCache = new Map<number, Song[]>();

function normalizeSongKey(song: Song): string {
  const normalizedTitle = song.name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const normalizedArtist = song.artist
    .toLowerCase()
    .replace(/feat\.?/g, ',')
    .replace(/ft\.?/g, ',')
    .replace(/ x /g, ',')
    .replace(/&/g, ',')
    .split(',')
    .map((part) => part.replace(/[^a-z0-9]+/g, ' ').trim())
    .filter(Boolean)
    .sort()
    .join('|');
  return `${normalizedTitle}::${normalizedArtist}`;
}

function dedupeSongs(songs: Song[]): Song[] {
  const seen = new Set<string>();
  const unique: Song[] = [];
  for (const song of songs) {
    const key = normalizeSongKey(song);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(song);
  }
  return unique;
}

function shuffleSongs(songs: Song[]): Song[] {
  return [...songs].sort(() => Math.random() - 0.5);
}

function pickUniqueSongs(songs: Song[], count: number): Song[] {
  return dedupeSongs(songs).slice(0, count);
}

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

// ============================================================
// Carga de canciones para modos que NO son year
// ============================================================
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
      return await deezer.searchByYear(parseInt(value), 25);
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
      return 20;
      
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
      return 20;
      
    default:
      return Math.min(20, Math.floor(totalSongs / config.songsPerRound));
  }
}

// ============================================================
// Inicio del juego: carga diferenciada por modo
// ============================================================

/**
 * Callback de progreso para modo año: se llama con cada año completado.
 * loadedYears: cuántos ya se cargaron, totalYears: cuántos hay en total.
 */
export type LoadingProgressCallback = (loadedYears: number, totalYears: number) => void;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureYearSongsLoaded(room: Room, year: number): Promise<Song[]> {
  const globalCached = globalYearSongsCache.get(year);
  if (globalCached) {
    if (!room.yearSongPool) room.yearSongPool = new Map<number, Song[]>();
    const roomShuffled = shuffleSongs(globalCached);
    room.yearSongPool.set(year, roomShuffled);
    return roomShuffled;
  }

  if (!room.yearSongPool) {
    room.yearSongPool = new Map<number, Song[]>();
  }

  const cached = room.yearSongPool.get(year);
  if (cached) return cached;

  if (!room.yearSongLoadPromises) {
    room.yearSongLoadPromises = new Map<number, Promise<Song[]>>();
  }

  const pending = room.yearSongLoadPromises.get(year);
  if (pending) return pending;

  const loader = (async () => {
    const songsPerRound = room.gameConfig?.songsPerRound ?? 6;
    const requestLimit = Math.max(40, songsPerRound * 8);
    const songs = await deezer.searchByYear(year, requestLimit);
    const canonical = dedupeSongs(
      songs.filter(song => song.previewUrl !== null && song.releaseYear === year)
    );
    const roomShuffled = shuffleSongs(canonical);
    room.yearSongPool!.set(year, roomShuffled);
    globalYearSongsCache.set(year, canonical);
    console.log(`[Year Mode] ${year}: ${roomShuffled.length} strict-year songs loaded`);
    room.yearSongLoadPromises!.delete(year);
    return roomShuffled;
  })();

  room.yearSongLoadPromises.set(year, loader);
  return loader;
}

export async function startGame(
  roomId: string,
  config: GameConfig,
  onProgress?: LoadingProgressCallback
): Promise<boolean> {
  const room = rooms.get(roomId);
  if (!room || room.players.length < 1) return false;
  
  room.gameConfig = config;
  room.isGameStarted = true;

  if (config.selectionType === 'year' && config.yearRange) {
    // ---- Modo AÑO: arranque robusto (menos requests simultáneas) ----
    const { start, end } = config.yearRange;
    const totalYears = end - start + 1;
    room.yearSongPool = new Map<number, Song[]>();
    room.yearSongLoadPromises = new Map<number, Promise<Song[]>>();
    room.currentYearIndex = 0;
    room.totalRounds = totalYears;
    room.allSongs = []; // No se usa en modo año

    let loadedYears = 0;
    const countedYears = new Set<number>();
    const onYearLoaded = (year: number) => {
      if (countedYears.has(year)) return;
      countedYears.add(year);
      loadedYears += 1;
      if (onProgress) {
        onProgress(loadedYears, totalYears);
      }
    };

    const allYears = Array.from({ length: totalYears }, (_, i) => start + i);

    // 1) Buscar primer año jugable de forma secuencial (evita 403 por ráfagas)
    let firstPlayableYear: number | null = null;

    for (const year of allYears) {
      const songs = await ensureYearSongsLoaded(room, year);
      onYearLoaded(year);
      if (songs.length >= config.songsPerRound) {
        firstPlayableYear = year;
        break;
      }

      // Pequeña pausa para no disparar rate-limit de Deezer
      await sleep(120);
    }

    if (firstPlayableYear !== null) {
      room.currentYearIndex = firstPlayableYear - start;
      console.log(`[Year Mode] First playable year: ${firstPlayableYear}`);
    }

    // 2) Prefetch gradual en background (1 por vez, con pausa)
    const firstYearToPrefetch = start + (room.currentYearIndex ?? 0) + 1;
    void (async () => {
      for (let year = firstYearToPrefetch; year <= end; year++) {
        if (countedYears.has(year)) continue;
        try {
          await ensureYearSongsLoaded(room, year);
          onYearLoaded(year);
        } catch {
          onYearLoaded(year);
        }
        await sleep(180);
      }
    })();

  } else {
    // ---- Otros modos: pool global ----
    const allSongs = await fetchSongsForConfig(config);
    console.log(`Fetched ${allSongs.length} songs for config`);
    room.allSongs = allSongs.filter(song => song.previewUrl !== null);
    console.log(`Songs with preview: ${room.allSongs.length}/${allSongs.length}`);
    room.totalRounds = calculateTotalRounds(config, room.allSongs.length);
  }
  
  return true;
}

// ============================================================
// Generación de rondas: diferenciada por modo
// ============================================================
export async function generateRound(roomId: string): Promise<Round | null> {
  const room = rooms.get(roomId);
  if (!room || !room.gameConfig) return null;

  // ---- Modo AÑO ----
  if (room.gameConfig.selectionType === 'year' && room.yearSongPool && room.gameConfig.yearRange) {
    const { start, end } = room.gameConfig.yearRange;
    const { songsPerRound } = room.gameConfig;
    let currentYearIndex = room.currentYearIndex ?? 0;
    let currentYear = start + currentYearIndex;

    while (currentYear <= end) {
      // precarga anticipada de próximos años para reducir espera entre rondas
      for (let offset = 1; offset <= 3; offset++) {
        const prefetchYear = currentYear + offset;
        if (prefetchYear <= end) {
          void ensureYearSongsLoaded(room, prefetchYear);
        }
      }

      const yearsPool = await ensureYearSongsLoaded(room, currentYear);
      if (yearsPool.length >= songsPerRound) {
        const selectedSongs = pickUniqueSongs(yearsPool, songsPerRound);
        if (selectedSongs.length < songsPerRound) {
          console.warn(`[Year Mode] Year ${currentYear} lacks ${songsPerRound} unique songs after dedupe, skipping`);
          currentYearIndex += 1;
          currentYear = start + currentYearIndex;
          room.currentYearIndex = currentYearIndex;
          continue;
        }
        const roundNumber = currentYearIndex + 1;

        room.currentYearIndex = currentYearIndex + 1;

        const round: Round = {
          roundNumber,
          songs: selectedSongs,
          votes: [],
          isPaused: false,
          timerStarted: false,
          yearLabel: `${currentYear}`,
        };

        room.currentRound = round;
        return round;
      }

      console.warn(`[Year Mode] Year ${currentYear} has ${yearsPool.length} songs, skipping`);
      currentYearIndex += 1;
      currentYear = start + currentYearIndex;
      room.currentYearIndex = currentYearIndex;
    }

    return null;
  }

  // ---- Otros modos: pool global ----
  const { songsPerRound } = room.gameConfig;
  const availableSongs = room.allSongs.filter(song => !room.usedSongIds.has(song.id));
  
  if (availableSongs.length < songsPerRound) {
    return null;
  }
  
  const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
  const selectedSongs = shuffled.slice(0, songsPerRound);
  
  selectedSongs.forEach(song => room.usedSongIds.add(song.id));
  
  const roundNumber = room.currentRound ? room.currentRound.roundNumber + 1 : 1;
  
  const round: Round = {
    roundNumber,
    songs: selectedSongs,
    votes: [],
    isPaused: false,
    timerStarted: false,
  };
  
  room.currentRound = round;
  return round;
}

export function submitVote(roomId: string, playerId: string, songId: string): boolean {
  const room = rooms.get(roomId);
  if (!room || !room.currentRound) return false;
  
  room.currentRound.votes = room.currentRound.votes.filter(v => v.playerId !== playerId);
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
  room.yearSongPool = undefined;
  room.yearSongLoadPromises = undefined;
  room.currentYearIndex = undefined;
  
  return true;
}
