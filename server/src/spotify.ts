import axios from 'axios';
import type { Song } from './types.js';

let spotifyToken: string | null = null;
let tokenExpiry: number = 0;

async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && Date.now() < tokenExpiry) {
    return spotifyToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
    }
  );

  spotifyToken = response.data.access_token;
  tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000;
  return spotifyToken as string;
}

export async function getTopTracks(market: string = 'US', limit: number = 20): Promise<Song[]> {
  const token = await getSpotifyToken();
  const response = await axios.get(
    'https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF/tracks',
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { market, limit },
    }
  );

  return response.data.items.map((item: any) => ({
    id: item.track.id,
    name: item.track.name,
    artist: item.track.artists.map((a: any) => a.name).join(', '),
    previewUrl: item.track.preview_url,
    albumArt: item.track.album.images[0]?.url || '',
    spotifyUrl: item.track.external_urls.spotify,
  }));
}

export async function searchByGenre(genre: string, limit: number = 50): Promise<Song[]> {
  const token = await getSpotifyToken();
  
  try {
    // Buscar playlists del género
    const playlistSearch = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: genre, type: 'playlist', limit: 3, market: 'US' }
    });

    const allTracks: Song[] = [];
    
    for (const playlist of playlistSearch.data.playlists.items) {
      if (allTracks.length >= limit) break;
      
      const tracksRes = await axios.get(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50, market: 'US' }
      });
      
      const tracks = tracksRes.data.items
        .filter((item: any) => item.track && item.track.preview_url)
        .map((item: any) => ({
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists.map((a: any) => a.name).join(', '),
          previewUrl: item.track.preview_url,
          albumArt: item.track.album.images[0]?.url || '',
          spotifyUrl: item.track.external_urls.spotify,
        }));
      
      allTracks.push(...tracks);
    }
    
    return allTracks.slice(0, limit);
  } catch (error) {
    console.error('Error in searchByGenre:', error);
    return [];
  }
}

export async function searchByArtist(artistName: string, limit: number = 50): Promise<Song[]> {
  const token = await getSpotifyToken();
  
  try {
    console.log(`Searching for tracks by artist: ${artistName}`);
    
    // Buscar playlists relacionadas con el artista
    const playlistSearch = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: { 
        q: `This Is ${artistName}`, 
        type: 'playlist', 
        limit: 5
      },
    });

    if (!playlistSearch.data.playlists.items.length) {
      console.log('No playlists found, trying alternative search');
      // Buscar con solo el nombre del artista
      const altSearch = await axios.get('https://api.spotify.com/v1/search', {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          q: artistName, 
          type: 'playlist', 
          limit: 5
        },
      });
      
      if (!altSearch.data.playlists.items.length) {
        console.log('No playlists found for artist');
        return [];
      }
      
      playlistSearch.data.playlists.items = altSearch.data.playlists.items;
    }

    const allTracks: Song[] = [];
    const artistNameLower = artistName.toLowerCase();
    
    // Obtener tracks de las playlists
    for (const playlist of playlistSearch.data.playlists.items) {
      if (allTracks.length >= limit) break;
      
      try {
        console.log(`Fetching tracks from playlist: ${playlist.name}`);
        const tracksRes = await axios.get(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 50 }
        });
        
        const tracks = tracksRes.data.items
          .filter((item: any) => {
            if (!item.track || !item.track.preview_url) return false;
            // Filtrar para asegurarnos que sea del artista correcto
            const trackArtists = item.track.artists.map((a: any) => a.name.toLowerCase());
            return trackArtists.some((name: string) => 
              name.includes(artistNameLower) || artistNameLower.includes(name)
            );
          })
          .map((item: any) => ({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists.map((a: any) => a.name).join(', '),
            previewUrl: item.track.preview_url,
            albumArt: item.track.album.images[0]?.url || '',
            spotifyUrl: item.track.external_urls.spotify,
          }));
        
        allTracks.push(...tracks);
        console.log(`Added ${tracks.length} tracks from ${playlist.name}`);
      } catch (err) {
        console.error('Error fetching playlist tracks:', err);
      }
    }

    // Eliminar duplicados por ID
    const uniqueTracks = allTracks.filter((track: Song, index: number, self: Song[]) =>
      index === self.findIndex((t) => t.id === track.id)
    );

    console.log(`Found ${uniqueTracks.length} unique tracks for ${artistName}`);
    return uniqueTracks.slice(0, limit);
  } catch (error) {
    console.error('Error in searchByArtist:', error);
    return [];
  }
}

