import axios from 'axios';
import type { Song } from './types.js';

const DEEZER_API = 'https://api.deezer.com';
const ITUNES_API = 'https://itunes.apple.com/search';
const trackYearCache = new Map<string, number | null>();

const TITLE_BLOCKLIST = [
  'remix', 'remaster', 'remastered', 'live', 'edit', 'radio edit', 'extended',
  'version', 'mix', 'karaoke', 'instrumental', 'sped up', 'slowed', 'nightcore',
  'rework', 'bootleg', 'cover'
];


function extractYearFromDate(value?: string): number | null {
  if (!value || value.length < 4) return null;
  const parsed = parseInt(value.substring(0, 4));
  return Number.isFinite(parsed) ? parsed : null;
}

function shouldRejectTitle(title: string, year?: number): boolean {
  const normalized = title.toLowerCase();

  if (TITLE_BLOCKLIST.some(word => normalized.includes(word))) {
    return true;
  }

  return false;
}

function getTrackAndAlbumYear(track: any): { trackYear: number | null; albumYear: number | null } {
  return {
    trackYear: extractYearFromDate(track?.release_date),
    albumYear: extractYearFromDate(track?.album?.release_date),
  };
}

function isStrictYearMatch(year: number, trackYear: number | null, albumYear: number | null): boolean {
  // Preferimos año del track; solo usar álbum si trackYear no existe.
  if (trackYear !== null) {
    return trackYear === year;
  }
  return albumYear === year;
}

function normalizeSongIdentity(name: string, artist: string): string {
  const cleanName = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const cleanArtist = artist
    .toLowerCase()
    .replace(/feat\.?/g, ',')
    .replace(/ft\.?/g, ',')
    .replace(/ x /g, ',')
    .replace(/&/g, ',')
    .split(',')
    .map((part) => part.replace(/[^a-z0-9]+/g, ' ').trim())
    .filter(Boolean)
    .sort()
    .join('|');
  return `${cleanName}::${cleanArtist}`;
}

function dedupeByIdentity(songs: Song[]): Song[] {
  const seen = new Set<string>();
  const output: Song[] = [];
  for (const song of songs) {
    const key = normalizeSongIdentity(song.name, song.artist);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(song);
  }
  return output;
}

async function resolveTrackYear(track: any): Promise<number | null> {
  const trackId = track?.id?.toString();
  if (!trackId) return null;

  if (trackYearCache.has(trackId)) {
    return trackYearCache.get(trackId) ?? null;
  }

  const fastTrackYear = extractYearFromDate(track.release_date);
  if (fastTrackYear) {
    trackYearCache.set(trackId, fastTrackYear);
    return fastTrackYear;
  }

  const fastAlbumYear = extractYearFromDate(track.album?.release_date);
  if (fastAlbumYear) {
    trackYearCache.set(trackId, fastAlbumYear);
    return fastAlbumYear;
  }

  try {
    const detail = await axios.get(`${DEEZER_API}/track/${trackId}`);
    const detailYear = extractYearFromDate(detail.data?.release_date)
      ?? extractYearFromDate(detail.data?.album?.release_date);
    trackYearCache.set(trackId, detailYear ?? null);
    return detailYear ?? null;
  } catch {
    trackYearCache.set(trackId, null);
    return null;
  }
}

async function searchItunesByYear(year: number, limit: number): Promise<Song[]> {
  const collected: Song[] = [];
  const seen = new Set<string>();
  const terms = [`${year} hits`, `top songs ${year}`, `best songs ${year}`];

  for (const term of terms) {
    if (collected.length >= limit) break;

    try {
      const response = await axios.get(ITUNES_API, {
        params: {
          term,
          entity: 'song',
          country: 'US',
          limit: 200,
        },
        timeout: 7000,
      });

      const items = response.data?.results ?? [];
      for (const item of items) {
        if (collected.length >= limit) break;
        if (!item?.previewUrl) continue;

        const releaseYear = extractYearFromDate(item.releaseDate);
        if (releaseYear !== year) continue;
        if (shouldRejectTitle(item.trackName ?? '', year)) continue;

        const id = `itunes-${item.trackId ?? `${item.artistName}-${item.trackName}`}`;
        if (seen.has(id)) continue;
        seen.add(id);

        collected.push({
          id,
          name: item.trackName,
          artist: item.artistName,
          previewUrl: item.previewUrl,
          albumArt: item.artworkUrl100?.replace('100x100bb', '600x600bb') || '',
          spotifyUrl: item.trackViewUrl || '',
          releaseYear: year,
        });
      }
    } catch (error) {
      const status = (error as any)?.response?.status;
      console.warn(`iTunes year fallback failed for ${year} / ${term}${status ? ` (status ${status})` : ''}`);
    }
  }

  return collected;
}

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

