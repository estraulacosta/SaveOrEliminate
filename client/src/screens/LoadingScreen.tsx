import { useState, useEffect } from 'react';
import '../App.css';
import Header from '../components/Header';

interface LoadingScreenProps {
  onBack?: () => void;
}

export default function LoadingScreen({ onBack }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simular progreso de carga - acelera al principio y se ralentiza
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 40) return prev + Math.random() * 15;
        if (prev < 80) return prev + Math.random() * 8;
        if (prev < 95) return prev + Math.random() * 3;
        return prev;
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Header onBack={onBack} showBackButton={false} />
      <div style={styles.container}>
        <div style={styles.content}>
          <h2 style={styles.title}>🎵 Preparando partida...</h2>
          
          <div style={styles.progressBarContainer}>
            <div 
              style={{
                ...styles.progressBar,
                width: `${Math.min(progress, 100)}%`
              }} 
            />
          </div>
          
          <p style={styles.text}>
            {Math.min(Math.round(progress), 100)}%
          </p>
          
          <p style={styles.subtitle}>Buscando y descargando canciones...</p>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: 'Arial, sans-serif',
  } as React.CSSProperties,
  
  content: {
    textAlign: 'center' as const,
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    maxWidth: '400px',
    width: '90%',
  } as React.CSSProperties,
  
  title: {
    fontSize: '32px',
    marginBottom: '30px',
    color: '#333',
  } as React.CSSProperties,
  
  progressBarContainer: {
    width: '100%',
    height: '8px',
    background: '#e0e0e0',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '20px',
  } as React.CSSProperties,
  
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s ease',
  } as React.CSSProperties,
  
  text: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: '10px',
  } as React.CSSProperties,
  
  subtitle: {
    fontSize: '14px',
    color: '#999',
    marginTop: '10px',
  } as React.CSSProperties,
};
