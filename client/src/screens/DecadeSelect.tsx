import { useState } from 'react';
import Header from '../components/Header';
import { Clock } from 'lucide-react';

interface DecadeSelectProps {
  onSelect: (decadeRange: { start: number; end: number }) => void;
  onBack?: () => void;
}

export default function DecadeSelect({ onSelect, onBack }: DecadeSelectProps) {
  // const decades = [1960, 1970, 1980, 1990, 2000, 2010, 2020];
  const [startDecade, setStartDecade] = useState(1990);
  const [endDecade, setEndDecade] = useState(2020);

  const handleSubmit = () => {
    if (startDecade <= endDecade) {
      onSelect({ start: startDecade, end: endDecade });
    } else {
      alert('La década inicial debe ser menor o igual a la década final');
    }
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseInt(e.target.value);
    if (newStart <= endDecade) {
      setStartDecade(newStart);
    } else {
      setStartDecade(endDecade);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseInt(e.target.value);
    if (newEnd >= startDecade) {
      setEndDecade(newEnd);
    } else {
      setEndDecade(startDecade);
    }
  };

  const numRounds = ((endDecade - startDecade) / 10) + 1;
  const MIN_DECADE = 1960;
  const MAX_DECADE = 2020;
  const startPercent = ((startDecade - MIN_DECADE) / (MAX_DECADE - MIN_DECADE)) * 100;
  const endPercent = ((endDecade - MIN_DECADE) / (MAX_DECADE - MIN_DECADE)) * 100;

  return (
    <div className="screen-container">
      <Header onBack={onBack} showBackButton={!!onBack} />
      
      <div className="icon-hero">
        <Clock size={64} />
      </div>
      
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}>SELECCIONA DÉCADAS</h1>
      
      <div className="card">
        <div style={{ position: 'relative', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Visual Range Bar Background */}
          <div style={{
            position: 'absolute',
            left: 0, right: 0,
            top: '50%', marginTop: '-4px',
            height: '8px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            zIndex: 1
          }}></div>

          {/* Active Range Bar */}
          <div style={{
            position: 'absolute',
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
            top: '50%', marginTop: '-4px',
            height: '8px',
            background: 'var(--color-principal)',
            borderRadius: '4px',
            zIndex: 2,
            boxShadow: '0 0 10px var(--color-principal)'
          }}></div>

          {/* Inputs (Invisible but clickable) */}
          <input
            type="range"
            min={MIN_DECADE}
            max={MAX_DECADE}
            step="10"
            value={startDecade}
            onChange={handleStartChange}
            style={{
              position: 'absolute',
              width: '100%',
              appearance: 'none',
              background: 'transparent',
              zIndex: 4,
            }}
            className="dual-range-slider"
          />
          <input
            type="range"
            min={MIN_DECADE}
            max={MAX_DECADE}
            step="10"
            value={endDecade}
            onChange={handleEndChange}
            style={{
              position: 'absolute',
              width: '100%',
              appearance: 'none',
              background: 'transparent',
              zIndex: 3, // Below startYear slider
            }}
            className="dual-range-slider"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'clamp(1rem, 2vw, 2rem)', marginBottom: 'clamp(1rem, 2vw, 2rem)', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', fontWeight: 600 }}>
          <span>{startDecade}s</span>
          <span style={{ color: 'var(--color-principal)' }}>{endDecade}s</span>
        </div>

        <p style={{ textAlign: 'center', marginBottom: 'clamp(1rem, 2vw, 2rem)', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}>
          <strong>{numRounds} décadas</strong> = <strong>{numRounds} rondas</strong>
        </p>

        <button type="button" className="primary" onClick={handleSubmit} style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}>
          Confirmar
        </button>
      </div>
    </div>
  );
}
