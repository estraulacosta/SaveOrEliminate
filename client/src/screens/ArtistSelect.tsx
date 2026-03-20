import { useState, useEffect } from 'react';
import { socket } from '../socket';
import Header from '../components/Header';

interface Artist {
  name: string;
  image: string;
}

interface ArtistSelectProps {
  onSelect: (artist: string) => void;
  onBack?: () => void;
}

export default function ArtistSelect({ onSelect, onBack }: ArtistSelectProps) {
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    socket.emit('get-top-artists', (artists: Artist[]) => {
      setTopArtists(artists);
    });
  }, []);

  // Búsqueda en tiempo real
  useEffect(() => {
    if (searchQuery.length >= 2) {
      setIsSearching(true);
      const timeout = setTimeout(() => {
        socket.emit('search-artists', { query: searchQuery }, (results: Artist[]) => {
          setSearchResults(results);
          setIsSearching(false);
        });
      }, 500); // Debounce de 500ms

      return () => clearTimeout(timeout);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const displayArtists = searchQuery.length >= 2 ? searchResults : topArtists;

  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem)', overflowX: 'hidden' }}>
        <h1 style={{ marginBottom: 'clamp(0.8rem, 2vw, 1.5rem)', fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}>SELECCIONA UN ARTISTA</h1>

        <input
          type="text"
          placeholder="Buscar artista..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '600px',
            padding: 'clamp(8px, 2vw, 12px)',
            fontSize: 'clamp(0.85rem, 2vw, 1rem)',
            borderRadius: '10px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            display: 'block',
            margin: '0 auto clamp(1rem, 3vw, 2rem) auto'
          }}
        />

        {isSearching && (
          <div className="loading">Buscando...</div>
        )}

        {displayArtists.length > 0 ? (
          <>
            <p style={{ opacity: 0.7, marginBottom: 'clamp(0.8rem, 2vw, 1.5rem)', textAlign: 'center', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
              {searchQuery.length >= 2 ? `${searchResults.length} resultados` : 'Top 20 artistas populares'}
            </p>
            <div className="artist-grid">
              {displayArtists.map((artist) => (
                <button
                  type="button"
                  key={artist.name}
                  onClick={() => onSelect(artist.name)}
                  style={{
                    padding: 'clamp(0.6rem, 1.5vw, 1rem) clamp(0.5rem, 1.5vw, 0.8rem)',
                    fontSize: 'clamp(0.7rem, 2vw, 0.85rem)',
                    background: 'rgba(128, 22, 199, 0.08)',
                    border: '1px solid rgba(128, 22, 199, 0.15)',
                    borderRadius: '14px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'clamp(0.3rem, 1vw, 0.6rem)',
                    overflow: 'hidden',
                    minHeight: 'clamp(100px, 25vw, 140px)',
                    justifyContent: 'flex-end',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(128, 22, 199, 0.5)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.15)';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(128, 22, 199, 0.15)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.08)';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  }}
                >
                  {artist.image && (
                    <img 
                      src={artist.image} 
                      alt={artist.name}
                      style={{
                        width: 'clamp(50px, 12vw, 80px)',
                        height: 'clamp(50px, 12vw, 80px)',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <span style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.8rem)', textAlign: 'center', wordBreak: 'break-word', fontWeight: 600, maxWidth: '100%' }}>{artist.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p style={{ opacity: 0.7, textAlign: 'center', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
            {searchQuery.length >= 2 ? 'No se encontraron artistas' : 'Cargando...'}
          </p>
        )}
      </div>
    </>
  );
}
