import axios from 'axios';
import type { Song } from './types.js';

const DEEZER_API = 'https://api.deezer.com';
const ITUNES_API = 'https://itunes.apple.com/search';
const MAX_ARTISTS_PER_GENRE = 60; // Máximo artistas por género (usa menos si no hay 60)

/**
 * Calcula un score de similitud entre dos nombres de artista (0-1)
 */
function calculateMatchScore(requested: string, returned: string): number {
  const norm1 = normalizeName(requested);
  const norm2 = normalizeName(returned);
  
  if (norm1 === norm2) return 1.0;
  
  // Substring matching - MÁS RESTRICTIVO
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = norm1.length < norm2.length ? norm1 : norm2;
    const longer = norm1.length < norm2.length ? norm2 : norm1;
    
    // Si uno es substring pero el largo es significativamente más grande (>30%),
    // probablemente sea otro artista (ej: "prince" vs "princeroyce")
    if (longer.length > shorter.length * 1.3) {
      // Penalizar substring parcial
      return 0.65;
    }
    
    return 0.95;
  }
  
  const parts1 = norm1.split(/\s+/).filter(p => p.length > 2);
  const parts2 = norm2.split(/\s+/).filter(p => p.length > 2);
  
  if (parts1.length === 0 || parts2.length === 0) return 0;
  
  const commonParts = parts1.filter(p => parts2.includes(p));
  const overlapRatio = commonParts.length / Math.max(parts1.length, parts2.length);
  
  if (overlapRatio >= 0.5) return 0.8 + (overlapRatio * 0.15);
  return Math.max(0, overlapRatio * 0.6);
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}
const trackYearCache = new Map<string, number | null>();

const TITLE_BLOCKLIST = [
  'remix', 'remaster', 'remastered', 'live', 'edit', 'radio edit', 'extended',
  'version', 'mix', 'karaoke', 'instrumental', 'sped up', 'slowed', 'nightcore',
  'rework', 'bootleg', 'cover', 'demo', 'track by track'
];


