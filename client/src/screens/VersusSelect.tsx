import { useState, useEffect } from 'react';
import { socket } from '../socket';
import Header from '../components/Header';
import { Swords } from 'lucide-react';

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
  
  // Para búsqueda de artistas en modo artist vs artist
  const [query1, setQuery1] = useState('');
  const [query2, setQuery2] = useState('');
  const [results1, setResults1] = useState<Artist[]>([]);
  const [results2, setResults2] = useState<Artist[]>([]);
  const [searching1, setSearching1] = useState(false);
  const [searching2, setSearching2] = useState(false);
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);
  // Para búsqueda de géneros en modo genre vs genre
  const [genreResults1, setGenreResults1] = useState<string[]>([]);
  const [genreResults2, setGenreResults2] = useState<string[]>([]);
  const [searchingGenre1, setSearchingGenre1] = useState(false);
  const [searchingGenre2, setSearchingGenre2] = useState(false);
  const [showGenreDropdown1, setShowGenreDropdown1] = useState(false);
  const [showGenreDropdown2, setShowGenreDropdown2] = useState(false);
  // Para selección de años en modo year vs year
  const [showYearDropdown1, setShowYearDropdown1] = useState(false);
  const [showYearDropdown2, setShowYearDropdown2] = useState(false);
  // Para selección de décadas en modo decade vs decade
  const [showDecadeDropdown1, setShowDecadeDropdown1] = useState(false);
  const [showDecadeDropdown2, setShowDecadeDropdown2] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  // Generar lista de años de 1960 a 2025
  const availableYears = Array.from({ length: 66 }, (_, i) => 1960 + i);
  
  // Generar lista de décadas
  const availableDecades = ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

  const typeOptions = [
    { value: 'artist' as const, label: 'ARTISTAS', icon: '' },
    { value: 'year' as const, label: 'AÑOS', icon: '' },
    { value: 'genre' as const, label: 'GÉNEROS', icon: '' },
    { value: 'decade' as const, label: 'DÉCADAS', icon: '' },
  ];

  const getPlaceholder = (index: number) => {
    const labels = {
      'artist': ['Primer artista', 'Segundo artista'],
      'year': ['Primer año', 'Segundo año'],
      'genre': ['Primer género', 'Segundo género'],
      'decade': ['Primera década', 'Segunda década'],
    };
    return labels[type][index];
  };

  // Búsqueda de artistas para option1
  useEffect(() => {
    if (type !== 'artist') return;
    
    if (query1.length >= 2 && showDropdown1) {
      setSearching1(true);
      const timeout = setTimeout(() => {
        socket.emit('search-artists', { query: query1 }, (results: Artist[]) => {
          setResults1(results.slice(0, 5)); // Máximo 5 resultados
          setSearching1(false);
        });
      }, 500); // Debounce

      return () => clearTimeout(timeout);
    } else {
      setResults1([]);
      setSearching1(false);
    }
  }, [query1, type, showDropdown1]);

  // Búsqueda de artistas para option2
  useEffect(() => {
    if (type !== 'artist') return;
    
    if (query2.length >= 2 && showDropdown2) {
      setSearching2(true);
      const timeout = setTimeout(() => {
        socket.emit('search-artists', { query: query2 }, (results: Artist[]) => {
          setResults2(results.slice(0, 5)); // Máximo 5 resultados
          setSearching2(false);
        });
      }, 500); // Debounce

      return () => clearTimeout(timeout);
    } else {
      setResults2([]);
      setSearching2(false);
    }
  }, [query2, type, showDropdown2]);

  const handleSelectArtist1 = (artist: Artist) => {
    setOption1(artist.name);
    setQuery1(artist.name);
    setShowDropdown1(false);
    setResults1([]);
  };

  const handleSelectArtist2 = (artist: Artist) => {
    setOption2(artist.name);
    setQuery2(artist.name);
    setShowDropdown2(false);
    setResults2([]);
  };

  // Búsqueda de géneros para option1
  useEffect(() => {
    if (type !== 'genre') return;
    
    if (query1.length >= 1 && showGenreDropdown1) {
      setSearchingGenre1(true);
      const timeout = setTimeout(() => {
        socket.emit('search-genres', { query: query1 }, (results: string[]) => {
          setGenreResults1(results.slice(0, 5)); // Máximo 5 resultados
          setSearchingGenre1(false);
        });
      }, 500); // Debounce

      return () => clearTimeout(timeout);
    } else {
      setGenreResults1([]);
      setSearchingGenre1(false);
    }
  }, [query1, type, showGenreDropdown1]);

  // Búsqueda de géneros para option2
  useEffect(() => {
    if (type !== 'genre') return;
    
    if (query2.length >= 1 && showGenreDropdown2) {
      setSearchingGenre2(true);
      const timeout = setTimeout(() => {
        socket.emit('search-genres', { query: query2 }, (results: string[]) => {
          setGenreResults2(results.slice(0, 5)); // Máximo 5 resultados
          setSearchingGenre2(false);
        });
      }, 500); // Debounce

      return () => clearTimeout(timeout);
    } else {
      setGenreResults2([]);
      setSearchingGenre2(false);
    }
  }, [query2, type, showGenreDropdown2]);

  const handleSelectGenre1 = (genre: string) => {
    setOption1(genre);
    setQuery1(genre);
    setShowGenreDropdown1(false);
    setGenreResults1([]);
  };

  const handleSelectGenre2 = (genre: string) => {
    setOption2(genre);
    setQuery2(genre);
    setShowGenreDropdown2(false);
    setGenreResults2([]);
  };

  const handleSelectYear1 = (year: number) => {
    setOption1(year.toString());
    setShowYearDropdown1(false);
  };

  const handleSelectYear2 = (year: number) => {
    setOption2(year.toString());
    setShowYearDropdown2(false);
  };

  const handleSelectDecade1 = (decade: string) => {
    setOption1(decade);
    setShowDecadeDropdown1(false);
  };

  const handleSelectDecade2 = (decade: string) => {
    setOption2(decade);
    setShowDecadeDropdown2(false);
  };

  const typeOptions = [
    { value: 'artist' as const, label: 'Artista vs Artista', icon: '🎤' },
    { value: 'year' as const, label: 'Año vs Año', icon: '📅' },
    { value: 'genre' as const, label: 'Género vs Género', icon: '🎵' },
    { value: 'decade' as const, label: 'Década vs Década', icon: '⏰' },
  ];

  const getPlaceholder = (index: number) => {
    const labels = {
      'artist': ['Primer artista', 'Segundo artista'],
      'year': ['Primer año', 'Segundo año'],
      'genre': ['Primer género', 'Segundo género'],
      'decade': ['Primera década', 'Segunda década'],
    };
    return labels[type][index];
  };

  const handleSubmit = () => {
    if (option1.trim() && option2.trim()) {
      // Easter egg: Michael Jackson vs Olivia Rodrigo
      const normalizedOption1 = option1.toLowerCase().trim();
      const normalizedOption2 = option2.toLowerCase().trim();
      
      const isMichaelJackson = normalizedOption1.includes('michael jackson') || normalizedOption2.includes('michael jackson');
      const isOliviaRodrigo = normalizedOption1.includes('olivia rodrigo') || normalizedOption2.includes('olivia rodrigo');
      
      if (isMichaelJackson && isOliviaRodrigo) {
        setShowErrorPopup(true);
        return;
      }
      
      onSelect({ type, option1, option2 });
    } else {
      alert('Completa ambas opciones');
    }
  };

  const handleCloseErrorPopup = () => {
    setShowErrorPopup(false);
    setOption1('');
    setOption2('');
    setQuery1('');
    setQuery2('');
    setResults1([]);
    setResults2([]);
  };

  return (
    <>
      <Header onBack={onBack} showBackButton={!!onBack} />
      <h1>MODO VERSUS - 1 vs 1</h1>
      <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '1rem', marginBottom: '1.5rem', opacity: 0.8 }}>Selecciona el tipo de versus:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {typeOptions.map(opt => (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  setType(opt.value);
                  setOption1('');
                  setOption2('');
                  setQuery1('');
                  setQuery2('');
                }}
                style={{
                  padding: '1.2rem',
                  background: type === opt.value ? 'rgba(128, 22, 199, 0.3)' : 'rgba(128, 22, 199, 0.1)',
                  border: type === opt.value ? '2px solid var(--color-principal)' : '2px solid rgba(128, 22, 199, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  fontSize: '0.95rem',
                  fontWeight: 600
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.2)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = type === opt.value ? 'rgba(128, 22, 199, 0.3)' : 'rgba(128, 22, 199, 0.1)';
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
            {/* Opción 1 */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.7 }}>Opción 1</label>
              {type === 'artist' ? (
                <>
                  <input
                    type="text"
                    placeholder={getPlaceholder(0)}
                    value={query1}
                    onChange={(e) => {
                      setQuery1(e.target.value);
                      if (e.target.value.length >= 2) {
                        setShowDropdown1(true);
                      }
                    }}
                    onFocus={() => {
                      if (query1.length >= 2) {
                        setShowDropdown1(true);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      fontSize: '1rem',
                      borderRadius: '10px',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                    }}
                  />
                  {showDropdown1 && results1.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 10, 30, 0.95)',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      borderRadius: '10px',
                      marginTop: '0.5rem',
                      zIndex: 10,
                      maxHeight: '250px',
                      overflowY: 'auto'
                    }}>
                      {results1.map((artist, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => handleSelectArtist1(artist)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            padding: '0.8rem 1rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            borderBottom: idx < results1.length - 1 ? '1px solid rgba(128, 22, 199, 0.2)' : 'none',
                            textAlign: 'left',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          }}
                        >
                          {artist.image && (
                            <img 
                              src={artist.image} 
                              alt={artist.name}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '4px',
                                objectFit: 'cover',
                                flexShrink: 0
                              }}
                            />
                          )}
                          <span style={{ fontSize: '0.9rem' }}>{artist.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown1 && searching1 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 10, 30, 0.95)',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      borderRadius: '10px',
                      marginTop: '0.5rem',
                      padding: '1rem',
                      textAlign: 'center',
                      color: 'rgba(128, 22, 199, 0.8)',
                      zIndex: 10
                    }}>
                      Buscando...
                    </div>
                  )}
                </>
              ) : type === 'genre' ? (
                <>
                  <input
                    type="text"
                    placeholder={getPlaceholder(0)}
                    value={query1}
                    onChange={(e) => {
                      setQuery1(e.target.value);
                      if (e.target.value.length >= 1) {
                        setShowGenreDropdown1(true);
                      }
                    }}
                    onFocus={() => {
                      if (query1.length >= 1) {
                        setShowGenreDropdown1(true);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      fontSize: '1rem',
                      borderRadius: '10px',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                    }}
                  />
                  {showGenreDropdown1 && genreResults1.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 10, 30, 0.95)',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      borderRadius: '10px',
                      marginTop: '0.5rem',
                      zIndex: 10,
                      maxHeight: '250px',
                      overflowY: 'auto'
                    }}>
                      {genreResults1.map((genre, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => handleSelectGenre1(genre)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            padding: '0.8rem 1rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            borderBottom: idx < genreResults1.length - 1 ? '1px solid rgba(128, 22, 199, 0.2)' : 'none',
                            textAlign: 'left',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          }}
                        >
                          <span style={{ fontSize: '0.9rem' }}>{genre}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showGenreDropdown1 && searchingGenre1 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 10, 30, 0.95)',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      borderRadius: '10px',
                      marginTop: '0.5rem',
                      padding: '1rem',
                      textAlign: 'center',
                      color: 'rgba(128, 22, 199, 0.8)',
                      zIndex: 10
                    }}>
                      Buscando...
                    </div>
                  )}
                </>
              ) : type === 'year' ? (
                <>
                  <div
                    onClick={() => setShowYearDropdown1(!showYearDropdown1)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      fontSize: '1rem',
                      borderRadius: '10px',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: option1 ? 'white' : 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{option1 || getPlaceholder(0)}</span>
                    <span style={{ opacity: 0.7 }}>▼</span>
                  </div>
                  {showYearDropdown1 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 10, 30, 0.95)',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      borderRadius: '10px',
                      marginTop: '0.5rem',
                      zIndex: 10,
                      maxHeight: '250px',
                      overflowY: 'auto'
                    }}>
                      {availableYears.map((year, idx) => (
                        <button
                          type="button"
                          key={year}
                          onClick={() => handleSelectYear1(year)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.8rem 1rem',
                            background: option1 === year.toString() ? 'rgba(128, 22, 199, 0.3)' : 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            borderBottom: idx < availableYears.length - 1 ? '1px solid rgba(128, 22, 199, 0.2)' : 'none',
                            textAlign: 'left',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = option1 === year.toString() ? 'rgba(128, 22, 199, 0.3)' : 'transparent';
                          }}
                        >
                          <span style={{ fontSize: '0.9rem' }}>{year}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : type === 'decade' ? (
                <>
                  <div
                    onClick={() => setShowDecadeDropdown1(!showDecadeDropdown1)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      fontSize: '1rem',
                      borderRadius: '10px',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: option1 ? 'white' : 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{option1 || getPlaceholder(0)}</span>
                    <span style={{ opacity: 0.7 }}>▼</span>
                  </div>
                  {showDecadeDropdown1 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 10, 30, 0.95)',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      borderRadius: '10px',
                      marginTop: '0.5rem',
                      zIndex: 10,
                      maxHeight: '250px',
                      overflowY: 'auto'
                    }}>
                      {availableDecades.map((decade, idx) => (
                        <button
                          type="button"
                          key={decade}
                          onClick={() => handleSelectDecade1(decade)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.8rem 1rem',
                            background: option1 === decade ? 'rgba(128, 22, 199, 0.3)' : 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            borderBottom: idx < availableDecades.length - 1 ? '1px solid rgba(128, 22, 199, 0.2)' : 'none',
                            textAlign: 'left',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = option1 === decade ? 'rgba(128, 22, 199, 0.3)' : 'transparent';
                          }}
                        >
                          <span style={{ fontSize: '0.9rem' }}>{decade}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <input
                  type="text"
                  placeholder={getPlaceholder(0)}
                  value={option1}
                  onChange={(e) => setOption1(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    fontSize: '1rem',
                    borderRadius: '10px',
                    border: '2px solid rgba(128, 22, 199, 0.3)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                  }}
                />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: 0.7, marginTop: '1.5rem' }}>
              <Swords size={28} />
            </div>

            {/* Opción 2 */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.7 }}>Opción 2</label>
              {type === 'artist' ? (
                <>
                  <input
                    type="text"
                    placeholder={getPlaceholder(1)}
                    value={query2}
                    onChange={(e) => {
                      setQuery2(e.target.value);
                      if (e.target.value.length >= 2) {
                        setShowDropdown2(true);
                      }
                    }}
                    onFocus={() => {
                      if (query2.length >= 2) {
                        setShowDropdown2(true);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      fontSize: '1rem',
                      borderRadius: '10px',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                    }}
                  />
                  {showDropdown2 && results2.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 10, 30, 0.95)',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      borderRadius: '10px',
                      marginTop: '0.5rem',
                      zIndex: 10,
                      maxHeight: '250px',
                      overflowY: 'auto'
                    }}>
                      {results2.map((artist, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => handleSelectArtist2(artist)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            padding: '0.8rem 1rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            borderBottom: idx < results2.length - 1 ? '1px solid rgba(128, 22, 199, 0.2)' : 'none',
                            textAlign: 'left',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          }}
                        >
                          {artist.image && (
                            <img 
                              src={artist.image} 
                              alt={artist.name}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '4px',
                                objectFit: 'cover',
                                flexShrink: 0
                              }}
                            />
                          )}
                          <span style={{ fontSize: '0.9rem' }}>{artist.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown2 && searching2 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 10, 30, 0.95)',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      borderRadius: '10px',
                      marginTop: '0.5rem',
                      padding: '1rem',
                      textAlign: 'center',
                      color: 'rgba(128, 22, 199, 0.8)',
                      zIndex: 10
                    }}>
                      Buscando...
                    </div>
                  )}
                </>
              ) : type === 'genre' ? (
                <>
                  <input
                    type="text"
                    placeholder={getPlaceholder(1)}
                    value={query2}
                    onChange={(e) => {
                      setQuery2(e.target.value);
                      if (e.target.value.length >= 1) {
                        setShowGenreDropdown2(true);
                      }
                    }}
                    onFocus={() => {
                      if (query2.length >= 1) {
                        setShowGenreDropdown2(true);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      fontSize: '1rem',
                      borderRadius: '10px',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                    }}
                  />
                  {showGenreDropdown2 && genreResults2.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 10, 30, 0.95)',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      borderRadius: '10px',
                      marginTop: '0.5rem',
                      zIndex: 10,
                      maxHeight: '250px',
                      overflowY: 'auto'
                    }}>
                      {genreResults2.map((genre, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => handleSelectGenre2(genre)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            padding: '0.8rem 1rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            borderBottom: idx < genreResults2.length - 1 ? '1px solid rgba(128, 22, 199, 0.2)' : 'none',
                            textAlign: 'left',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          }}
                        >
                          <span style={{ fontSize: '0.9rem' }}>{genre}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showGenreDropdown2 && searchingGenre2 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 10, 30, 0.95)',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      borderRadius: '10px',
                      marginTop: '0.5rem',
                      padding: '1rem',
                      textAlign: 'center',
                      color: 'rgba(128, 22, 199, 0.8)',
                      zIndex: 10
                    }}>
                      Buscando...
                    </div>
                  )}
                </>
              ) : type === 'year' ? (
                <>
                  <div
                    onClick={() => setShowYearDropdown2(!showYearDropdown2)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      fontSize: '1rem',
                      borderRadius: '10px',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: option2 ? 'white' : 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{option2 || getPlaceholder(1)}</span>
                    <span style={{ opacity: 0.7 }}>▼</span>
                  </div>
                  {showYearDropdown2 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 10, 30, 0.95)',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      borderRadius: '10px',
                      marginTop: '0.5rem',
                      zIndex: 10,
                      maxHeight: '250px',
                      overflowY: 'auto'
                    }}>
                      {availableYears.map((year, idx) => (
                        <button
                          type="button"
                          key={year}
                          onClick={() => handleSelectYear2(year)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.8rem 1rem',
                            background: option2 === year.toString() ? 'rgba(128, 22, 199, 0.3)' : 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            borderBottom: idx < availableYears.length - 1 ? '1px solid rgba(128, 22, 199, 0.2)' : 'none',
                            textAlign: 'left',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = option2 === year.toString() ? 'rgba(128, 22, 199, 0.3)' : 'transparent';
                          }}
                        >
                          <span style={{ fontSize: '0.9rem' }}>{year}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : type === 'decade' ? (
                <>
                  <div
                    onClick={() => setShowDecadeDropdown2(!showDecadeDropdown2)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      fontSize: '1rem',
                      borderRadius: '10px',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: option2 ? 'white' : 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{option2 || getPlaceholder(1)}</span>
                    <span style={{ opacity: 0.7 }}>▼</span>
                  </div>
                  {showDecadeDropdown2 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 10, 30, 0.95)',
                      border: '2px solid rgba(128, 22, 199, 0.3)',
                      borderRadius: '10px',
                      marginTop: '0.5rem',
                      zIndex: 10,
                      maxHeight: '250px',
                      overflowY: 'auto'
                    }}>
                      {availableDecades.map((decade, idx) => (
                        <button
                          type="button"
                          key={decade}
                          onClick={() => handleSelectDecade2(decade)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.8rem 1rem',
                            background: option2 === decade ? 'rgba(128, 22, 199, 0.3)' : 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            borderBottom: idx < availableDecades.length - 1 ? '1px solid rgba(128, 22, 199, 0.2)' : 'none',
                            textAlign: 'left',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(128, 22, 199, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = option2 === decade ? 'rgba(128, 22, 199, 0.3)' : 'transparent';
                          }}
                        >
                          <span style={{ fontSize: '0.9rem' }}>{decade}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <input
                  type="text"
                  placeholder={getPlaceholder(1)}
                  value={option2}
                  onChange={(e) => setOption2(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    fontSize: '1rem',
                    borderRadius: '10px',
                    border: '2px solid rgba(128, 22, 199, 0.3)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                  }}
                />
              )}
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            padding: '1.5rem',
            background: 'rgba(128, 22, 199, 0.1)',
            borderRadius: '12px',
            marginBottom: '2rem',
            fontSize: '1.3rem',
            fontWeight: 700,
            color: 'var(--color-principal)'
          }}>
            ⚔️ {option1 || '???'} vs {option2 || '???'}
          </div>

          <button type="button" className="primary" onClick={handleSubmit} style={{ fontSize: '1.1rem', padding: '1rem' }}>
            Iniciar Versus
          </button>
        </div>
      </div>

      {/* Easter Egg Pop-up */}
      {showErrorPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(128, 22, 199, 0.2) 0%, rgba(250, 86, 73, 0.15) 100%)',
            border: '2px solid rgba(250, 86, 73, 0.6)',
            borderRadius: '20px',
            padding: '2.5rem',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(250, 86, 73, 0.3), 0 0 40px rgba(250, 86, 73, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            {/* Error Icon */}
            <div style={{
              fontSize: '4rem',
              marginBottom: '1rem',
              animation: 'pulse 2s infinite',
              color: 'var(--color-eliminate)'
            }}>
              !
            </div>

            {/* Error Title */}
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: 700,
              color: 'var(--color-eliminate)',
              marginBottom: '1rem',
              textShadow: '0 0 20px rgba(250, 86, 73, 0.5)'
            }}>
              ERROR CRÍTICO
            </h2>

            {/* Error Message */}
            <p style={{
              fontSize: '1.1rem',
              color: 'white',
              marginBottom: '0.5rem',
              lineHeight: '1.6'
            }}>
              Este versus NUNCA se podrá hacer.
            </p>

            {/* Attribution */}
            <p style={{
              fontSize: '0.9rem',
              color: 'rgba(250, 86, 73, 0.8)',
              marginBottom: '2rem',
              fontStyle: 'italic'
            }}>
              Att: Desarrolladores
            </p>

            {/* Button */}
            <button
              type="button"
              onClick={handleCloseErrorPopup}
              style={{
                background: 'var(--color-principal)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 10px 30px rgba(128, 22, 199, 0.4)'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-5px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 15px 40px rgba(128, 22, 199, 0.6)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 30px rgba(128, 22, 199, 0.4)';
              }}
            >
              Otro Versus
            </button>
          </div>

          {/* CSS Animation */}
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
