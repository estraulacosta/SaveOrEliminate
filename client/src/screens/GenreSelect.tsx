import { useState, useEffect } from 'react';
import { socket } from '../socket';
import Header from '../components/Header';

interface GenreSelectProps {
  onSelect: (genre: string) => void;
  onBack?: () => void;
}

export default function GenreSelect({ onSelect, onBack }: GenreSelectProps) {
  const [topGenres, setTopGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);

  useEffect(() => {
    socket.emit('get-top-genres', (genres: string[]) => {
      setTopGenres(genres);
    });
  }, []);

  // Búsqueda en tiempo real
  useEffect(() => {
    if (searchQuery) {
      socket.emit('search-genres', { query: searchQuery }, (results: string[]) => {
        setSearchResults(results);
      });
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const displayGenres = searchQuery ? searchResults : topGenres;

  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <h1>Selecciona un Género</h1>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <input
          type="text"
          placeholder="Buscar género..."
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

      {displayGenres.length > 0 ? (
        <>
          <p style={{ opacity: 0.7, marginBottom: '20px' }}>
            {searchQuery ? `${searchResults.length} resultados` : 'Top 20 géneros populares'}
          </p>
          <div className="grid">
            {displayGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => onSelect(genre)}
                style={{
                  padding: '20px',
                  fontSize: '1.1rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textTransform: 'capitalize',
                }}
              >
                {genre}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p style={{ opacity: 0.7 }}>
          {searchQuery ? 'No se encontraron géneros' : 'Cargando...'}
        </p>
      )}
      </div>
    </>
  );
}
