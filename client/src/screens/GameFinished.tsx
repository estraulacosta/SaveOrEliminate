interface GameFinishedProps {
  isHost: boolean;
  roomId: string;
  onPlayAgain: () => void;
}

export default function GameFinished({ isHost, onPlayAgain }: GameFinishedProps) {
  return (
    <>
      <h1>🎉 ¡Juego Terminado!</h1>
      
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ fontSize: '1.5rem', marginBottom: '30px' }}>
          Gracias por jugar Save or Eliminate
        </p>
        
        {isHost && (
          <button className="primary" onClick={onPlayAgain}>
            🔄 Jugar de Nuevo
          </button>
        )}

        {!isHost && (
          <p style={{ opacity: 0.7 }}>
            Esperando a que el host decida si jugar de nuevo...
          </p>
        )}
      </div>
    </>
  );
}
