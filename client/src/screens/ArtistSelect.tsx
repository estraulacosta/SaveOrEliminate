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
      <h1>Selecciona un Artista</h1>

      <input
        type="text"
        placeholder="Buscar artista..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          maxWidth: '500px',
          padding: '15px',
          fontSize: '1rem',
          borderRadius: '10px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          background: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          marginBottom: '30px',
        }}
      />

      {isSearching && (
        <div className="loading">Buscando...</div>
      )}

      {displayArtists.length > 0 ? (
        <>
          <p style={{ opacity: 0.7, marginBottom: '20px' }}>
            {searchQuery.length >= 2 ? `${searchResults.length} resultados` : 'Top 20 artistas populares'}
          </p>
          <div className="grid">
            {displayArtists.map((artist) => (
              <button
                key={artist.name}
                onClick={() => onSelect(artist.name)}
                style={{
                  padding: '15px',
                  fontSize: '1.1rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {artist.image && (
                  <img 
                    src={artist.image} 
                    alt={artist.name}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                )}
                <span>{artist.name}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p style={{ opacity: 0.7 }}>
          {searchQuery.length >= 2 ? 'No se encontraron artistas' : 'Cargando...'}
        </p>
      )}
    </>
  );
}
