import { useState } from 'react';
import type { MusicSelectionType } from '../types';
import Header from '../components/Header';
import { Music, Mic, Calendar, Clock, Swords } from 'lucide-react';

interface MusicSetupSelectProps {
  onSelectType: (type: MusicSelectionType, songsPerRound?: number, totalRounds?: number, yearRange?: {start: number; end: number}, decadeRange?: {start: number; end: number}) => void;
  onBack?: () => void;
}

export default function MusicSetupSelect({ onSelectType, onBack }: MusicSetupSelectProps) {
  const [selectedType, setSelectedType] = useState<MusicSelectionType | null>(null);
  const [songCount, setSongCount] = useState(3);
  const [totalRounds, setTotalRounds] = useState(10);
  const [startYear, setStartYear] = useState(2000);
  const [endYear, setEndYear] = useState(2025);
  const [startDecade, setStartDecade] = useState(1990);
  const [endDecade, setEndDecade] = useState(2020);
  const [activeYearSlider, setActiveYearSlider] = useState<'start' | 'end' | null>(null);
  const [activeDecadeSlider, setActiveDecadeSlider] = useState<'start' | 'end' | null>(null);
  
  const MIN_SONGS = 2;
  const MAX_SONGS = 6;
  const MIN_ROUNDS = 1;
  const MAX_ROUNDS = 20;
  const MIN_YEAR = 1960;
  const MAX_YEAR = 2025;
  const MIN_DECADE = 1960;
  const MAX_DECADE = 2020;

  const typeOptions = [
    { type: 'genre' as const, label: 'POR GÉNERO', icon: <Music /> },
    { type: 'artist' as const, label: 'POR ARTISTA', icon: <Mic /> },
    { type: 'year' as const, label: 'POR AÑO', icon: <Calendar /> },
    { type: 'decade' as const, label: 'POR DÉCADA', icon: <Clock /> },
    { type: 'versus' as const, label: 'VERSUS', icon: <Swords /> },
  ] as const;

  const handleConfirm = () => {
    if (selectedType) {
      const finalSongCount = selectedType === 'versus' ? 2 : songCount;
      const finalRounds = (selectedType === 'year' || selectedType === 'decade') ? undefined : totalRounds;
      
      if (selectedType === 'year') {
        onSelectType(selectedType, finalSongCount, finalRounds, { start: startYear, end: endYear });
      } else if (selectedType === 'decade') {
        onSelectType(selectedType, finalSongCount, finalRounds, undefined, { start: startDecade, end: endDecade });
      } else {
        onSelectType(selectedType, finalSongCount, finalRounds);
      }
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSongCount(parseInt(e.target.value));
  };

  const handleRoundsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalRounds(parseInt(e.target.value));
  };

  const handleStartYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseInt(e.target.value);
    if (newStart <= endYear) {
      setStartYear(newStart);
    } else {
      setStartYear(endYear);
    }
  };

  const handleEndYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseInt(e.target.value);
    if (newEnd >= startYear) {
      setEndYear(newEnd);
    } else {
      setEndYear(startYear);
    }
  };

  const handleStartDecadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseInt(e.target.value);
    if (newStart <= endDecade) {
      setStartDecade(newStart);
    } else {
      setStartDecade(endDecade);
    }
  };

  const handleEndDecadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseInt(e.target.value);
    if (newEnd >= startDecade) {
      setEndDecade(newEnd);
    } else {
      setEndDecade(startDecade);
    }
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

      {/* Sección 2: Configuración según tipo seleccionado */}
      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
        
        {selectedType === 'year' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '1.5rem' }}>
              {/* Deslizador 1: Años (IZQUIERDA) */}
              <div>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', textAlign: 'center' }}>SELECCIONA AÑOS</h2>
                
                {/* Display años - mismo layout que canciones */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                    <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--color-principal)' }}>{startYear}</div>
                    <div style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.5)' }}>-</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--color-eliminate)' }}>{endYear}</div>
                  </div>
                  <p style={{ opacity: 0.8, fontSize: '0.95rem', margin: 0 }}>años seleccionados</p>
                </div>

                <div style={{ position: 'relative', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  
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
                    left: `${((startYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`,
                    width: `${((endYear - startYear) / (MAX_YEAR - MIN_YEAR)) * 100}%`,
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
                    onChange={handleStartYearChange}
                    onMouseDown={() => setActiveYearSlider('start')}
                    onTouchStart={() => setActiveYearSlider('start')}
                    onMouseUp={() => setActiveYearSlider(null)}
                    onTouchEnd={() => setActiveYearSlider(null)}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      appearance: 'none',
                      background: 'transparent',
                      zIndex: activeYearSlider === 'start' ? 5 : 3,
                    }}
                    className="dual-range-slider"
                  />
                  <input
                    type="range"
                    min={MIN_YEAR}
                    max={MAX_YEAR}
                    value={endYear}
                    onChange={handleEndYearChange}
                    onMouseDown={() => setActiveYearSlider('end')}
                    onTouchStart={() => setActiveYearSlider('end')}
                    onMouseUp={() => setActiveYearSlider(null)}
                    onTouchEnd={() => setActiveYearSlider(null)}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      appearance: 'none',
                      background: 'transparent',
                      zIndex: activeYearSlider === 'end' ? 5 : 4,
                    }}
                    className="dual-range-slider"
                  />
                </div>
              </div>

              {/* Deslizador 2: Canciones (DERECHA) */}
              <div>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', textAlign: 'center' }}>¿Cuántas Canciones?</h2>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--color-principal)', marginBottom: '0.3rem' }}>
                    {songCount}
                  </div>
                  <p style={{ opacity: 0.8, fontSize: '0.95rem', margin: 0 }}>canciones por ronda</p>
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
              </div>
            </div>

            {/* CSS hack for allowing pointer events only on the thumb for overlapping sliders */}
            <style>{`
              .dual-range-slider {
                touch-action: none;
              }
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
          </>
        )}

        {selectedType === 'decade' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '1.5rem' }}>
              {/* Deslizador 1: Décadas (IZQUIERDA) */}
              <div>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', textAlign: 'center' }}>SELECCIONA DÉCADAS</h2>
                
                {/* Display décadas - mismo layout que canciones */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                    <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--color-principal)' }}>{String(startDecade).slice(-2)}s</div>
                    <div style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.5)' }}>-</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--color-eliminate)' }}>{String(endDecade).slice(-2)}s</div>
                  </div>
                  <p style={{ opacity: 0.8, fontSize: '0.95rem', margin: 0 }}>décadas seleccionadas</p>
                </div>

                <div style={{ position: 'relative', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  
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
                    left: `${((startDecade - MIN_DECADE) / (MAX_DECADE - MIN_DECADE)) * 100}%`,
                    width: `${((endDecade - startDecade) / (MAX_DECADE - MIN_DECADE)) * 100}%`,
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
                    onChange={handleStartDecadeChange}
                    onMouseDown={() => setActiveDecadeSlider('start')}
                    onTouchStart={() => setActiveDecadeSlider('start')}
                    onMouseUp={() => setActiveDecadeSlider(null)}
                    onTouchEnd={() => setActiveDecadeSlider(null)}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      appearance: 'none',
                      background: 'transparent',
                      zIndex: activeDecadeSlider === 'start' ? 5 : 4,
                    }}
                    className="dual-range-slider"
                  />
                  <input
                    type="range"
                    min={MIN_DECADE}
                    max={MAX_DECADE}
                    step="10"
                    value={endDecade}
                    onChange={handleEndDecadeChange}
                    onMouseDown={() => setActiveDecadeSlider('end')}
                    onTouchStart={() => setActiveDecadeSlider('end')}
                    onMouseUp={() => setActiveDecadeSlider(null)}
                    onTouchEnd={() => setActiveDecadeSlider(null)}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      appearance: 'none',
                      background: 'transparent',
                      zIndex: activeDecadeSlider === 'end' ? 5 : 3,
                    }}
                    className="dual-range-slider"
                  />
                </div>
              </div>

              {/* Deslizador 2: Canciones (DERECHA) */}
              <div>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', textAlign: 'center' }}>¿Cuántas Canciones?</h2>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--color-principal)', marginBottom: '0.3rem' }}>
                    {songCount}
                  </div>
                  <p style={{ opacity: 0.8, fontSize: '0.95rem', margin: 0 }}>canciones por ronda</p>
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
              </div>
            </div>

            {/* CSS hack for allowing pointer events only on the thumb for overlapping sliders */}
            <style>{`
              .dual-range-slider {
                touch-action: none;
              }
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
          </>
        )}

        {(selectedType === 'genre' || selectedType === 'artist' || selectedType === 'versus') && (
          <>
            {/* Grid para dos deslizadores lado a lado - Rondas a la IZQUIERDA, Canciones a la DERECHA */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedType === 'versus' ? '1fr' : '1fr 1fr', gap: '3rem', marginBottom: '1.5rem' }}>
              
              {/* Deslizador 1: Rondas (IZQUIERDA) */}
              <div style={{ maxWidth: selectedType === 'versus' ? '400px' : undefined, margin: selectedType === 'versus' ? '0 auto' : undefined, width: '100%' }}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', textAlign: 'center' }}>¿Cuántas Rondas?</h2>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--color-principal)', marginBottom: '0.3rem' }}>
                    {totalRounds}
                  </div>
                  <p style={{ opacity: 0.8, fontSize: '0.95rem', margin: 0 }}>rondas</p>
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
                    width: `${((totalRounds - MIN_ROUNDS) / (MAX_ROUNDS - MIN_ROUNDS)) * 100}%`,
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
                    min={MIN_ROUNDS}
                    max={MAX_ROUNDS}
                    value={totalRounds}
                    onChange={handleRoundsChange}
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
              </div>

              {/* Deslizador 2: Canciones (DERECHA) - Solo visible si no es VERSUS */}
              {selectedType !== 'versus' && (
              <div>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', textAlign: 'center' }}>¿Cuántas Canciones?</h2>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--color-principal)', marginBottom: '0.3rem' }}>
                    {songCount}
                  </div>
                  <p style={{ opacity: 0.8, fontSize: '0.95rem', margin: 0 }}>canciones por ronda</p>
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
              </div>
              )}
            </div>

            {/* CSS hack for allowing pointer events only on the thumb for overlapping sliders */}
            <style>{`
              .dual-range-slider {
                touch-action: none;
              }
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
          </>
        )}

        <button 
          type="button"
          className="primary"
          onClick={handleConfirm}
          disabled={!selectedType}
          style={{ fontSize: '1rem', padding: '0.9rem 2rem', width: '100%', marginTop: '2rem' }}
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}
