import type { MusicSelectionType } from '../types';
import Header from '../components/Header';
import { Music, Mic, Calendar, Clock, Swords } from 'lucide-react';

interface MusicTypeSelectProps {
  onSelect: (type: MusicSelectionType) => void;
  onBack?: () => void;
}

export default function MusicTypeSelect({ onSelect, onBack }: MusicTypeSelectProps) {
  const options = [
    { type: 'genre', label: 'POR GÉNERO', icon: <Music /> },
    { type: 'artist', label: 'POR ARTISTA', icon: <Mic /> },
    { type: 'year', label: 'POR AÑO', icon: <Calendar /> },
    { type: 'decade', label: 'POR DÉCADA', icon: <Clock /> },
    { type: 'versus', label: 'VERSUS', icon: <Swords /> },
  ] as const;

  return (
    <div className="screen-container">
      <Header onBack={onBack} showBackButton={!!onBack} />
      
      <h1>SELECCIÓN DE MÚSICA</h1>
      
      <div className="grid">
        {options.map((opt) => (
          <button 
            key={opt.type} 
            onClick={() => onSelect(opt.type)}
            style={{ 
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              background: 'rgba(128, 22, 199, 0.1)',
              border: '2px solid rgba(128, 22, 199, 0.2)',
              borderRadius: '16px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s',
              minHeight: '140px',
              justifyContent: 'center',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(128, 22, 199, 0.5)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.2)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(128, 22, 199, 0.2)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.1)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            <span style={{ color: 'var(--color-principal)', fontSize: '2rem' }}>{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

