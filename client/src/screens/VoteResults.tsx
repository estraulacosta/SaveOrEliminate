import type { Round, Player, Vote } from '../types';

interface VoteResultsProps {
  round: Round;
  players: Player[];
  votes: Vote[];
  isHost: boolean;
  roomId: string;
  onNextRound: () => void;
}

export default function VoteResults({ round, players, votes, isHost, onNextRound }: VoteResultsProps) {
  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || 'Desconocido';
  };

  const getSongName = (songId: string) => {
    return round.songs.find(s => s.id === songId)?.name || 'Desconocida';
  };

  return (
    <>
      <h1>Resultados - Ronda {round.roundNumber}</h1>
      
      <div className="vote-results">
        <h2>Votos:</h2>
        {votes.length > 0 ? (
          votes.map((vote, index) => (
            <div key={index} className="vote-item">
              <span>{getPlayerName(vote.playerId)}</span>
              <span>→</span>
              <span>{getSongName(vote.songId)}</span>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', opacity: 0.7 }}>
            Nadie votó en esta ronda
          </p>
        )}
      </div>

      {isHost && (
        <button className="primary" onClick={onNextRound}>
          Siguiente Ronda
        </button>
      )}

      {!isHost && (
        <p style={{ textAlign: 'center', opacity: 0.7 }}>
          Esperando a que el host continúe...
        </p>
      )}
    </>
  );
}
