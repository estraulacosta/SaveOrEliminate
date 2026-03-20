export interface Song {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  albumArt: string;
  spotifyUrl: string;
  releaseYear?: number;
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
  songsPerRound: number;
  totalRounds?: number;
  genre?: string;
  artist?: string;
  yearRange?: { start: number; end: number };
  decadeRange?: { start: number; end: number };
  versusConfig?: {
    type: 'artist' | 'year' | 'genre' | 'decade';
    option1: string;
    option2: string;
  };
  currentYear?: number;
  currentDecade?: number;
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
  yearLabel?: string; // Solo en modo año, ej: "1985"
}

export interface Room {
  id: string;
  players: Player[];
  gameConfig: GameConfig | null;
  currentRound: Round | null;
  allSongs: Song[];
  usedSongIds: Set<string>;
  totalRounds: number;
  isGameStarted: boolean;
  createdAt: number;
}
