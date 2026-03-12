import { useState, useEffect } from 'react';
import { socket } from './socket';
import type { Room, Player, GameConfig, Round, Vote } from './types';
import Home from './screens/Home';
import EnterName from './screens/EnterName';
import Lobby from './screens/Lobby';
import GameModeSelect from './screens/GameModeSelect';
import MusicTypeSelect from './screens/MusicTypeSelect';
import SongsPerRoundSelect from './screens/SongsPerRoundSelect';
import GenreSelect from './screens/GenreSelect';
import ArtistSelect from './screens/ArtistSelect';
import YearSelect from './screens/YearSelect';
import DecadeSelect from './screens/DecadeSelect';
import VersusSelect from './screens/VersusSelect';
import GamePlay from './screens/GamePlay';
import VoteResults from './screens/VoteResults';
import GameFinished from './screens/GameFinished';

type Screen = 
  | 'home'
  | 'enter-name'
  | 'lobby'
  | 'game-mode-select'
  | 'music-type-select'
  | 'songs-per-round'
  | 'genre-select'
  | 'artist-select'
  | 'year-select'
  | 'decade-select'
  | 'versus-select'
  | 'gameplay'
  | 'vote-results'
  | 'game-finished';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [room, setRoom] = useState<Room | null>(null);
  const [, setPlayerName] = useState('');
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [gameConfig, setGameConfig] = useState<Partial<GameConfig>>({});
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [totalRounds, setTotalRounds] = useState(0);
  const [votes, setVotes] = useState<Vote[]>([]);

  useEffect(() => {
    socket.on('room-created', (newRoom: Room) => {
      setRoom(newRoom);
      setCurrentScreen('lobby');
    });

    socket.on('room-joined', (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setCurrentScreen('lobby');
    });

    socket.on('player-joined', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on('game-started', ({ round, totalRounds: total }: { round: Round; totalRounds: number }) => {
      setCurrentRound(round);
      setTotalRounds(total);
      setCurrentScreen('gameplay');
    });

    socket.on('timer-started', () => {
      if (currentRound) {
        setCurrentRound({ ...currentRound, timerStarted: true });
      }
    });

    socket.on('timer-paused', ({ isPaused }: { isPaused: boolean }) => {
      if (currentRound) {
        setCurrentRound({ ...currentRound, isPaused });
      }
    });

    socket.on('vote-submitted', ({ votes: newVotes }: { votes: Vote[]; players: Player[] }) => {
      setVotes(newVotes);
    });

    socket.on('new-round', ({ round, totalRounds: total }: { round: Round; totalRounds: number }) => {
      setCurrentRound(round);
      setTotalRounds(total);
      setVotes([]);
      setCurrentScreen('gameplay');
    });

    socket.on('game-finished', () => {
      setCurrentScreen('game-finished');
    });

    socket.on('game-reset', (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setGameConfig({});
      setCurrentRound(null);
      setVotes([]);
      setCurrentScreen('lobby');
    });

    socket.on('error', ({ message }: { message: string }) => {
      alert(message);
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('game-started');
      socket.off('timer-started');
      socket.off('timer-paused');
      socket.off('vote-submitted');
      socket.off('new-round');
      socket.off('game-finished');
      socket.off('game-reset');
      socket.off('error');
    };
  }, [currentRound]);

  const isHost = room?.players.find(p => p.id === socket.id)?.isHost || false;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <Home onAction={(action, roomId) => {
          if (action === 'create') {
            setCurrentScreen('enter-name');
          } else {
            setPendingRoomId(roomId || null);
            setCurrentScreen('enter-name');
          }
        }} />;

      case 'enter-name':
        return <EnterName
          onSubmit={(name) => {
            setPlayerName(name);
            if (pendingRoomId) {
              socket.emit('join-room', { roomId: pendingRoomId, playerName: name });
            } else {
              socket.emit('create-room', { playerName: name });
            }
          }}
        />;

      case 'lobby':
        return <Lobby
          room={room!}
          isHost={isHost}
          onStartGame={() => setCurrentScreen('game-mode-select')}
        />;

      case 'game-mode-select':
        return <GameModeSelect
          onSelect={(mode) => {
            setGameConfig({ ...gameConfig, mode });
            setCurrentScreen('music-type-select');
          }}
        />;

      case 'music-type-select':
        return <MusicTypeSelect
          onSelect={(type) => {
            setGameConfig({ ...gameConfig, selectionType: type });
            setCurrentScreen('songs-per-round');
          }}
        />;

      case 'songs-per-round':
        return <SongsPerRoundSelect
          onSelect={(count) => {
            setGameConfig({ ...gameConfig, songsPerRound: count });
            const type = gameConfig.selectionType;
            if (type === 'genre') setCurrentScreen('genre-select');
            else if (type === 'artist') setCurrentScreen('artist-select');
            else if (type === 'year') setCurrentScreen('year-select');
            else if (type === 'decade') setCurrentScreen('decade-select');
            else if (type === 'versus') setCurrentScreen('versus-select');
          }}
        />;

      case 'genre-select':
        return <GenreSelect
          onSelect={(genre) => {
            const config = { ...gameConfig, genre } as GameConfig;
            socket.emit('start-game', { roomId: room!.id, config });
          }}
        />;

      case 'artist-select':
        return <ArtistSelect
          onSelect={(artist) => {
            const config = { ...gameConfig, artist } as GameConfig;
            socket.emit('start-game', { roomId: room!.id, config });
          }}
        />;

      case 'year-select':
        return <YearSelect
          onSelect={(yearRange) => {
            const config = { ...gameConfig, yearRange } as GameConfig;
            socket.emit('start-game', { roomId: room!.id, config });
          }}
        />;

      case 'decade-select':
        return <DecadeSelect
          onSelect={(decadeRange) => {
            const config = { ...gameConfig, decadeRange } as GameConfig;
            socket.emit('start-game', { roomId: room!.id, config });
          }}
        />;

      case 'versus-select':
        return <VersusSelect
          onSelect={(versusConfig) => {
            const config = { ...gameConfig, versusConfig } as GameConfig;
            socket.emit('start-game', { roomId: room!.id, config });
          }}
        />;

      case 'gameplay':
        return <GamePlay
          round={currentRound!}
          totalRounds={totalRounds}
          roomId={room!.id}
          isHost={isHost}
          gameMode={gameConfig.mode!}
          onTimerEnd={() => setCurrentScreen('vote-results')}
        />;

      case 'vote-results':
        return <VoteResults
          round={currentRound!}
          players={room!.players}
          votes={votes}
          isHost={isHost}
          roomId={room!.id}
          onNextRound={() => socket.emit('next-round', { roomId: room!.id })}
        />;

      case 'game-finished':
        return <GameFinished
          isHost={isHost}
          roomId={room!.id}
          onPlayAgain={() => socket.emit('reset-game', { roomId: room!.id })}
        />;

      default:
        return <div>Error: pantalla no encontrada</div>;
    }
  };

  return (
    <div className="container">
      {renderScreen()}
    </div>
  );
}

export default App;
