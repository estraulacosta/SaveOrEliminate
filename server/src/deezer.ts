import axios from 'axios';
import type { Song } from './types.js';

const DEEZER_API = 'https://api.deezer.com';

export async function searchByArtist(artistName: string, limit: number = 50): Promise<Song[]> {
  try {
    console.log(`Searching Deezer for artist: ${artistName}`);
    
    // Paso 1: Buscar al artista para obtener su ID
    const artistSearch = await axios.get(`${DEEZER_API}/search/artist`, {
      params: {
        q: artistName,
        limit: 1
      }
    });

    if (!artistSearch.data.data || artistSearch.data.data.length === 0) {
      console.log('Artist not found');
      return [];
    }

    const artist = artistSearch.data.data[0];
    const artistId = artist.id;
    console.log(`Found artist: ${artist.name} (ID: ${artistId})`);

    // Paso 2: Obtener las canciones TOP del artista directamente
    const topTracksResponse = await axios.get(`${DEEZER_API}/artist/${artistId}/top`, {
      params: { limit: limit }
    });

    if (!topTracksResponse.data.data || topTracksResponse.data.data.length === 0) {
      console.log('No top tracks found');
      return [];
    }

    const tracks = topTracksResponse.data.data
      .filter((track: any) => track.preview) // Solo tracks con preview
      .map((track: any) => ({
        id: track.id.toString(),
        name: track.title,
        artist: track.artist.name,
        previewUrl: track.preview,
        albumArt: track.album.cover_big || track.album.cover_medium || track.album.cover,
        spotifyUrl: track.link,
      }));

    console.log(`Found ${tracks.length} tracks with previews for ${artistName}`);
    return tracks;
  } catch (error) {
    console.error('Error in searchByArtist:', error);
    return [];
  }
}

export async function searchByGenre(genre: string, limit: number = 50): Promise<Song[]> {
  try {
    console.log(`Searching Deezer for genre: ${genre}`);
    
    const response = await axios.get(`${DEEZER_API}/search`, {
      params: {
        q: `genre:"${genre}"`,
        limit: limit
      }
    });

    if (!response.data.data || response.data.data.length === 0) {
      console.log('No tracks found for genre');
      return [];
    }

    const tracks = response.data.data
      .filter((track: any) => track.preview)
      .map((track: any) => ({
        id: track.id.toString(),
        name: track.title,
        artist: track.artist.name,
        previewUrl: track.preview,
        albumArt: track.album.cover_big || track.album.cover_medium || track.album.cover,
        spotifyUrl: track.link,
      }));

    console.log(`Found ${tracks.length} tracks for genre ${genre}`);
    return tracks;
  } catch (error) {
    console.error('Error in searchByGenre:', error);
    return [];
  }
}

export async function searchByYear(year: number, limit: number = 50): Promise<Song[]> {
  try {
    console.log(`Searching Deezer for year: ${year}`);
    
    // Buscar hits del año específico
    const response = await axios.get(`${DEEZER_API}/search`, {
      params: {
        q: `${year}`,
        limit: limit
      }
    });

    if (!response.data.data || response.data.data.length === 0) {
      console.log('No tracks found for year');
      return [];
    }

    const tracks = response.data.data
      .filter((track: any) => track.preview)
      .map((track: any) => ({
        id: track.id.toString(),
        name: track.title,
        artist: track.artist.name,
        previewUrl: track.preview,
        albumArt: track.album.cover_big || track.album.cover_medium || track.album.cover,
        spotifyUrl: track.link,
      }));

    console.log(`Found ${tracks.length} tracks for year ${year}`);
    return tracks;
  } catch (error) {
    console.error('Error in searchByYear:', error);
    return [];
  }
}

export async function searchByDecade(startYear: number, endYear: number, limit: number = 50): Promise<Song[]> {
  try {
    const decade = `${Math.floor(startYear / 10) * 10}s`;
    console.log(`Searching Deezer for decade: ${decade}`);
    
    const response = await axios.get(`${DEEZER_API}/search`, {
      params: {
        q: decade,
        limit: limit
      }
    });

    if (!response.data.data || response.data.data.length === 0) {
      console.log('No tracks found for decade');
      return [];
    }

    const tracks = response.data.data
      .filter((track: any) => track.preview)
      .map((track: any) => ({
        id: track.id.toString(),
        name: track.title,
        artist: track.artist.name,
        previewUrl: track.preview,
        albumArt: track.album.cover_big || track.album.cover_medium || track.album.cover,
        spotifyUrl: track.link,
      }));

    console.log(`Found ${tracks.length} tracks for decade ${decade}`);
    return tracks;
  } catch (error) {
    console.error('Error in searchByDecade:', error);
    return [];
  }
}

