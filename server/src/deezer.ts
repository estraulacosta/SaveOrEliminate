import axios from 'axios';
import type { Song } from './types.js';

const DEEZER_API = 'https://api.deezer.com';

// Mapeo de años a IDs de playlist en Deezer
const yearPlaylistMap: Record<number, string> = {
  1960: '15049579303',
  1961: '15049606603',
  1962: '15049668783',
  1963: '15049679003',
  1964: '15049687403',
  1965: '15049696823',
  1966: '15049718563',
  1967: '15049759923',
  1968: '15049768383',
  1969: '15049775003',
  1970: '15049803363',
  1971: '15049809803',
  1972: '15049815683',
  1973: '15049841383',
  1974: '15049855563',
  1975: '15049869143',
  1976: '15049875503',
  1977: '15049880383',
  1978: '15049884343',
  1979: '15049891103',
  1980: '15049895483',
  1981: '15049903103',
  1982: '15049906043',
  1983: '15049911943',
  1984: '15049917983',
  1985: '15049920203',
  1986: '15049924143',
  1987: '15049927103',
  1988: '15049929763',
  1989: '15049934603',
  1990: '15049938383',
  1991: '15049941763',
  1992: '15049951783',
  1993: '15049961643',
  1994: '15049971043',
  1995: '15049979943',
  1996: '15049984763',
  1997: '15049993103',
  1998: '15050001563',
  1999: '15050005863',
  2000: '15050007963',
  2001: '15050016183',
  2002: '15050025763',
  2003: '15050033603',
  2004: '15050036983',
  2005: '15050045343',
  2006: '15050050903',
  2007: '15050057223',
  2008: '15050062083',
  2009: '15050067923',
  2010: '15050073343',
  2011: '15050080963',
  2012: '15050086563',
  2013: '15050095883',
  2014: '15050104103',
  2015: '15050110623',
  2016: '15050120903',
  2017: '15051230463',
  2018: '15051243643',
  2019: '15051259283',
  2020: '15051272523',
  2021: '15051288943',
  2022: '15051312323',
  2023: '15051331663',
  2024: '15051346563',
  2025: '15051365383',
};

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

export async function searchByYear(year: number, limit: number = 100): Promise<Song[]> {
  try {
    const playlistId = yearPlaylistMap[year];

    if (!playlistId) {
      console.log(`No playlist configured for year ${year}`);
      return [];
    }

    console.log(`Fetching playlist for year ${year} (ID: ${playlistId})...`);

    try {
      const res = await axios.get(`${DEEZER_API}/playlist/${playlistId}/tracks`, {
        params: {
          limit: 30, // Cada playlist tiene 25-30 canciones
        },
      });

      if (!res.data.data || res.data.data.length === 0) {
        console.log(`No tracks found in playlist for year ${year}`);
        return [];
      }

      // Filtrar solo los que tienen preview
      const allTracks = res.data.data.filter((t: any) => t.preview);

      console.log(`Got ${allTracks.length} tracks from playlist for year ${year}`);

      // Ordenar por popularidad
      allTracks.sort((a: any, b: any) => (b.nb_fan || 0) - (a.nb_fan || 0));

      // Mapear y filtrar
      const tracks = allTracks
        .filter((track: any) => track.preview && track.title && track.artist)
        .map((track: any) => ({
          id: track.id.toString(),
          name: track.title,
          artist: track.artist.name,
          previewUrl: track.preview,
          albumArt:
            track.album?.cover_big ||
            track.album?.cover_medium ||
            track.album?.cover ||
            '',
          spotifyUrl: track.link,
        }));

      console.log(
        `Final: ${tracks.length} songs from year ${year} (from playlist)`
      );
      return tracks;
    } catch (e) {
      console.error(`Error fetching playlist for year ${year}:`, (e as any).message);
      return [];
    }
  } catch (error) {
    console.error('Error in searchByYear:', error);
    return [];
  }
}

export async function searchByDecade(startYear: number, endYear: number, limit: number = 50): Promise<Song[]> {
  try {
    const decade = `${Math.floor(startYear / 10) * 10}s`;
    console.log(`Searching Deezer for decade: ${decade} (years ${startYear}-${endYear})`);
    
    const allSongs: Song[] = [];
    
    // Obtener canciones de cada año en la década
    for (let year = startYear; year <= endYear; year++) {
      const yearPlaylistId = yearPlaylistMap[year];
      
      if (!yearPlaylistId) {
        console.log(`No playlist found for year ${year}`);
        continue;
      }
      
      try {
        const response = await axios.get(`${DEEZER_API}/playlist/${yearPlaylistId}/tracks`, {
          params: { limit: limit }
        });
        
        if (response.data.data && response.data.data.length > 0) {
          const yearTracks = response.data.data
            .filter((track: any) => track.preview)
            .map((track: any) => ({
              id: track.id.toString(),
              name: track.title,
              artist: track.artist.name,
              previewUrl: track.preview,
              albumArt:
                track.album?.cover_big ||
                track.album?.cover_medium ||
                track.album?.cover ||
                '',
              spotifyUrl: track.link,
            }));
          
          allSongs.push(...yearTracks);
          console.log(`Found ${yearTracks.length} songs from year ${year}`);
        }
      } catch (e) {
        console.error(`Error fetching playlist for year ${year}:`, (e as any).message);
      }
    }
    
    console.log(`Total songs found for decade ${decade}: ${allSongs.length}`);
    return allSongs;
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