export async function searchByYear(year: number, limit: number = 25): Promise<Song[]> {
  try {
    console.log(`Searching Deezer for year: ${year} (top ${limit})`);

    // Búsquedas orientadas a popularidad (sin usar el año como texto para evitar sesgo de título)
    const queries = [
      `top hits ${year}`,
      `${year} songs`,
      `popular ${year}`,
      'global chart',
    ];
    const indexes = [0];

    const seenIds = new Set<string>();
    const candidateTracks: Array<{ track: any; rank: number }> = [];

    for (const q of queries) {
      if (candidateTracks.length >= 120) break;

      try {
        for (const index of indexes) {
          if (candidateTracks.length >= 120) break;

          const response = await axios.get(`${DEEZER_API}/search`, {
            params: { q, limit: 100, index, order: 'RANKING' },
            timeout: 6000,
          });

          if (!response.data.data || response.data.data.length === 0) continue;

          for (const track of response.data.data) {
            if (!track.preview || seenIds.has(track.id.toString())) continue;
            if (shouldRejectTitle(track.title ?? '', year)) continue;
            seenIds.add(track.id.toString());
            candidateTracks.push({ track, rank: track.rank ?? 0 });
          }
        }
      } catch (innerErr) {
        const status = (innerErr as any)?.response?.status;
        console.warn(`Error in query "${q}"${status ? ` (status ${status})` : ''}`);
      }
    }

    const strictMatches: Song[] = [];
    const strictSeen = new Set<string>();
    const unresolved: any[] = [];

    candidateTracks.sort((a, b) => b.rank - a.rank);

    for (const candidate of candidateTracks) {
      const track = candidate.track;
      const { trackYear, albumYear } = getTrackAndAlbumYear(track);

      if (isStrictYearMatch(year, trackYear, albumYear)) {
        const candidateSong: Song = {
          id: track.id.toString(),
          name: track.title,
          artist: track.artist.name,
          previewUrl: track.preview,
          albumArt: track.album.cover_big || track.album.cover_medium || track.album.cover,
          spotifyUrl: track.link,
          releaseYear: year,
        };
        const candidateKey = normalizeSongIdentity(candidateSong.name, candidateSong.artist);
        if (strictSeen.has(candidateKey)) continue;
        strictSeen.add(candidateKey);
        strictMatches.push(candidateSong);
      } else if (trackYear === null && albumYear === null) {
        unresolved.push(track);
      }

      if (strictMatches.length >= limit) break;
    }

    if (strictMatches.length < limit && unresolved.length > 0) {
      const need = Math.min(10, unresolved.length);
      const yearResults = await Promise.allSettled(
        unresolved.slice(0, need).map((track) => resolveTrackYear(track))
      );

      for (let i = 0; i < yearResults.length; i++) {
        if (strictMatches.length >= limit) break;
        const result = yearResults[i];
        if (result.status !== 'fulfilled' || result.value !== year) continue;

        const track = unresolved[i];
        const fallbackSong: Song = {
          id: track.id.toString(),
          name: track.title,
          artist: track.artist.name,
          previewUrl: track.preview,
          albumArt: track.album.cover_big || track.album.cover_medium || track.album.cover,
          spotifyUrl: track.link,
          releaseYear: year,
        };
        const fallbackKey = normalizeSongIdentity(fallbackSong.name, fallbackSong.artist);
        if (strictSeen.has(fallbackKey)) continue;
        strictSeen.add(fallbackKey);
        strictMatches.push(fallbackSong);
      }
    }

    let result = dedupeByIdentity(strictMatches).slice(0, limit);

    // Fallback resiliente: completar con iTunes (estricto por release year)
    if (result.length < limit) {
      const missing = limit - result.length;
      const itunes = await searchItunesByYear(year, missing * 2);
      const seenIds = new Set(result.map(song => song.id));
      const seenIdentity = new Set(result.map(song => normalizeSongIdentity(song.name, song.artist)));
      for (const song of itunes) {
        if (result.length >= limit) break;
        const identity = normalizeSongIdentity(song.name, song.artist);
        if (seenIds.has(song.id) || seenIdentity.has(identity)) continue;
        seenIds.add(song.id);
        seenIdentity.add(identity);
        result.push(song);
      }
    }

    console.log(`[Year ${year}] Found ${result.length} strict-year tracks`);
    return result;
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
