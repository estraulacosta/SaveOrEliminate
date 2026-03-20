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

export function createRoom(playerName: string, playerId: string, playerAvatar: number): Room {
  const roomId = generateRoomId();
  
  const room: Room = {
    id: roomId,
    players: [{
      id: playerId,
      name: playerName,
      isHost: true,
      avatar: playerAvatar,
    }],
    gameConfig: null,
    currentRound: null,
    allSongs: [],
    usedSongIds: new Set(),
    totalRounds: 0,
    isGameStarted: false,
    createdAt: Date.now(),
    waitingPlayers: new Set(),
    disconnectedPlayers: new Map(),
    artistRoundHistory: new Map(),
    roundArtists: new Map(),
  };
  
  rooms.set(roomId, room);
  setTimeout(() => rooms.delete(roomId), 4 * 60 * 60 * 1000); // 4 horas
  
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function joinRoom(roomId: string, playerName: string, playerId: string, playerAvatar: number): Room | null {
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
    avatar: playerAvatar,
  });
  
  return room;
}

export function removePlayer(roomId: string, playerId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  room.players = room.players.filter((p: Player) => p.id !== playerId);
  
  // Si sale el host, asignar a otro
  if (room.players.length > 0 && !room.players.some((p: Player) => p.isHost)) {
    room.players[0].isHost = true;
  }
  
  // Si no quedan jugadores, eliminar sala
  if (room.players.length === 0) {
    rooms.delete(roomId);
  }
  
  return true;
}

export function transferHost(roomId: string, newHostPlayerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  // Encontrar el nuevo host
  const newHost = room.players.find((p: Player) => p.id === newHostPlayerId);
  if (!newHost) return null;
  
  // Remover host anterior de jugadores activos
  room.players.forEach((p: Player) => {
    if (p.isHost) {
      p.isHost = false;
    }
  });
  
  // Buscar y actualizar host anterior en desconectados
  if (room.disconnectedPlayers) {
    for (const [id, disconnectedData] of room.disconnectedPlayers.entries()) {
      if (disconnectedData.isHost) {
        disconnectedData.isHost = false;
        console.log(`[transferHost] Updated disconnected player ${id} to isHost: false`);
      }
    }
  }
  
  // Asignar nuevo host
  newHost.isHost = true;
  
  return room;
}

export function markPlayerDisconnected(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  const player = room.players.find((p: Player) => p.id === playerId);
  if (!player) return null;
  
  // Si la partida está activa, marcar como desconectado en lugar de remover
  if (room.isGameStarted) {
    if (!room.disconnectedPlayers) {
      room.disconnectedPlayers = new Map();
    }
    room.disconnectedPlayers.set(playerId, {
      name: player.name,
      avatar: player.avatar,
      isHost: player.isHost
    });
    
    console.log(`Marked player ${player.name} (${playerId}) as disconnected from room ${roomId}`);
    
    // Remover de los jugadores activos
    room.players = room.players.filter((p: Player) => p.id !== playerId);
    
    // Si el que se desconectó era host, asignar a otro
    if (!room.players.some((p: Player) => p.isHost) && room.players.length > 0) {
      room.players[0].isHost = true;
      // Limpiar el flag de host de todos los desconectados
      if (room.disconnectedPlayers) {
        for (const [id, disconnectedData] of room.disconnectedPlayers.entries()) {
          if (disconnectedData.isHost) {
            disconnectedData.isHost = false;
            console.log(`[markPlayerDisconnected] Cleared isHost from disconnected player ${id}`);
          }
        }
      }
      console.log(`New host assigned: ${room.players[0].name}`);
    }
    
    return room;
  } else {
    // Si no ha empezado, remover normalmente
    removePlayer(roomId, playerId);
    return room;
  }
}

export function reconnectPlayer(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  const disconnectedData = room.disconnectedPlayers?.get(playerId);
  if (!disconnectedData) return null;
  
  // Agregar de nuevo a la lista de jugadores
  room.players.push({
    id: playerId,
    name: disconnectedData.name,
    isHost: disconnectedData.isHost,
    avatar: disconnectedData.avatar
  });
  
  // Remover de desconectados
  room.disconnectedPlayers?.delete(playerId);
  
  return room;
}

