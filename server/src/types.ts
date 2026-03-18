export interface Song {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  albumArt: string;
  spotifyUrl: string;
  releaseYear?: number;
  albumName?: string;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  avatar: number;
}

export type GameMode = 'save' | 'eliminate';
export type MusicSelectionType = 'genre' | 'artist' | 'year' | 'decade' | 'versus';

export interface GameConfig {
  mode: GameMode;
  selectionType: MusicSelectionType;
  songsPerRound: number; // 2-6
  totalRounds?: number; // 1-20 (opcional, según tipo de selección)
  
  // Valores según el tipo de selección
  genre?: string;
  artist?: string;
  yearRange?: { start: number; end: number };
  decadeRange?: { start: number; end: number }; // 1960, 1970, etc.
  versusConfig?: {
    type: 'artist' | 'year' | 'genre' | 'decade';
    option1: string;
    option2: string;
  };
}

export interface Vote {
  playerId: string;
  songId: string;
}

export interface Round {
  roundNumber: number;
  songs: Song[];
  votes: Vote[];
  isPaused: boolean;
  timerStarted: boolean;
  yearLabel?: string; // Solo para modo por año, ej: "1985"
}

export interface Room {
  id: string;
  players: Player[];
  gameConfig: GameConfig | null;
  currentRound: Round | null;
  allSongs: Song[]; // Pool de canciones para toda la partida (modos no-año)
  usedSongIds: Set<string>; // IDs de canciones ya usadas
  totalRounds: number;
  isGameStarted: boolean;
  createdAt: number;
  // Modo año: pool pre-cargado por año { "1985": Song[], "1986": Song[], ... }
  yearSongPool?: Map<number, Song[]>;
  yearSongLoadPromises?: Map<number, Promise<Song[]>>;
  currentYearIndex?: number; // índice del año actual en el modo año
  // Modo versus: pools de canciones de cada artista
  versusSongsOption1?: Song[];
  versusSongsOption2?: Song[];
  versusUsedIndices1?: Set<number>;
  versusUsedIndices2?: Set<number>;
}
