import { useState } from 'react';
import { Play, Users } from 'lucide-react';

interface HomeProps {
  onAction: (action: 'create' | 'join', roomId?: string) => void;
}

export default function Home({ onAction }: HomeProps) {
  const [roomId, setRoomId] = useState('');

  return (
    <div className="screen-container">
      <div className="icon-hero">
        <img src="/Logo/Logo.svg" alt="Save or Eliminate" style={{ width: 'clamp(200px, 70vw, 600px)', height: 'auto' }} />
      </div>
      
      
      <p>Bienvenido al juego musical definitivo.</p>

      <div className="card">
        <button className="primary" onClick={() => onAction('create')}>
          <Play size={20} /> Crear Nueva Sala
        </button>

        <div style={{ position: 'relative', margin: '1rem 0', textAlign: 'center' }}>
          <span className="text-small">O UNITE A UNA EXISTENTE</span>
        </div>

        <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <input
            type="text"
            placeholder="CÓDIGO"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ letterSpacing: '4px', textTransform: 'uppercase' }}
          />
          <button 
            className="secondary" 
            onClick={() => onAction('join', roomId)} 
            disabled={roomId.length !== 6}
            style={{ padding: '0 1rem' }}
          >
            <Users size={20} /> Unirse
          </button>
        </div>
      </div>
    </div>
  );
}
