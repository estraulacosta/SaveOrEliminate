import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Edit2 } from 'lucide-react';

interface EnterNameProps {
  onSubmit: (name: string, avatar: number) => void;
  onBack?: () => void;
}

export default function EnterName({ onSubmit, onBack }: EnterNameProps) {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<number>(1);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [hoveredOver, setHoveredOver] = useState(false);

  const avatarCount = 16;

  // Generar avatar aleatorio al cargar
  useEffect(() => {
    const randomAvatar = Math.floor(Math.random() * avatarCount) + 1;
    setSelectedAvatar(randomAvatar);
  }, []);

  const handleAvatarSelect = (avatarNum: number) => {
    setSelectedAvatar(avatarNum);
    setShowAvatarMenu(false);
  };

  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%', padding: '20px' }}>
        <h1>¿Cuál es tu nombre?</h1>
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          
          {/* Avatar Preview with Change Button */}
          <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative' }}>
            <div
              onMouseEnter={() => setHoveredOver(true)}
              onMouseLeave={() => setHoveredOver(false)}
              style={{
                position: 'relative',
                display: 'inline-block',
                cursor: 'pointer'
              }}
              onClick={() => setShowAvatarMenu(true)}
            >
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <img
                  src={`/Avatares/${selectedAvatar}.png`}
                  alt={`Avatar ${selectedAvatar}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      parent.style.backgroundColor = `hsl(${selectedAvatar * 22.5}, 70%, 60%)`;
                      const fallback = document.createElement('div');
                      fallback.textContent = selectedAvatar.toString();
                      fallback.style.fontSize = '64px';
                      fallback.style.fontWeight = 'bold';
                      fallback.style.color = '#fff';
                      fallback.style.textShadow = '0 2px 4px rgba(0,0,0,0.3)';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>

              {/* Change Icon on Hover */}
              {hoveredOver && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    backgroundColor: 'var(--color-principal)',
                    borderRadius: '50%',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(128, 22, 199, 0.4)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                >
                  <Edit2 size={20} color="white" />
                </div>
              )}
            </div>

            {/* "Eres tu!" text */}
            <p style={{
              marginTop: '1rem',
              fontSize: '0.9rem',
              color: '#888',
              margin: '1rem 0 0 0'
            }}>
              Eres tu!
            </p>
          </div>

          {/* Avatar Selection Modal */}
          {showAvatarMenu && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
              onClick={() => setShowAvatarMenu(false)}
            >
              <div
                style={{
                  backgroundColor: '#1E1921',
                  borderRadius: '16px',
                  padding: '2rem',
                  maxWidth: '500px',
                  width: '90vw',
                  border: '2px solid #646cff',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', textAlign: 'center' }}>
                  Elige tu Avatar
                </h2>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px'
                }}>
                  {Array.from({ length: avatarCount }, (_, i) => i + 1).map((avatarNum) => (
                    <div
                      key={avatarNum}
                      onClick={() => handleAvatarSelect(avatarNum)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: '12px',
                        border: selectedAvatar === avatarNum ? '3px solid var(--color-principal)' : '2px solid rgba(255,255,255,0.2)',
                        overflow: 'hidden',
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        transform: selectedAvatar === avatarNum ? 'scale(1.1)' : 'scale(1)',
                        backgroundColor: '#333',
                        boxShadow: selectedAvatar === avatarNum ? `0 0 15px rgba(128, 22, 199, 0.5)` : 'none',
                        position: 'relative'
                      }}
                    >
                      <img
                        src={`/Avatares/${avatarNum}.png`}
                        alt={`Avatar ${avatarNum}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            parent.style.backgroundColor = `hsl(${avatarNum * 22.5}, 70%, 50%)`;
                            const fallback = document.createElement('div');
                            fallback.textContent = avatarNum.toString();
                            fallback.style.fontSize = '32px';
                            fallback.style.fontWeight = 'bold';
                            fallback.style.color = '#fff';
                            fallback.style.textShadow = '0 2px 4px rgba(0,0,0,0.3)';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Name Input */}
          <input
            type="text"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
            style={{ marginBottom: '2.5rem' }}
          />
          
          {/* Submit Button */}
          <button
            type="button"
            className="primary"
            onClick={() => onSubmit(name, selectedAvatar)}
            disabled={name.trim().length === 0}
          >
            Continuar
          </button>

          <style>{`
            @keyframes pulse {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.1);
              }
            }
          `}</style>
        </div>
      </div>
    </>
  );
}
