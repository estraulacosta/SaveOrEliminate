import { useState } from 'react';
import '../App.css';
import Header from '../components/Header';

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
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <div style={styles.container}>
      <h1 style={styles.title}>🎵 Selecciona el Rango de Años</h1>
      
      <div style={styles.displayContainer}>
        <div style={styles.yearDisplay}>
          <div style={styles.yearBox}>
            <div style={styles.yearLabel}>Desde</div>
            <div style={styles.yearValue}>{startYear}</div>
          </div>
          <div style={styles.separator}>→</div>
          <div style={styles.yearBox}>
            <div style={styles.yearLabel}>Hasta</div>
            <div style={styles.yearValue}>{endYear}</div>
          </div>
        </div>
        
        <div style={styles.statsBox}>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Rondas:</span>
            <span style={styles.statValue}>{rangeYears}</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Período:</span>
            <span style={styles.statValue}>{rangeYears} años</span>
          </div>
        </div>
      </div>

      <div style={styles.sliderSection}>
        <div style={styles.sliderGroup}>
          <label style={styles.sliderLabel}>
            <div style={styles.sliderLabelText}>Año Inicial: <strong>{startYear}</strong></div>
            <input
              type="range"
              min={MIN_YEAR}
              max={MAX_YEAR}
              value={startYear}
              onChange={handleStartChange}
              style={{
                ...styles.slider,
                background: `linear-gradient(90deg, #667eea 0%, #667eea ${((startYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%, #e0e0e0 ${((startYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%, #e0e0e0 100%)`
              }}
            />
          </label>
        </div>

        <div style={styles.sliderGroup}>
          <label style={styles.sliderLabel}>
            <div style={styles.sliderLabelText}>Año Final: <strong>{endYear}</strong></div>
            <input
              type="range"
              min={MIN_YEAR}
              max={MAX_YEAR}
              value={endYear}
              onChange={handleEndChange}
              style={{
                ...styles.slider,
                background: `linear-gradient(90deg, #667eea 0%, #667eea ${((endYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%, #e0e0e0 ${((endYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%, #e0e0e0 100%)`
              }}
            />
          </label>
        </div>

        <div style={styles.rangeVisualization}>
          <div style={styles.timelineContainer}>
            <div style={styles.timeline}>
              <div 
                style={{
                  ...styles.selectedRange,
                  left: `${startPercent}%`,
                  right: `${100 - endPercent}%`
                }}
              />
            </div>
            <div style={styles.timelineLabels}>
              <span>{MIN_YEAR}</span>
              <span>{MAX_YEAR}</span>
            </div>
          </div>
        </div>
      </div>

      <button className="primary" onClick={handleSubmit} style={styles.button}>
        🎮 Confirmar y Jugar
      </button>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: 'Arial, sans-serif',
  } as React.CSSProperties,

  title: {
    textAlign: 'center' as const,
    fontSize: '32px',
    marginBottom: '40px',
    color: '#333',
  } as React.CSSProperties,

  displayContainer: {
    marginBottom: '40px',
  } as React.CSSProperties,

  yearDisplay: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '30px',
  } as React.CSSProperties,

  yearBox: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '25px 40px',
    borderRadius: '15px',
    boxShadow: '0 8px 15px rgba(102, 126, 234, 0.3)',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  yearLabel: {
    fontSize: '12px',
    opacity: 0.8,
    marginBottom: '5px',
    textTransform: 'uppercase' as const,
    fontWeight: 'bold' as const,
  } as React.CSSProperties,

  yearValue: {
    fontSize: '42px',
    fontWeight: 'bold' as const,
  } as React.CSSProperties,

  separator: {
    fontSize: '32px',
    color: '#667eea',
    fontWeight: 'bold' as const,
  } as React.CSSProperties,

  statsBox: {
    background: '#f5f5f5',
    padding: '20px',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'space-around',
    gap: '20px',
  } as React.CSSProperties,

  stat: {
    textAlign: 'center' as const,
    flex: 1,
  } as React.CSSProperties,

  statLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#999',
    marginBottom: '5px',
  } as React.CSSProperties,

  statValue: {
    display: 'block',
    fontSize: '28px',
    fontWeight: 'bold' as const,
    color: '#667eea',
  } as React.CSSProperties,

  sliderSection: {
    marginBottom: '30px',
  } as React.CSSProperties,

  sliderGroup: {
    marginBottom: '25px',
  } as React.CSSProperties,

  sliderLabel: {
    display: 'block',
  } as React.CSSProperties,

  sliderLabelText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
    fontWeight: '500' as const,
  } as React.CSSProperties,

  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '5px',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,

  rangeVisualization: {
    marginTop: '40px',
    padding: '20px',
    background: '#f9f9f9',
    borderRadius: '10px',
  } as React.CSSProperties,

  timelineContainer: {
    position: 'relative' as const,
  } as React.CSSProperties,

  timeline: {
    position: 'relative' as const,
    height: '6px',
    background: '#e0e0e0',
    borderRadius: '3px',
    marginBottom: '10px',
  } as React.CSSProperties,

  selectedRange: {
    position: 'absolute' as const,
    height: '100%',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
    borderRadius: '3px',
    top: 0,
  } as React.CSSProperties,

  timelineLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#999',
  } as React.CSSProperties,

  button: {
    width: '100%',
    padding: '16px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 8px 15px rgba(102, 126, 234, 0.3)',
  } as React.CSSProperties,
};
