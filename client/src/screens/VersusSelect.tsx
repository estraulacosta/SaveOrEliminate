import { useState } from 'react';
import Header from '../components/Header';

interface VersusConfig {
  type: 'artist' | 'year' | 'genre' | 'decade';
  option1: string;
  option2: string;
}

interface VersusSelectProps {
  onSelect: (config: VersusConfig) => void;
  onBack?: () => void;
}

export default function VersusSelect({ onSelect, onBack }: VersusSelectProps) {
  const [type, setType] = useState<'artist' | 'year' | 'genre' | 'decade'>('artist');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');

  const handleSubmit = () => {
    if (option1.trim() && option2.trim()) {
      onSelect({ type, option1, option2 });
    } else {
      alert('Completa ambas opciones');
    }
  };

  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <h1>Modo Versus - 1 vs 1</h1>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <label style={{ display: 'block', marginBottom: '10px' }}>
          Tipo de Versus:
          <select value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="artist">Artista vs Artista</option>
            <option value="year">Año vs Año</option>
            <option value="genre">Género vs Género</option>
            <option value="decade">Década vs Década</option>
          </select>
        </label>

        <input
          type="text"
          placeholder={`${type === 'artist' ? 'Primer artista' : type === 'year' ? 'Primer año' : type === 'genre' ? 'Primer género' : 'Primera década'}`}
          value={option1}
          onChange={(e) => setOption1(e.target.value)}
        />

        <input
          type="text"
          placeholder={`${type === 'artist' ? 'Segundo artista' : type === 'year' ? 'Segundo año' : type === 'genre' ? 'Segundo género' : 'Segunda década'}`}
          value={option2}
          onChange={(e) => setOption2(e.target.value)}
        />

        <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.2rem' }}>
          ⚔️ {option1 || '???'} VS {option2 || '???'}
        </p>

        <button className="primary" onClick={handleSubmit}>
          Iniciar Versus
        </button>
      </div>
    </>
  );
}
