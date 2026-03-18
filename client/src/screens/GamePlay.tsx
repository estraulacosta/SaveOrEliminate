import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import Header from '../components/Header';
import { Music, Loader } from 'lucide-react';
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
      
      // Flag para asegurar que onComplete se llamara solo UNA VEZ
      let hasCompleted = false;
      
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`[Audio] Playing started successfully`);
          })
          .catch(err => {
            console.error(`[Audio] Error playing:`, err);
            if (onComplete && !hasCompleted) {
              hasCompleted = true;
              console.log(`[Audio] Calling onComplete due to error`);
              onComplete();
            }
          });
      }

      // Detener después de 10 segundos
      const timeoutId = setTimeout(() => {
        audioElement.pause();
        audioElement.currentTime = 0;
        if (onComplete && !hasCompleted) {
          hasCompleted = true;
          console.log(`[Audio] Calling onComplete after 10s timeout`);
          onComplete();
        }
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

export default function GamePlay({ round, totalRounds, roomId, isHost, gameMode, selectionType, currentYear, currentDecade, onTimerEnd, onBack }: GamePlayProps) {
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(round.roundNumber === 1 ? -1 : 0);
  const [previewsPlayed, setPreviewsPlayed] = useState(false);
  const [previewsStarted, setPreviewsStarted] = useState(false);
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (playbackCleanupRef.current) {
      playbackCleanupRef.current();
      playbackCleanupRef.current = null;
    }
    
    setSelectedSong(null);
    // Ronda 1: mostrar explicación (-1). Ronda 2+: comenzar previews automáticamente
    if (round.roundNumber === 1) {
      setCurrentPreviewIndex(-1);
      setPreviewsPlayed(false);
      setPreviewsStarted(false);
    } else {
      // Ronda 2+: comienzan las previews automáticamente
      setCurrentPreviewIndex(0);
      setPreviewsPlayed(false);
      setPreviewsStarted(true);
    }
    setShowingPreview(true);
    setVotingStarted(false);
    setTimer(10);
    setVoteCounts({});
    setPlayingPreviewId(null);
  }, [round.roundNumber]);

  // Auto-play previews de 10 segundos
  useEffect(() => {
    let cleanupFn: (() => void) | undefined;

    if (previewsStarted && currentPreviewIndex >= 0 && currentPreviewIndex < round.songs.length && !previewsPlayed) {
      const song = round.songs[currentPreviewIndex];
      
      console.log(`[GamePlay PREVIEW] Index ${currentPreviewIndex}/${round.songs.length}: "${song.name}" by ${song.artist}`, {
        hasPreviewUrl: !!song.previewUrl,
        previewUrlLength: song.previewUrl?.length || 0,
        previewUrlValid: !!song.previewUrl && song.previewUrl.trim() !== ''
      });
      
      if (audioRef.current && song.previewUrl && song.previewUrl.trim() !== '') {
        console.log(`[GamePlay PREVIEW] ✓ PLAYING song ${currentPreviewIndex + 1}/${round.songs.length}: ${song.name}`);
        audioRef.current.src = song.previewUrl;
        const audioHelper = createSimpleAudio(audioRef.current);
        cleanupFn = audioHelper.play(() => {
          console.log(`[GamePlay PREVIEW] ✓ FINISHED playing song ${currentPreviewIndex + 1}, moving to ${currentPreviewIndex + 2}`);
          setCurrentPreviewIndex(prev => prev + 1);
        });
      } else if (!song.previewUrl || song.previewUrl.trim() === '') {
        // Si no hay preview URL, saltar esta canción y pasar a la siguiente
        console.warn(`[GamePlay PREVIEW] ✗ SKIPPING song ${currentPreviewIndex + 1}/${round.songs.length} (${song.name}): NO PREVIEW URL`);
        setCurrentPreviewIndex(prev => prev + 1);
      } else {
        // Si no hay audioRef, saltar
        console.warn(`[GamePlay PREVIEW] ✗ SKIPPING song ${currentPreviewIndex + 1}/${round.songs.length}: NO AUDIO REF`);
        setCurrentPreviewIndex(prev => prev + 1);
      }
    } else if (previewsStarted && currentPreviewIndex >= round.songs.length && !previewsPlayed) {
      console.log(`[GamePlay PREVIEW] ✓ ALL PREVIEWS FINISHED - Total songs: ${round.songs.length}`);
      setShowingPreview(false);
      setPreviewsPlayed(true);
    }

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [currentPreviewIndex, round.roundNumber, previewsPlayed, previewsStarted, round.songs]);

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

  // Escuchar cuando el host comienza las previews
  useEffect(() => {
    const handlePreviewsStarted = () => {
      console.log('[GamePlay] Previews started event received, round:', round.roundNumber, 'songs:', round.songs.length);
      setPreviewsStarted(true);
      setCurrentPreviewIndex(0); // Pasar de -1 a 0 para comenzar la reproducción
    };

    const handleVotingStarted = () => {
      console.log('[GamePlay] Voting started event received');
      setVotingStarted(true);
    };

    socket.on('previews-started', handlePreviewsStarted);
    socket.on('voting-started', handleVotingStarted);
    return () => {
      socket.off('previews-started', handlePreviewsStarted);
      socket.off('voting-started', handleVotingStarted);
    };
  }, [round.roundNumber]);

  const handleSongSelect = (songId: string) => {
    setSelectedSong(songId);
    socket.emit('submit-vote', { roomId, songId });
  };

  const handleReplayPreview = (song: any) => {
    console.log(`[GamePlay] handleReplayPreview called for song: ${song.name}, previewId: ${playingPreviewId}, songId: ${song.id}`);
    
    // Limpiar el playback anterior
    if (playbackCleanupRef.current) {
      playbackCleanupRef.current();
      playbackCleanupRef.current = null;
    }

    if (playingPreviewId === song.id) {
      // Detener reproducción actual
      console.log(`[GamePlay] Stopping playback for ${song.name}`);
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
      
      if (audioRef.current && song.previewUrl && song.previewUrl.trim() !== '') {
        console.log(`[GamePlay] Starting preview for ${song.name}, URL: ${song.previewUrl.substring(0, 50)}...`);
        audioRef.current.src = song.previewUrl;
        const audioHelper = createSimpleAudio(audioRef.current);
        const cleanup = audioHelper.play(() => {
          console.log(`[GamePlay] Preview finished for ${song.name}, clearing playingPreviewId`);
          setPlayingPreviewId(null);
        });
        playbackCleanupRef.current = cleanup;
        setPlayingPreviewId(song.id);
      } else {
        console.warn(`[GamePlay] Cannot replay preview for ${song.name}: ${!song.previewUrl ? 'no previewUrl' : 'empty previewUrl'}`);
      }
    }
  };

  const handleStartVoting = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingPreviewId(null);
    socket.emit('start-voting', { roomId });
  };

  return (
    <>
      <Header showBackButton={false} showVolume={true} onBack={onBack} />
      <audio ref={audioRef} style={{ display: 'none' }} />

      <h1 style={{ marginTop: 'clamp(-0.5rem, -2vw, 0rem)', marginBottom: 'clamp(1rem, 2vw, 1.5rem)', fontSize: 'clamp(1.5rem, 6.25vw, 2.5rem)' }}>
        {selectionType === 'year' 
          ? `AÑO ${currentYear}`
          : selectionType === 'decade'
          ? `DÉCADA ${currentDecade}-${(currentDecade || 0) + 9}`
          : `RONDA ${round.roundNumber}/${totalRounds}`
        }
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
          {isHost ? (
            <button 
              className="primary" 
              onClick={() => socket.emit('start-previews', { roomId })}
              style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)', padding: 'clamp(0.8rem, 2vw, 1.2rem) clamp(1.5rem, 4vw, 2rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(0.3rem, 1vw, 0.5rem)', margin: '0 auto' }}
            >
              <Music size={20} /> Comenzar Previews
            </button>
          ) : (
            <div style={{ fontSize: 'clamp(0.75rem, 2vw, 0.95rem)', opacity: 0.7, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
              <Loader size={20} color="var(--color-principal)" style={{ animation: 'spin 2s linear infinite', display: 'inline-flex' }} />
              Esperando a que el host comience las previews...
            </div>
          )}
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
            <div className={`songs-voting-grid songs-grid-count-${round.songs.length}`} style={{
              justifyContent: 'center',
              justifyItems: 'center',
              width: '100%',
              margin: '0 auto'
            }}>
              {round.songs.map((song) => {
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
                      top: selectionType === 'versus' ? 'clamp(8px, 2vw, 18px)' : 'clamp(8px, 2vw, 12px)',
                      right: selectionType === 'versus' ? 'clamp(8px, 2vw, 18px)' : 'clamp(8px, 2vw, 12px)',
                      backgroundColor: gameMode === 'eliminate' ? 'var(--color-eliminate)' : 'var(--color-save)',
                      color: 'white',
                      borderRadius: '50%',
                      width: selectionType === 'versus' ? 'clamp(40px, 9.5vw, 65px)' : 'clamp(35px, 8vw, 45px)',
                      height: selectionType === 'versus' ? 'clamp(40px, 9.5vw, 65px)' : 'clamp(35px, 8vw, 45px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: selectionType === 'versus' ? 'clamp(1rem, 3vw, 1.6rem)' : 'clamp(1rem, 3vw, 1.2rem)',
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
                        display: 'block',
                        borderRadius: selectionType === 'versus' ? 'clamp(16px, 3vw, 24px)' : 'clamp(12px, 2vw, 16px)',
                        width: selectionType === 'versus' ? 'clamp(160px, 30vw, 380px)' : 'clamp(150px, 25vw, 220px)',
                        height: selectionType === 'versus' ? 'clamp(160px, 30vw, 380px)' : 'clamp(150px, 25vw, 220px)',
                      }}
                    />
                    
                    {previewsPlayed && !votingStarted && (
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
                            backgroundColor: 'transparent',
                            color: playingPreviewId === song.id ? 'var(--color-eliminate)' : 'var(--color-principal)',
                            border: `2px solid ${playingPreviewId === song.id ? 'var(--color-eliminate)' : 'var(--color-principal)'}`,
                            borderRadius: '50%',
                            width: 'clamp(80px, 20vw, 120px)',
                            height: 'clamp(80px, 20vw, 120px)',
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
                          <img 
                            src={playingPreviewId === song.id ? '/iconos/pause.svg' : '/iconos/play.svg'} 
                            alt={playingPreviewId === song.id ? 'Pause' : 'Play'}
                            style={{
                              width: 'clamp(80px, 20vw, 120px)',
                              height: 'clamp(80px, 20vw, 120px)',
                              objectFit: 'contain'
                            }}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                  <h3 style={{ 
                    fontSize: selectionType === 'versus' ? 'clamp(0.85rem, 3.2vw, 1.5rem)' : 'clamp(0.85rem, 3vw, 1.1rem)', 
                    textAlign: 'center', 
                    marginTop: selectionType === 'versus' ? 'clamp(0.8rem, 1.8vw, 1.5rem)' : 'clamp(0.5rem, 2vw, 0.8rem)', 
                    marginBottom: '-0.55rem', 
                    lineHeight: '1', 
                    padding: '0' 
                  }}>{song.name}</h3>
                  <p style={{ 
                    fontSize: selectionType === 'versus' ? 'clamp(0.75rem, 2.6vw, 1.2rem)' : 'clamp(0.75rem, 2.5vw, 0.95rem)', 
                    margin: 0, 
                    opacity: 0.8, 
                    textAlign: 'center', 
                    lineHeight: '1', 
                    padding: '0' 
                  }}>{song.artist}</p>
                </div>
              );
            })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
