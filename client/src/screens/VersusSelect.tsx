import { useState } from 'react';
import Header from '../components/Header';
import { Swords } from 'lucide-react';

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

  const typeOptions = [
    { value: 'artist' as const, label: 'Artista vs Artista', icon: '🎤' },
    { value: 'year' as const, label: 'Año vs Año', icon: '📅' },
    { value: 'genre' as const, label: 'Género vs Género', icon: '🎵' },
    { value: 'decade' as const, label: 'Década vs Década', icon: '⏰' },
  ];

  const getPlaceholder = (index: number) => {
    const labels = {
      'artist': ['Primer artista', 'Segundo artista'],
      'year': ['Primer año', 'Segundo año'],
      'genre': ['Primer género', 'Segundo género'],
      'decade': ['Primera década', 'Segunda década'],
    };
    return labels[type][index];
  };

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
      <h1>MODO VERSUS - 1 vs 1</h1>
      <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '1rem', marginBottom: '1.5rem', opacity: 0.8 }}>Selecciona el tipo de versus:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {typeOptions.map(opt => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setType(opt.value)}
                style={{
                  padding: '1.2rem',
                  background: type === opt.value ? 'rgba(128, 22, 199, 0.3)' : 'rgba(128, 22, 199, 0.1)',
                  border: type === opt.value ? '2px solid var(--color-principal)' : '2px solid rgba(128, 22, 199, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  fontSize: '0.95rem',
                  fontWeight: 600
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.2)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = type === opt.value ? 'rgba(128, 22, 199, 0.3)' : 'rgba(128, 22, 199, 0.1)';
                }}
              >
                <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.7 }}>Opción 1</label>
              <input
                type="text"
                placeholder={getPlaceholder(0)}
                value={option1}
                onChange={(e) => setOption1(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '2px solid rgba(128, 22, 199, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: 0.7 }}>
              <Swords size={28} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.7 }}>Opción 2</label>
              <input
                type="text"
                placeholder={getPlaceholder(1)}
                value={option2}
                onChange={(e) => setOption2(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '2px solid rgba(128, 22, 199, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                }}
              />
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            padding: '1.5rem',
            background: 'rgba(128, 22, 199, 0.1)',
            borderRadius: '12px',
            marginBottom: '2rem',
            fontSize: '1.3rem',
            fontWeight: 700,
            color: 'var(--color-principal)'
          }}>
            ⚔️ {option1 || '???'} vs {option2 || '???'}
          </div>

          <button type="button" className="primary" onClick={handleSubmit} style={{ fontSize: '1.1rem', padding: '1rem' }}>
            Iniciar Versus
          </button>
        </div>
      </div>
    </>
  );
}
