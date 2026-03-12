import { useState } from 'react';

interface HomeProps {
  onAction: (action: 'create' | 'join', roomId?: string) => void;
}

export default function Home({ onAction }: HomeProps) {
  const [roomId, setRoomId] = useState('');

  return (
    <>
      <h1>🎵 Save or Eliminate</h1>
      <div className="button-group">
        <button className="primary" onClick={() => onAction('create')}>
          Crear Sala
        </button>
        <div style={{ width: '100%', maxWidth: '400px', margin: '20px auto' }}>
          <input
            type="text"
            placeholder="Código de sala"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button onClick={() => onAction('join', roomId)} disabled={roomId.length !== 6}>
            Unirse a Sala
          </button>
        </div>
      </div>
    </>
  );
}