export function findAndMarkPlayerDisconnected(playerId: string): { roomId: string; room: Room; playerName: string } | null {
  for (const [roomId, room] of rooms.entries()) {
    const player = room.players.find((p: Player) => p.id === playerId);
    if (player) {
      const playerName = player.name;
      
      if (room.isGameStarted) {
        // Marcar como desconectado si hay partida activa
        const updatedRoom = markPlayerDisconnected(roomId, playerId);
        if (updatedRoom) {
          return { roomId, room: updatedRoom, playerName };
        }
      } else {
        // Remover si no hay partida
        removePlayer(roomId, playerId);
        const updatedRoom = getRoom(roomId);
        return { roomId, room: updatedRoom || room, playerName };
      }
    }
  }
  return null;
}

// ============================================================
// Filtro para remover versiones alteradas (mix, remix, instrumental, live, etc)
// Y también filtra canciones sin previewUrl válida
// ============================================================
function filterOutRemixes(songs: Song[]): Song[] {
  const keywords = [
    'remix',
    'instrumental',
    'live',
    'unplugged',
    'acoustic',
    'radio edit',
    'club mix',
    'house mix',
    'dub',
    'bootleg',
    'mashup',
    'cover',
    'edit',
    'remix version',
    'en vivo',
    'karaoke',
    'demo',
    'track by track'
  ];

  return songs.filter(song => {
    // Filtrar por previewUrl válida
    if (!song.previewUrl || song.previewUrl.trim() === '') {
      return false;
    }
    const lowerName = song.name.toLowerCase();
    return !keywords.some(keyword => lowerName.includes(keyword));
  });
}

// ============================================================
// Filtro especial para Soundtrack: PERMITE instrumentales
// ============================================================
function filterOutRemixesAllowInstrumental(songs: Song[]): Song[] {
  const keywords = [
    'mix',
    'remix',
    // 'instrumental' - PERMITIDO para Soundtrack
    'live',
    'unplugged',
    'acoustic',
    'radio edit',
    'club mix',
    'house mix',
    'dub',
    'bootleg',
    'mashup',
    'cover',
    'edit',
    'remix version',
    'en vivo',
    'karaoke',
    'demo',
    'track by track'
  ];

  return songs.filter(song => {
    // Filtrar por previewUrl válida
    if (!song.previewUrl || song.previewUrl.trim() === '') {
      return false;
    }
    const lowerName = song.name.toLowerCase();
    return !keywords.some(keyword => lowerName.includes(keyword));
  });
}