export async function searchByYear(year: number, limit: number = 50): Promise<Song[]> {
  const token = await getSpotifyToken();
  
  try {
    const playlistSearch = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: `${year}`, type: 'playlist', limit: 2, market: 'US' }
    });

    const allTracks: Song[] = [];
    
    for (const playlist of playlistSearch.data.playlists.items) {
      if (allTracks.length >= limit) break;
      
      const tracksRes = await axios.get(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50, market: 'US' }
      });
      
      const tracks = tracksRes.data.items
        .filter((item: any) => item.track && item.track.preview_url)
        .map((item: any) => ({
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists.map((a: any) => a.name).join(', '),
          previewUrl: item.track.preview_url,
          albumArt: item.track.album.images[0]?.url || '',
          spotifyUrl: item.track.external_urls.spotify,
        }));
      
      allTracks.push(...tracks);
    }
    
    return allTracks.slice(0, limit);
  } catch (error) {
    console.error('Error in searchByYear:', error);
    return [];
  }
}

export async function searchByDecade(startYear: number, endYear: number, limit: number = 50): Promise<Song[]> {
  const token = await getSpotifyToken();
  
  try {
    const decade = `${Math.floor(startYear / 10) * 10}s`;
    const playlistSearch = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: decade, type: 'playlist', limit: 2, market: 'US' }
    });

    const allTracks: Song[] = [];
    
    for (const playlist of playlistSearch.data.playlists.items) {
      if (allTracks.length >= limit) break;
      
      const tracksRes = await axios.get(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50, market: 'US' }
      });
      
      const tracks = tracksRes.data.items
        .filter((item: any) => item.track && item.track.preview_url)
        .map((item: any) => ({
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists.map((a: any) => a.name).join(', '),
          previewUrl: item.track.preview_url,
          albumArt: item.track.album.images[0]?.url || '',
          spotifyUrl: item.track.external_urls.spotify,
        }));
      
      allTracks.push(...tracks);
    }
    
    return allTracks.slice(0, limit);
  } catch (error) {
    console.error('Error in searchByDecade:', error);
    return [];
  }
}

export async function getTopArtists(limit: number = 20): Promise<string[]> {
  // Retorna los 20 artistas más populares
  const popularArtists = [
    'Taylor Swift', 'Bad Bunny', 'Drake', 'The Weeknd', 'Ariana Grande',
    'Ed Sheeran', 'Justin Bieber', 'Billie Eilish', 'Post Malone', 'Dua Lipa',
    'Olivia Rodrigo', 'Harry Styles', 'BTS', 'Coldplay', 'Imagine Dragons',
    'Maroon 5', 'Rihanna', 'Eminem', 'Kanye West', 'Beyoncé'
  ];
  return popularArtists.slice(0, limit);
}

export async function getTopGenres(limit: number = 20): Promise<string[]> {
  // Los 20 géneros más populares
  const popularGenres = [
    'pop', 'rock', 'hip-hop', 'r&b', 'electronic', 'indie', 'country', 'latin',
    'reggaeton', 'jazz', 'blues', 'classical', 'metal', 'punk', 'folk',
    'soul', 'disco', 'funk', 'reggae', 'k-pop'
  ];
  return popularGenres.slice(0, limit);
}

export async function searchArtists(query: string, limit: number = 10): Promise<string[]> {
  if (!query || query.length < 2) return [];
  
  try {
    const token = await getSpotifyToken();
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: query, type: 'artist', limit },
    });

    return response.data.artists.items.map((artist: any) => artist.name);
  } catch (error) {
    console.error('Error searching artists:', error);
    return [];
  }
}

export async function searchGenres(query: string): Promise<string[]> {
  // Filtrar géneros existentes
  const allGenres = [
    'pop', 'rock', 'hip-hop', 'r&b', 'electronic', 'indie', 'country', 'latin',
    'reggaeton', 'jazz', 'blues', 'classical', 'metal', 'punk', 'folk',
    'soul', 'disco', 'funk', 'reggae', 'k-pop', 'rap', 'house', 'techno',
    'dance', 'edm', 'alternative', 'grunge', 'ska', 'gospel', 'bluegrass'
  ];
  
  if (!query) return allGenres.slice(0, 20);
  
  return allGenres.filter(g => g.toLowerCase().includes(query.toLowerCase()));
}
