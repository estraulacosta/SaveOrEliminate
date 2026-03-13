import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import Header from '../components/Header';
import type { Round, GameMode } from '../types';

interface GamePlayProps {
  round: Round;
  totalRounds: number;
  roomId: string;
  isHost: boolean;
  gameMode: GameMode;
  selectionType?: string;
  currentYear?: number;
  currentDecade?: number;
  onTimerEnd: () => void;
}

// Helper: Reproducir audio simple de 10 segundos
function createSimpleAudio(audioElement: HTMLAudioElement) {
  return {
    play: (onComplete?: () => void) => {
      // Obtener el volumen del localStorage o usar 50% por defecto
      const savedVolume = localStorage.getItem('musicVolume');
      const volumePercent = savedVolume ? parseInt(savedVolume) : 50;
      audioElement.volume = volumePercent / 100;
      audioElement.currentTime = 0;
      
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => console.error('Error playing:', err));
      }

      // Detener después de 10 segundos
      const timeoutId = setTimeout(() => {
        audioElement.pause();
        audioElement.currentTime = 0;
        if (onComplete) onComplete();
      }, 10000);

      return () => clearTimeout(timeoutId);
    },

    stop: () => {
      audioElement.pause();
      audioElement.currentTime = 0;
      audioElement.volume = 0;
    }
  };
}

