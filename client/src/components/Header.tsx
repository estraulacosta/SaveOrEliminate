import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react';

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
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedVolume = localStorage.getItem('musicVolume');
    if (savedVolume) {
      const vol = parseInt(savedVolume);
      setVolume(vol);
      applyVolume(vol);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    applyVolume(newVolume);
    if (newVolume > 0) setIsMuted(false);
  };

  // const _toggleMute = () => {
  //   if (isMuted) {
  //     applyVolume(volume);
  //     setIsMuted(false);
  //   } else {
  //     setIsMuted(true);
  //     applyVolume(0);
  //   }
  // };

  return (
    <header className="header-bar">
      {showBackButton && onBack ? (
        <button type="button" onClick={onBack} className="back-btn" aria-label="Volver">
          <ChevronLeft size={32} />
        </button>
      ) : (
        <div style={{ width: 48 }}></div> 
      )}

      {showVolume && (
        <div 
          ref={volumeRef}
          className="volume-wrapper"
          style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
        >
          {showVolumeSlider && (
            <div style={{
              position: 'absolute',
              right: '60px',
              background: 'rgba(30, 25, 33, 0.95)',
              padding: '12px 16px',
              borderRadius: '12px',
              width: '180px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              zIndex: 1000
            }}>
              <Volume2 size={16} style={{ marginRight: 12, color: 'rgba(255,255,255,0.5)', minWidth: 16 }} />
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{ width: '100%', cursor: 'pointer', height: '6px' }}
              />
            </div>
          )}
          <button 
            type="button"
            onClick={() => setShowVolumeSlider(!showVolumeSlider)} 
            style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              padding: 0,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: showVolumeSlider ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none',
              color: 'var(--color-text)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        </div>
      )}
    </header>
  );
}
