import { useState, useEffect } from 'react';
import { socket } from '../socket';
import Header from '../components/Header';

interface Artist {
  name: string;
  image: string;
}

interface VersusConfig {
  type: 'artist' | 'year' | 'genre' | 'decade';
  option1: string;
  option2: string;
}

interface VersusSelectProps {
  onSelect: (config: VersusConfig) => void;
  onBack?: () => void;
}

export default function VersusSelect({ onSelect, onBack }: VersusSelectProps) {
  const [type, setType] = useState<'artist' | 'year' | 'genre' | 'decade'>('artist');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  
  // Estados para búsqueda de artistas
  const [searchQuery1, setSearchQuery1] = useState('');
  const [searchResults1, setSearchResults1] = useState<Artist[]>([]);
  const [isSearching1, setIsSearching1] = useState(false);
  const [selectedArtist1, setSelectedArtist1] = useState<Artist | null>(null);
  
  const [searchQuery2, setSearchQuery2] = useState('');
  const [searchResults2, setSearchResults2] = useState<Artist[]>([]);
  const [isSearching2, setIsSearching2] = useState(false);
  const [selectedArtist2, setSelectedArtist2] = useState<Artist | null>(null);
  
  // Estados para búsqueda de géneros
  const [searchQuery1Genre, setSearchQuery1Genre] = useState('');
  const [searchResults1Genre, setSearchResults1Genre] = useState<string[]>([]);
  const [isSearching1Genre, setIsSearching1Genre] = useState(false);
  
  const [searchQuery2Genre, setSearchQuery2Genre] = useState('');
  const [searchResults2Genre, setSearchResults2Genre] = useState<string[]>([]);
  const [isSearching2Genre, setIsSearching2Genre] = useState(false);

  // Búsqueda en tiempo real para artista 1
  useEffect(() => {
    if (type === 'artist' && searchQuery1.length >= 2) {
      setIsSearching1(true);
      const timeout = setTimeout(() => {
        socket.emit('search-artists', { query: searchQuery1 }, (results: Artist[]) => {
          setSearchResults1(results);
          setIsSearching1(false);
        });
      }, 500);

      return () => clearTimeout(timeout);
    } else {
      setSearchResults1([]);
      setIsSearching1(false);
    }
  }, [searchQuery1, type]);

  // Búsqueda en tiempo real para artista 2
  useEffect(() => {
    if (type === 'artist' && searchQuery2.length >= 2) {
      setIsSearching2(true);
      const timeout = setTimeout(() => {
        socket.emit('search-artists', { query: searchQuery2 }, (results: Artist[]) => {
          setSearchResults2(results);
          setIsSearching2(false);
        });
      }, 500);

      return () => clearTimeout(timeout);
    } else {
      setSearchResults2([]);
      setIsSearching2(false);
    }
  }, [searchQuery2, type]);

  // Búsqueda en tiempo real para género 1
  useEffect(() => {
    if (type === 'genre' && searchQuery1Genre.length >= 1) {
      setIsSearching1Genre(true);
      const timeout = setTimeout(() => {
        socket.emit('search-genres', { query: searchQuery1Genre }, (results: string[]) => {
          setSearchResults1Genre(results);
          setIsSearching1Genre(false);
        });
      }, 300);

      return () => clearTimeout(timeout);
    } else {
      setSearchResults1Genre([]);
      setIsSearching1Genre(false);
    }
  }, [searchQuery1Genre, type]);

  // Búsqueda en tiempo real para género 2
  useEffect(() => {
    if (type === 'genre' && searchQuery2Genre.length >= 1) {
      setIsSearching2Genre(true);
      const timeout = setTimeout(() => {
        socket.emit('search-genres', { query: searchQuery2Genre }, (results: string[]) => {
          setSearchResults2Genre(results);
          setIsSearching2Genre(false);
        });
      }, 300);

      return () => clearTimeout(timeout);
    } else {
      setSearchResults2Genre([]);
      setIsSearching2Genre(false);
    }
  }, [searchQuery2Genre, type]);

  const handleSelectArtist1 = (artist: Artist) => {
    setSelectedArtist1(artist);
    setOption1(artist.name);
    setSearchQuery1('');
    setSearchResults1([]);
  };

  const handleSelectArtist2 = (artist: Artist) => {
    setSelectedArtist2(artist);
    setOption2(artist.name);
    setSearchQuery2('');
    setSearchResults2([]);
  };

  const handleSelectGenre1 = (genre: string) => {
    setOption1(genre);
    setSearchQuery1Genre('');
    setSearchResults1Genre([]);
  };

  const handleSelectGenre2 = (genre: string) => {
    setOption2(genre);
    setSearchQuery2Genre('');
    setSearchResults2Genre([]);
  };

  const handleSubmit = () => {
    if (!option1.trim() || !option2.trim()) {
      alert('Completa ambas opciones');
      return;
    }
    
    // Validación especial para modo año y década
    if ((type === 'year' || type === 'decade') && option1 === option2) {
      alert(`Las ${type === 'year' ? 'años' : 'décadas'} deben ser diferentes`);
      return;
    }
    
    onSelect({ type, option1, option2 });
  };

  const handleTypeChange = (newType: 'artist' | 'year' | 'genre' | 'decade') => {
    setType(newType);
    setOption1('');
    setOption2('');
    setSelectedArtist1(null);
    setSelectedArtist2(null);
    setSearchQuery1('');
    setSearchQuery2('');
    setSearchResults1([]);
    setSearchResults2([]);
    setSearchQuery1Genre('');
    setSearchQuery2Genre('');
    setSearchResults1Genre([]);
    setSearchResults2Genre([]);
  };

  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <h1>Modo Versus - 1 vs 1</h1>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <label style={{ display: 'block', marginBottom: '20px' }}>
          Tipo de Versus:
          <select value={type} onChange={(e) => handleTypeChange(e.target.value as any)}>
            <option value="artist">🎤 Artista vs Artista</option>
            <option value="year">📅 Año vs Año</option>
            <option value="genre">🎸 Género vs Género</option>
            <option value="decade">🕐 Década vs Década</option>
          </select>
        </label>

        {/* Modo Artista*/}
        {type === 'artist' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
            {/* Artista 1 */}
            <div>
              <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>Artista 1</h3>
              <input
                type="text"
                placeholder="Buscar artista..."
                value={searchQuery1}
                onChange={(e) => setSearchQuery1(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  marginBottom: '10px',
                  boxSizing: 'border-box',
                }}
              />

              {selectedArtist1 && (
                <div style={{
                  padding: '15px',
                  background: 'rgba(76, 175, 80, 0.2)',
                  borderRadius: '10px',
                  textAlign: 'center',
                  marginBottom: '10px',
                  border: '2px solid rgba(76, 175, 80, 0.5)',
                }}>
                  {selectedArtist1.image && (
                    <img
                      src={selectedArtist1.image}
                      alt={selectedArtist1.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        marginBottom: '10px',
                        display: 'block',
                        margin: '0 auto 10px',
                      }}
                    />
                  )}
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedArtist1.name}</p>
                </div>
              )}

              {isSearching1 && (
                <div style={{ textAlign: 'center', opacity: 0.7, marginBottom: '10px' }}>Buscando...</div>
              )}

              {searchResults1.length > 0 && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}>
                  {searchResults1.map((artist) => (
                    <button
                      key={artist.name}
                      onClick={() => handleSelectArtist1(artist)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {artist.image && (
                        <img
                          src={artist.image}
                          alt={artist.name}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <span style={{ textAlign: 'left', flex: 1 }}>{artist.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Artista 2 */}
            <div>
              <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>Artista 2</h3>
              <input
                type="text"
                placeholder="Buscar artista..."
                value={searchQuery2}
                onChange={(e) => setSearchQuery2(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  marginBottom: '10px',
                  boxSizing: 'border-box',
                }}
              />

              {selectedArtist2 && (
                <div style={{
                  padding: '15px',
                  background: 'rgba(76, 175, 80, 0.2)',
                  borderRadius: '10px',
                  textAlign: 'center',
                  marginBottom: '10px',
                  border: '2px solid rgba(76, 175, 80, 0.5)',
                }}>
                  {selectedArtist2.image && (
                    <img
                      src={selectedArtist2.image}
                      alt={selectedArtist2.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        marginBottom: '10px',
                        display: 'block',
                        margin: '0 auto 10px',
                      }}
                    />
                  )}
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedArtist2.name}</p>
                </div>
              )}

              {isSearching2 && (
                <div style={{ textAlign: 'center', opacity: 0.7, marginBottom: '10px' }}>Buscando...</div>
              )}

              {searchResults2.length > 0 && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}>
                  {searchResults2.map((artist) => (
                    <button
                      key={artist.name}
                      onClick={() => handleSelectArtist2(artist)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {artist.image && (
                        <img
                          src={artist.image}
                          alt={artist.name}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <span style={{ textAlign: 'left', flex: 1 }}>{artist.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : type === 'year' ? (
          /* Modo Año */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
            {/* Año 1 */}
            <div>
              <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>Año 1</h3>
              <select
                value={option1}
                onChange={(e) => setOption1(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  marginBottom: '10px',
                  boxSizing: 'border-box',
                  maxHeight: '200px',
                }}
              >
                <option value="">Selecciona un año</option>
                {Array.from({ length: 66 }, (_, i) => 1960 + i).map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>

              {option1 && (
                <div style={{
                  padding: '15px',
                  background: 'rgba(76, 175, 80, 0.2)',
                  borderRadius: '10px',
                  textAlign: 'center',
                  border: '2px solid rgba(76, 175, 80, 0.5)',
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.3rem' }}>{option1}</p>
                </div>
              )}
            </div>

            {/* Año 2 */}
            <div>
              <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>Año 2</h3>
              <select
                value={option2}
                onChange={(e) => setOption2(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  marginBottom: '10px',
                  boxSizing: 'border-box',
                  maxHeight: '200px',
                }}
              >
                <option value="">Selecciona un año</option>
                {Array.from({ length: 66 }, (_, i) => 1960 + i).map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>

              {option2 && (
                <div style={{
                  padding: '15px',
                  background: 'rgba(76, 175, 80, 0.2)',
                  borderRadius: '10px',
                  textAlign: 'center',
                  border: '2px solid rgba(76, 175, 80, 0.5)',
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.3rem' }}>{option2}</p>
                </div>
              )}
            </div>
          </div>
        ) : type === 'genre' ? (
          /* Modo Género */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
            {/* Género 1 */}
            <div>
              <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>Género 1</h3>
              <input
                type="text"
                placeholder="Buscar género..."
                value={searchQuery1Genre}
                onChange={(e) => setSearchQuery1Genre(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  marginBottom: '10px',
                  boxSizing: 'border-box',
                }}
              />

              {option1 && (
                <div style={{
                  padding: '15px',
                  background: 'rgba(76, 175, 80, 0.2)',
                  borderRadius: '10px',
                  textAlign: 'center',
                  marginBottom: '10px',
                  border: '2px solid rgba(76, 175, 80, 0.5)',
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2rem' }}>{option1}</p>
                </div>
              )}

              {isSearching1Genre && (
                <div style={{ textAlign: 'center', opacity: 0.7, marginBottom: '10px' }}>Buscando...</div>
              )}

              {searchResults1Genre.length > 0 && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}>
                  {searchResults1Genre.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => handleSelectGenre1(genre)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Género 2 */}
            <div>
              <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>Género 2</h3>
              <input
                type="text"
                placeholder="Buscar género..."
                value={searchQuery2Genre}
                onChange={(e) => setSearchQuery2Genre(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  marginBottom: '10px',
                  boxSizing: 'border-box',
                }}
              />

              {option2 && (
                <div style={{
                  padding: '15px',
                  background: 'rgba(76, 175, 80, 0.2)',
                  borderRadius: '10px',
                  textAlign: 'center',
                  marginBottom: '10px',
                  border: '2px solid rgba(76, 175, 80, 0.5)',
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2rem' }}>{option2}</p>
                </div>
              )}

              {isSearching2Genre && (
                <div style={{ textAlign: 'center', opacity: 0.7, marginBottom: '10px' }}>Buscando...</div>
              )}

              {searchResults2Genre.length > 0 && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}>
                  {searchResults2Genre.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => handleSelectGenre2(genre)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : type === 'decade' ? (
          /* Modo Década */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
            {/* Década 1 */}
            <div>
              <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>Década 1</h3>
              <select
                value={option1}
                onChange={(e) => setOption1(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  marginBottom: '10px',
                  boxSizing: 'border-box',
                  maxHeight: '200px',
                }}
              >
                <option value="">Selecciona una década</option>
                {Array.from({ length: 7 }, (_, i) => 1960 + i * 10).map((decade) => (
                  <option key={decade} value={decade.toString()}>
                    Años {decade}
                  </option>
                ))}
              </select>

              {option1 && (
                <div style={{
                  padding: '15px',
                  background: 'rgba(76, 175, 80, 0.2)',
                  borderRadius: '10px',
                  textAlign: 'center',
                  border: '2px solid rgba(76, 175, 80, 0.5)',
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.3rem' }}>Años {option1}</p>
                </div>
              )}
            </div>

            {/* Década 2 */}
            <div>
              <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>Década 2</h3>
              <select
                value={option2}
                onChange={(e) => setOption2(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  marginBottom: '10px',
                  boxSizing: 'border-box',
                  maxHeight: '200px',
                }}
              >
                <option value="">Selecciona una década</option>
                {Array.from({ length: 7 }, (_, i) => 1960 + i * 10).map((decade) => (
                  <option key={decade} value={decade.toString()}>
                    Años {decade}
                  </option>
                ))}
              </select>

              {option2 && (
                <div style={{
                  padding: '15px',
                  background: 'rgba(76, 175, 80, 0.2)',
                  borderRadius: '10px',
                  textAlign: 'center',
                  border: '2px solid rgba(76, 175, 80, 0.5)',
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.3rem' }}>Años {option2}</p>
                </div>
              )}

              {option1 && option2 && option1 === option2 && (
                <p style={{ color: '#ff6b6b', textAlign: 'center', marginBottom: '15px' }}>
                  ⚠️ Las décadas deben ser diferentes
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Placeholder para otros modos futuros */
          <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
            <p>Modo no disponible aún</p>
          </div>
        )}

        <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.3rem', fontWeight: 'bold' }}>
          ⚔️ {type === 'decade' ? (option1 ? `Años ${option1}` : '???') : (option1 || '???')} VS {type === 'decade' ? (option2 ? `Años ${option2}` : '???') : (option2 || '???')}
        </p>

        <button
          className="primary"
          onClick={handleSubmit}
          disabled={!option1 || !option2}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '1.1rem',
            opacity: (option1 && option2) ? 1 : 0.5,
            cursor: (option1 && option2) ? 'pointer' : 'not-allowed',
          }}
        >
          Iniciar Versus ⚔️
        </button>
      </div>
    </>
  );
}
