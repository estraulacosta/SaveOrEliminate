import { useState } from 'react';
import Header from '../components/Header';

interface DecadeSelectProps {
  onSelect: (decadeRange: { start: number; end: number }) => void;
  onBack?: () => void;
}

export default function DecadeSelect({ onSelect, onBack }: DecadeSelectProps) {
  const decades = [1960, 1970, 1980, 1990, 2000, 2010, 2020];
  const [startDecade, setStartDecade] = useState(1990);
  const [endDecade, setEndDecade] = useState(2020);

  const handleSubmit = () => {
    if (startDecade <= endDecade) {
      onSelect({ start: startDecade, end: endDecade });
    } else {
      alert('La década inicial debe ser menor o igual a la década final');
    }
  };

  const numRounds = ((endDecade - startDecade) / 10) + 1;

  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <h1>Selecciona el Rango de Décadas</h1>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <label style={{ display: 'block', marginBottom: '10px' }}>
          Década Inicial:
          <select value={startDecade} onChange={(e) => setStartDecade(parseInt(e.target.value))}>
            {decades.map(d => (
              <option key={d} value={d}>{d}s</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: '20px' }}>
          Década Final:
          <select value={endDecade} onChange={(e) => setEndDecade(parseInt(e.target.value))}>
            {decades.map(d => (
              <option key={d} value={d}>{d}s</option>
            ))}
          </select>
        </label>
        <p style={{ textAlign: 'center', marginBottom: '20px' }}>
          {numRounds} décadas = {numRounds} rondas
        </p>
        <button className="primary" onClick={handleSubmit}>
          Confirmar
        </button>
      </div>
    </>
  );
}