export async function getTopTracks(limit: number = 20): Promise<Song[]> {
  try {
    console.log('Getting top tracks from Deezer');
    
    // Obtener el chart global de Deezer
    const response = await axios.get(`${DEEZER_API}/chart/0/tracks`, {
      params: { limit }
    });

    if (!response.data.data || response.data.data.length === 0) {
      console.log('No top tracks found');
      return [];
    }

    const tracks = response.data.data
      .filter((track: any) => track.preview)
      .map((track: any) => ({
        id: track.id.toString(),
        name: track.title,
        artist: track.artist.name,
        previewUrl: track.preview,
        albumArt: track.album.cover_big || track.album.cover_medium || track.album.cover,
        spotifyUrl: track.link,
      }));

    console.log(`Found ${tracks.length} top tracks`);
    return tracks;
  } catch (error) {
    console.error('Error in getTopTracks:', error);
    return [];
  }
}

export async function getTopArtists(limit: number = 20): Promise<Array<{name: string; image: string}>> {
  try {
    // Obtener artistas del chart de Deezer
    const response = await axios.get(`${DEEZER_API}/chart/0/artists`, {
      params: { limit }
    });

    if (!response.data.data || response.data.data.length === 0) {
      return defaultTopArtists();
    }

    return response.data.data.map((artist: any) => ({
      name: artist.name,
      image: artist.picture_medium || artist.picture || artist.picture_small || ''
    }));
  } catch (error) {
    console.error('Error getting top artists:', error);
    return defaultTopArtists();
  }
}

function defaultTopArtists(): Array<{name: string; image: string}> {
  return [
    { name: 'Taylor Swift', image: '' },
    { name: 'Bad Bunny', image: '' },
    { name: 'Drake', image: '' },
    { name: 'The Weeknd', image: '' },
    { name: 'Ariana Grande', image: '' },
    { name: 'Ed Sheeran', image: '' },
    { name: 'Justin Bieber', image: '' },
    { name: 'Billie Eilish', image: '' },
    { name: 'Post Malone', image: '' },
    { name: 'Dua Lipa', image: '' },
    { name: 'Olivia Rodrigo', image: '' },
    { name: 'Harry Styles', image: '' },
    { name: 'BTS', image: '' },
    { name: 'Coldplay', image: '' },
    { name: 'Imagine Dragons', image: '' },
    { name: 'Maroon 5', image: '' },
    { name: 'Rihanna', image: '' },
    { name: 'Eminem', image: '' },
    { name: 'Kanye West', image: '' },
    { name: 'Beyoncé', image: '' }
  ];
}

export async function getTopGenres(limit: number = 20): Promise<string[]> {
  const genres = [
    'pop', 'rock', 'hip-hop', 'r&b', 'electronic', 'indie', 'country', 'latin',
    'reggaeton', 'jazz', 'blues', 'classical', 'metal', 'punk', 'folk',
    'soul', 'disco', 'funk', 'reggae', 'k-pop'
  ];
  return genres.slice(0, limit);
}

export async function searchArtists(query: string, limit: number = 10): Promise<Array<{name: string; image: string}>> {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await axios.get(`${DEEZER_API}/search/artist`, {
      params: { q: query, limit }
    });

    if (!response.data.data || response.data.data.length === 0) {
      return [];
    }

    return response.data.data.map((artist: any) => ({
      name: artist.name,
      image: artist.picture_medium || artist.picture || artist.picture_small || ''
    }));
  } catch (error) {
    console.error('Error searching artists:', error);
    return [];
  }
}

export async function searchGenres(query: string): Promise<string[]> {
  const allGenres = [
    'pop', 'rock', 'hip-hop', 'r&b', 'electronic', 'indie', 'country', 'latin',
    'reggaeton', 'jazz', 'blues', 'classical', 'metal', 'punk', 'folk',
    'soul', 'disco', 'funk', 'reggae', 'k-pop', 'rap', 'house', 'techno',
    'dance', 'edm', 'alternative', 'grunge', 'ska', 'gospel', 'bluegrass'
  ];
  
  if (!query) return allGenres.slice(0, 20);
  
  return allGenres.filter(g => g.toLowerCase().includes(query.toLowerCase()));
}
