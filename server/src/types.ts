export interface Song {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  albumArt: string;
  spotifyUrl: string;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export type GameMode = 'save' | 'eliminate';
export type MusicSelectionType = 'genre' | 'artist' | 'year' | 'decade' | 'versus';

export interface GameConfig {
  mode: GameMode;
  selectionType: MusicSelectionType;
  songsPerRound: number; // 2-6
  
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
}

export interface Room {
  id: string;
  players: Player[];
  gameConfig: GameConfig | null;
  currentRound: Round | null;
  allSongs: Song[]; // Pool de canciones para toda la partida
  usedSongIds: Set<string>; // IDs de canciones ya usadas
  artistSongs?: { // Para modo versus artista
    artist1: Song[];
    artist2: Song[];
  };
  usedSongsByArtist?: {
    artist1: Set<string>; // IDs de canciones usadas del artista 1
    artist2: Set<string>; // IDs de canciones usadas del artista 2
  };
  yearSongs?: { // Para modo versus año
    year1: Song[];
    year2: Song[];
  };
  usedSongsByYear?: {
    year1: Set<string>; // IDs de canciones usadas del año 1
    year2: Set<string>; // IDs de canciones usadas del año 2
  };
  genreSongs?: { // Para modo versus género
    genre1: Song[];
    genre2: Song[];
  };
  usedSongsByGenre?: {
    genre1: Set<string>; // IDs de canciones usadas del género 1
    genre2: Set<string>; // IDs de canciones usadas del género 2
  };
  decadeSongs?: { // Para modo versus década
    decade1: Song[];
    decade2: Song[];
  };
  usedSongsByDecade?: {
    decade1: Set<string>; // IDs de canciones usadas de la década 1
    decade2: Set<string>; // IDs de canciones usadas de la década 2
  };
  totalRounds: number;
  isGameStarted: boolean;
  createdAt: number;
}
