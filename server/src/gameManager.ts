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

export function findAndRemovePlayerFromAllRooms(playerId: string): { roomId: string; room: Room; playerName: string } | null {
  for (const [roomId, room] of rooms.entries()) {
    const player = room.players.find((p: Player) => p.id === playerId);
    if (player) {
      removePlayer(roomId, playerId);
      return { roomId, room, playerName: player.name };
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
// Filtro por artista principal: solo canciones donde el artista es el especificado
// (sin features, colaboraciones, etc)
// ============================================================
function filterByPrimaryArtist(songs: Song[], targetArtistName: string): Song[] {
  const normalizeArtistName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, ' '); // Normalizar espacios
  };

  const targetNormalized = normalizeArtistName(targetArtistName);

  return songs.filter(song => {
    // Verificar si el artista aparece en el campo de artista (como substring)
    // Incluye: artista principal, features (ft., feat., &, x, etc)
    const songArtistNormalized = normalizeArtistName(song.artist);
    const isMatch = songArtistNormalized.includes(targetNormalized);
    
    if (!isMatch) {
      console.log(`[filterByArtist] Filtered out: "${song.name}" by ${song.artist}`);
    }

    // Exclusión especial: Taylor Swift - excluir "reputation Stadium Tour Surprise Song Playlist"
    if (isMatch && normalizeArtistName(targetArtistName) === normalizeArtistName('taylor swift')) {
      const albumNormalized = normalizeArtistName(song.albumName || '');
      const excludeAlbumNormalized = normalizeArtistName('reputation Stadium Tour Surprise Song Playlist');
      
      if (albumNormalized === excludeAlbumNormalized) {
        console.log(`[filterByArtist] Excluded Taylor Swift track: "${song.name}" from excluded album: ${song.albumName}`);
        return false;
      }
    }

    return isMatch;
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
          const filtered = filterOutRemixes(songs);
          console.log(`[fetchSongsForConfig] After filtering remixes: ${filtered.length} songs`);
          
          // Filtro adicional: solo canciones del artista principal (sin features)
          const filteredByPrimaryArtist = filterByPrimaryArtist(filtered, config.artist);
          console.log(`[fetchSongsForConfig] After filtering by primary artist: ${filteredByPrimaryArtist.length} songs`);
          
          // Show first 3 and last 3
          if (filteredByPrimaryArtist.length > 0) {
            console.log(`[fetchSongsForConfig] First 3: ${filteredByPrimaryArtist.slice(0, 3).map(s => `"${s.name}" (${s.artist}) (preview: ${s.previewUrl ? 'YES' : 'NO'})`).join(', ')}`);
            if (filteredByPrimaryArtist.length > 3) {
              console.log(`[fetchSongsForConfig] Last 3: ${filteredByPrimaryArtist.slice(-3).map(s => `"${s.name}" (${s.artist}) (preview: ${s.previewUrl ? 'YES' : 'NO'})`).join(', ')}`);
            }
          }
          return filteredByPrimaryArtist;
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
      const artistSongs = await deezer.searchByArtist(value, 150);
      const filteredRemixes = filterOutRemixes(artistSongs);
      // Filtro adicional: solo artista principal
      return filterByPrimaryArtist(filteredRemixes, value);
    case 'year':
      return await deezer.searchByYear(parseInt(value), 25);
    case 'genre':
      const genreSongs = await deezer.searchByGenre(value, 50);
      return filterOutRemixes(genreSongs);
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


export async function generateRound(roomId: string): Promise<Round | null> {
  const room = rooms.get(roomId);
  if (!room || !room.gameConfig) {
    console.error(`[GenerateRound] Room not found or no config for roomId: ${roomId}`);
    return null;
  }
  
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
    // Para otros modos, usar las canciones pre-cargadas
    const availableSongs = room.allSongs.filter(song => !room.usedSongIds.has(song.id));
    
    if (availableSongs.length < songsPerRound) {
      console.log(`Not enough songs: ${availableSongs.length} < ${songsPerRound}`);
      return null;
    }
    
    const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
    selectedSongs = shuffled.slice(0, songsPerRound);
    
    // Marcar como usadas
    selectedSongs.forEach(song => room.usedSongIds.add(song.id));
  }
  
  // Verificar que TODAS las canciones tienen previewUrl válida antes de enviar al cliente
  const invalidSongs = selectedSongs.filter(song => !song.previewUrl || song.previewUrl.trim().length === 0);
  if (invalidSongs.length > 0) {
    console.error(`[GenerateRound] WARNING: ${invalidSongs.length} songs without valid preview URL:`, invalidSongs.map(s => `"${s.name}" - ${s.artist}`));
  }
  
  console.log(`[GenerateRound] Round ${roundNumber} songs:`, selectedSongs.map((s, i) => `${i+1}. "${s.name}" by ${s.artist} (preview: ${s.previewUrl ? s.previewUrl.substring(0, 50) + '...' : 'NONE'})`));
  
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
  
  return true;
}
