import Header from '../components/Header';
import type { Round, Player, Vote } from '../types';

interface VoteResultsProps {
  round: Round;
  players: Player[];
  votes: Vote[];
  isHost: boolean;
  roomId: string;
  onNextRound: () => void;
  onEndGame?: () => void;
}

export default function VoteResults({ round, votes, players, isHost, onNextRound, onEndGame }: VoteResultsProps) {
  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || 'Desconocido';
  };

  // Agrupar votos por canción
  const votesByColor = () => {
    const colorMap: Record<string, any> = {};
    round.songs.forEach(song => {
      colorMap[song.id] = {
        song,
        voters: votes
          .filter(v => v.songId === song.id)
          .map(v => getPlayerName(v.playerId))
      };
    });
    return colorMap;
  };

  const allVotesByColor = votesByColor();
  const songsWithVotes = Object.values(allVotesByColor).filter(item => item.voters.length > 0);
  
  // Obtener la canción con más votos para determinar colores
  const maxVotes = Math.max(...songsWithVotes.map((item: any) => item.voters.length), 0);
  
  const getSongColor = (itemVoters: string[]) => {
    if (itemVoters.length === maxVotes && maxVotes > 0) {
      return 'var(--color-save)'; // Verde - se salva
    }
    return 'var(--color-eliminate)'; // Rojo - se elimina
  };

  return (
    <>
      <Header showBackButton={false} />
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', marginBottom: 'clamp(0.3rem, 1vw, 0.5rem)' }}>Resultados - Ronda {round.roundNumber}</h1>
      {round.yearLabel && (
        <div style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #6c63ff, #ff6584)',
          color: '#fff',
          borderRadius: 'clamp(20px, 3vw, 30px)',
          padding: 'clamp(0.4rem, 1vw, 0.8rem) clamp(1rem, 2vw, 1.5rem)',
          fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)',
          fontWeight: 700,
          letterSpacing: 'clamp(1px, 0.3vw, 2px)',
          marginBottom: 'clamp(0.8rem, 1.5vw, 1.2rem)',
          boxShadow: '0 4px 16px rgba(108,99,255,0.3)',
        }}>
          📅 {round.yearLabel}
        </div>
      )}

      <div className="vote-summary" style={{ marginBottom: '1.5rem', maxWidth: 'min(95vw, 2750px)', margin: '1.5rem auto 1.5rem auto' }}>
        {songsWithVotes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.75rem, 1.2vw, 1rem)', width: '100%' }}>
            {songsWithVotes.map((item: any) => {
              const count = item.voters.length;
              const percentage = votes.length > 0 ? (count / votes.length) * 100 : 0;
              const barColor = getSongColor(item.voters);
              return (
                <div key={item.song.id} style={{
                  display: 'grid',
                  gridTemplateColumns: 'clamp(80px, 18vw, 120px) 1fr',
                  gap: 'clamp(0.75rem, 1.5vw, 1.2rem)',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'clamp(8px, 1.5vw, 12px)',
                  padding: 'clamp(0.75rem, 1vw, 1rem)',
                }}>
                  {/* LEFT: Imagen + Votantes */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(0.35rem, 0.6vw, 0.6rem)' }}>
                    <img 
                      src={item.song.albumArt} 
                      alt={item.song.name}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                      }}
                    />
                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <div style={{ fontWeight: 600, fontSize: 'clamp(0.65rem, 1.4vw, 0.85rem)', marginBottom: 'clamp(0.02rem, 0.1vw, 0.05rem)', wordBreak: 'break-word' }}
                        >
                        {item.song.name}
                      </div>
                      <div style={{ fontSize: 'clamp(0.6rem, 1.1vw, 0.75rem)', opacity: 0.7 }}>
                        {item.song.artist}
                      </div>
                      <div style={{ fontSize: 'clamp(0.55rem, 1vw, 0.7rem)', color: 'rgba(251, 244, 254, 0.8)', marginTop: 'clamp(0.1rem, 0.4vw, 0.2rem)', lineHeight: '1.1' }}>
                        <strong>Votaron:</strong> {item.voters.join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Barra horizontal ancha */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(0.3rem, 0.5vw, 0.4rem)' }}>
                    <div style={{
                      width: '100%',
                      height: 'clamp(20px, 3vw, 40px)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: barColor,
                        transition: 'width 0.3s ease',
                        boxShadow: `0 0 15px ${barColor === 'var(--color-save)' ? 'rgba(139, 255, 98, 0.6)' : 'rgba(250, 86, 73, 0.6)'}`
                      }} />
                    </div>
                    <div style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.9rem)', fontWeight: 'bold', color: barColor, textAlign: 'right' }}>
                      {count} votos ({Math.round(percentage)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ textAlign: 'center', opacity: 0.7, width: '100%', fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>
            Nadie votó en esta ronda
          </p>
        )}
      </div>

      {isHost && (
        <div style={{ marginTop: 'clamp(0.8rem, 1.2vw, 1rem)', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(0.6rem, 1vw, 0.8rem)' }}>
          <button type="button" className="primary" onClick={onNextRound} style={{ fontSize: 'clamp(0.7rem, 2vw, 0.85rem)', padding: 'clamp(0.6rem, 1vw, 0.8rem)', fontWeight: 'bold' }}>
            Siguiente Ronda
          </button>
          {onEndGame && (
            <button 
              type="button"
              className="eliminate" 
              onClick={onEndGame} 
              style={{ fontSize: 'clamp(0.7rem, 2vw, 0.85rem)', padding: 'clamp(0.6rem, 1vw, 0.8rem)', fontWeight: 'bold' }}
            >
              Acabar Partida
            </button>
          )}
        </div>
      )}

      {!isHost && (
        <p style={{ textAlign: 'center', opacity: 0.7, marginTop: '2rem', fontSize: '1.1rem' }}>
          Esperando a que el host continúe...
        </p>
      )}
    </>
  );
}
