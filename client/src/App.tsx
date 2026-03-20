import { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import type { Room, Player, GameConfig, Round, Vote } from './types';
import Home from './screens/Home';
import EnterName from './screens/EnterName';
import Lobby from './screens/Lobby';
import GameModeSelect from './screens/GameModeSelect';
import MusicSetupSelect from './screens/MusicSetupSelect';
import GenreSelect from './screens/GenreSelect';
import ArtistSelect from './screens/ArtistSelect';
import YearSelect from './screens/YearSelect';
import DecadeSelect from './screens/DecadeSelect';
import VersusSelect from './screens/VersusSelect';
import GamePlay from './screens/GamePlay';
import VoteResults from './screens/VoteResults';
import GameFinished from './screens/GameFinished';
import LoadingScreen from './screens/LoadingScreen';
import WaitingForRound from './screens/WaitingForRound';

type Screen = 
  | 'home'
  | 'enter-name'
  | 'lobby'
  | 'game-mode-select'
  | 'music-setup-select'
  | 'genre-select'
  | 'artist-select'
  | 'year-select'
  | 'decade-select'
  | 'versus-select'
  | 'loading'
  | 'gameplay'
  | 'vote-results'
  | 'game-finished'
  | 'waiting-for-round';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [screenHistory, setScreenHistory] = useState<Screen[]>(['home']);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState(0);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [gameConfig, setGameConfig] = useState<Partial<GameConfig>>({});
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [totalRounds, setTotalRounds] = useState(0);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isStartingGameRef = useRef(false);

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
    setScreenHistory(prev => [...prev, screen]);
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = screenHistory.slice(0, -1);
      setScreenHistory(newHistory);
      setCurrentScreen(newHistory[newHistory.length - 1]);
    }
  };

  // Manejar salida del lobby
  const handleLobbyBack = () => {
    if (room) {
      socket.emit('leave-room', { roomId: room.id });
      setRoom(null);
      setGameConfig({});
      setCurrentRound(null);
      setVotes([]);
    }
    
    // Volver al inicio
    setCurrentScreen('home');
    setScreenHistory(['home']);
  };

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

    socket.on('player-left', ({ room, message }: { room: Room; message: string }) => {
      setRoom(room);
      console.log(message);
    });

    socket.on('host-transferred', ({ room, message }: { room: Room; message: string }) => {
      setRoom(room);
      console.log(message);
    });

    socket.on('player-disconnected', ({ room, message, canReconnect }: { room: Room; message: string; canReconnect: boolean }) => {
      setRoom(room);
      console.log(message, canReconnect ? '(puede reconectarse)' : '');
    });

    socket.on('player-reconnected', ({ room, message }: { room: Room; message: string }) => {
      setRoom(room);
      if (room.gameConfig) {
        setGameConfig(room.gameConfig);
      }
      console.log(message);
    });

    socket.on('room-rejoined', (updatedRoom: Room & { waitingPlayers?: string[] }) => {
      console.log('Room rejoined:', updatedRoom);
      setRoom(updatedRoom);
      if (updatedRoom.gameConfig) {
        setGameConfig(updatedRoom.gameConfig);
        console.log('GameConfig restored:', updatedRoom.gameConfig);
      }
      
      // Obtener la ID del socket actual para verificar si está esperando
      const currentPlayerId = socket.id || '';
      const isCurrentPlayerWaiting = (updatedRoom.waitingPlayers?.includes(currentPlayerId)) || false;
      
      if (updatedRoom.isGameStarted && updatedRoom.currentRound) {
        setCurrentRound(updatedRoom.currentRound);
        setTotalRounds(updatedRoom.totalRounds);
        
        // Si el jugador está esperando, mostrar pantalla de espera
        if (isCurrentPlayerWaiting) {
          console.log('Player is waiting for next round');
          setCurrentScreen('waiting-for-round');
        } else {
          setCurrentScreen('gameplay');
          console.log('Restored to gameplay mode, round:', updatedRoom.currentRound.roundNumber);
        }
      } else {
        // Si no hay ronda actual pero el juego empezó, mostrar pantalla de espera
        console.log('Game started but no current round - showing loading screen');
        setCurrentScreen('loading');
      }
    });

    socket.on('game-loading', ({ loadedYears, totalYears }: { loadedYears: number; totalYears: number }) => {
      setLoadingProgress({ loaded: loadedYears, total: totalYears });
      setCurrentScreen('loading');
    });

    socket.on('game-started', ({ round, totalRounds: total, currentYear, currentDecade, selectionType, mode }: { round: Round; totalRounds: number; currentYear?: number; currentDecade?: number; selectionType?: string; mode?: string }) => {
      console.log('Game started event received:', { mode, selectionType, roundNumber: round.roundNumber });
      setCurrentRound(round);
      setTotalRounds(total);
      if (currentYear !== undefined) {
        setGameConfig(prev => ({ ...prev, currentYear, mode: mode as any }));
      }
      if (currentDecade !== undefined) {
        setGameConfig(prev => ({ ...prev, currentDecade, mode: mode as any }));
      }
      if (selectionType !== undefined) {
        setGameConfig(prev => ({ ...prev, selectionType: selectionType as any, mode: mode as any }));
      }
      if (mode !== undefined) {
        setGameConfig(prev => ({ ...prev, mode: mode as any }));
      }
      setCurrentScreen('gameplay');
    });

    socket.on('game-error', ({ message }: { message: string }) => {
      isStartingGameRef.current = false;
      setLoadingProgress(null);
      setCurrentScreen('lobby');
      setErrorMessage(message);
    });

    socket.on('timer-started', () => {
      setCurrentRound((prev) => (prev ? { ...prev, timerStarted: true } : prev));
    });

    socket.on('timer-paused', ({ isPaused }: { isPaused: boolean }) => {
      setCurrentRound((prev) => (prev ? { ...prev, isPaused } : prev));
    });

    socket.on('vote-submitted', ({ votes: newVotes }: { votes: Vote[]; players: Player[] }) => {
      setVotes(newVotes);
    });

    socket.on('new-round', ({ round, totalRounds: total, currentYear, currentDecade, selectionType, mode }: { round: Round; totalRounds: number; currentYear?: number; currentDecade?: number; selectionType?: string; mode?: string }) => {
      setCurrentRound(round);
      setTotalRounds(total);
      if (currentYear !== undefined) {
        setGameConfig(prev => ({ ...prev, currentYear }));
      }
      if (currentDecade !== undefined) {
        setGameConfig(prev => ({ ...prev, currentDecade }));
      }
      if (selectionType !== undefined) {
        setGameConfig(prev => ({ ...prev, selectionType: selectionType as any }));
      }
      if (mode !== undefined) {
        setGameConfig(prev => ({ ...prev, mode: mode as any }));
      }
      setVotes([]);
      // Siempre mostrar gameplay en nueva ronda (el jugador ya no está esperando)
      setCurrentScreen('gameplay');
    });

    socket.on('game-finished', () => {
      setCurrentScreen('game-finished');
    });

    socket.on('game-reset', (updatedRoom: Room) => {
      isStartingGameRef.current = false;
      setRoom(updatedRoom);
      setGameConfig({});
      setCurrentRound(null);
      setVotes([]);
      setCurrentScreen('lobby');
    });

    socket.on('error', ({ message, canReconnect }: { message: string; canReconnect?: boolean }) => {
      if (message === 'Hay una partida en curso. ¿Deseas reconectarte?' && canReconnect && pendingRoomId && playerName) {
        // Intentar reconectar automáticamente con el nombre guardado
        console.log('Intentando reconectar con nombre guardado:', playerName);
        socket.emit('join-room', { roomId: pendingRoomId, playerName, playerAvatar });
      } else if (message.includes('Hay una partida en curso')) {
        setErrorMessage('Hay una partida en curso. ¿Deseas reconectarte?');
        setIsReconnecting(true);
      } else {
        setErrorMessage(message);
      }
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('host-transferred');
      socket.off('player-disconnected');
      socket.off('player-reconnected');
      socket.off('room-rejoined');
      socket.off('game-loading');
      socket.off('game-started');
      socket.off('game-error');
      socket.off('timer-started');
      socket.off('timer-paused');
      socket.off('vote-submitted');
      socket.off('new-round');
      socket.off('game-finished');
      socket.off('game-reset');
      socket.off('error');
    };
  }, []);

  // Detectar parámetro ?room= en URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomIdFromUrl = params.get('room');
    if (roomIdFromUrl && roomIdFromUrl.length === 6) {
      setPendingRoomId(roomIdFromUrl);
      // No asumir reconexión - el servidor lo determinará
      setIsReconnecting(false);
      setCurrentScreen('enter-name');
      setScreenHistory(['home', 'enter-name']);
    }
  }, []);

  const isHost = room?.players.find(p => p.id === socket.id)?.isHost || false;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <Home onAction={(action, roomId) => {
          if (action === 'create') {
            navigateTo('enter-name');
          } else {
            setPendingRoomId(roomId || null);
            navigateTo('enter-name');
          }
        }} />;

      case 'enter-name':
        return <EnterName
          isReconnect={isReconnecting}
          onSubmit={(name, avatar) => {
            setPlayerName(name);
            setPlayerAvatar(avatar);
            // Siempre intentar unirse primero
            if (pendingRoomId) {
              socket.emit('join-room', { roomId: pendingRoomId, playerName: name, playerAvatar: avatar });
            } else {
              socket.emit('create-room', { playerName: name, playerAvatar: avatar });
            }
          }}
          onBack={goBack}
        />;

      case 'lobby':
        return <Lobby
          room={room!}
          isHost={isHost}
          onStartGame={() => navigateTo('game-mode-select')}
          onBack={handleLobbyBack}
        />;

      case 'game-mode-select':
        return <GameModeSelect
          onSelect={(mode) => {
            setGameConfig({ ...gameConfig, mode });
            navigateTo('music-setup-select');
          }}
          onBack={goBack}
        />;

      case 'music-setup-select':
        return <MusicSetupSelect
          onSelectType={(type, songsPerRound, totalRounds, yearRange, decadeRange) => {
            const config = { 
              ...gameConfig, 
              selectionType: type,
              songsPerRound: songsPerRound || gameConfig.songsPerRound || 3,
              totalRounds: totalRounds || gameConfig.totalRounds || 10
            } as GameConfig;
            
            if (type === 'genre') {
              setGameConfig(config);
              navigateTo('genre-select');
            } else if (type === 'artist') {
              setGameConfig(config);
              navigateTo('artist-select');
            } else if (type === 'year') {
              const finalConfig = { 
                ...config, 
                yearRange,
                totalRounds: undefined // Dejar que calculateTotalRounds haga el cálculo
              } as GameConfig;
              setGameConfig(finalConfig);
              navigateTo('loading');
              socket.emit('start-game', { roomId: room!.id, config: finalConfig });
            } else if (type === 'decade') {
              const finalConfig = { 
                ...config, 
                decadeRange,
                totalRounds: undefined // Dejar que calculateTotalRounds haga el cálculo
              } as GameConfig;
              setGameConfig(finalConfig);
              navigateTo('loading');
              socket.emit('start-game', { roomId: room!.id, config: finalConfig });
            } else if (type === 'versus') {
              setGameConfig(config);
              navigateTo('versus-select');
            }
          }}
          onBack={goBack}
        />;

      case 'genre-select':
        return <GenreSelect
          onSelect={(genre) => {
            const config = { ...gameConfig, genre } as GameConfig;
            navigateTo('loading');
            socket.emit('start-game', { roomId: room!.id, config });
          }}
          onBack={goBack}
        />;

      case 'artist-select':
        return <ArtistSelect
          onSelect={(artist) => {
            const config = { ...gameConfig, artist } as GameConfig;
            navigateTo('loading');
            socket.emit('start-game', { roomId: room!.id, config });
          }}
          onBack={goBack}
        />;

      case 'year-select':
        return <YearSelect
          onSelect={(yearRange) => {
            const config = { ...gameConfig, yearRange } as GameConfig;
            navigateTo('loading');
            socket.emit('start-game', { roomId: room!.id, config });
          }}
          onBack={goBack}
        />;

      case 'decade-select':
        return <DecadeSelect
          onSelect={(decadeRange) => {
            const config = { ...gameConfig, decadeRange } as GameConfig;
            navigateTo('loading');
            socket.emit('start-game', { roomId: room!.id, config });
          }}
          onBack={goBack}
        />;

      case 'loading':
        return <LoadingScreen progress={loadingProgress} onBack={goBack} />;

      case 'versus-select':
        return <VersusSelect
          onSelect={(versusConfig) => {
            const config = { ...gameConfig, versusConfig } as GameConfig;
            navigateTo('loading');
            socket.emit('start-game', { roomId: room!.id, config });
          }}
          onBack={goBack}
        />;

      case 'gameplay':
        return <GamePlay
          round={currentRound!}
          totalRounds={totalRounds}
          roomId={room!.id}
          isHost={isHost}
          gameMode={gameConfig.mode!}
          selectionType={gameConfig.selectionType}
          currentYear={gameConfig.currentYear as number | undefined}
          currentDecade={gameConfig.currentDecade as number | undefined}
          onTimerEnd={() => navigateTo('vote-results')}
          onBack={goBack}
        />;

      case 'vote-results':
        return <VoteResults
          round={currentRound!}
          players={room!.players}
          votes={votes}
          isHost={isHost}
          roomId={room!.id}
          totalRounds={totalRounds}
          onNextRound={() => socket.emit('next-round', { roomId: room!.id })}
          onEndGame={() => socket.emit('end-game', { roomId: room!.id })}
        />;

      case 'game-finished':
        return <GameFinished
          isHost={isHost}
          roomId={room!.id}
          onPlayAgain={() => socket.emit('reset-game', { roomId: room!.id })}
        />;

      case 'waiting-for-round':
        return <WaitingForRound
          roundNumber={currentRound?.roundNumber || 1}
          totalRounds={totalRounds}
        />;

      default:
        return <div>Error: pantalla no encontrada</div>;
    }
  };

  return (
    <div className="container">
      {renderScreen()}
      
      {errorMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(30, 25, 33, 0.98)',
          border: '2px solid #FA5649',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '90%',
          zIndex: 9999,
          backdropFilter: 'blur(5px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(250, 86, 73, 0.3)'
        }}>
          <h3 style={{ color: '#FA5649', marginBottom: '1rem', marginTop: 0, fontSize: '1.3rem' }}>Error</h3>
          <p style={{ color: '#FBF4FE', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: '1.4' }}>{errorMessage}</p>
          <button 
            onClick={() => setErrorMessage(null)}
            style={{
              background: '#FA5649',
              color: 'white',
              border: 'none',
              padding: '0.8rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            Aceptar
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
