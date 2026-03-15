import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import Header from '../components/Header';
import { Music } from 'lucide-react';
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
  onBack?: () => void;
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

export default function GamePlay({ round, totalRounds, roomId, isHost, gameMode, onTimerEnd, onBack }: GamePlayProps) {
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(round.roundNumber === 1 ? -1 : 0);
  const [previewsPlayed, setPreviewsPlayed] = useState(false); // Always start with previews
  const [timer, setTimer] = useState(10);
  const [showingPreview, setShowingPreview] = useState(true);
  const [votingStarted, setVotingStarted] = useState(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playbackCleanupRef = useRef<(() => void) | null>(null);

  // Limpiar playback cuando se desmonta el componente
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (playbackCleanupRef.current) {
        playbackCleanupRef.current();
      }
    };
  }, []);

  // Reiniciar estado cuando cambia de ronda
  useEffect(() => {
    // Limpiar el playback anterior
    if (playbackCleanupRef.current) {
      playbackCleanupRef.current();
      playbackCleanupRef.current = null;
    }
    
    setSelectedSong(null);
    setCurrentPreviewIndex(round.roundNumber === 1 ? -1 : 0);
    setPreviewsPlayed(false);
    setShowingPreview(true);
    setVotingStarted(false);
    setTimer(10);
    setVoteCounts({});
    setPlayingPreviewId(null);
  }, [round.id]);

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
    // Limpiar el playback anterior
    if (playbackCleanupRef.current) {
      playbackCleanupRef.current();
      playbackCleanupRef.current = null;
    }

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
        const cleanup = audioHelper.play(() => {
          setPlayingPreviewId(null);
        });
        playbackCleanupRef.current = cleanup;
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

  return (
    <>
      <Header showBackButton={true} showVolume={true} onBack={onBack} />
      <audio ref={audioRef} style={{ display: 'none' }} />

      <h1 style={{ marginTop: 'clamp(-0.5rem, -2vw, 0rem)', marginBottom: 'clamp(1rem, 2vw, 1.5rem)', fontSize: 'clamp(1.5rem, 6.25vw, 2.5rem)' }}>
        RONDA {round.roundNumber}/{totalRounds}
      </h1>
      <h2 style={{ 
        fontSize: 'clamp(1rem, 3.5vw, 1.5rem)', 
        marginBottom: 'clamp(0.3rem, 1.2vw, 0.7rem)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '0.2rem',
        ...(previewsPlayed && !votingStarted ? {} : (gameMode === 'save' 
          ? {
              color: 'var(--color-save)',
              textShadow: '0 0 20px rgba(139, 255, 98, 0.6), 0 0 40px rgba(139, 255, 98, 0.3)'
            }
          : {
              color: 'var(--color-eliminate)',
              textShadow: '0 0 20px rgba(250, 86, 73, 0.6), 0 0 40px rgba(250, 86, 73, 0.3)'
            }))
      }}>
        {previewsPlayed && !votingStarted ? 'Repite la canción que te perdiste' : (gameMode === 'save' ? 'SALVA UNA CANCIÓN' : 'ELIMINA UNA CANCIÓN')}
      </h2>

      {currentPreviewIndex === -1 && (
        <div style={{ textAlign: 'center', padding: 'clamp(0.6rem, 2vw, 1.5rem)' }}>
          <p style={{ fontSize: 'clamp(0.8rem, 3vw, 1rem)', marginBottom: 'clamp(1rem, 1.5vw, 1.5rem)' }}>
            Escucharás <strong>{round.songs.length} canciones</strong> con previews de 10 segundos cada una
          </p>
          <button 
            className="primary" 
            onClick={() => setCurrentPreviewIndex(0)}
            style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)', padding: 'clamp(0.8rem, 2vw, 1.2rem) clamp(1.5rem, 4vw, 2rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(0.3rem, 1vw, 0.5rem)', margin: '0 auto' }}
          >
            <Music size={20} /> Comenzar Previews
          </button>
        </div>
      )}

      {showingPreview && currentPreviewIndex >= 0 && currentPreviewIndex < round.songs.length && (
        <div style={{ textAlign: 'center', padding: 'clamp(0.3rem, 1vw, 0.5rem)' }}>
          <div className="loading" style={{ marginBottom: 'clamp(0.6rem, 1vw, 0.8rem)', fontSize: 'clamp(1rem, 4vw, 1.2rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(0.3rem, 1vw, 0.5rem)' }}>
            <Music size={24} /> Reproduciendo...
          </div>
          
          <img 
            src={round.songs[currentPreviewIndex].albumArt} 
            alt={round.songs[currentPreviewIndex].name}
            style={{
              width: 'clamp(140px, 55vw, 380px)',
              height: 'clamp(140px, 55vw, 380px)',
            borderRadius: 'clamp(12px, 2vw, 16px)',
            objectFit: 'cover',
            margin: '0 auto clamp(0.3rem, 1vw, 0.5rem)',
            boxShadow: '0 20px 60px rgba(128, 22, 199, 0.4)'
            }}
          />
          <h3 style={{ fontSize: 'clamp(1.222rem, 4.3125vw, 1.725rem)', textAlign: 'center', marginBottom: '0.1rem' }}>{round.songs[currentPreviewIndex].name}</h3>
          <p style={{ fontSize: 'clamp(1.078rem, 3.594vw, 1.294rem)', opacity: 0.8, textAlign: 'center' }}>{round.songs[currentPreviewIndex].artist}</p>
        </div>
      )}

      {!showingPreview && (
        <>
          {votingStarted && (
            <div style={{ width: '100%', maxWidth: 'clamp(300px, 90vw, 600px)', margin: 'clamp(0.2rem, 0.5vw, 0.3rem) auto', padding: '0 clamp(0.3rem, 1vw, 0.5rem)' }}>
              <div style={{
                width: '100%',
                height: 'clamp(6px, 1.5vw, 10px)',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 'clamp(4px, 1vw, 6px)',
                overflow: 'hidden',
                boxShadow: '0 0 15px rgba(0,0,0,0.3)'
              }}>
                <div style={{
                  width: `${(timer / 10) * 100}%`,
                  height: '100%',
                  background: timer <= 3 ? 'var(--color-eliminate)' : 'var(--color-principal)',
                  borderRadius: '6px',
                  transition: 'width 1s linear, background 0.3s ease',
                  boxShadow: timer <= 3 ? '0 0 20px var(--color-eliminate)' : '0 0 20px var(--color-principal)'
                }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 'clamp(0.1rem, 0.5vw, 0.2rem)', fontSize: 'clamp(0.85rem, 3vw, 1rem)', fontWeight: 'bold', color: 'var(--color-principal)' }}>
                {timer}s
              </div>
            </div>
          )}

          {!votingStarted && previewsPlayed && (
            <div style={{ textAlign: 'center', marginBottom: 'clamp(0.6rem, 1vw, 1rem)' }}>
              {isHost ? (
                <button 
                  type="button"
                  className="primary"
                  onClick={handleStartVoting}
                  style={{ fontSize: 'clamp(0.8rem, 2.5vw, 1rem)', padding: 'clamp(0.6rem, 1.5vw, 1rem) clamp(1.5rem, 4vw, 2.5rem)', width: 'clamp(160px, 60vw, 300px)' }}
                >
                  VOTAR
                </button>
              ) : (
                <div style={{ fontSize: 'clamp(0.75rem, 2vw, 0.95rem)', opacity: 0.7, textAlign: 'center' }}>
                  Esperando a que el host inicie la votación...
                </div>
              )}
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            padding: '0 clamp(0.5rem, 2vw, 1rem)',
            marginBottom: 'clamp(1rem, 2vw, 1.5rem)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: round.songs.length === 2
                ? 'repeat(2, minmax(clamp(150px, 25vw, 220px), clamp(150px, 25vw, 220px)))'
                : round.songs.length === 4 
                ? 'repeat(4, minmax(clamp(150px, 25vw, 220px), clamp(150px, 25vw, 220px)))' 
                : 'repeat(3, minmax(clamp(150px, 25vw, 220px), clamp(150px, 25vw, 220px)))',
              gap: 'clamp(1rem, 3vw, 2rem)',
              justifyContent: 'center',
              justifyItems: 'center',
              width: 'fit-content',
              margin: '0 auto'
            }}>
              {round.songs.map((song, index) => {
              const voteCount = voteCounts[song.id] || 0;
              const isSelected = selectedSong === song.id;
              const isEliminate = gameMode === 'eliminate';
              const totalSongs = round.songs.length;
              
              // Para 5 canciones, solo renderizar los primeros 3 en el grid
              if (totalSongs === 5 && index >= 3) {
                return null;
              }
              
              return (
                <div
                  key={song.id}
                  className={`song-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => votingStarted && previewsPlayed ? handleSongSelect(song.id) : null}
                  onMouseEnter={(e) => {
                    if (votingStarted && previewsPlayed) {
                      const target = e.currentTarget as HTMLElement;
                      const imgElement = target.querySelector('img') as HTMLImageElement;
                      if (imgElement) {
                        imgElement.style.boxShadow = isEliminate 
                          ? '0 20px 50px rgba(250, 86, 73, 0.6)' 
                          : '0 20px 50px rgba(139, 255, 98, 0.6)';
                      }
                      target.style.transform = 'translateY(-10px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    const imgElement = target.querySelector('img') as HTMLImageElement;
                    if (imgElement) {
                      imgElement.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
                    }
                    target.style.transform = isSelected ? 'scale(1.05)' : 'translateY(0)';
                  }}
                  style={{ 
                    cursor: votingStarted && previewsPlayed ? 'pointer' : 'default', 
                    opacity: previewsPlayed ? 1 : 0.5,
                    position: 'relative',
                  }}
                >
                  {votingStarted && voteCount > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 'clamp(8px, 2vw, 12px)',
                      right: 'clamp(8px, 2vw, 12px)',
                      backgroundColor: gameMode === 'eliminate' ? 'var(--color-eliminate)' : 'var(--color-save)',
                      color: 'white',
                      borderRadius: '50%',
                      width: 'clamp(35px, 8vw, 45px)',
                      height: 'clamp(35px, 8vw, 45px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'clamp(1rem, 3vw, 1.2rem)',
                      fontWeight: 'bold',
                      zIndex: 10,
                      boxShadow: gameMode === 'eliminate' 
                        ? '0 0 20px rgba(250, 86, 73, 0.6)' 
                        : '0 0 20px rgba(139, 255, 98, 0.6)'
                    }}>
                      {voteCount}
                    </div>
                  )}
                  
                  <div style={{
                    position: 'relative',
                    display: 'inline-block'
                  }}>
                    <img 
                      src={song.albumArt} 
                      alt={song.name}
                      style={{
                        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                        transition: 'all 0.3s ease',
                        display: 'block'
                      }}
                    />
                    
                    {previewsPlayed && !votingStarted && isHost && (
                      <div
                        onMouseEnter={(e) => {
                          const overlay = e.currentTarget as HTMLElement;
                          overlay.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          const overlay = e.currentTarget as HTMLElement;
                          overlay.style.opacity = '0';
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '16px',
                          opacity: '0',
                          transition: 'opacity 0.3s ease',
                          cursor: 'pointer'
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReplayPreview(song);
                          }}
                          style={{
                            backgroundColor: playingPreviewId === song.id ? 'var(--color-eliminate)' : 'var(--color-principal)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: 'clamp(50px, 12vw, 70px)',
                            height: 'clamp(50px, 12vw, 70px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                            transform: 'scale(1)'
                          }}
                          onMouseEnter={(e) => {
                            const btn = e.currentTarget as HTMLElement;
                            btn.style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            const btn = e.currentTarget as HTMLElement;
                            btn.style.transform = 'scale(1)';
                          }}
                        >
                          {playingPreviewId === song.id ? '⏸' : '▶'}
                        </button>
                      </div>
                    )}
                  </div>
                  <h3 style={{ fontSize: 'clamp(0.85rem, 3vw, 1.1rem)', textAlign: 'center', marginTop: 'clamp(0.5rem, 2vw, 0.8rem)', marginBottom: '-0.55rem', lineHeight: '1', padding: '0' }}>{song.name}</h3>
                  <p style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.95rem)', margin: 0, opacity: 0.8, textAlign: 'center', lineHeight: '1', padding: '0' }}>{song.artist}</p>
                </div>
              );
            })}
            {/* Para 5 canciones, renderizar los últimos 2 items centrados en su propio contenedor */}
            {round.songs.length === 5 && (
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex',
                justifyContent: 'center',
                gap: 'clamp(1rem, 3vw, 2rem)',
                marginTop: 'clamp(0rem, 1vw, 0.5rem)'
              }}>
                {round.songs.slice(3).map((song, sliceIndex) => {
                  const index = 3 + sliceIndex;
                  const voteCount = voteCounts[song.id] || 0;
                  const isSelected = selectedSong === song.id;
                  const isEliminate = gameMode === 'eliminate';
                  
                  return (
                    <div
                      key={song.id}
                      className={`song-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => votingStarted && previewsPlayed ? handleSongSelect(song.id) : null}
                      onMouseEnter={(e) => {
                        if (votingStarted && previewsPlayed) {
                          const target = e.currentTarget as HTMLElement;
                          const imgElement = target.querySelector('img') as HTMLImageElement;
                          if (imgElement) {
                            imgElement.style.boxShadow = isEliminate 
                              ? '0 20px 50px rgba(250, 86, 73, 0.6)' 
                              : '0 20px 50px rgba(139, 255, 98, 0.6)';
                          }
                          target.style.transform = 'translateY(-10px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        const imgElement = target.querySelector('img') as HTMLImageElement;
                        if (imgElement) {
                          imgElement.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
                        }
                        target.style.transform = isSelected ? 'scale(1.05)' : 'translateY(0)';
                      }}
                      style={{ 
                        cursor: votingStarted && previewsPlayed ? 'pointer' : 'default', 
                        opacity: previewsPlayed ? 1 : 0.5,
                        position: 'relative',
                      }}
                    >
                      {votingStarted && voteCount > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: 'clamp(8px, 2vw, 12px)',
                          right: 'clamp(8px, 2vw, 12px)',
                          backgroundColor: gameMode === 'eliminate' ? 'var(--color-eliminate)' : 'var(--color-save)',
                          color: 'white',
                          borderRadius: '50%',
                          width: 'clamp(35px, 8vw, 45px)',
                          height: 'clamp(35px, 8vw, 45px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'clamp(1rem, 3vw, 1.2rem)',
                          fontWeight: 'bold',
                          zIndex: 10,
                          boxShadow: gameMode === 'eliminate' 
                            ? '0 0 20px rgba(250, 86, 73, 0.6)' 
                            : '0 0 20px rgba(139, 255, 98, 0.6)'
                        }}>
                          {voteCount}
                        </div>
                      )}
                      
                      <div style={{
                        position: 'relative',
                        display: 'inline-block'
                      }}>
                        <img 
                          src={song.albumArt} 
                          alt={song.name}
                          style={{
                            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                            transition: 'all 0.3s ease',
                            display: 'block'
                          }}
                        />
                        
                        {previewsPlayed && !votingStarted && isHost && (
                          <div
                            onMouseEnter={(e) => {
                              const overlay = e.currentTarget as HTMLElement;
                              overlay.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              const overlay = e.currentTarget as HTMLElement;
                              overlay.style.opacity = '0';
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              backgroundColor: 'rgba(0, 0, 0, 0.6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '16px',
                              opacity: '0',
                              transition: 'opacity 0.3s ease',
                              cursor: 'pointer'
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReplayPreview(song);
                              }}
                              style={{
                                backgroundColor: playingPreviewId === song.id ? 'var(--color-eliminate)' : 'var(--color-principal)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: 'clamp(50px, 12vw, 70px)',
                                height: 'clamp(50px, 12vw, 70px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                                transform: 'scale(1)'
                              }}
                              onMouseEnter={(e) => {
                                const btn = e.currentTarget as HTMLElement;
                                btn.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                const btn = e.currentTarget as HTMLElement;
                                btn.style.transform = 'scale(1)';
                              }}
                            >
                              {playingPreviewId === song.id ? '⏸' : '▶'}
                            </button>
                          </div>
                        )}
                      </div>
                      <h3 style={{ fontSize: 'clamp(0.85rem, 3vw, 1.1rem)', textAlign: 'center', marginTop: 'clamp(0.5rem, 2vw, 0.8rem)', marginBottom: '-0.55rem', lineHeight: '1', padding: '0' }}>{song.name}</h3>
                      <p style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.95rem)', margin: 0, opacity: 0.8, textAlign: 'center', lineHeight: '1', padding: '0' }}>{song.artist}</p>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
