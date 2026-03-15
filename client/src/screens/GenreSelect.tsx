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
      <div className="selector-container">
        <h1 className="selector-title">SELECCIONA UN GÉNERO</h1>
        <input
          type="text"
          placeholder="Buscar género..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="selector-input"
          style={{
            borderRadius: '10px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
          }}
        />

        {displayGenres.length > 0 ? (
          <>
            <p className="selector-subtitle" style={{ opacity: 0.7, textAlign: 'center' }}>
              {searchQuery ? `${searchResults.length} resultados` : 'Top 20 géneros populares'}
            </p>
            <div className="selector-grid">
              {displayGenres.map((genre) => (
                <button
                  type="button"
                  key={genre}
                  onClick={() => onSelect(genre)}
                  className="selector-item secondary"
                  style={{
                    background: 'rgba(128, 22, 199, 0.1)',
                    border: '2px solid rgba(128, 22, 199, 0.2)',
                    borderRadius: '16px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    textTransform: 'capitalize',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(128, 22, 199, 0.5)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.15)';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(128, 22, 199, 0.2)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.1)';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  }}
                >
                  {genre}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p style={{ opacity: 0.7, textAlign: 'center' }}>
            {searchQuery ? 'No se encontraron géneros' : 'Cargando...'}
          </p>
        )}
      </div>
    </>
  );
}
