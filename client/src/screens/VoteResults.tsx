import Header from '../components/Header';
import type { Round, Player, Vote } from '../types';

interface VoteResultsProps {
  round: Round;
  players: Player[];
  votes: Vote[];
  isHost: boolean;
  roomId: string;
  totalRounds: number;
  onNextRound: () => void;
  onEndGame?: () => void;
}

export default function VoteResults({ round, votes, players, isHost, totalRounds, onNextRound, onEndGame }: VoteResultsProps) {
  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || 'Desconocido';
  };

  const getPlayerData = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return {
      name: player?.name || 'Desconocido',
      avatar: player?.avatar || 1,
      id: playerId
    };
  };

  // Agrupar votos por canción
  const votesByColor = () => {
    const colorMap: Record<string, any> = {};
    round.songs.forEach(song => {
      colorMap[song.id] = {
        song,
        voters: votes
          .filter(v => v.songId === song.id)
          .map(v => ({
            ...getPlayerData(v.playerId),
            playerId: v.playerId
          }))
      };
    });
    return colorMap;
  };

  const allVotesByColor = votesByColor();
  const songsWithVotes = Object.values(allVotesByColor).filter(item => item.voters.length > 0);
  
  // Obtener la canción con más votos para determinar colores
  const maxVotes = Math.max(...songsWithVotes.map((item: any) => item.voters.length), 0);
  
  const getSongColor = (itemVoters: any[]) => {
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
          <div className="vote-results-grid" style={{ 
            display: 'grid',
            gridTemplateColumns: songsWithVotes.length === 1 ? '1fr' : 
                                  songsWithVotes.length === 2 ? 'repeat(2, 1fr)' :
                                  songsWithVotes.length === 3 ? 'repeat(3, 1fr)' :
                                  'repeat(3, 1fr)',
            gap: 'clamp(0.75rem, 1.2vw, 1rem)', 
            width: '100%',
            maxWidth: 'min(95vw, 1400px)',
            margin: '0 auto',
            justifyItems: 'center',
            padding: '0 clamp(0.5rem, 2vw, 1rem)'
          }}>
            {songsWithVotes
              .sort((a: any, b: any) => b.voters.length - a.voters.length)
              .map((item: any, index: number) => {
                const count = item.voters.length;
                const percentage = votes.length > 0 ? (count / votes.length) * 100 : 0;
                const barColor = getSongColor(item.voters);
                
                // Calcular si este item debe estar centrado (para layouts 4-5 canciones)
                const totalSongs = songsWithVotes.length;
                const lastRowItems = totalSongs % 3;
                const isLastRow = index >= totalSongs - lastRowItems && lastRowItems > 0 && lastRowItems < 3;
                
                return (
                  <div key={item.song.id} className="vote-result-card" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gridTemplateRows: 'auto auto auto',
                    gap: 'clamp(0.6rem, 1vw, 0.9rem)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 'clamp(8px, 1.5vw, 12px)',
                    padding: 'clamp(0.85rem, 1.1vw, 1.2rem)',
                    width: 'clamp(200px, 32vw, 420px)',
                    minHeight: 'auto',
                    ...(isLastRow && { gridColumn: 'auto' })
                  }}>
                    {/* Imagen - Col 1, Row 1 */}
                    <div className="vote-card-image" style={{
                      gridColumn: 1,
                      gridRow: 1,
                      justifySelf: 'center'
                    }}>
                      <img 
                        src={item.song.albumArt} 
                        alt={item.song.name}
                        style={{
                          width: 'clamp(90px, 15vw, 165px)',
                          aspectRatio: '1',
                          borderRadius: '6px',
                          objectFit: 'cover',
                          boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                          display: 'block'
                        }}
                      />
                    </div>
                    
                    {/* Info (Nombre + Artista) - Col 1, Row 2 */}
                    <div className="vote-card-song-info" style={{ 
                      gridColumn: 1, 
                      gridRow: 2,
                      textAlign: 'center', 
                      width: '100%'
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 'clamp(0.7rem, 1.5vw, 0.95rem)', marginBottom: 'clamp(0.05rem, 0.15vw, 0.1rem)', wordBreak: 'break-word', lineHeight: '1.2', color: '#fbf4fe' }}>
                        {item.song.name}
                      </div>
                      <div style={{ fontSize: 'clamp(0.6rem, 1vw, 0.75rem)', opacity: 0.75, fontWeight: 500 }}>
                        {item.song.artist}
                      </div>
                    </div>

                    {/* Barra + Votos + Avatares - Col 2, Rows 1-3 */}
                    <div className="vote-card-info" style={{
                      gridColumn: 2,
                      gridRow: '1 / 4',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'clamp(0.4rem, 0.6vw, 0.6rem)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingLeft: 'clamp(0.6rem, 1vw, 0.9rem)',
                      borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      {/* Barra de progreso horizontal - Solo en desktop */}
                      <div className="vote-bar" style={{
                        width: 'clamp(60px, 10vw, 150px)',
                        height: 'clamp(3px, 0.5vw, 8px)',
                        display: 'flex',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.15)'
                      }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: barColor,
                          transition: 'width 0.3s ease',
                          boxShadow: `0 0 10px ${barColor === 'var(--color-save)' ? 'rgba(139, 255, 98, 0.6)' : 'rgba(250, 86, 73, 0.6)'}`
                        }} />
                      </div>

                      {/* Porcentaje en formato texto - Solo en mobile */}
                      <div className="vote-percentage" style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.85rem)', fontWeight: 'bold', color: barColor, textAlign: 'center', whiteSpace: 'nowrap', display: 'none' }}>
                        {Math.round(percentage)}%
                      </div>

                      {/* Número de votos */}
                      <div style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.85rem)', fontWeight: 'bold', color: barColor, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {count} votos
                      </div>

                      {/* Avatares de votantes */}
                      <div style={{ 
                        width: '100%',
                        display: item.voters.length >= 8 ? 'flex' : 'grid',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...(item.voters.length < 8 && {
                          gridTemplateColumns: 
                            item.voters.length === 1 ? '1fr' :
                            item.voters.length === 2 ? 'repeat(2, 1fr)' :
                            item.voters.length === 3 ? 'repeat(2, 1fr)' :
                            item.voters.length === 4 ? 'repeat(2, 1fr)' :
                            item.voters.length === 5 ? 'repeat(3, 1fr)' :
                            item.voters.length === 6 ? 'repeat(3, 1fr)' :
                            'repeat(3, 1fr)',
                          gap: 'clamp(0.25rem, 0.4vw, 0.4rem)'
                        })
                      }}>
                        {item.voters.length >= 8 ? (
                          <div style={{
                            fontSize: 'clamp(0.85rem, 1.5vw, 1.1rem)',
                            fontWeight: 'bold',
                            color: '#f542cb',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                          }}>
                            TODOS
                          </div>
                        ) : (
                          item.voters.map((voter: any, voterIndex: number) => {
                            // Lógica para centrar en layouts asimétricos
                            let shouldCenterInGrid = false;
                            if (item.voters.length === 3 && voterIndex === 2) shouldCenterInGrid = true;
                            if (item.voters.length === 5 && voterIndex >= 3) shouldCenterInGrid = true;
                            if (item.voters.length === 7 && voterIndex >= 6) shouldCenterInGrid = true;

                            return (
                              <div 
                                key={voter.playerId}
                                style={{ 
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: 'clamp(0.05rem, 0.1vw, 0.1rem)',
                                  ...(shouldCenterInGrid && { gridColumn: item.voters.length === 3 ? '1 / 3' : item.voters.length === 5 ? '2 / 3' : '2 / 3' })
                                }}
                              >
                                <img 
                                  src={`/Avatares/${voter.avatar}.png`}
                                  alt={voter.name}
                                  title={voter.name}
                                  style={{
                                      width: 'clamp(35px, 6.4vw, 51px)',
                                      height: 'clamp(35px, 6.4vw, 51px)',
                                    borderRadius: '50%',
                                    border: '2px solid rgba(139, 255, 98, 0.5)',
                                    objectFit: 'cover',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                  }}
                                  onMouseEnter={(e) => {
                                    (e.target as HTMLImageElement).style.transform = 'scale(1.1)';
                                    (e.target as HTMLImageElement).style.borderColor = 'rgba(139, 255, 98, 1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    (e.target as HTMLImageElement).style.transform = 'scale(1)';
                                    (e.target as HTMLImageElement).style.borderColor = 'rgba(139, 255, 98, 0.5)';
                                  }}
                                />
                                <div style={{ 
                                  fontSize: 'clamp(0.6rem, 1vw, 0.75rem)', 
                                  textAlign: 'center',
                                  fontWeight: 600,
                                  color: 'rgba(251, 244, 254, 0.85)',
                                  wordBreak: 'break-word',
                                  lineHeight: '1.1',
                                  maxWidth: 'clamp(50px, 8vw, 80px)'
                                }}>
                                  {voter.name}
                                </div>
                              </div>
                            );
                          })
                        )}
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
        <div style={{ marginTop: 'clamp(0.8rem, 1.2vw, 1rem)', width: '100%', display: 'grid', gridTemplateColumns: round.roundNumber === totalRounds ? '1fr' : '1fr 1fr', gap: 'clamp(0.6rem, 1vw, 0.8rem)' }}>
          {round.roundNumber < totalRounds && (
            <button type="button" className="primary" onClick={onNextRound} style={{ fontSize: 'clamp(0.7rem, 2vw, 0.85rem)', padding: 'clamp(0.6rem, 1vw, 0.8rem)', fontWeight: 'bold' }}>
              Siguiente Ronda
            </button>
          )}
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
