import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import type { Round, GameMode } from '../types';

interface GamePlayProps {
  round: Round;
  totalRounds: number;
  roomId: string;
  isHost: boolean;
  gameMode: GameMode;
  onTimerEnd: () => void;
}

export default function GamePlay({ round, totalRounds, roomId, isHost, gameMode, onTimerEnd }: GamePlayProps) {
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(-1);
  const [previewsPlayed, setPreviewsPlayed] = useState(false);
  const [timer, setTimer] = useState(10);
  const [showingPreview, setShowingPreview] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-play previews de 7 segundos - UNO POR UNO con audio de Spotify
  useEffect(() => {
    if (currentPreviewIndex >= 0 && currentPreviewIndex < round.songs.length && !previewsPlayed) {
      const song = round.songs[currentPreviewIndex];
      
      // Reproducir audio automáticamente
      if (audioRef.current && song.previewUrl) {
        audioRef.current.src = song.previewUrl;
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
        });
      }

      const timeout = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setCurrentPreviewIndex(prev => prev + 1);
      }, 7000); // 7 segundos

      return () => {
        clearTimeout(timeout);
        if (audioRef.current) {
          audioRef.current.pause();
        }
      };
    } else if (currentPreviewIndex >= round.songs.length && !previewsPlayed) {
      setShowingPreview(false);
      setPreviewsPlayed(true);
      setTimeout(() => {
        socket.emit('start-timer', { roomId });
      }, 1000);
    }
  }, [currentPreviewIndex, round.songs, previewsPlayed, roomId]);

  // Timer countdown
  useEffect(() => {
    if (previewsPlayed && round.timerStarted && !round.isPaused && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    }

    if (timer === 0) {
      onTimerEnd();
    }
  }, [previewsPlayed, round.timerStarted, round.isPaused, timer, onTimerEnd]);

  const handleSongSelect = (songId: string) => {
    setSelectedSong(songId);
    socket.emit('submit-vote', { roomId, songId });
  };

  const handleTogglePause = () => {
    socket.emit('toggle-pause', { roomId });
  };

  const handleStartPreviews = () => {
    setCurrentPreviewIndex(0);
  };

  return (
    <>
      <h1>
        Ronda {round.roundNumber}/{totalRounds}
      </h1>
      <h2>
        {gameMode === 'save' ? '💚 Salva una canción' : '❌ Elimina una canción'}
      </h2>

      {currentPreviewIndex === -1 && (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ fontSize: '1.3rem', marginBottom: '30px' }}>
            Escucharás <strong>{round.songs.length} canciones</strong> con previews de 7 segundos cada una
          </p>
          <button 
            className="primary" 
            onClick={handleStartPreviews}
            style={{ fontSize: '1.2rem', padding: '20px 40px' }}
          >
            🎵 Comenzar Previews
          </button>
        </div>
      )}

      {showingPreview && currentPreviewIndex >= 0 && currentPreviewIndex < round.songs.length && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading" style={{ marginBottom: '20px', fontSize: '1.2rem' }}>
            🎵 Preview {currentPreviewIndex + 1}/{round.songs.length} - 7 segundos
          </div>
          
          {/* Audio Player (invisible - reproducción automática) */}
          <audio ref={audioRef} style={{ display: 'none' }} />
          
          <div className="song-card" style={{ maxWidth: '500px', margin: '0 auto', pointerEvents: 'none', transform: 'scale(1.05)' }}>
            <img src={round.songs[currentPreviewIndex].albumArt} alt={round.songs[currentPreviewIndex].name} />
            <h3>{round.songs[currentPreviewIndex].name}</h3>
            <p>{round.songs[currentPreviewIndex].artist}</p>
          </div>
        </div>
      )}

      {!showingPreview && (
        <>
          {previewsPlayed && round.timerStarted && (
            <>
              <div className={`timer ${timer <= 3 ? 'warning' : ''}`}>
                {timer}s
              </div>

              {isHost && (
                <button onClick={handleTogglePause} style={{ marginBottom: '20px' }}>
                  {round.isPaused ? '▶️ Reanudar' : '⏸️ Pausar'}
                </button>
              )}
            </>
          )}

          {!previewsPlayed && (
            <div className="loading">
              Organizando canciones...
            </div>
          )}

          <div className="grid">
            {round.songs.map((song) => (
              <div
                key={song.id}
                className={`song-card ${selectedSong === song.id ? 'selected' : ''}`}
                onClick={() => previewsPlayed ? handleSongSelect(song.id) : null}
                style={{ cursor: previewsPlayed ? 'pointer' : 'default', opacity: previewsPlayed ? 1 : 0.7 }}
              >
                <img src={song.albumArt} alt={song.name} />
                <h3>{song.name}</h3>
                <p>{song.artist}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
