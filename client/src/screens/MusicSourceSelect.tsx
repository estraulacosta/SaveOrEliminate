interface MusicSourceSelectProps {
  onSelect: (source: 'spotify' | 'youtube') => void;
}

export default function MusicSourceSelect({ onSelect }: MusicSourceSelectProps) {
  return (
    <>
      <h1>Selecciona la Fuente de Música</h1>
      <p style={{ opacity: 0.8, marginBottom: '40px' }}>
        Elige de dónde quieres obtener la música para el juego
      </p>

      <div className="grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => onSelect('youtube')}
          className="card"
          style={{
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div style={{ fontSize: '4rem' }}>🎥</div>
          <h2>YouTube</h2>
          <p style={{ opacity: 0.8, fontSize: '0.95rem' }}>
            • Totalmente gratuito<br />
            • No requiere cuenta premium<br />
            • Gran variedad de música<br />
            • Reproduce videos de 7 segundos
          </p>
        </button>

        <button
          onClick={() => onSelect('spotify')}
          className="card"
          style={{
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div style={{ fontSize: '4rem' }}>🎵</div>
          <h2>Spotify</h2>
          <p style={{ opacity: 0.8, fontSize: '0.95rem' }}>
            • Previews de audio de 30 segundos<br />
            • Requiere API credentials<br />
            • Catálogo oficial de Spotify<br />
            • Metadata precisa
          </p>
        </button>
      </div>
    </>
  );
}
