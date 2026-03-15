interface SongsPerRoundSelectProps {
  onSelect: (count: number) => void;
  onBack?: () => void;
}
import { useState } from 'react';
import Header from '../components/Header';

export default function SongsPerRoundSelect({ onSelect, onBack }: SongsPerRoundSelectProps) {
  const [songCount, setSongCount] = useState(3);
  const MIN_SONGS = 2;
  const MAX_SONGS = 6;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSongCount(parseInt(e.target.value));
  };

  const handleConfirm = () => {
    onSelect(songCount);
  };

  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <h1>¿Cuántas Canciones?</h1>
      
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--color-principal)', marginBottom: '1rem' }}>
            {songCount}
          </div>
          <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>canciones por ronda</p>
        </div>

        <div style={{ position: 'relative', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3rem' }}>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '0.9rem', opacity: 0.6 }}>
          <span>{MIN_SONGS}</span>
          <span>{MAX_SONGS}</span>
        </div>

        <button 
          className="primary"
          onClick={handleConfirm}
          style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}
        >
          Confirmar
        </button>
      </div>
    </>
  );
}