// ============================================================
// Carga de canciones para modos que NO son year
// ============================================================
async function fetchSongsForConfig(config: GameConfig): Promise<Song[]> {
  try {
    switch (config.selectionType) {
      case 'genre':
        if (config.genre) {
          console.log(`[fetchSongsForConfig] Fetching by genre: ${config.genre}`);
          const songs = await deezer.searchByGenre(config.genre, 500);
          console.log(`[fetchSongsForConfig] Got ${songs.length} songs from genre search`);
          // Para Soundtrack: permitir instrumentales. Para otros géneros: filtrar todo.
          const filtered = config.genre === 'Soundtrack' 
            ? filterOutRemixesAllowInstrumental(songs)
            : filterOutRemixes(songs);
          console.log(`[fetchSongsForConfig] After filtering remixes: ${filtered.length} songs (${config.genre === 'Soundtrack' ? 'instrumentals ALLOWED' : 'instrumentals FILTERED'})`);
          return filtered;
        }
        break;
        
      case 'artist':
        if (config.artist) {
          console.log(`[fetchSongsForConfig] Fetching by artist: ${config.artist}`);
          const songs = await deezer.searchByArtist(config.artist, 300);
          console.log(`[fetchSongsForConfig] Got ${songs.length} songs from artist search`);
          return songs; // Sin filtros adicionales
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
      return await deezer.searchByArtist(value, 150); // Sin filtros
    case 'year':
      return await deezer.searchByYear(parseInt(value), 25);
    case 'genre':
      // VERSUS GENRE MODE: Get 1 song from 20 different random artists
      return await deezer.searchGenreForVersus(value, 20);
    case 'decade':
      const decade = parseInt(value);
      return await deezer.searchByDecade(decade, decade + 9, 50);
    default:
      return [];
  }
}

function calculateTotalRounds(config: GameConfig, totalSongs: number): number {
  // Si el usuario especificó totalRounds y no es year/decade, usar ese valor
  if (config.totalRounds !== undefined && config.totalRounds > 0 && config.selectionType !== 'year' && config.selectionType !== 'decade') {
    return config.totalRounds;
  }

  switch (config.selectionType) {
    case 'genre':
    case 'artist':
      return 20; // Default si no se especificó totalRounds
      
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
  if (!room || room.players.length < 1) {
    console.error(`[StartGame] Room not found or no players: ${roomId}`);
    return false;
  }
  
  console.log(`[StartGame] Starting game - Mode: ${config.selectionType}, songsPerRound: ${config.songsPerRound}, totalRounds from config: ${config.totalRounds}`);
  
  room.gameConfig = config;
  room.isGameStarted = true;

  try {
    if (config.selectionType === 'year' && config.yearRange) {
      // ---- Modo AÑO: arranque robusto (menos requests simultáneas) ----
      console.log(`[StartGame] Year mode: ${config.yearRange.start}-${config.yearRange.end}`);
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

      // Validar que cada año tenga suficientes canciones
      const songsPerRoundYear = config.songsPerRound || 6;
      const playableYears = allYears.filter(year => {
        const yearSongs = room.yearSongPool?.get(year) || [];
        return yearSongs.length >= songsPerRoundYear;
      });
      
      if (playableYears.length < totalYears) {
        console.log(`[Year Mode] ⚠️ WARNING: Some years have insufficient songs!`);
        console.log(`   - Total years: ${totalYears}`);
        console.log(`   - Playable years: ${playableYears.length}`);
        console.log(`   - Songs per round: ${songsPerRoundYear}`);
        if (playableYears.length === 0) {
          console.warn(`[Year Mode] ERROR: No playable years found! Game cannot start.`);
        }
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

    } else if (config.selectionType === 'versus' && config.versusConfig) {
      // ---- Modo VERSUS: cargar canciones de ambos artistas por separado ----
      console.log(`[StartGame] Versus mode: ${config.versusConfig.option1} vs ${config.versusConfig.option2}`);
      const type = config.versusConfig.type;
      const option1 = config.versusConfig.option1;
      const option2 = config.versusConfig.option2;

      // Cargar canciones para ambos artistas
      const songs1 = await fetchSongsForVersus(type, option1);
      const songs2 = await fetchSongsForVersus(type, option2);

      // Filtrar canciones con preview y deduplicar
      room.versusSongsOption1 = dedupeSongs(songs1).filter(song => song.previewUrl !== null);
      room.versusSongsOption2 = dedupeSongs(songs2).filter(song => song.previewUrl !== null);
      room.versusUsedIndices1 = new Set();
      room.versusUsedIndices2 = new Set();
      room.allSongs = []; // No se usa en modo versus
      // Respetar totalRounds del usuario, o 20 por defecto
      room.totalRounds = config.totalRounds && config.totalRounds > 0 ? config.totalRounds : 20;

      console.log(`[Versus Mode] Songs loaded: ${room.versusSongsOption1.length} (${option1}), ${room.versusSongsOption2.length} (${option2}), totalRounds: ${room.totalRounds}`);
      // Emitir progreso completado para modo versus
      if (onProgress) {
        onProgress(1, 1);
      }
    } else {
      // ---- Otros modos: pool global ----
      console.log(`[StartGame] Other mode (${config.selectionType}): fetching songs...`);
      const allSongs = await fetchSongsForConfig(config);
      console.log(`[StartGame] Fetched ${allSongs.length} songs total`);
      
      // Filtrar ESTRICTAMENTE: solo canciones con previewUrl válida (no null, no vacío)
      room.allSongs = allSongs.filter(song => {
        const isValid = song.previewUrl && song.previewUrl.trim().length > 0;
        if (!isValid) {
          console.log(`[StartGame] Filtering out song without valid preview: "${song.name}" by ${song.artist}`);
        }
        return isValid;
      });
      
      console.log(`[StartGame] Songs with valid preview: ${room.allSongs.length}/${allSongs.length}`);
      
      // Mostrar primeras 3 y últimas 3 canciones para debug
      if (room.allSongs.length > 0) {
        console.log(`[StartGame] First 3 songs with preview:`, room.allSongs.slice(0, 3).map(s => `"${s.name}" - ${s.artist}`));
        if (room.allSongs.length > 3) {
          console.log(`[StartGame] Last 3 songs with preview:`, room.allSongs.slice(-3).map(s => `"${s.name}" - ${s.artist}`));
        }
      }
      
      room.totalRounds = calculateTotalRounds(config, room.allSongs.length);
      
      // ============================================================
      // LIMITACIÓN DE RONDAS: solo para modo ARTISTA normal (no para género ni década)
      // ============================================================
      if (config.selectionType === 'artist') {
        const songsPerRound = config.songsPerRound || 6;
        const requiredSongs = room.totalRounds * songsPerRound;
        
        if (room.allSongs.length < requiredSongs) {
          const maxAvailableRounds = Math.floor(room.allSongs.length / songsPerRound);
          console.log(`[StartGame] ⚠️ LIMITED ROUNDS: Artist has insufficient songs!`);
          console.log(`   - Available songs: ${room.allSongs.length}`);
          console.log(`   - Songs per round: ${songsPerRound}`);
          console.log(`   - Requested rounds: ${room.totalRounds}`);
          console.log(`   - Required songs: ${requiredSongs}`);
          console.log(`   - Max available rounds: ${maxAvailableRounds}`);
          room.totalRounds = Math.max(1, maxAvailableRounds); // Al menos 1 ronda
        }
      }
      
      console.log(`[StartGame] Final config - Mode: ${config.selectionType}, selectedRounds: ${config.totalRounds}, calculatedRounds: ${room.totalRounds}, songsPerRound: ${config.songsPerRound}`);
      // Emitir progreso completado para otros modos
      if (onProgress) {
        onProgress(1, 1);
      }
    }
    
    console.log(`[StartGame] SUCCESS - totalRounds is ${room.totalRounds}`);
    return true;
  } catch (error) {
    console.error(`[StartGame] FAILED with error:`, error);
    return false;
  }
}

/**
 * Selecciona canciones con distancia mínima entre artistas.
 * Asegura que el mismo artista no aparezca en rondas consecutive.
 */
function selectSongsWithArtistDistancing(
  songs: Song[],
  songsPerRound: number,
  roundNumber: number,
  room: Room,
  minDistance: number = 1
): Song[] {
  // Extraer artistas únicos de las canciones disponibles
  const artistSongsMap = new Map<string, Song[]>();
  for (const song of songs) {
    if (!artistSongsMap.has(song.artist)) {
      artistSongsMap.set(song.artist, []);
    }
    artistSongsMap.get(song.artist)!.push(song);
  }

  const { artistRoundHistory = new Map() } = room;

  // Intentar seleccionar artistas respetando la distancia deseada
  // Si no hay suficientes, reducir la distancia progresivamente
  let availableArtists: string[] = [];
  let currentMinDistance = minDistance;

  while (availableArtists.length < songsPerRound && currentMinDistance >= 0) {
    availableArtists = [];
    
    for (const artist of artistSongsMap.keys()) {
      const lastRound = artistRoundHistory.get(artist);
      
      // Si nunca apareció o respeta la distancia mínima, está disponible
      if (lastRound === undefined || (roundNumber - lastRound) > currentMinDistance) {
        availableArtists.push(artist);
      }
    }
    
    // Si encontramos suficientes artistas, salir del loop
    if (availableArtists.length >= songsPerRound) {
      break;
    }
    
    // Reducir la distancia y intentar de nuevo
    currentMinDistance--;
  }

  // Si aún no hay suficientes, usar todos los artistas disponibles
  const artistsToUse = availableArtists.length > 0 ? availableArtists : Array.from(artistSongsMap.keys());
  
  // Determinar cuántos artistas seleccionar
  const selectedArtistsCount = Math.min(songsPerRound, artistsToUse.length);
  
  console.log(
    `[SelectSongs] Round ${roundNumber}: ` +
    `Available artists: ${availableArtists.length}/${artistSongsMap.size}, ` +
    `Selecting ${selectedArtistsCount} artists for ${songsPerRound} songs, ` +
    `minDistance: ${currentMinDistance} (requested: ${minDistance})`
  );

  // Seleccionar artistas al azar usando Fisher-Yates shuffle
  const shuffledArtists = fisherYatesShuffle(artistsToUse);
  const selectedArtists = shuffledArtists.slice(0, selectedArtistsCount);

  // Para cada artista, seleccionar 1 canción al azar
  const selectedSongs: Song[] = [];
  const roundArtistsSet = new Set<string>();

  for (const artist of selectedArtists) {
    const artistSongs = artistSongsMap.get(artist)!;
    const randomSong = artistSongs[Math.floor(Math.random() * artistSongs.length)];
    selectedSongs.push(randomSong);
    roundArtistsSet.add(artist);

    // Actualizar historial: este artista acaba de aparecer en esta ronda
    if (!room.artistRoundHistory) {
      room.artistRoundHistory = new Map();
    }
    room.artistRoundHistory.set(artist, roundNumber);
  }

  // Hacer shuffle de las canciones finales para que no salgan en orden
  const shuffledSongs = fisherYatesShuffle(selectedSongs);

  // Guardar artistas de esta ronda para referencia futura
  if (!room.roundArtists) {
    room.roundArtists = new Map();
  }
  room.roundArtists.set(roundNumber, roundArtistsSet);

  console.log(
    `[SelectSongs] Round ${roundNumber} artists: ${selectedArtists.join(', ')}`
  );
  
  return shuffledSongs;
}

function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function generateRound(roomId: string): Promise<Round | null> {
  const room = rooms.get(roomId);
  if (!room || !room.gameConfig) {
    console.error(`[GenerateRound] Room not found or no config for roomId: ${roomId}`);
    return null;
  }
  
  try {
    const { songsPerRound, selectionType, yearRange, decadeRange, versusConfig } = room.gameConfig;
    const roundNumber = room.currentRound ? room.currentRound.roundNumber + 1 : 1;
    
    // Verificar si ya alcanzamos el total de rondas
    if (roundNumber > room.totalRounds) {
      console.log(`[GenerateRound] Game ended. Round ${roundNumber} exceeds total rounds ${room.totalRounds}`);
      return null;
    }
    
    console.log(`[GenerateRound] Generating round ${roundNumber}/${room.totalRounds} for mode ${selectionType}`);
    
    let selectedSongs: Song[] = [];
    
    // Para VERSUS mode: 1 canción de cada artista
    if (selectionType === 'versus' && versusConfig && room.versusSongsOption1 && room.versusSongsOption2) {
      const songsOption1 = room.versusSongsOption1.filter((song, idx) => !room.versusUsedIndices1?.has(idx));
      const songsOption2 = room.versusSongsOption2.filter((song, idx) => !room.versusUsedIndices2?.has(idx));

      if (songsOption1.length === 0 || songsOption2.length === 0) {
        console.log(`[Versus] Not enough songs: ${songsOption1.length} from option1, ${songsOption2.length} from option2`);
        return null;
      }

      // Seleccionar una canción al azar de cada artista
      const song1 = songsOption1[Math.floor(Math.random() * songsOption1.length)];
      const song2 = songsOption2[Math.floor(Math.random() * songsOption2.length)];

      // Marcar como usadas
      const idx1 = room.versusSongsOption1.indexOf(song1);
      const idx2 = room.versusSongsOption2.indexOf(song2);
      room.versusUsedIndices1?.add(idx1);
      room.versusUsedIndices2?.add(idx2);

      // Shuffle para que no siempre salga primero el artista 1
      selectedSongs = [song1, song2].sort(() => Math.random() - 0.5);
      console.log(`[Versus Round ${roundNumber}] Selected songs: ${song1.artist} - ${song1.name} and ${song2.artist} - ${song2.name}`);
    }
    // Para year mode, obtener SOLO las canciones del año actual de esa ronda
    else if (selectionType === 'year' && yearRange) {
      const currentYear = yearRange.start + (roundNumber - 1);
      if (currentYear > yearRange.end) {
        console.log(`End of year range. Current year ${currentYear} exceeds end ${yearRange.end}`);
        return null; // Ya pasamos el rango de años
      }
      console.log(`[Ronda ${roundNumber}] Fetching songs for year ${currentYear}...`);
      const availableSongs = await deezer.searchByYear(currentYear, 100);
      console.log(`[Ronda ${roundNumber}] Got ${availableSongs.length} songs for year ${currentYear}`);
      
      if (availableSongs.length < songsPerRound) {
        console.log(`Not enough songs: ${availableSongs.length} < ${songsPerRound}`);
        return null;
      }
      
      const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
      selectedSongs = shuffled.slice(0, songsPerRound);
    } 
    // Para decade mode, obtener SOLO las canciones de la década actual de esa ronda
    else if (selectionType === 'decade' && decadeRange) {
      const currentDecade = decadeRange.start + (roundNumber - 1) * 10;
      if (currentDecade > decadeRange.end) {
        console.log(`End of decade range. Current decade ${currentDecade} exceeds end ${decadeRange.end}`);
        return null; // Ya pasamos el rango de décadas
      }
      console.log(`[Ronda ${roundNumber}] Fetching songs for decade ${currentDecade}s...`);
      const availableSongs = await deezer.searchByDecade(currentDecade, currentDecade + 9, 100);
      console.log(`[Ronda ${roundNumber}] Got ${availableSongs.length} songs for decade ${currentDecade}s`);
      
      if (availableSongs.length < songsPerRound) {
        console.log(`Not enough songs: ${availableSongs.length} < ${songsPerRound}`);
        return null;
      }
      
      const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
      selectedSongs = shuffled.slice(0, songsPerRound);
    }
    else {
      // Para otros modos (genre, artist, etc.), usar las canciones pre-cargadas
      const availableSongs = room.allSongs.filter(song => !room.usedSongIds.has(song.id));
      
      if (availableSongs.length < songsPerRound) {
        console.log(`Not enough songs: ${availableSongs.length} < ${songsPerRound}`);
        return null;
      }

      // MODE ESPECÍFICO: ARTIST
      // En modo artista, NO usar artist distancing. Solo seleccionar canciones del pool.
      if (selectionType === 'artist') {
        console.log(`[SelectSongs] ARTIST MODE: Selecting ${songsPerRound} songs from ${availableSongs.length} available`);
        const shuffled = availableSongs.sort(() => Math.random() - 0.5);
        selectedSongs = shuffled.slice(0, songsPerRound);
      } else {
        // MODE ESPECÍFICO: GENRE o VERSUS
        // Con múltiples artistas, usar artist distancing
        const totalSongsNeeded = room.totalRounds * songsPerRound;
        const estimatedArtists = 40;
        
        let dynamicMinDistance = Math.max(
          0,
          Math.floor((estimatedArtists / songsPerRound) - (room.totalRounds / 5))
        );
        
        console.log(
          `[DistanceCalc] GENRE/VERSUS MODE - Total songs needed: ${totalSongsNeeded}, ` +
          `Estimated artists: ${estimatedArtists}, ` +
          `Songs per round: ${songsPerRound}, ` +
          `Calculated minDistance: ${dynamicMinDistance}`
        );
        
        selectedSongs = selectSongsWithArtistDistancing(
          availableSongs,
          songsPerRound,
          roundNumber,
          room,
          dynamicMinDistance
        );
      }
      
      // Marcar como usadas
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
  } catch (error) {
    console.error(`[GenerateRound] ERROR:`, error);
    return null;
  }
}

/**
 * Agrega un jugador a la lista de espera para la siguiente ronda
 * Se usa cuando un jugador se conecta de nuevo durante una ronda activa
 */
export function addWaitingPlayer(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (!room.waitingPlayers) {
    room.waitingPlayers = new Set();
  }

  room.waitingPlayers.add(playerId);
  console.log(`[WaitingPlayers] Player ${playerId} added to waiting list for room ${roomId}`);
  
  return room;
}

/**
 * Limpia la lista de jugadores esperando cuando comienza una nueva ronda
 */
export function clearWaitingPlayers(roomId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (room.waitingPlayers) {
    console.log(`[WaitingPlayers] Clearing waiting players for room ${roomId} (count: ${room.waitingPlayers.size})`);
    room.waitingPlayers.clear();
  }
  
  return room;
}

/**
 * Verifica si un jugador está en la lista de espera
 */
export function isPlayerWaiting(roomId: string, playerId: string): boolean {
  const room = rooms.get(roomId);
  if (!room || !room.waitingPlayers) return false;
  return room.waitingPlayers.has(playerId);
}

export function submitVote(roomId: string, playerId: string, songId: string): boolean {
  const room = rooms.get(roomId);
  if (!room || !room.currentRound) return false;
  
  // Si el jugador está esperando, no permitir voto
  if (room.waitingPlayers && room.waitingPlayers.has(playerId)) {
    console.log(`[submitVote] Player ${playerId} is waiting - vote rejected`);
    return false;
  }
  
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
  room.versusSongsOption1 = undefined;
  room.versusSongsOption2 = undefined;
  room.versusUsedIndices1 = undefined;
  room.versusUsedIndices2 = undefined;
  
  // Limpiar desconectados y jugadores esperando para nueva partida
  room.disconnectedPlayers?.clear();
  room.waitingPlayers?.clear();
  
  console.log(`[ResetGame] Game reset for room ${roomId} - cleared disconnected and waiting players`);
  
  return true;
}
