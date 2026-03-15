import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Loader, Music } from 'lucide-react';

interface LoadingScreenProps {
  onBack?: () => void;
  progress?: { loaded: number; total: number } | null;
}

export default function LoadingScreen({ onBack, progress }: LoadingScreenProps) {
  const [fakeProgress, setFakeProgress] = useState(0);

  useEffect(() => {
    if (progress) return; // Don't use fake progress if real progress is provided

    const interval = setInterval(() => {
      setFakeProgress(prev => {
        if (prev < 30) return prev + Math.random() * 5;
        if (prev < 60) return prev + Math.random() * 2;
        if (prev < 90) return prev + Math.random() * 0.5;
        return prev;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [progress]);

  const percentage = progress && progress.total > 0
    ? Math.min(Math.round((progress.loaded / progress.total) * 100), 100)
    : Math.min(Math.round(fakeProgress), 100);

  return (
    <div className="screen-container">
      <Header onBack={onBack} showBackButton={false} />
      
      <div className="card" style={{ alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ position: 'relative', marginBottom: '2rem' }}>
          <Loader 
            size={64} 
            color="var(--color-principal)" 
            style={{ animation: 'spin 1.5s linear infinite' }} 
          />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <Music size={24} color="rgba(255,255,255,0.5)" />
          </div>
        </div>

        <h2 style={{ marginBottom: '1rem' }}>PREPARANDO PARTIDA</h2>
        
        <div style={{ width: '100%', maxWidth: '300px', marginBottom: '1.5rem' }}>
          <div style={{ 
            height: '8px', 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: '4px', 
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{ 
              width: `${percentage}%`, 
              height: '100%', 
              background: 'var(--color-principal)',
              borderRadius: '4px',
              transition: 'width 0.3s ease-out',
              boxShadow: '0 0 10px var(--color-principal)'
            }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.7 }}>
            <span>{percentage}%</span>
            {progress && progress.total > 0 && (
              <span>{progress.loaded} / {progress.total} canciones</span>
            )}
          </div>
        </div>

        <p className="text-small" style={{ opacity: 0.6, animation: 'pulse 2s infinite' }}>
          {percentage < 30 ? 'Despertando a los DJ...' : 
           percentage < 60 ? 'Afinando los bajos...' : 
           percentage < 90 ? 'Cargando temazos...' : 
           '¡Casi listos!'}
        </p>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
