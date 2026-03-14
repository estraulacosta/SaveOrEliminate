import { useState, useEffect } from 'react';

interface HeaderProps {
  onBack?: () => void;
  showBackButton?: boolean;
  showVolume?: boolean;
}

export default function Header({ onBack, showBackButton = true, showVolume = true }: HeaderProps) {
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('musicVolume');
    return saved ? parseInt(saved) : 50;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeHover, setShowVolumeHover] = useState(false);

  // Aplicar volumen al cargar
  useEffect(() => {
    applyVolume(volume);
  }, []);

  const applyVolume = (vol: number) => {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.volume = vol / 100;
    });
    localStorage.setItem('musicVolume', vol.toString());
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    applyVolume(newVolume);
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(50);
      applyVolume(50);
      setIsMuted(false);
    } else {
      setVolume(0);
      applyVolume(0);
      setIsMuted(true);
    }
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return '🔇';
    if (volume < 33) return '🔈';
    if (volume < 66) return '🔉';
    return '🔊';
  };

  return (
    <div style={styles.header}>
      <div style={styles.leftSection}>
        {showBackButton && onBack && (
          <button 
            style={styles.backButton} 
            onClick={onBack} 
            title="Volver atrás"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateX(-4px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateX(0)';
            }}
          >
            <span style={styles.backIcon}>←</span> Atrás
          </button>
        )}
      </div>

      {showVolume && (
        <div 
          style={styles.volumeContainer}
          onMouseEnter={() => setShowVolumeHover(true)}
          onMouseLeave={() => setShowVolumeHover(false)}
        >
          <button 
            onClick={toggleMute} 
            style={{
              ...styles.muteButton,
              transform: showVolumeHover ? 'scale(1.15)' : 'scale(1)',
            }}
            title={isMuted ? 'Desactivar silencio' : 'Silenciar'}
          >
            {getVolumeIcon()}
          </button>
          
          <div style={{...styles.sliderWrapper, opacity: showVolumeHover ? 1 : 0.6}}>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              style={{
                ...styles.volumeSlider,
                backgroundImage: `linear-gradient(to right, #667eea 0%, #764ba2 ${volume}%, rgba(230,230,230,0.5) ${volume}%, rgba(230,230,230,0.5) 100%)`
              }}
              title="Control de volumen"
            />
          </div>
          
          <span style={{...styles.volumeLabel, opacity: showVolumeHover ? 1 : 0.7}}>
            {volume}%
          </span>
        </div>
      )}
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 25px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)',
    marginBottom: '0',
    gap: '20px',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  } as React.CSSProperties,

  leftSection: {
    flex: 1,
  } as React.CSSProperties,

  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '600' as const,
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,

  backIcon: {
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  volumeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    background: 'rgba(255, 255, 255, 0.15)',
    border: '2px solid rgba(255, 255, 255, 0.25)',
    borderRadius: '12px',
    backdropFilter: 'blur(20px)',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,

  muteButton: {
    fontSize: '22px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 6px',
    transition: 'transform 0.2s ease',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
  } as React.CSSProperties,

  sliderWrapper: {
    display: 'flex',
    alignItems: 'center',
    transition: 'opacity 0.3s ease',
  } as React.CSSProperties,

  volumeSlider: {
    width: '130px',
    height: '5px',
    borderRadius: '10px',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none' as const,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
  } as unknown as React.CSSProperties,

  volumeLabel: {
    fontSize: '13px',
    color: 'white',
    fontWeight: '600' as const,
    minWidth: '38px',
    textAlign: 'right' as const,
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    transition: 'opacity 0.3s ease',
  } as React.CSSProperties,
};

// Estilos globales para el slider
if (!document.getElementById('slider-styles')) {
  const style = document.createElement('style');
  style.id = 'slider-styles';
  style.textContent = `
    input[type='range']::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      border: 2px solid white;
      transition: all 0.2s ease;
    }
    
    input[type='range']::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.6);
    }
    
    input[type='range']::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      border: 2px solid white;
      transition: all 0.2s ease;
    }
    
    input[type='range']::-moz-range-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.6);
    }
  `;
  document.head.appendChild(style);
}
