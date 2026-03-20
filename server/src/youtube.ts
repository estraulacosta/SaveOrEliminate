import axios from 'axios';
import type { Song } from './types.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Cache simple para reducir llamadas a la API
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY || '';
  if (!key) {
    console.error('WARNING: YOUTUBE_API_KEY not found in environment variables!');
  }
  return key;
}

function getCached(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function searchByArtist(artistName: string, limit: number = 50): Promise<Song[]> {
  try {
    // Revisar caché primero
    const cacheKey = `artist_${artistName}_${limit}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`Using cached results for artist: ${artistName}`);
      return cached;
    }

    console.log(`Searching YouTube for artist: ${artistName}`);
    
    // Búsqueda más simple y eficiente - solo videos musicales oficiales
    const searchResponse = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: `${artistName} official music video`,
        type: 'video',
        videoCategoryId: '10',
        videoDuration: 'medium', // Entre 4-20 minutos, excluye automáticamente shorts
        maxResults: Math.min(limit, 50),
        order: 'relevance',
        key: getApiKey(),
      },
    });

    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      console.log(`No results found for artist: ${artistName}`);
      return [];
    }

    // Filtrar en base al título solamente (más rápido)
    const excludeKeywords = [
      'live', 'cover', 'remix', 'reaction', 'tutorial', 
      'compilation', 'playlist', 'full album', 'mix',
      'top 10', 'top 20', 'best of', 'hour', 'hours'
    ];

    const filteredSongs = searchResponse.data.items
      .filter((item: any) => {
        const title = item.snippet.title.toLowerCase();
        
        // Excluir títulos con palabras clave problemáticas
        if (excludeKeywords.some(keyword => title.includes(keyword))) {
          return false;
        }
        
        return true;
      })
      .map((item: any) => ({
        id: item.id.videoId,
        name: item.snippet.title
          .replace(/\(Official.*\)/gi, '')
          .replace(/\[Official.*\]/gi, '')
          .replace(/Official Video/gi, '')
          .replace(/Official Audio/gi, '')
          .replace(/\|.*/gi, '') // Eliminar texto después de |
          .trim(),
        artist: item.snippet.channelTitle,
        previewUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        albumArt: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
        spotifyUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }))
      .slice(0, limit);

    console.log(`Found ${filteredSongs.length} songs for artist: ${artistName}`);
    
    // Guardar en caché
    setCache(cacheKey, filteredSongs);
    
    return filteredSongs;
  } catch (error: any) {
    if (error.response?.status === 403) {
      console.error('YouTube API Error 403: Quota exceeded or API key invalid');
      console.error('Please check: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas');
    } else {
      console.error('Error searching YouTube by artist:', error.message);
    }
    return [];
  }
}

export async function searchByGenre(genre: string, limit: number = 50): Promise<Song[]> {
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: `${genre} music`,
        type: 'video',
        videoCategoryId: '10',
        maxResults: Math.min(limit, 50),
        key: getApiKey(),
      },
    });

    return response.data.items.map((item: any) => ({
      id: item.id.videoId,
      name: item.snippet.title.replace(/\(Official.*\)/gi, '').replace(/\[Official.*\]/gi, '').trim(),
      artist: item.snippet.channelTitle,
      previewUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      albumArt: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      spotifyUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
  } catch (error) {
    console.error('Error searching YouTube by genre:', error);
    return [];
  }
}

export async function searchByYear(year: number, limit: number = 50): Promise<Song[]> {
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: `top songs ${year}`,
        type: 'video',
        videoCategoryId: '10',
        maxResults: Math.min(limit, 50),
        key: getApiKey(),
      },
    });

    return response.data.items.map((item: any) => ({
      id: item.id.videoId,
      name: item.snippet.title.replace(/\(Official.*\)/gi, '').replace(/\[Official.*\]/gi, '').trim(),
      artist: item.snippet.channelTitle,
      previewUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      albumArt: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      spotifyUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
  } catch (error) {
    console.error('Error searching YouTube by year:', error);
    return [];
  }
}

export async function searchByDecade(startYear: number, endYear: number, limit: number = 50): Promise<Song[]> {
  try {
    const decade = `${Math.floor(startYear / 10) * 10}s`;
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: `best songs ${decade}`,
        type: 'video',
        videoCategoryId: '10',
        maxResults: Math.min(limit, 50),
        key: getApiKey(),
      },
    });

    return response.data.items.map((item: any) => ({
      id: item.id.videoId,
      name: item.snippet.title.replace(/\(Official.*\)/gi, '').replace(/\[Official.*\]/gi, '').trim(),
      artist: item.snippet.channelTitle,
      previewUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      albumArt: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      spotifyUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
  } catch (error) {
    console.error('Error searching YouTube by decade:', error);
    return [];
  }
}

export async function getTopTracks(limit: number = 50): Promise<Song[]> {
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: 'top music 2024',
        type: 'video',
        videoCategoryId: '10',
        maxResults: Math.min(limit, 50),
        key: getApiKey(),
      },
    });

    return response.data.items.map((item: any) => ({
      id: item.id.videoId,
      name: item.snippet.title.replace(/\(Official.*\)/gi, '').replace(/\[Official.*\]/gi, '').trim(),
      artist: item.snippet.channelTitle,
      previewUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      albumArt: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      spotifyUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
  } catch (error) {
    console.error('Error getting YouTube top tracks:', error);
    return [];
  }
}

export async function searchArtists(query: string, limit: number = 10): Promise<string[]> {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: `${query} official`,
        type: 'channel',
        maxResults: limit,
        key: getApiKey(),
      },
    });

    return response.data.items.map((item: any) => item.snippet.title);
  } catch (error) {
    console.error('Error searching YouTube artists:', error);
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

export async function getTopArtists(limit: number = 20): Promise<string[]> {
  const popularArtists = [
    'Bruno Mars', 'Bad Bunny', 'The Weeknd', 'Rihanna', 'Taylor Swift',
    'Justin Bieber', 'Lady Gaga', 'Coldplay', 'Billie Eilish', 'Drake',
    'J Balvin', 'Ariana Grande', 'Ed Sheeran', 'David Guetta', 'Shakira',
    'Kendrick Lamar', 'Maroon 5', 'Eminem', 'SZA', 'Calvin Harris'
  ];
  return popularArtists.slice(0, limit);
}

export async function getTopGenres(limit: number = 20): Promise<string[]> {
  const popularGenres = [
    'pop', 'rock', 'hip-hop', 'r&b', 'electronic', 'indie', 'country', 'latin',
    'reggaeton', 'jazz', 'blues', 'classical', 'metal', 'punk', 'folk',
    'soul', 'disco', 'funk', 'reggae', 'k-pop'
  ];
  return popularGenres.slice(0, limit);
}