export default function GamePlay({ round, totalRounds, roomId, gameMode, selectionType, currentYear, currentDecade, onTimerEnd }: GamePlayProps) {
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(-1);
  const [previewsPlayed, setPreviewsPlayed] = useState(false);
  const [timer, setTimer] = useState(10);
  const [showingPreview, setShowingPreview] = useState(true);
  const [votingStarted, setVotingStarted] = useState(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-play previews de 10 segundos
  useEffect(() => {
    let cleanupFn: (() => void) | undefined;

    if (currentPreviewIndex >= 0 && currentPreviewIndex < round.songs.length && !previewsPlayed) {
      const song = round.songs[currentPreviewIndex];
      
      if (audioRef.current && song.previewUrl) {
        audioRef.current.src = song.previewUrl;
        const audioHelper = createSimpleAudio(audioRef.current);
        cleanupFn = audioHelper.play(() => {
          setCurrentPreviewIndex(prev => prev + 1);
        });
      }
    } else if (currentPreviewIndex >= round.songs.length && !previewsPlayed) {
      setShowingPreview(false);
      setPreviewsPlayed(true);
    }

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [currentPreviewIndex, round.songs, previewsPlayed]);

  // Timer countdown
  useEffect(() => {
    if (votingStarted && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    }

    if (votingStarted && timer === 0) {
      onTimerEnd();
    }
  }, [votingStarted, timer, onTimerEnd]);

  // Escuchar cambios en votos desde el servidor
  useEffect(() => {
    const handleVoteUpdate = (data: any) => {
      const counts: Record<string, number> = {};
      round.songs.forEach(song => {
        counts[song.id] = data.votes.filter((v: any) => v.songId === song.id).length;
      });
      setVoteCounts(counts);

      // Si todos los jugadores votaron, terminar la ronda automáticamente
      if (data.votes.length === data.players.length && votingStarted) {
        setTimeout(() => {
          onTimerEnd();
        }, 500);
      }
    };

    socket.on('vote-submitted', handleVoteUpdate);
    return () => {
      socket.off('vote-submitted', handleVoteUpdate);
    };
  }, [round.songs, votingStarted, onTimerEnd]);

  const handleSongSelect = (songId: string) => {
    setSelectedSong(songId);
    socket.emit('submit-vote', { roomId, songId });
  };

  const handleReplayPreview = (song: any) => {
    if (playingPreviewId === song.id) {
      // Detener reproducción actual
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingPreviewId(null);
    } else {
      // Reproducir preview
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      if (audioRef.current && song.previewUrl) {
        audioRef.current.src = song.previewUrl;
        const audioHelper = createSimpleAudio(audioRef.current);
        audioHelper.play(() => {
          setPlayingPreviewId(null);
        });
        setPlayingPreviewId(song.id);
      }
    }
  };

  const handleStartVoting = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingPreviewId(null);
    setVotingStarted(true);
    socket.emit('start-timer', { roomId });
  };

  const handleSelectNothing = () => {
    // Registrar voto como "NINGUNA"
    setSelectedSong('NONE');
    socket.emit('submit-vote', { roomId, songId: 'NONE' });
  };

  const handleSelectAny = () => {
    // Seleccionar aleatoriamente una canción
    const randomSong = round.songs[Math.floor(Math.random() * round.songs.length)];
    handleSongSelect(randomSong.id);
  };

  return (
    <>
      <Header showBackButton={false} showVolume={true} />
      <audio ref={audioRef} style={{ display: 'none' }} />

      <h1>
        {selectionType === 'year' && currentYear ? `🎵 AÑO ${currentYear}` : selectionType === 'decade' && currentDecade ? `🎵 DÉCADA DE LOS ${currentDecade}S` : `Ronda ${round.roundNumber}/${totalRounds}`}
      </h1>
      <h2>
        {gameMode === 'save' ? '💚 Salva una canción' : '❌ Elimina una canción'}
      </h2>

      {currentPreviewIndex === -1 && (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ fontSize: '1.3rem', marginBottom: '30px' }}>
            Escucharás <strong>{round.songs.length} canciones</strong> con previews de 10 segundos cada una
          </p>
          <button 
            className="primary" 
            onClick={() => setCurrentPreviewIndex(0)}
            style={{ fontSize: '1.2rem', padding: '20px 40px' }}
          >
            🎵 Comenzar Previews
          </button>
        </div>
      )}

      {showingPreview && currentPreviewIndex >= 0 && currentPreviewIndex < round.songs.length && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading" style={{ marginBottom: '20px', fontSize: '1.2rem' }}>
            🎵 Preview {currentPreviewIndex + 1}/{round.songs.length} - 10 segundos
          </div>
          
          <div className="song-card" style={{ maxWidth: '500px', margin: '0 auto', pointerEvents: 'none', transform: 'scale(1.05)' }}>
            <img src={round.songs[currentPreviewIndex].albumArt} alt={round.songs[currentPreviewIndex].name} />
            <h3>{round.songs[currentPreviewIndex].name}</h3>
            <p>{round.songs[currentPreviewIndex].artist}</p>
          </div>
        </div>
      )}

      {!showingPreview && (
        <>
          {votingStarted && (
            <div className={`timer ${timer <= 3 ? 'warning' : ''}`}>
              {timer}s
            </div>
          )}

          {!votingStarted && previewsPlayed && (
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <button 
                className="primary"
                onClick={handleStartVoting}
                style={{ fontSize: '1.1rem', padding: '15px 30px' }}
              >
                🗳️ VOTAR
              </button>
            </div>
          )}

          {votingStarted && previewsPlayed && (
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <button 
                onClick={handleSelectNothing}
                style={{ fontSize: '1rem', padding: '10px 20px', marginRight: '10px' }}
              >
                ❌ NINGUNA
              </button>
              <button 
                onClick={handleSelectAny}
                style={{ fontSize: '1rem', padding: '10px 20px' }}
              >
                🎲 CUALQUIERA
              </button>
            </div>
          )}

          <div className="grid">
            {round.songs.map((song) => {
              const voteCount = voteCounts[song.id] || 0;
              return (
                <div
                  key={song.id}
                  className={`song-card ${selectedSong === song.id ? 'selected' : ''}`}
                  onClick={() => votingStarted && previewsPlayed ? handleSongSelect(song.id) : null}
                  style={{ 
                    cursor: votingStarted && previewsPlayed ? 'pointer' : 'default', 
                    opacity: previewsPlayed ? 1 : 0.7,
                    position: 'relative'
                  }}
                >
                  {votingStarted && voteCount > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      zIndex: 10
                    }}>
                      {voteCount}
                    </div>
                  )}
                  
                  <img src={song.albumArt} alt={song.name} />
                  <h3>{song.name}</h3>
                  <p>{song.artist}</p>
                  
                  {previewsPlayed && !votingStarted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReplayPreview(song);
                      }}
                      style={{
                        marginTop: '10px',
                        padding: '8px 12px',
                        backgroundColor: playingPreviewId === song.id ? '#ff6b6b' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        width: '100%'
                      }}
                    >
                      {playingPreviewId === song.id ? '⏹️ Detener' : '🔊 Repetir'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
