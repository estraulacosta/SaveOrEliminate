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
  totalRounds: number;
  isGameStarted: boolean;
  createdAt: number;
}