function extractYearFromDate(value?: string): number | undefined {
  if (!value || value.length < 4) return undefined;
  const parsed = parseInt(value.substring(0, 4));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function shouldRejectTitle(title: string, year?: number): boolean {
  const normalized = title.toLowerCase();

  if (TITLE_BLOCKLIST.some(word => normalized.includes(word))) {
    return true;
  }

  return false;
}

function getTrackAndAlbumYear(track: any): { trackYear: number | undefined; albumYear: number | undefined } {
  return {
    trackYear: extractYearFromDate(track?.release_date),
    albumYear: extractYearFromDate(track?.album?.release_date),
  };
}

function isStrictYearMatch(year: number, trackYear: number | undefined, albumYear: number | undefined): boolean {
  // Preferimos año del track; solo usar álbum si trackYear no existe.
  if (trackYear !== undefined) {
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

// Mapeo de géneros a artistas clave 100% confiables para búsqueda pura
// ALIASING: Artistas que tienen variaciones de nombre en Deezer
const ARTIST_NAME_ALIASES: { [key: string]: string[] } = {
  'The Beatles': ['The Beatles', 'Beatles', 'The Fab Four'],
  'The Rolling Stones': ['The Rolling Stones', 'Rolling Stones', 'The Stones'],
  'Led Zeppelin': ['Led Zeppelin', 'Led Zepplin', 'Led-Zeppelin'],
  'Pink Floyd': ['Pink Floyd', 'The Pink Floyd'],
  'David Bowie': ['David Bowie', 'Bowie', 'David Robert Jones'],
  'The Who': ['The Who', 'Who', 'The Who Sings'],
  'AC/DC': ['AC/DC', 'ACDC', 'AC DC', 'acdc'],
  'Metallica': ['Metallica', 'METALLICA'],
  'Aerosmith': ['Aerosmith', 'AEROSMITH'],
  'Guns N\' Roses': ['Guns N\' Roses', 'Guns N Roses', 'Guns and Roses', 'Guns Roses'],
  'Queen': ['Queen', 'Queen Greatest Hits'],
  'Jimi Hendrix': ['Jimi Hendrix', 'Jimi Hendrix Experience', 'Hendrix'],
  'Deep Purple': ['Deep Purple', 'Deep Purpel'],
  'The Doors': ['The Doors', 'Doors'],
  'U2': ['U2', 'U 2'],
  'Bruce Springsteen': ['Bruce Springsteen', 'Springsteen', 'Bruce Frederick Springsteen'],
  'Fleetwood Mac': ['Fleetwood Mac', 'Fleetwood-Mac', 'Fleetwood'],
  'The Police': ['The Police', 'Police'],
  'Dire Straits': ['Dire Straits', 'Dire Strait'],
  'Black Sabbath': ['Black Sabbath', 'Black Sabbath and More'],
  'Iron Maiden': ['Iron Maiden', 'IRON MAIDEN'],
  'Pearl Jam': ['Pearl Jam', 'Pearl-Jam'],
  'Radiohead': ['Radiohead', 'Radiohead Thom Yorke'],
  'Linkin Park': ['Linkin Park', 'Linkin-Park'],
  'Bon Jovi': ['Bon Jovi', 'Bon-Jovi'],
  'Van Halen': ['Van Halen', 'Van-Halen', 'Vanhalen'],
  'Red Hot Chili Peppers': ['Red Hot Chili Peppers', 'Red Hot Chilli Peppers', 'RHCP'],
  'Journey': ['Journey', 'Journey Band'],
  'The Kinks': ['The Kinks', 'Kinks'],
  'Genesis': ['Genesis', 'Genesis Plus'],
  'Elton John': ['Elton John', 'Elton', 'Reginald Kenneth Dwight'],
  'Nirvana': ['Nirvana', 'Nirvana Kurt Cobain'],
  'George Michael': ['George Michael', 'George Michael Careless'],
  'Muse': ['Muse', 'MUSE', 'Muse Simulation'],
  'Foo Fighters': ['Foo Fighters', 'Foo-Fighters'],
  'Green Day': ['Green Day', 'Green-Day'],
  'Coldplay': ['Coldplay', 'Cold-Play'],
  'Oasis': ['Oasis', 'Oasis (What\'s the Story)'],
  'Blur': ['Blur', 'Blur Damon Albarn'],
  'The Beach Boys': ['The Beach Boys', 'Beach Boys', 'Beach Boys The']
};

const GENRE_ARTISTS: { [key: string]: string[] } = {
  'reggae': [
        'Bob Marley', 'Peter Tosh', 'Burning Spear', 'Jimmy Cliff', 'Steel Pulse', 
        'Black Uhuru', 'Bunny Wailer', 'Gregory Isaacs', 'Dennis Brown', 'Toots and the Maytals',
        'Alpha Blondy', 'Lucky Dube', 'Yellowman', 'Sizzla', 'Buju Banton', 
        'The Abyssinians', 'Culture', 'Israel Vibration', 'Max Romeo', 'The Gladiators',
        'Inner Circle', 'Jacob Miller', 'Barrington Levy', 'Eek-A-Mouse', 'Althea & Donna', 
        'Capleton', 'Damian Marley', 'Ziggy Marley', 'Protoje', 'Chronixx',
        'Shaggy', 'Sean Paul', 'UB40', 'Musical Youth', 'Eddy Grant', 
        'Collie Buddz', 'Matisyahu', 'Beres Hammond', 'Garnett Silk', 'Third World'
    ],
    'reggaeton': [
        'Daddy Yankee', 'Don Omar', 'Bad Bunny', 'J Balvin', 'Wisin y Yandel', 
        'Arcángel', 'Farruko', 'Anitta', 'Jhay Cortez', 'Ozuna',
        'Tego Calderon', 'Ivy Queen', 'Zion & Lennox', 'Nicky Jam', 'Plan B', 
        'Vico C', 'Alexis & Fido', 'Rauw Alejandro', 'Karol G', 'Maluma', 
        'Myke Towers', 'Feid', 'De La Ghetto', 'Chencho Corleone', 'Yandel', 
        'Tito El Bambino', 'Nengo Flow', 'Ryan Castro', 'Blessd', 'El Alfa',
        'Luny Tunes', 'Natti Natasha', 'Becky G', 'Sech', 'Mora', 
        'Manuel Turizo', 'Bryant Myers', 'Cosculluela', 'Baby Rasta & Gringo', 'Calle 13', 'Quevedo'
    ],
    'punk': [
        'The Ramones', 'Sex Pistols', 'The Clash', 'Dead Kennedys', 'Black Flag', 
        'Minor Threat', 'The Damned', 'Buzzcocks', 'Joy Division', 'Descendents',
        'Bad Brains', 'Fugazi', 'Social Distortion', 'The Adicts', 'Crass', 
        'Circle Jerks', 'Stiff Little Fingers', 'Sham 69', 'The Stooges', 'Misfits', 
        'Pennywise', 'NOFX', 'Bad Religion', 'Rancid', 'The Exploited', 
        'Discharge', 'GBH', 'Anti-Flag', 'Rise Against', 'Television',
        'Green Day', 'The Offspring', 'Blink-182', 'Sum 41', 'Flogging Molly', 
        'Dropkick Murphys', 'Patti Smith', 'X', 'The Germs', 'Subhumans'
    ],
    'hip-hop': [
        'Tupac', 'The Notorious B.I.G', 'Nas', 'Jay-Z', 'Eminem', 
        'Dr. Dre', 'Rakim', 'KRS-One', 'Run-D.M.C', 'LL Cool J',
        'Snoop Dogg', 'Kendrick Lamar', 'Kanye West', 'Wu-Tang Clan', 'Public Enemy', 
        'A Tribe Called Quest', 'Outkast', 'Ice Cube', '50 Cent', 'J. Cole', 
        'Andre 3000', 'Big Daddy Kane', 'Slick Rick', 'Mos Def', 'Common', 
        'Method Man', 'Ghostface Killah', 'Lauryn Hill', 'Busta Rhymes', 'DMX',
        'Drake', 'Travis Scott', 'Tyler the Creator', 'Lil Wayne', 'Future', 
        'Cardi B', 'Nicki Minaj', 'Mac Miller', 'Post Malone', 'A$AP Rocky'
    ],
    'hip hop': ['Tupac', 'The Notorious B.I.G', 'Nas', 'Jay-Z', 'Eminem', 'Dr. Dre', 'Rakim', 'KRS-One', 'Run-D.M.C', 'LL Cool J', 'Snoop Dogg', 'Kendrick Lamar', 'Kanye West', 'Wu-Tang Clan', 'Public Enemy', 'A Tribe Called Quest', 'Outkast', 'Ice Cube', '50 Cent', 'J. Cole', 'Andre 3000', 'Big Daddy Kane', 'Slick Rick', 'Mos Def', 'Common', 'Method Man', 'Ghostface Killah', 'Lauryn Hill', 'Busta Rhymes', 'DMX', 'Drake', 'Travis Scott', 'Tyler the Creator', 'Lil Wayne', 'Future', 'Cardi B', 'Nicki Minaj', 'Mac Miller', 'Post Malone', 'A$AP Rocky'],
    'rap': ['Tupac', 'The Notorious B.I.G', 'Nas', 'Jay-Z', 'Eminem', 'Dr. Dre', 'Rakim', 'KRS-One', 'Run-D.M.C', 'LL Cool J', 'Snoop Dogg', 'Kendrick Lamar', 'Kanye West', 'Wu-Tang Clan', 'Public Enemy', 'A Tribe Called Quest', 'Outkast', 'Ice Cube', '50 Cent', 'J. Cole', 'Andre 3000', 'Big Daddy Kane', 'Slick Rick', 'Mos Def', 'Common', 'Method Man', 'Ghostface Killah', 'Lauryn Hill', 'Busta Rhymes', 'DMX', 'Drake', 'Travis Scott', 'Tyler the Creator', 'Lil Wayne', 'Future', 'Cardi B', 'Nicki Minaj', 'Mac Miller', 'Post Malone', 'A$AP Rocky'],
    'rock': [
        'The Beatles', 'The Rolling Stones', 'Led Zeppelin', 'Pink Floyd', 'David Bowie', 
        'The Who', 'AC/DC', 'Metallica', 'Aerosmith', 'Guns N\' Roses',
        'Queen', 'Jimi Hendrix', 'Deep Purple', 'The Doors', 'U2', 
        'Bruce Springsteen', 'Fleetwood Mac', 'The Police', 'Dire Straits', 'Black Sabbath', 
        'Iron Maiden', 'Pearl Jam', 'Radiohead', 'Linkin Park', 'Bon Jovi', 
        'Van Halen', 'Red Hot Chili Peppers', 'Journey', 'The Kinks', 'Genesis',
        'Elton John', 'Nirvana', 'George Michael', 'Muse', 'Foo Fighters', 
        'Green Day', 'Coldplay', 'Oasis', 'Blur', 'The Beach Boys'
    ],
    'pop': [
        'Michael Jackson', 'Madonna', 'Britney Spears', 'The Weeknd', 'Ariana Grande', 
        'Taylor Swift', 'Lady Gaga', 'Beyonce', 'Drake', 'Billie Eilish', 
        'Olivia Rodrigo', 'Sabrina Carpenter', 'Chappell Roan', 'Gracie Abrams', 'Justin Bieber', 
        'Katy Perry', 'Adele', 'Rihanna', 'Bruno Mars', 'Ed Sheeran', 
        'Harry Styles', 'Dua Lipa', 'Prince', 'George Michael', 'Whitney Houston', 
        'Celine Dion', 'Elton John', 'ABBA', 'Cher', 'Justin Timberlake',
        'Coldplay', 'Sam Smith', 'Miley Cyrus', 'Doja Cat', 'Lana Del Rey', 
        'Sia', 'Demi Lovato', 'Selena Gomez', 'Shawn Mendes', 'Camila Cabello'
    ],
    'jazz': [
        'Miles Davis', 'John Coltrane', 'Ella Fitzgerald', 'Duke Ellington', 'Charlie Parker', 
        'Billie Holiday', 'Thelonious Monk', 'Louis Armstrong', 'Oscar Peterson', 'Herbie Hancock',
        'Charles Mingus', 'Dave Brubeck', 'Count Basie', 'Dizzy Gillespie', 'Sarah Vaughan', 
        'Wes Montgomery', 'Stan Getz', 'Chet Baker', 'Bill Evans', 'Art Blakey', 
        'Nina Simone', 'Nat King Cole', 'Django Reinhardt', 'Chick Corea', 'Wayne Shorter', 
        'Benny Goodman', 'Sun Ra', 'Dexter Gordon', 'Ornette Coleman', 'Bud Powell',
        'Norah Jones', 'Diana Krall', 'Kamasi Washington', 'Esperanza Spalding', 'Gregory Porter', 
        'Wynton Marsalis', 'Stacey Kent', 'Jamie Cullum', 'Pat Metheny', 'Quincy Jones'
    ],
    'blues': [
        'B.B. King', 'Muddy Waters', 'Howlin\' Wolf', 'Bessie Smith', 'Robert Johnson', 
        'John Lee Hooker', 'Albert King', 'Etta James', 'Buddy Guy', 'Willie Dixon',
        'Stevie Ray Vaughan', 'T-Bone Walker', 'Elmore James', 'Son House', 'Blind Willie McTell', 
        'Ma Rainey', 'Lightnin\' Hopkins', 'Freddie King', 'Junior Wells', 'Lead Belly', 
        'Otis Rush', 'Big Maceo Merriweather', 'Gary Clark Jr.', 'Joe Bonamassa', 'Taj Mahal', 
        'Koko Taylor', 'Bobby "Blue" Bland', 'Memphis Slim', 'Skip James', 'Pinetop Perkins',
        'Rory Gallagher', 'Johnny Winter', 'Bonnie Raitt', 'Derek Trucks', 'Susan Tedeschi', 
        'Keb\' Mo\'', 'Big Mama Thornton', 'Mississippi John Hurt', 'Charley Patton', 'Lightnin\' Slim'
    ],
    'k-pop': [
        'BTS', 'BLACKPINK', 'EXO', 'Stray Kids', 'TWICE', 'Red Velvet', 'iKON', 'Seventeen', 
        'Girl\'s Generation', 'Super Junior', 'BIGBANG', 'SHINee', 'NewJeans', 'IVE', 'LE SSERAFIM', 
        'TXT', 'ATEEZ', 'NCT 127', 'ENHYPEN', 'ITZY', 'Aespa', 'MAMAMOO', 'Monsta X', 
        '2NE1', 'TVXQ!', 'Wonder Girls', 'GOT7', 'PSY', 'IU', 'Rain',
        'G-Dragon', 'Taemin', 'Sunmi', 'Chungha', 'Zico', 
        'Day6', 'The Boyz', 'NMIXX', 'BABYMONSTER', 'FIFTY FIFTY'
    ],
    'r&b': [
        'Usher', 'R. Kelly', 'Boyz II Men', 'TLC', 'Aaliyah', 'Outkast', 'Ne-Yo', 
        'Mary J. Blige', 'Erykah Badu', 'Bryson Tiller', 'Marvin Gaye', 'Stevie Wonder', 
        'Aretha Franklin', 'Ray Charles', 'Whitney Houston', 'Luther Vandross', 'Alicia Keys', 
        'SZA', 'Frank Ocean', 'The Weeknd', 'D\'Angelo', 'Maxwell', 'Toni Braxton', 
        'Ginuwine', 'Monica', 'Brandy', 'Chris Brown', 'Summer Walker', 'H.E.R.', 'Jali',
        'Solange', 'Janelle Monae', 'Miguel', 'Kehlani', 'Giveon', 
        'Brent Faiyaz', 'Lucky Daye', 'Victoria Monet', 'Tems', 'Teyana Taylor'
    ],
    'electronic': [
        'Daft Punk', 'The Chemical Brothers', 'Aphex Twin', 'Fatboy Slim', 'Moby', 
        'Deadmau5', 'Skrillex', 'David Guetta', 'Avicii', 'Tiësto', 'Kraftwerk', 
        'Brian Eno', 'Jean-Michel Jarre', 'The Prodigy', 'LCD Soundsystem', 'Justice', 
        'Disclosure', 'Flying Lotus', 'Burial', 'Four Tet', 'Bonobo', 'Massive Attack', 
        'Portishead', 'Boards of Canada', 'Orbital', 'Underworld', 'Vangelis', 'Flume', 
        'Zedd', 'Kygo', 'Jamie xx', 'Kaytranada', 'Nicolas Jaar', 'Jon Hopkins', 'Moderat', 
        'Mount Kimbie', 'Amon Tobin', 'Squarepusher', 'Autechre', 'Richie Hawtin'
    ],
    'dance': [
        'Daft Punk', 'Fatboy Slim', 'David Guetta', 'Calvin Harris', 'Diplo', 
        'Avicii', 'Tiësto', 'Deadmau5', 'The Chemical Brothers', 'Hardwell',
        'Armin van Buuren', 'Swedish House Mafia', 'Marshmello', 'Martin Garrix', 'Zedd', 
        'Kygo', 'Robin Schulz', 'Major Lazer', 'Clean Bandit', 'The Chainsmokers', 
        'Cascada', 'Alice Deejay', 'Vengaboys', 'Bob Sinclar', 'Eric Prydz', 
        'Paul van Dyk', 'Benny Benassi', 'Rufus Du Sol', 'Fred again..', 'Fisher',
        'Peggy Gou', 'Honey Dijon', 'Dom Dolla', 'Purple Disco Machine', 'CamelPhat', 
        'Duke Dumont', 'Gorgon City', 'Jax Jones', 'Oliver Heldens', 'Meduza'
    ],
    'edm': [
        'Daft Punk', 'David Guetta', 'Avicii', 'Tiësto', 'Deadmau5', 
        'Hardwell', 'Diplo', 'Zedd', 'Calvin Harris', 'Martin Garrix',
        'Steve Aoki', 'Skrillex', 'Marshmello', 'The Chainsmokers', 'DJ Snake', 
        'Alan Walker', 'Afrojack', 'Alesso', 'Kaskade', 'Above & Beyond', 
        'Seven Lions', 'Illenium', 'REZZ', 'Alison Wonderland', 'Flume', 
        'Dillon Francis', 'Porter Robinson', 'Madeon', 'Gryffin', 'Don Diablo',
        'W&W', 'Nicky Romero', 'KSHMR', 'Vicetone', 'Yellow Claw', 
        'Galantis', 'Lost Frequencies', 'San Holo', 'Sub Focus', 'Pendulum'
    ],
    'indie': [
        'The Strokes', 'Djo', 'Arctic Monkeys', 'Arcade Fire', 'The National', 
        'Interpol', 'Vampire Weekend', 'Foster the People', 'Cold War Kids', 'Phoenix', 
        'Two Door Cinema Club', 'Tame Impala', 'Modest Mouse', 'The Libertines', 'Florence + The Machine', 
        'The Killers', 'MGMT', 'Bon Iver', 'Mac DeMarco', 'The 1975', 
        'alt-J', 'Beach House', 'Glass Animals', 'Phoebe Bridgers', 'Mitski', 
        'Neutral Milk Hotel', 'Pixies', 'The Smiths', 'Wilco', 'Spoon',
        'Cigarettes After Sex', 'Wallows', 'Clairo', 'TV Girl', 'The Garden', 
        'Beabadoobee', 'Big Thief', 'Father John Misty', 'Deerhunter', 'Grizzly Bear'
    ],
    'alternative': [
        'Nirvana', 'Pearl Jam', 'Soundgarden', 'The Smashing Pumpkins', 'Stone Temple Pilots', 
        'Alice in Chains', 'Faith No More', 'Rage Against the Machine', 'Pixies', 'Sonic Youth',
        'Radiohead', 'Beck', 'Red Hot Chili Peppers', 'Jane\'s Addiction', 'The Cure', 
        'R.E.M.', 'Blur', 'Oasis', 'Gorillaz', 'Linkin Park', 'Depeche Mode', 
        'Nine Inch Nails', 'The White Stripes', 'Green Day', 'Foo Fighters', 
        'Weezer', 'Muse', 'Björk', 'PJ Harvey', 'Violent Femmes',
        'The Killers', 'Coldplay', 'Arctic Monkeys', 'The Strokes', 'Imagine Dragons', 
        'Twenty One Pilots', 'Paramore', 'My Chemical Romance', 'No Doubt', 'Panic! At The Disco'
    ],
    'country': [
        'Johnny Cash', 'Willie Nelson', 'Dolly Parton', 'Hank Williams', 'George Strait', 
        'Waylon Jennings', 'Merle Haggard', 'Patsy Cline', 'Buck Owens', 'Loretta Lynn',
        'Garth Brooks', 'Kenny Rogers', 'Alan Jackson', 'Reba McEntire', 'Tim McGraw', 
        'Shania Twain', 'Carrie Underwood', 'Luke Combs', 'Chris Stapleton', 'Morgan Wallen', 
        'Glen Campbell', 'Charley Pride', 'Tammy Wynette', 'Conway Twitty', 'George Jones', 
        'Brooks & Dunn', 'Miranda Lambert', 'Blake Shelton', 'Zac Brown Band', 'Taylor Swift (Early)',
        'Kacey Musgraves', 'Tyler Childers', 'Sturgill Simpson', 'Colter Wall', 'Maren Morris', 
        'Keith Urban', 'Brad Paisley', 'Jason Aldean', 'Eric Church', 'Kane Brown'
    ],
    'classical': [
        'Ludwig van Beethoven', 'Wolfgang Amadeus Mozart', 'Johan Sebastian Bach', 
        'Pyotr Ilyich Tchaikovsky', 'George Friedrich Handel', 'Antonio Vivaldi', 
        'Gioachino Rossini', 'Giuseppe Verdi', 'Richard Wagner', 'Claude Debussy',
        'Johannes Brahms', 'Franz Schubert', 'Frederic Chopin', 'Igor Stravinsky', 
        'Gustav Mahler', 'Maurice Ravel', 'Sergei Rachmaninoff', 'Giacomo Puccini', 
        'Dmitri Shostakovich', 'Felix Mendelssohn', 'Antonin Dvorak', 'Edward Elgar', 
        'Erik Satie', 'Bela Bartok', 'Jean Sibelius', 'Modest Mussorgsky', 
        'Camille Saint-Saëns', 'Franz Liszt', 'Aaron Copland', 'Leonard Bernstein',
        'Philip Glass', 'Arvo Pärt', 'John Adams', 'Steve Reich', 'Max Richter', 
        'Ludovico Einaudi', 'Hans Zimmer', 'Gustav Holst', 'Claudio Monteverdi', 'Henry Purcell'
    ],
    'metal': [
        'Black Sabbath', 'Iron Maiden', 'Judas Priest', 'Slayer', 'Pantera', 
        'Lamb of God', 'Gojira', 'Opeth', 'Meshuggah', 'Korn',
        'Metallica', 'Megadeth', 'Anthrax', 'Motorhead', 'Slipknot', 
        'System of a Down', 'Tool', 'Avenged Sevenfold', 'Mastodon', 'Sepultura', 
        'Death', 'Cannibal Corpse', 'Nightwish', 'Helloween', 'Dream Theater', 
        'Dio', 'Ozzy Osbourne', 'Rammstein', 'In Flames', 'Machine Head',
        'Ghost', 'Architects', 'Bring Me The Horizon', 'Sleep Token', 'Jinjer', 
        'Behemoth', 'Deftones', 'Alice in Chains', 'Disturbed', 'Five Finger Death Punch'
    ],
    'folk': [
        'Bob Dylan', 'Joan Baez', 'Joni Mitchell', 'Leonard Cohen', 'Paul Simon', 
        'Woody Guthrie', 'Peter, Paul and Mary', 'The Lumineers', 'Mumford & Sons', 'Fleet Foxes',
        'Cat Stevens', 'Simon & Garfunkel', 'Nick Drake', 'Tracy Chapman', 'John Denver', 
        'Donovan', 'Gordon Lightfoot', 'Phil Ochs', 'The Byrds', 'Iron & Wine', 
        'Sufjan Stevens', 'Laura Marling', 'The Weavers', 'Fairport Convention', 'Judy Collins', 
        'Arlo Guthrie', 'The Dubliners', 'The Chieftains', 'Townes Van Zandt', 'Bon Iver',
        'Hozier', 'Gregory Alan Isakov', 'The Tallest Man on Earth', 'First Aid Kit', 'Vashti Bunyan', 
        'Bert Jansch', 'Jackson C. Frank', 'Tim Buckley', 'Dave Van Ronk', 'Jim Croce'
    ],
    'soul': [
        'Aretha Franklin', 'Sam Cooke', 'Marvin Gaye', 'Otis Redding', 'Ray Charles', 
        'Nina Simone', 'Wilson Pickett', 'Solomon Burke', 'Mavis Staples', 'Alicia Keys',
        'James Brown', 'Bill Withers', 'Al Green', 'Curtis Mayfield', 
        'Etta James', 'Dusty Springfield', 'Isaac Hayes', 'The Temptations', 'The Supremes', 
        'Jackie Wilson', 'Donny Hathaway', 'Roberta Flack', 'Ben E. King', 'Bobby Womack', 
        'Chaka Khan', 'Amy Winehouse', 'Erykah Badu', 'Joss Stone', 'Leon Bridges',
        'Stevie Wonder', 'Michael Jackson', 'George Michael', 'Adele', 'Solange', 
        'Jazmine Sullivan', 'Raphael Saadiq', 'D\'Angelo', 'Maxwell', 'Charles Bradley'
    ],
    'disco': [
        'Bee Gees', 'Donna Summer', 'KC and the Sunshine Band', 'Gloria Gaynor', 'Barry White', 
        'Earth, Wind & Fire', 'Sister Sledge', 'The Trammps', 'Village People', 'Chic',
        'ABBA', 'The Jacksons', 'Diana Ross', 'Boney M.', 'Amii Stewart', 
        'The Pointer Sisters', 'Sylvester', 'Anita Ward', 'Lipps Inc.', 'The Weather Girls', 
        'Cheryl Lynn', 'Grace Jones', 'Loleatta Holloway', 'Kool & The Gang', 'Heatwave', 
        'The Emotions', 'Indeep', 'Irene Cara', 'Patrick Hernandez', 'The Gap Band',
        'Silver Convention', 'Odyssey', 'Rose Royce', 'The Hues Corporation', 'Van McCoy', 
        'Candi Staton', 'The Ritchie Family', 'Santa Esmeralda', 'Tavares', 'Giorgio Moroder'
    ],
    'funk': [
        'James Brown', 'Parliament-Funkadelic', 'Earth, Wind & Fire', 'Stevie Wonder', 'Prince', 
        'Zapp & Roger', 'Roger Troutman', 'Herbie Hancock', 'Grandmaster Flash', 'The Time',
        'Kool & The Gang', 'The Meters', 'Sly & The Family Stone', 'Rick James', 'The Isley Brothers', 
        'George Clinton', 'Bootsy Collins', 'Betty Davis', 'Ohio Players', 'Wild Cherry', 
        'Commodores', 'The Brothers Johnson', 'Average White Band', 'Cameo', 'Tower of Power', 
        'Rufus', 'Chaka Khan', 'Slave', 'Fatback Band', 'Bar-Kays',
        'Vulfpeck', 'Khruangbin', 'The Fearless Flyers', 'Cory Wong', 'Lettuce', 
        'Dumpstaphunk', 'The Budos Band', 'Sharon Jones & The Dap-Kings', 'Galactic', 'Orgone'
    ],
    'salsa': [
        'Celia Cruz', 'Willie Colon', 'Hector Lavoe', 'Oscar D\'Leon', 'Ruben Blades', 
        'Ismael Miranda', 'Ray Barretto', 'Tito Puente', 'Eddie Santiago', 'Joe Arroyo',
        'El Gran Combo de Puerto Rico', 'La Sonora Ponceña', 'Richie Ray & Bobby Cruz', 
        'Cheo Feliciano', 'Gilberto Santa Rosa', 'Marc Anthony', 'Victor Manuelle', 
        'La India', 'Fania All-Stars', 'Roberto Roena', 'Luis Enrique', 'Frankie Ruiz', 
        'Jerry Rivera', 'Grupo Niche', 'Orquesta Guayacan', 'Papo Lucca', 'Adalberto Santiago', 
        'Andy Montanez', 'Tito Nieves', 'Maelo Ruiz',
        'Ismael Rivera', 'Benny More', 'Sonora Matancera', 'Fruko y sus Tesos', 'Bobby Valentin', 
        'Tommy Olivencia', 'Tony Vega', 'Rey Ruiz', 'Hansel y Raul', 'Choco Orta'
    ],
    'vallenato': [
        'Carlos Vives', 'Diomedes Diaz', 'Binomio de Oro', 'Jorge Celedon', 'Felipe Pelaez', 
        'Peter Manjarres', 'Rafael Orozco', 'Silvestre Dangond', 'Los Diablitos', 'Los Chiches del Vallenato',
        'Los Gigantes del Vallenato', 'Los Inquietos del Vallenato', 'Nelson Velasquez', 'Jean Carlos Centeno', 
        'Alfredo Gutierrez', 'Alejo Duran', 'Luis Enrique Martinez', 'Pacho Rada', 'Emiliano Zuleta', 
        'Poncho Zuleta', 'Ivan Villazon', 'Beto Zabaleta', 'Silvio Brito', 
        'Miguel Morales', 'Patricia Teheran', 'Kaleth Morales', 'Hebert Vargas', 'Alex Manga', 'Daniel Calderon',
        'Omar Geles', 'Elder Dayan Diaz', 'Mono Zabaleta', 'Kvrass', 'Luifer Cuello', 
        'Adriana Lucia', 'Gusi', 'Lucas Dangond', 'Los Embajadores', 'Luis Mario Onate', 'El Gran Martin Elias', 'Rafael Escalona'
    ],
    'bachata': [
        'Juan Luis Guerra', 'Aventura', 'Romeo Santos', 'Antony Santos', 'Xtreme', 
        'Monchy & Alexandra', 'Grupo Mania', 'Hector Acosta', 'Los Ilegales', 'Prince Royce',
        'Raulin Rodriguez', 'Luis Vargas', 'Frank Reyes', 'Zacarias Ferreira', 'El Chaval de la Bachata', 
        'Joe Veras', 'Teodoro Reyes', 'Leonardo Paniagua', 'Blas Duran', 'Yoskar Sarante', 
        'Kiko Rodriguez', 'Elvis Martinez', 'Daniel Santacruz', 'Vicente Garcia', 'Leslie Grace', 
        'Toby Love', 'Luis Miguel del Amargue', 'Henry Santos', 'Alexandra', 'Joan Soriano',
        'El Vinny', 'Karlos Rose', 'Pinto Picasso', 'Luis Segura', 'Jose Manuel Calderon', 
        'Eladio Romero Santos', 'Chicho Severino', 'Andy Andy', 'Cosby', 'Bachata Heightz'
    ],
    'cumbia': [
        'Los Graduados', 'Sonora Dinamita', 'Guaco', 'Grupo Bahia', 'La Hipoteca', 
        'Fulanito', 'Grupo Gale', 'El Binomio de Oro', 'Los Palmeras', 'Gilda', 
        'Los Angeles Azules', 'Margarita la Diosa de la Cumbia', 'Pastor Lopez', 'Rodolfo Aicardi', 
        'Los Hispanos', 'La Sonora de Margarita', 'Grupo Canaveral', 'Rafaga', 'Amar Azul', 
        'Damas Gratis', 'Los Mirlos', 'Juaneco y su Combo', 'Aniceto Molina', 'Lucho Bermudez', 
        'Pacho Galán', 'Totó la Momposina', 'Ondatrópica', 'Bomba Estéreo', 'Chicha Libre', 'Bareto',
        'Los Destellos', 'La Delio Valdez', 'Santaferia', 'Chico Trujillo', 'La Combo Tortuga', 
        'Los Shapis', 'Grupo Karicia', 'Agua Marina', 'Armonia 10', 'Corazon Serrano'
    ],
    'merengue': [
        'Juan Luis Guerra', 'Oro Solido', 'Sergio Vargas', 'Los Ilegales', 'Grupo Mania', 
        'Eddy Herrera', 'Fulanito', 'Kinito Mendez', 'Wilfrido Vargas', 'Johnny Ventura', 
        'Olga Tanon', 'Elvis Crespo', 'Milly Quezada', 'Fernando Villalona', 'Los Vecinos', 
        'The New York Band', 'Bandy2', 'La Makina', 'Rikarena', 'Jossie Esteban', 
        'Pochy y su Cocoband', 'Cuco Valoy', 'Bonny Cepeda', 'Alex Bueno', 'Miriam Cruz', 
        'Manny Manuel', 'Gabriel Pagan', 'Omega', 'Chichi Peralta', 'Tono Rosario',
        'Papi Sanchez', 'Magic Juan', 'Proyecto Uno', 'Sandy & Papo', 'Ilegales', 
        'Julian Oro Duro', 'Tito Kenton', 'El Prodigio', 'Krisspy', 'Banda Real'
    ],
    'tango': [
        'Carlos Gardel', 'Astor Piazzolla', 'Julio Sosa', 'Roberto Goyeneche', 'Carlos Di Sarli', 
        'Juan d\'Arienzo', 'Osvaldo Pugliese', 'Leopoldo Federico', 'Adriana Varela', 'Anibal Troilo', 
        'Francisco Canaro', 'Edmundo Rivero', 'Libertad Lamarque', 'Tita Merello', 'Enrique Santos Discepolo', 
        'Homero Manzi', 'Mariano Mores', 'Nelly Omar', 'Alberto Castillo', 'Osvaldo Fresedo', 
        'Miguel Caló', 'Angel D\'Agostino', 'Lucio Demare', 'Rodolfo Biagi', 'Hugo del Carril', 
        'Susana Rinaldi', 'Rubén Juárez', 'Gino Matteo', 'Gotan Project', 'Bajofondo',
        'Osvaldo Piro', 'Horacio Salgán', 'Nelly Vazquez', 'Virginia Luque', 'Jorge Falcon', 
        'Guillermo Fernandez', 'Ariel Ardit', 'Lidia Borda', 'Quinteto Real', 'Sexteto Mayor'
    ],
    'grunge': [
        'Nirvana', 'Pearl Jam', 'Soundgarden', 'Alice in Chains', 'Stone Temple Pilots', 
        'Mudhoney', 'Screaming Trees', 'Melvins', 'Tad', 'Green River', 
        'Temple of the Dog', 'Mother Love Bone', 'Silverchair', 'L7', 'Hole', 
        'Bush', 'Local H', 'The Gits', 'Babes in Toyland', 'Paw', 
        'Skin Yard', 'U-Men', 'Malfunkshun', '7 Year Bitch', 'Hammerbox', 
        'Veruca Salt', 'Candlebox', 'Days of the New', 'Love Battery', 'Gruntruck',
        'Smile', 'Blood Circus', 'Coffin Break', 'Willard', 'The Thrown Ups', 
        'Bundle of Hiss', 'Dickless', 'Mono Men', 'Seaweed', 'Superfuzz'
    ],
    'ska': [
        'The Specials', 'Madness', 'The Selecter', 'Bad Manners', 'Sublime', 
        'Reel Big Fish', 'Less Than Jake', 'The Clash', 'The Police', 'No Doubt', 
        'The Skatalites', 'Prince Buster', 'Desmond Dekker', 'The Toasters', 'The Slackers', 
        'Save Ferris', 'Goldfinger', 'Operation Ivy', 'The Mighty Mighty Bosstones', 'Fishbone', 
        'The Interrupters', 'Streetlight Manifesto', 'Tokyo Ska Paradise Orchestra', 'Panteon Rococo', 
        'Los Fabulosos Cadillacs', 'Los Autenticos Decadentes', 'La Maldita Vecindad', 'Inspector', 
        'Skank', 'Hepcat',
        'The Pietasters', 'Big D and the Kids Table', 'Ska-P', 'Desorden Publico', 'Los Pericos', 
        'The Aggrolites', 'Busters', 'Mephiskapheles', 'Bad Brains', 'English Beat'
    ],
    'gospel': [
        'Mahalia Jackson', 'Elvis Presley', 'Yolanda Adams', 'Kirk Franklin', 'Shirley Caesar', 
        'Al Green', 'Sam Cooke', 'Aretha Franklin', 'Tye Tribbett', 'CeCe Winans', 
        'BeBe Winans', 'Fred Hammond', 'Marvin Sapp', 'Donnie McClurkin', 'Tamela Mann', 
        'Andrae Crouch', 'The Clark Sisters', 'Hezekiah Walker', 'Israel Houghton', 'Smokie Norful', 
        'Maverick City Music', 'Tasha Cobbs Leonard', 'Lecrae', 'The Blind Boys of Alabama', 
        'The Soul Stirrers', 'The Jordanaires', 'Thomas A. Dorsey', 'Sandi Patty', 'Amy Grant', 'Casting Crowns',
        'Kim Burrell', 'Donnie McClurkin', 'Byron Cage', 'John P. Kee', 'Deitrick Haddon', 
        'Jonathan McReynolds', 'Travis Greene', 'Dante Bowe', 'Kierra Sheard', 'Mary Mary'
    ],
    'bluegrass': [
        'Bill Monroe', 'Earl Scruggs', 'Lester Flatt', 'The Stanley Brothers', 'The Osborne Brothers', 
        'Ricky Skaggs', 'Tony Rice', 'Norman Blake', 'David Grisman', 'Doc Watson', 
        'Alison Krauss', 'Bela Fleck', 'Del McCoury', 'John Hartford', 'Old & In The Way', 
        'The Dillards', 'Chris Thile', 'The Steeldrivers', 'Billy Strings', 'Molly Tuttle', 
        'Rhiannon Giddens', 'The Punch Brothers', 'Trampled by Turtles', 'Nickel Creek', 
        'Seldom Scene', 'J.D. Crowe', 'Sam Bush', 'Jerry Douglas', 'Vassar Clements', 'Clarence White',
        'Kentucky Colonels', 'Peter Rowan', 'Tim O\'Brien', 'Sierra Hull', 'Bryan Sutton', 
        'Noam Pikelny', 'Stuart Duncan', 'Balsam Range', 'The Lonesome River Band', 'Dailey & Vincent'
    ],
    'house': [
        'Daft Punk', 'Disclosure', 'Eric Prydz', 'Frankie Knuckles', 'Marshall Jefferson', 
        'Carl Cox', 'Masters at Work', 'Kerri Chandler', 'Larry Heard', 'Kevin Saunderson', 
        'Derrick May', 'Juan Atkins', 'Todd Terry', 'Honey Dijon', 'Black Coffee', 
        'Solomun', 'The Blessed Madonna', 'Jamie Jones', 'Peggy Gou', 'Kaytranada', 
        'Moodymann', 'Theo Parrish', 'Armand Van Helden', 'Green Velvet', 'Roger Sanchez', 
        'David Morales', 'Pete Tong', 'Bob Sinclar', 'Claptone', 'Fisher',
        'MK', 'Defected', 'CamelPhat', 'Tchami', 'Malaa', 
        'Vintage Culture', 'John Summit', 'Purple Disco Machine', 'Hot Since 82', 'The Martinez Brothers'
    ],
    'techno': [
        'Richie Hawtin', 'Adam Beyer', 'Amelie Lens', 'Charlotte de Witte', 'Carl Cox', 
        'Loco Dice', 'Jeff Mills', 'Robert Hood', 'Surgeon', 'Dave Clarke', 
        'Juan Atkins', 'Kevin Saunderson', 'Derrick May', 'Sven Vath', 'Laurent Garnier', 
        'Nina Kraviz', 'Ben Klock', 'Marcel Dettmann', 'Chris Liebing', 'Speedy J', 
        'Dubfire', 'Paul Kalkbrenner', 'Ellen Allien', 'Boris Brejcha', 'Enrico Sangiuliano', 
        'Nicole Moudaber', 'Joseph Capriati', 'Slam', 'Underground Resistance', 'The Belleville Three',
        'Oscar Mulero', '999999999', 'I Hate Models', 'Fjaak', 'Tale of Us', 
        'Maceo Plex', 'Dixon', 'Ame', 'Kobosil', 'Blawan'
    ],
    'soundtrack': [
        'Ludwig Goransson', 'Daniel Blumberg', 'Volker Bertelmann', 'Hans Zimmer', 'Jon Batiste',
        'Atticus Ross', 'Trent Reznor', 'Hildur Gudnadottir', 'Alexandre Desplat', 'Justin Hurwitz',
        'Ennio Morricone', 'Steven Price', 'Mychael Danna', 'Ludovic Bource', 'Michael Giacchino',
        'A.R. Rahman', 'Dario Marianelli', 'Gustavo Santaolalla', 'Jan A.P. Kaczmarek', 'Howard Shore',
        'Elliot Goldenthal', 'Tan Dun', 'John Corigliano', 'Nicola Piovani', 'James Horner',
        'Gabriel Yared', 'Luis Bacalov', 'John Williams', 'Alan Menken', 'John Barry',
        'Dave Grusin', 'Ryuichi Sakamoto', 'Herbie Hancock', 'Maurice Jarre', 'Bill Conti',
        'Vangelis', 'Michael Gore', 'Georges Delerue', 'Giorgio Moroder', 'Jerry Goldsmith',
        'Ramin Djawadi', 'Bear McCreary', 'Max Richter', 'Nicholas Britell', 'Jeff Russo',
        'Cristobal Tapia de Veer', 'Murray Gold', 'Siddhartha Khosla', 'Blake Neely', 'Jeff Beal',
        'Martin Phipps', 'Kyle Dixon', 'Michael Stein', 'Carlos Rafael Rivera', 'Mac Quayle',
        'Daniel Pemberton', 'Lorne Balfe', 'Isobel Waller-Bridge', 'Labrinth', 'Kris Bowers',
        'Sean Callery', 'Mark Snow', 'Angelo Badalamenti', 'W.G. Snuffy Walden', 'Trevor Morris',
        'Christopher Lennertz', 'Dominik Scherrer', 'David Arnold', 'Mike Post', 'Danny Elfman',
        'Nobuo Uematsu', 'Koji Kondo', 'Austin Wintory', 'Darren Korb', 'Lena Raine',
        'Mick Gordon', 'Yoko Shimomura', 'Jeremy Soule', 'Shoji Meguro', 'Jesper Kyd',
        'Yasunori Mitsuda', 'Martin O\'Donnell', 'Borislav Slavov', 'Gareth Coker', 'Keiichi Okabe',
        'Masayoshi Soken', 'Christopher Tin', 'Grant Kirkhope', 'Akira Yamaoka', 'Inon Zur'
    ],
    'popular': [
        'Dario Gomez', 'Luis Alberto Posada', 'El Charrito Negro', 'Arelys Henao', 'Jhonny Rivera',
        'Yeison Jimenez', 'Jessi Uribe', 'Luis Alfonso', 'Paola Jara', 'Alzate',
        'Francy', 'Pipe Bueno', 'Jhon Alex Castano', 'Giovanny Ayala', 'Luisito Munoz',
        'Fernando Burbano', 'El Andariego', 'Galy Galiano', 'Las Hermanitas Calle', 'Joaquin Guiller',
        'El Caballero Gaucho', 'Los Relicarios', 'Alexis Escobar', 'Dario Dario', 'Lady Yuliana', 'Alan Ramirez', 'Ciro Quinonez', 'Gabriel Roman', 'El Dueto Buritica'
    ],
    'ranchera': [
        'Vicente Fernandez', 'Pedro Infante', 'Jorge Negrete', 'Javier Solis', 'Jose Alfredo Jimenez',
        'Antonio Aguilar', 'Lola Beltran', 'Lucha Villa', 'Miguel Aceves Mejia', 'Chavela Vargas',
        'Rocio Durcal', 'Alejandro Fernandez', 'Pepe Aguilar', 'Amalia Mendoza', 'Aida Cuevas',
        'Juan Gabriel', 'Pedro Fernandez', 'Cuco Sanchez', 'Luis Aguilar', 'Yolanda del Rio',
        'Chayito Valdez', 'Cornelio Reyna', 'Gerardo Reyes', 'Francisco Charro Avitia', 'Flor Silvestre',
        'Enriqueta Jimenez', 'Tito Guizar', 'David Zaiizar', 'Demetrio Gonzalez', 'Matilde Sanchez',
        'Maria de Lourdes', 'Christian Nodal', 'Angela Aguilar', 'Lucero', 'Ana Gabriel',
        'Paquita la del Barrio', 'Guadalupe Pineda', 'Irma Serrano', 'Luis Miguel', 'Mariachi Vargas de Tecalitlan'
    ],
    'norteña': [
        'Los Tigres del Norte', 'Ramón Ayala y Sus Bravos del Norte', 'Los Cadetes de Linares', 'Los Invasores de Nuevo León', 'Los Cardenales de Nuevo León',
        'Los Tucanes de Tijuana', 'Los Huracanes del Norte', 'Intocable', 'Pesado', 'Duelo',
        'Conjunto Primavera', 'Los Relámpagos del Norte', 'Carlos Y José', 'Los Alegres de Terán', 'Lalo Mora',
        'Cornelio Reyna', 'Los Rieleros del Norte', 'Calibre 50', 'Los Dos Carnales', 'El Fantasma',
        'Grupo Exterminador', 'Uriel Henao', 'Jimmy Gutiérrez', 'Rey Fonseca', 'Águilas del Norte',
        'Grupo Mezcal', 'Jhon Jairo Perez', 'Humberto Diaz', 'Los Originales de San Juan', 'Los Traileros del Norte',
        'Eliseo Robles', 'Voz de Mando', 'Gerardo Ortiz', 'Alfredo Olivas', 'Julion Alvarez y su Norteno Banda',
        'Los Inquietos del Norte', 'Eden Munoz', 'Luis R Conriquez', 'Los Buitres de Culiacan Sinaloa', 'Ariel Camacho y Los Plebes del Rancho'
    ],
    'cumbia villera': [
        'Damas Gratis', 'Pibes Chorros', 'Yerba Brava', 'Mala Fama', 'Supermerk2',
        'Meta Guacha', 'Flor de Piedra', 'Los Gedes', 'Altos Cumbieros', 'Nestor en Bloque',
        'La Base', 'El Original', 'El Polaco', 'La Repandilla', 'La Liga',
        'Amar Azul', 'Pala Ancha', 'Guachin', 'Eh Guacho', 'El Empuje',
        'Los Pibes del Penal', 'Me Dicen Fideo', 'Repiola', 'El Dipy', 'El Pepo',
        'Jimmy y su Combo Negro', 'Bajo Palabra', 'Mala Gata', 'Agrupacion Marilyn', 'Los Chicos de la Via'
    ],
    'rock en espanol': [
        'Soda Stereo', 'Heroes del Silencio', 'Caifanes', 'Cafe Tacvba', 'Los Prisioneros',
        'Charly Garcia', 'Luis Alberto Spinetta', 'Enanitos Verdes', 'Mana', 'Aterciopelados',
        'La Ley', 'Molotov', 'Patricio Rey y sus Redonditos de Ricota', 'Andres Calamaro', 'Fito Paez',
        'Los Fabulosos Cadillacs', 'Maldita Vecindad y los Hijos del Quinto Patio', 'El Tri', 'Radio Futura', 'Zoe',
        'Los Tres', 'Extremoduro', 'El Cuarteto de Nos', 'Babasónicos', 'No Te Va Gustar',
        'Jaguares', 'Nacha Pop', 'Duncan Dhu', 'Kraken', 'Lucybell', 'Mago de Oz','Rata Blanca', 'Doctor Krapula',
        'Miguel Rios', 'Los Rodriguez', 'Seru Giran', 'Los Autenticos Decadentes', 'Panteon Rococo',
        'La Vela Puerca', 'M-Clan', 'Loquillo y los Trogloditas', 'El Ultimo de la Fila', 'Kinky', 'Hombres G', 'Los Caligaris', 'inspector'
    ]
};

// Mapeo de géneros a IDs de Deezer (solo como referencia, no se usa)

// Mapeo de géneros a términos de búsqueda (solo como fallback)
const GENRE_SEARCH_TERMS: { [key: string]: string[] } = {
  'reggae': ['reggae music', 'bob marley', 'wailers', 'reggae classic', 'roots reggae'],
  'reggaeton': ['reggaeton', 'perreo', 'dembow', 'reggaeton latino', 'reggaeton hits'],
  'salsa': ['salsa music', 'salsa cubana', 'salsa dance', 'salsa hits', 'orchestras salsa'],
  'vallenato': ['vallenato', 'carlos vives', 'juan luis guerra', 'cumbia vallenato', 'accordion'],
  'bachata': ['bachata', 'juan luis guerra', 'aventura', 'bachata dominicana', 'bachata hits'],
  'cumbia': ['cumbia music', 'cumbia colombiana', 'cumbia tradicional', 'cumbia hits', 'cumbia dance'],
  'merengue': ['merengue', 'juan luis guerra', 'merengue dominicano', 'merengue hits', 'merengue dance'],
  'tango': ['tango music', 'carlos gardel', 'tango argentino', 'tango hits', 'tango dancing'],
};

// Función helper para obtener términos de búsqueda para un género (fallback)
function getSearchTerms(genre: string): string[] {
  const genreKey = genre.toLowerCase();
  
  // Si existe un mapeo específico, usarlo
  if (GENRE_SEARCH_TERMS[genreKey]) {
    return GENRE_SEARCH_TERMS[genreKey];
  }
  
  // Si no, generar términos automáticos
  return [
    genre,
    `${genre} hits`,
    `${genre} music`,
    `best ${genre}`,
    `top ${genre}`
  ];
}

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

// Función para obtener TODAS las canciones de un artista desde TODOS sus álbumes
// Con un pool de 150 canciones aleatorias, deduplicadas, filtradas y shuffled en cada partida
/**
 * Obtiene canciones de un artista - HÍBRIDO: intenta top tracks primero,
 * si insuficientes, complementa con álbumes
 */
async function getArtistTracksHybrid(artistId: number, limit: number = 75): Promise<Song[]> {
  try {
    console.log(`\n  [HÍBRIDO] Intentando top tracks primero (limit: ${limit})...`);
    
    // Paso 1: Intenta obtener top tracks (1 petición HTTP)
    const topTracksResponse = await axios.get(`${DEEZER_API}/artist/${artistId}/top`, {
      params: { limit: Math.max(75, limit) }
    });

    const topTracks: Song[] = [];
    if (topTracksResponse.data.data) {
      for (const track of topTracksResponse.data.data) {
        if (!track.preview) continue;
        if (shouldRejectTitle(track.title)) continue;

        topTracks.push({
          id: track.id.toString(),
          name: track.title,
          artist: track.artist.name,
          previewUrl: track.preview,
          albumArt: track.album?.cover_big || track.album?.cover_medium || '',
          spotifyUrl: track.link || '',
          albumName: track.album?.title,
        });
      }
    }
    
    console.log(`  ✓ Top tracks: ${topTracks.length} válidas`);
    
    // Paso 2: Si hay suficientes, retornarlas (MODO RÁPIDO)
    if (topTracks.length >= 50) {
      console.log(`  ✓ SUFICIENTES (${topTracks.length} >= 50). Sin álbumes.`);
      const shuffled = fisherYatesShuffle(topTracks);
      return shuffled.slice(0, limit);
    }
    
    // Paso 3: Si insuficientes, complementar con álbumes (MODO COMPLETO)
    console.log(`  ⚠️ INSUFICIENTES (${topTracks.length} < 50). Complementando con álbumes...`);
    const albumTracks = await getAllTracksFromArtistAlbums(artistId, limit);
    
    // Combinar y deduplicar
    const combined = [...topTracks, ...albumTracks];
    const deduped = dedupeByIdentity(combined);
    const shuffled = fisherYatesShuffle(deduped);
    
    console.log(`  ✓ RESULTADO: ${shuffled.length} canciones (top+álbumes)`);
    return shuffled.slice(0, limit);
    
  } catch (error) {
    console.error('  Error in getArtistTracksHybrid:', error);
    // En caso de error, intentar álbumes como fallback
    return await getAllTracksFromArtistAlbums(artistId, limit);
  }
}

/**
 * Fisher-Yates shuffle
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function getAllTracksFromArtistAlbums(artistId: number, limit: number = 50, isHybridBackup: boolean = false): Promise<Song[]> {
  try {
    console.log(`\n=== NUEVA PARTIDA - Artist ID: ${artistId} ===`);
    
    // Paso 1: Obtener TODOS los álbumes del artista
    const albumsResponse = await axios.get(`${DEEZER_API}/artist/${artistId}/albums`, {
      params: { limit: 100 }
    });

    if (!albumsResponse.data.data || albumsResponse.data.data.length === 0) {
      console.log(`No albums found for artist ID: ${artistId}`);
      return [];
    }

    const albums = albumsResponse.data.data;
    console.log(`✓ Found ${albums.length} albums for artist`);

    // Paso 2: Obtener TODAS las canciones de TODOS los álbumes
    const allCandidates: Song[] = [];
    const albumFetchPromises = albums.map(async (album: any) => {
      try {
        const tracksResponse = await axios.get(`${DEEZER_API}/album/${album.id}/tracks`, {
          params: { limit: 100 }
        });

        if (tracksResponse.data.data) {
          for (const track of tracksResponse.data.data) {
            if (!track.preview) continue; // Solo con preview
            if (shouldRejectTitle(track.title)) continue; // Filtrar remixes, covers, etc.

            allCandidates.push({
              id: track.id.toString(),
              name: track.title,
              artist: track.artist.name,
              previewUrl: track.preview,
              albumArt: album?.cover_big || album?.cover_medium || album?.cover || track.album?.cover_big || '',
              spotifyUrl: track.link || '',
              albumName: album?.title,
            });
          }
        }
      } catch (e) {
        console.error(`Error fetching album ${album.id}:`, e);
      }
    });

    await Promise.all(albumFetchPromises);
    console.log(`✓ Fetched ${allCandidates.length} total candidate tracks from all albums`);

    if (allCandidates.length === 0) {
      console.log(`No valid tracks found`);
      return [];
    }

    // Paso 3: Seleccionar 150 canciones ALEATORIAS del pool completo
    const poolSize = Math.min(150, allCandidates.length);
    const pool: Song[] = [];
    const usedIndices = new Set<number>();

    while (pool.length < poolSize) {
      const randomIndex = Math.floor(Math.random() * allCandidates.length);
      if (!usedIndices.has(randomIndex)) {
        pool.push(allCandidates[randomIndex]);
        usedIndices.add(randomIndex);
      }
    }

    console.log(`✓ Selected ${poolSize} random tracks from ${allCandidates.length} candidates`);

    // Paso 4: Deduplicar y filtrar - Si hay duplicados, buscar reemplazos EN TODAS LAS CANCIONES
    const finalTracks: Song[] = [];
    const seen = new Set<string>();

    for (const track of pool) {
      const trackIdentity = normalizeSongIdentity(track.name, track.artist);

      if (seen.has(trackIdentity)) {
        console.log(`  ⚠️ Duplicate found: "${track.name}" - replacing...`);
        
        // Buscar un reemplazo de allCandidates que no esté duplicado
        let replacement = null;
        const availableIndices = Array.from({ length: allCandidates.length }, (_, i) => i);
        
        while (replacement === null && availableIndices.length > 0) {
          const randomIdx = Math.floor(Math.random() * availableIndices.length);
          const candidateIdx = availableIndices[randomIdx];
          const candidate = allCandidates[candidateIdx];
          const candidateIdentity = normalizeSongIdentity(candidate.name, candidate.artist);

          if (!seen.has(candidateIdentity)) {
            replacement = candidate;
          }
          availableIndices.splice(randomIdx, 1);
        }

        if (replacement) {
          const replacementIdentity = normalizeSongIdentity(replacement.name, replacement.artist);
          seen.add(replacementIdentity);
          finalTracks.push(replacement);
          console.log(`  ✓ Replaced with: "${replacement.name}"`);
          if (finalTracks.length >= limit) break;
        }
      } else {
        seen.add(trackIdentity);
        finalTracks.push(track);
        if (finalTracks.length >= limit) break;
      }
    }

    console.log(`✓ Deduplication complete: ${finalTracks.length} tracks after filtering`);

    // Paso 5: Shuffle final - orden aleatorio para esta partida
    for (let i = finalTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalTracks[i], finalTracks[j]] = [finalTracks[j], finalTracks[i]];
    }

    const resultTracks = finalTracks.slice(0, limit);
    console.log(`✓ Final result: ${resultTracks.length} shuffled tracks for this game`);
    console.log(`=== PARTIDA LISTA ===\n`);

    return resultTracks;
  } catch (error) {
    console.error('Error in getAllTracksFromArtistAlbums:', error);
    return [];
  }
}

export async function searchByArtist(artistName: string, limit: number = 50): Promise<Song[]> {
  try {
    console.log(`[searchByArtist] Searching: ${artistName}`);
    
    // Buscar artista - revisar más resultados para encontrar mejor match
    const artistSearch = await axios.get(`${DEEZER_API}/search/artist`, {
      params: {
        q: artistName,
        limit: 50  // Aumentado a 50 para evaluar múltiples opciones
      }
    });

    if (!artistSearch.data.data || artistSearch.data.data.length === 0) {
      console.log(`[searchByArtist] ❌ No results for: ${artistName}`);
      return [];
    }

    // NUEVA LÓGICA: Ordenar por followers (descendente), luego verificar match
    const artistsByFollowers = artistSearch.data.data.sort((a: any, b: any) => {
      return (b.nb_fan || 0) - (a.nb_fan || 0);
    });

    let bestArtist = null;
    let bestScore = -1;

    // MÁS ESTRICTO: Búsqueda de artista específica - threshold 0.85 (match muy exacto)
    for (const candidate of artistsByFollowers) {
      const score = calculateMatchScore(artistName, candidate.name);
      if (score >= 0.85) {
        bestArtist = candidate;
        bestScore = score;
        break;  // Toma el primero que cumpla (máximo followers en ese rango)
      }
    }

    if (!bestArtist) {
      console.log(`[searchByArtist] ❌ No matches found for: ${artistName}`);
      return [];
    }

    console.log(`[searchByArtist] ✓ Best match: "${bestArtist.name}" (followers: ${bestArtist.nb_fan || 0}, score: ${bestScore.toFixed(2)})`);

    // Obtener TOP TRACKS directamente
    const topTracksUrl = `${DEEZER_API}/artist/${bestArtist.id}/top?limit=${limit}`;
    const tracksResponse = await axios.get(topTracksUrl);
    
    if (!tracksResponse.data.data || tracksResponse.data.data.length === 0) {
      console.log(`[searchByArtist] ❌ No tracks found for: ${bestArtist.name}`);
      return [];
    }

    // Convertir a formato Song - sin filtros adicionales
    const songs: Song[] = tracksResponse.data.data
      .map((track: any) => ({
        id: track.id.toString(),
        name: track.title,
        artist: track.artist.name,
        previewUrl: track.preview || null,
        albumArt: track.album?.cover_medium || track.album?.cover_big || '',
        spotifyUrl: '',
        releaseYear: extractYearFromDate(track.release_date),
        albumName: track.album?.title
      }))
      .filter((song: Song) => song.previewUrl !== null && song.previewUrl.trim() !== '');

    console.log(`[searchByArtist] ✓ Got ${songs.length} tracks from "${bestArtist.name}"`);
    return songs;
  } catch (error) {
    console.error('Error in searchByArtist:', error);
    return [];
  }
}

export async function searchByGenre(genre: string, limit: number = 2000): Promise<Song[]> {
  try {
    console.log(`🎵 [searchByGenre] Searching: ${genre}`);
    
    const genreKey = genre.toLowerCase();
    let genreArtists = GENRE_ARTISTS[genreKey];
    
    if (!genreArtists) {
      console.log(`Genre key '${genreKey}' not found. Trying variants...`);
      const altKey1 = genreKey.replace(/-/g, ' ');
      const altKey2 = genreKey.replace(/ /g, '-');
      genreArtists = GENRE_ARTISTS[altKey1] || GENRE_ARTISTS[altKey2];
    }
    
    if (!genreArtists || genreArtists.length === 0) {
      console.error(`❌ ERROR: No artists found for genre: ${genre}`);
      return [];
    }

    console.log(`✓ Found ${genreArtists.length} artists for ${genre}`);
    const artistsToUse = genreArtists.slice(0, MAX_ARTISTS_PER_GENRE);
    console.log(`Using ${artistsToUse.length} artists (max: ${MAX_ARTISTS_PER_GENRE})`);

    let allTracks: Song[] = [];
    const seen = new Set<string>();
    let successfulArtistsCount = 0;

    // Para cada artista, buscar y obtener sus top tracks
    for (const artistName of artistsToUse) {
      if (allTracks.length >= limit) break;

      try {
        // Buscar artista - revisar más resultados para encontrar mejor match
        const artistSearch = await axios.get(`${DEEZER_API}/search/artist`, {
          params: {
            q: artistName,
            limit: 50
          }
        });

        if (!artistSearch.data.data || artistSearch.data.data.length === 0) {
          console.warn(`✗ ${artistName}: No results`);
          continue;
        }

        // NUEVA LÓGICA: Ordenar por followers (descendente), tomar El PRIMERO con score >= 0.4
        const artistsByFollowers = artistSearch.data.data.sort((a: any, b: any) => {
          return (b.nb_fan || 0) - (a.nb_fan || 0);
        });

        let bestArtist = null;
        let bestScore = -1;

        // MÁS ESTRICTO: Búsqueda de género - threshold 0.80 (requiere match cercano)
        for (const candidate of artistsByFollowers) {
          const score = calculateMatchScore(artistName, candidate.name);
          if (score >= 0.80) {
            bestArtist = candidate;
            bestScore = score;
            break;
          }
        }

        if (!bestArtist) {
          console.warn(`✗ ${artistName}: No matches found (threshold: 0.80)`);
          continue;
        }

        console.log(`✓ ${artistName} → matched to "${bestArtist.name}" (followers: ${bestArtist.nb_fan || 0})`);
        successfulArtistsCount++;

        // Obtener TOP TRACKS directamente
        const remainingSlots = limit - allTracks.length;
        const artistsRemaining = artistsToUse.length - artistsToUse.indexOf(artistName);
        const tracksPerArtist = Math.ceil(remainingSlots / Math.max(1, artistsRemaining));
        
        const topTracksUrl = `${DEEZER_API}/artist/${bestArtist.id}/top?limit=${tracksPerArtist}`;
        const tracksResponse = await axios.get(topTracksUrl);
        
        if (!tracksResponse.data.data || tracksResponse.data.data.length === 0) {
          console.log(`  No tracks for: ${bestArtist.name}`);
          continue;
        }

        // Convertir a formato Song
        let addedCount = 0;
        for (const track of tracksResponse.data.data) {
          if (allTracks.length >= limit) break;
          if (!track.preview || track.preview.trim() === '') continue;
          
          const songId = track.id.toString();
          if (seen.has(songId)) continue;
          
          const song: Song = {
            id: songId,
            name: track.title,
            artist: track.artist.name,
            previewUrl: track.preview,
            albumArt: track.album?.cover_medium || track.album?.cover_big || '',
            spotifyUrl: '',
            releaseYear: extractYearFromDate(track.release_date),
            albumName: track.album?.title
          };
          
          seen.add(songId);
          allTracks.push(song);
          addedCount++;
        }

        console.log(`  ✓ Added ${addedCount} tracks from ${bestArtist.name}`);

      } catch (e) {
        console.error(`✗ Error with artist "${artistName}":`, e);
        continue;
      }
    }

    if (allTracks.length === 0) {
      console.error(`❌ ERROR: No tracks found for genre: ${genre}`);
      return [];
    }

    console.log(`✓ Got ${allTracks.length} total tracks from ${successfulArtistsCount} artists`);
    return allTracks;
  } catch (error) {
    console.error('Error in searchByGenre:', error);
    return [];
  }
}

/**
 * VERSUS GENRE MODE: Select random artists and get 1 random track from their top 10
 * Ensures no artist appears twice in a single game
 */
export async function searchGenreForVersus(genre: string, songCount: number = 20): Promise<Song[]> {
  try {
    console.log(`[VERSUS MODE] Fetching ${songCount} songs from ${genre} (1 per random artist)`);

    const genreKey = genre.toLowerCase();
    let genreArtists = GENRE_ARTISTS[genreKey];
    
    if (!genreArtists) {
      const altKey1 = genreKey.replace(/-/g, ' ');
      const altKey2 = genreKey.replace(/ /g, '-');
      genreArtists = GENRE_ARTISTS[altKey1] || GENRE_ARTISTS[altKey2];
    }

    if (!genreArtists || genreArtists.length === 0) {
      console.error(`[VERSUS MODE] No artists found for genre: ${genre}`);
      return [];
    }

    // Limit to MAX_ARTISTS_PER_GENRE
    const availableArtists = genreArtists.slice(0, MAX_ARTISTS_PER_GENRE);
    const artistsToSelect = Math.min(songCount, availableArtists.length);
    
    // Shuffle and select random artists
    const shuffledArtists = fisherYatesShuffle([...availableArtists]).slice(0, artistsToSelect);
    console.log(`[VERSUS MODE] Selected ${shuffledArtists.length} random artists`);

    const versusSongs: Song[] = [];
    const seen = new Set<string>();

    for (const artistName of shuffledArtists) {
      try {
        // Buscar artista - revisar más resultados para encontrar mejor match
        const artistSearch = await axios.get(`${DEEZER_API}/search/artist`, {
          params: {
            q: artistName,
            limit: 50
          }
        });

        if (!artistSearch.data.data || artistSearch.data.data.length === 0) {
          console.warn(`[VERSUS MODE] ✗ ${artistName}: No results`);
          continue;
        }

        // NUEVA LÓGICA: Ordenar por followers (descendente), tomar el PRIMERO con score >= 0.4
        const artistsByFollowers = artistSearch.data.data.sort((a: any, b: any) => {
          return (b.nb_fan || 0) - (a.nb_fan || 0);
        });

        let bestArtist = null;

        // MÁS ESTRICTO: Búsqueda de género - threshold 0.80 (requiere match cercano)
        for (const candidate of artistsByFollowers) {
          const score = calculateMatchScore(artistName, candidate.name);
          if (score >= 0.80) {
            bestArtist = candidate;
            break;
          }
        }

        if (!bestArtist) {
          console.warn(`[VERSUS MODE] ✗ Artist not found: ${artistName} (threshold: 0.80)`);
          continue;
        }

        // Get top 10 tracks directly from API
        const tracksResponse = await axios.get(`${DEEZER_API}/artist/${bestArtist.id}/top?limit=10`);
        
        if (!tracksResponse.data.data || tracksResponse.data.data.length === 0) {
          console.warn(`[VERSUS MODE] ✗ No tracks for artist: ${bestArtist.name}`);
          continue;
        }

        // Get valid tracks (with preview URLs)
        const validTracks = tracksResponse.data.data.filter((t: any) => t.preview && t.preview.trim() !== '');
        
        if (validTracks.length === 0) {
          console.warn(`[VERSUS MODE] ✗ No tracks with preview for artist: ${bestArtist.name}`);
          continue;
        }

        // Randomly select 1 from the top tracks
        const randomTrackData = validTracks[Math.floor(Math.random() * validTracks.length)];
        
        // Check for duplicates using song ID
        const trackId = randomTrackData.id.toString();
        if (seen.has(trackId)) {
          console.log(`[VERSUS MODE] ⊘ Skipped duplicate: ${bestArtist.name} - ${randomTrackData.title}`);
          continue;
        }

        // Convert to Song format
        const song: Song = {
          id: trackId,
          name: randomTrackData.title,
          artist: randomTrackData.artist.name,
          previewUrl: randomTrackData.preview,
          albumArt: randomTrackData.album?.cover_medium || randomTrackData.album?.cover_big || '',
          spotifyUrl: '',
          releaseYear: extractYearFromDate(randomTrackData.release_date),
          albumName: randomTrackData.album?.title
        };
        
        seen.add(trackId);
        versusSongs.push(song);
        console.log(`[VERSUS MODE] ✓ Added 1/10 from ${bestArtist.name}: "${song.name}"`);

      } catch (error) {
        console.error(`[VERSUS MODE] Error with artist "${artistName}":`, error);
        continue;
      }
    }

    console.log(`[VERSUS MODE] ✅ Loaded ${versusSongs.length} songs from unique artists`);
    return versusSongs;
  } catch (error) {
    console.error('[VERSUS MODE] Error in searchGenreForVersus:', error);
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
  const artistNames = [
    'Bruno Mars',
    'Bad Bunny',
    'The Weeknd',
    'Rihanna',
    'Taylor Swift',
    'Justin Bieber',
    'Lady Gaga',
    'Coldplay',
    'Billie Eilish',
    'Drake',
    'J Balvin',
    'Ariana Grande',
    'Ed Sheeran',
    'David Guetta',
    'Shakira',
    'Kendrick Lamar',
    'Maroon 5',
    'Eminem',
    'SZA',
    'Calvin Harris'
  ];

  try {
    // Buscar imagen para cada artista en Deezer
    const artists = await Promise.all(
      artistNames.slice(0, limit).map(async (name) => {
        try {
          const response = await axios.get(`${DEEZER_API}/search/artist`, {
            params: { q: name, limit: 1 }
          });
          
          if (response.data.data && response.data.data.length > 0) {
            const artist = response.data.data[0];
            return {
              name: name,
              image: artist.picture_medium || artist.picture || artist.picture_small || ''
            };
          }
        } catch (err) {
          // Ignorar errores individuales y devolver sin imagen
        }
        
        return { name: name, image: '' };
      })
    );

    return artists;
  } catch (error) {
    console.error('Error getting top artists:', error);
    return defaultTopArtists().slice(0, limit);
  }
}

function defaultTopArtists(): Array<{name: string; image: string}> {
  return [
    { name: 'Bruno Mars', image: '' },
    { name: 'Bad Bunny', image: '' },
    { name: 'The Weeknd', image: '' },
    { name: 'Rihanna', image: '' },
    { name: 'Taylor Swift', image: '' },
    { name: 'Justin Bieber', image: '' },
    { name: 'Lady Gaga', image: '' },
    { name: 'Coldplay', image: '' },
    { name: 'Billie Eilish', image: '' },
    { name: 'Drake', image: '' },
    { name: 'J Balvin', image: '' },
    { name: 'Ariana Grande', image: '' },
    { name: 'Ed Sheeran', image: '' },
    { name: 'David Guetta', image: '' },
    { name: 'Shakira', image: '' },
    { name: 'Kendrick Lamar', image: '' },
    { name: 'Maroon 5', image: '' },
    { name: 'Eminem', image: '' },
    { name: 'SZA', image: '' },
    { name: 'Calvin Harris', image: '' }
  ];
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

export async function getTopGenres(limit: number = 20): Promise<string[]> {
  // Obtener solo los géneros que están en GENRE_ARTISTS
  const genres = Object.keys(GENRE_ARTISTS);
  console.log(`Returning ${Math.min(genres.length, limit)} genres from GENRE_ARTISTS`);
  return genres.slice(0, limit);
}

export async function searchGenres(query: string): Promise<string[]> {
  // Buscar géneros solo en GENRE_ARTISTS
  if (!query || query.length < 1) {
    return getTopGenres(30);
  }

  console.log(`Searching genres for query: ${query}`);
  
  // Filtrar géneros según la búsqueda
  const genres = Object.keys(GENRE_ARTISTS)
    .filter((g: string) => g.includes(query.toLowerCase()));
  
  console.log(`Found ${genres.length} genres matching "${query}"`);
  return genres;
}
