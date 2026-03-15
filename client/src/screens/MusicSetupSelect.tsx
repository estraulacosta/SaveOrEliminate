import { useState } from 'react';
import type { MusicSelectionType } from '../types';
import Header from '../components/Header';
import { Music, Mic, Calendar, Clock, Swords } from 'lucide-react';

interface MusicSetupSelectProps {
  onSelectType: (type: MusicSelectionType, songsPerRound?: number) => void;
  onBack?: () => void;
}

export default function MusicSetupSelect({ onSelectType, onBack }: MusicSetupSelectProps) {
  const [selectedType, setSelectedType] = useState<MusicSelectionType | null>(null);
  const [songCount, setSongCount] = useState(3);
  const MIN_SONGS = 2;
  const MAX_SONGS = 6;

  const typeOptions = [
    { type: 'genre' as const, label: 'POR GÉNERO', icon: <Music /> },
    { type: 'artist' as const, label: 'POR ARTISTA', icon: <Mic /> },
    { type: 'year' as const, label: 'POR AÑO', icon: <Calendar /> },
    { type: 'decade' as const, label: 'POR DÉCADA', icon: <Clock /> },
    { type: 'versus' as const, label: 'VERSUS', icon: <Swords /> },
  ] as const;

  const handleConfirm = () => {
    if (selectedType) {
      onSelectType(selectedType, songCount);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSongCount(parseInt(e.target.value));
  };

  return (
    <div className="screen-container">
      <Header onBack={onBack} showBackButton={!!onBack} />
      
      <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>CONFIGURACIÓN DE MÚSICA</h1>
      
      {/* Sección 1: Selección de tipo */}
      <div style={{ marginBottom: '2rem', width: '100%' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Tipo de Selección</h2>
        <div className="grid" style={{ maxWidth: '1000px', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem', margin: '0 auto' }}>
          {typeOptions.map((opt) => (
            <button 
              type="button"
              key={opt.type} 
              onClick={() => setSelectedType(opt.type)}
              style={{ 
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                background: selectedType === opt.type ? 'rgba(128, 22, 199, 0.3)' : 'rgba(128, 22, 199, 0.1)',
                border: selectedType === opt.type ? '2px solid var(--color-principal)' : '2px solid rgba(128, 22, 199, 0.2)',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s',
                minHeight: '110px',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                if (selectedType !== opt.type) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(128, 22, 199, 0.5)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.15)';
                }
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = selectedType === opt.type ? 'var(--color-principal)' : 'rgba(128, 22, 199, 0.2)';
                (e.currentTarget as HTMLButtonElement).style.background = selectedType === opt.type ? 'rgba(128, 22, 199, 0.3)' : 'rgba(128, 22, 199, 0.1)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <span style={{ color: 'var(--color-principal)', fontSize: '1.3rem' }}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sección 2: Canciones por ronda */}
      <div style={{ width: '100%', maxWidth: '450px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>¿Cuántas Canciones?</h2>
        
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--color-principal)', marginBottom: '0.3rem' }}>
            {songCount}
          </div>
          <p style={{ opacity: 0.8, fontSize: '0.95rem' }}>canciones por ronda</p>
        </div>

        <div style={{ position: 'relative', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          {/* Background Bar */}
          <div style={{
            position: 'absolute',
            left: 0, right: 0,
            top: '50%', marginTop: '-4px',
            height: '8px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            zIndex: 1
          }}></div>

          {/* Filled Bar */}
          <div style={{
            position: 'absolute',
            left: 0,
            width: `${((songCount - MIN_SONGS) / (MAX_SONGS - MIN_SONGS)) * 100}%`,
            top: '50%', marginTop: '-4px',
            height: '8px',
            background: 'var(--color-principal)',
            borderRadius: '4px',
            zIndex: 2,
            boxShadow: '0 0 10px var(--color-principal)'
          }}></div>

          {/* Input Slider */}
          <input
            type="range"
            min={MIN_SONGS}
            max={MAX_SONGS}
            value={songCount}
            onChange={handleSliderChange}
            style={{
              position: 'relative',
              width: '100%',
              height: '8px',
              zIndex: 5,
              cursor: 'pointer',
              appearance: 'none',
              background: 'transparent'
            }}
            className="dual-range-slider"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.85rem', opacity: 0.6 }}>
          <span>{MIN_SONGS}</span>
          <span>{MAX_SONGS}</span>
        </div>

        <button 
          type="button"
          className="primary"
          onClick={handleConfirm}
          disabled={!selectedType}
          style={{ fontSize: '1rem', padding: '0.9rem 2rem', width: '100%' }}
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}
