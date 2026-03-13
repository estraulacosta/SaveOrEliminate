import type { Room } from '../types';
import Header from '../components/Header';

interface LobbyProps {
  room: Room;
  isHost: boolean;
  onStartGame: () => void;
  onBack?: () => void;
}

export default function Lobby({ room, isHost, onStartGame, onBack }: LobbyProps) {
  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${room.id}`;
    navigator.clipboard.writeText(link);
    alert('¡Link copiado!');
  };

  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <h1>Sala: {room.id}</h1>
      
      <div className="room-code">
        Código: {room.id}
        <br />
        <button onClick={copyRoomLink} style={{ marginTop: '15px' }}>
          📋 Copiar Link
        </button>
      </div>

      <div className="players-list">
        <h2>Jugadores ({room.players.length}/8)</h2>
        {room.players.map((player) => (
          <div key={player.id} className="player-item">
            <span>{player.name}</span>
            {player.isHost && <span>👑 Host</span>}
          </div>
        ))}
      </div>

      {isHost && (
        <button
          className="primary"
          onClick={onStartGame}
          disabled={room.players.length < 1}
        >
          ¡Iniciar Partida!
        </button>
      )}

      {!isHost && (
        <p style={{ textAlign: 'center', opacity: 0.7 }}>
          Esperando a que el host inicie la partida...
        </p>
      )}
    </>
  );
}
