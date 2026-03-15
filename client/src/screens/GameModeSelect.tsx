import type { GameMode } from '../types';
import Header from '../components/Header';
import { Heart, Trash2 } from 'lucide-react';

interface GameModeSelectProps {
  onSelect: (mode: GameMode) => void;
  onBack?: () => void;
}

export default function GameModeSelect({ onSelect, onBack }: GameModeSelectProps) {
  return (
    <div className="screen-container">
      <Header onBack={onBack} showBackButton={!!onBack} />
      
      <h1>MODO DE JUEGO</h1>
      <p style={{ fontSize: '1.3rem', marginBottom: '3rem' }}>Elige el destino de las canciones</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3rem', width: '100%', maxWidth: '900px' }}>
        <button 
          type="button"
          className="save" 
          onClick={() => onSelect('save')}
          style={{ height: '220px', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', gap: '20px', borderRadius: '24px', padding: '2rem', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ color: 'var(--color-save)', display: 'flex', justifyContent: 'center' }}>
            <Heart size={64} fill="currentColor" />
          </div>
          SALVAR
        </button>
        
        <button 
          type="button"
          className="eliminate" 
          onClick={() => onSelect('eliminate')}
          style={{ height: '220px', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', gap: '20px', borderRadius: '24px', padding: '2rem', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ color: 'var(--color-eliminate)', display: 'flex', justifyContent: 'center' }}>
            <Trash2 size={64} />
          </div>
          ELIMINAR
        </button>
      </div>
    </div>
  );
}
