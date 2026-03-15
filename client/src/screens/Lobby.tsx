import type { Room } from '../types';
import Header from '../components/Header';
import { Users, Copy, Crown, Play, Loader } from 'lucide-react';
import React from 'react';

interface LobbyProps {
  room: Room;
  isHost: boolean;
  onStartGame: () => void;
  onBack?: () => void;
}

export default function Lobby({ room, isHost, onStartGame, onBack }: LobbyProps) {
  const [copied, setCopied] = React.useState(false);

  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${room.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="screen-container">
      <Header onBack={onBack} showBackButton={!!onBack} />
      
      <div style={{ width: '100%', marginBottom: 'clamp(0.6rem, 0.8vw, 0.8rem)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'clamp(0.8rem, 1.2vw, 1rem)' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: 0, display: 'flex', alignItems: 'center', gap: 'clamp(10px, 2vw, 15px)' }}>
            <Users size={28} color="var(--color-principal)" /> JUGADORES <span style={{ opacity: 0.5, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}>({room.players.length})</span>
          </h2>
        </div>

        <div className="players-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '1rem',
          marginBottom: 'clamp(0.8rem, 1.2vw, 1rem)',
          maxWidth: '100%',
          margin: '0 auto clamp(0.8rem, 1.2vw, 1rem)'
        }}>
          {room.players.map((player) => (
            <div key={player.id} style={{
              background: 'rgba(255,255,255,0.05)',
              border: player.isHost ? '2px solid var(--color-principal)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'clamp(12px, 2vw, 16px)',
              padding: 'clamp(0.7rem, 1.5vw, 1rem)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: player.isHost ? '0 0 20px rgba(128, 22, 199, 0.3)' : 'none',
              transition: 'all 0.3s'
            }}>
              {player.isHost && (
                <div style={{ position: 'absolute', top: 'clamp(-18px, -2vw, -12px)', background: '#1E1921', padding: 'clamp(1px, 0.3vw, 2px) clamp(6px, 1vw, 8px)', borderRadius: 'clamp(10px, 1.5vw, 12px)' }}>
                  <Crown size={16} color="#FFD700" fill="#FFD700" />
                </div>
              )}
              <div style={{ 
                width: 'clamp(50px, 12vw, 80px)', height: 'clamp(50px, 12vw, 80px)', 
                background: player.isHost ? 'var(--color-principal)' : 'rgba(128, 22, 199, 0.2)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 'clamp(0.6rem, 1.5vw, 1rem)',
                fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
                fontWeight: 'bold'
              }}>
                {player.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: 700, fontSize: 'clamp(0.8rem, 2vw, 1.1rem)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {player.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ alignItems: 'center', textAlign: 'center', marginBottom: 'clamp(1rem, 1.5vw, 1.5rem)', background: 'transparent', border: 'none', boxShadow: 'none' }}>
        <p className="text-small" style={{ marginBottom: 'clamp(0.3rem, 1vw, 0.5rem)', fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)', opacity: 0.7 }}>SALA DE JUEGO</p>
        <h1 style={{ marginBottom: 'clamp(1rem, 2vw, 1.5rem)', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', letterSpacing: 'clamp(4px, 1vw, 6px)' }}>
          {room.id}
        </h1>
        
        <button 
          type="button"
          onClick={copyRoomLink} 
          className="secondary" 
          style={{ width: 'auto', padding: 'clamp(0.6rem, 1vw, 0.8rem) clamp(1rem, 2vw, 1.5rem)', fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)', background: copied ? 'rgba(139, 255, 98, 0.2)' : 'transparent', transition: 'all 0.3s' }}
        >
          <Copy size={16} /> {copied ? '¡Copiado!' : 'Copiar Enlace'}
        </button>
      </div>

      <div style={{ marginTop: 'clamp(0.8rem, 1vw, 1.2rem)' }}>
        {isHost ? (
          <button
            type="button"
            className="primary"
            onClick={onStartGame}
            disabled={room.players.length < 1}
            style={{ width: '100%', padding: 'clamp(1rem, 2vw, 1.5rem)', fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}
          >
            <Play size={24} fill="currentColor" /> CONFIGURAR PARTIDA
          </button>
        ) : (
          <div className="card" style={{ background: 'rgba(128, 22, 199, 0.1)', border: '1px solid var(--color-principal)', marginTop: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
              <Loader size={24} className="spin" style={{ animation: 'spin 2s linear infinite' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: 'clamp(0.8rem, 2.5vw, 1.1rem)', textAlign: 'left' }}>ESPERANDO AL HOST</h3>
                <p style={{ margin: 0, fontSize: 'clamp(0.6rem, 1.5vw, 0.8rem)', textAlign: 'left', opacity: 0.7 }}>El anfitrión está configurando la partida...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
