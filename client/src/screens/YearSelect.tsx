import { useState } from 'react';
import Header from '../components/Header';
import { Calendar, ArrowRight } from 'lucide-react';

interface YearSelectProps {
  onSelect: (yearRange: { start: number; end: number }) => void;
  onBack?: () => void;
}

export default function YearSelect({ onSelect, onBack }: YearSelectProps) {
  const MIN_YEAR = 1960;
  const MAX_YEAR = 2025;
  const [startYear, setStartYear] = useState(2000);
  const [endYear, setEndYear] = useState(2025);

  const handleSubmit = () => {
    if (startYear <= endYear) {
      onSelect({ start: startYear, end: endYear });
    } else {
      // Better UI feedback would be nice, but keeping alert for simplicity if no toast system
      alert('El año inicial debe ser menor o igual al año final');
    }
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseInt(e.target.value);
    if (newStart <= endYear) {
      setStartYear(newStart);
    } else {
      setStartYear(endYear);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseInt(e.target.value);
    if (newEnd >= startYear) {
      setEndYear(newEnd);
    } else {
      setEndYear(startYear);
    }
  };

  const rangeYears = endYear - startYear + 1;
  const startPercent = ((startYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
  const endPercent = ((endYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  return (
    <div className="screen-container">
      <Header onBack={onBack} showBackButton={!!onBack} />
      
      <div className="icon-hero">
        <Calendar size={64} />
      </div>
      
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}>SELECCIONA AÑOS</h1>
      
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
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={startYear}
            onChange={handleStartChange}
            style={{
              position: 'absolute',
              width: '100%',
              pointerEvents: 'none', // Allow clicking through... wait, range inputs need pointer events
              appearance: 'none',
              background: 'transparent',
              zIndex: 3,
              // We need to make the track invisible but thumb visible and clickable
            }}
            className="dual-range-slider"
          />
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={endYear}
            onChange={handleEndChange}
            style={{
              position: 'absolute',
              width: '100%',
              pointerEvents: 'none',
              appearance: 'none',
              background: 'transparent',
              zIndex: 4,
            }}
            className="dual-range-slider"
          />
        </div>

        {/* Labels below */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(1rem, 2vw, 2rem)' }}>
          <div className="year-display" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', opacity: 0.7 }}>DESDE</span>
            <div style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', fontFamily: 'var(--font-title)', color: 'var(--color-principal)' }}>{startYear}</div>
          </div>
          
          <div style={{ height: '2px', width: 'clamp(20px, 5vw, 30px)', background: 'rgba(255,255,255,0.2)' }}></div>
          
          <div className="year-display" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', opacity: 0.7 }}>HASTA</span>
            <div style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', fontFamily: 'var(--font-title)', color: 'var(--color-eliminate)' }}>{endYear}</div>
          </div>
        </div>

        <p className="text-small" style={{ marginTop: 0, fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
          Rango seleccionado: <strong style={{ color: '#fff' }}>{rangeYears} años</strong>
        </p>

        <button type="button" className="primary" onClick={handleSubmit}>
          CONFIRMAR RANGO <ArrowRight size={20} />
        </button>
      </div>
      
      {/* CSS hack for allowing pointer events only on the thumb for overlapping sliders */}
      <style>{`
        .dual-range-slider::-webkit-slider-thumb {
          pointer-events: auto;
          position: relative;
          z-index: 10;
        }
        .dual-range-slider::-moz-range-thumb {
          pointer-events: auto;
          position: relative;
          z-index: 10;
        }
      `}</style>
    </div>
  );
}
