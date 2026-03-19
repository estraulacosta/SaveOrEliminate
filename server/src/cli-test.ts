import * as deezer from './deezer';

interface TestConfig {
  mode: 'genre' | 'artist' | 'year';
  value: string;
  totalRounds: number;
  songsPerRound: number;
}

async function runTest(config: TestConfig) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 SAVE OR ELIMINATE - CLI TEST TOOL');
  console.log('='.repeat(80));
  console.log(`Mode: ${config.mode.toUpperCase()}`);
  console.log(`Value: ${config.value}`);
  console.log(`Total Rounds: ${config.totalRounds}`);
  console.log(`Songs per Round: ${config.songsPerRound}`);
  console.log(`Total Songs Needed: ${config.totalRounds * config.songsPerRound}`);
  console.log('='.repeat(80) + '\n');

  try {
    let songs: any[] = [];

    // Fetch songs based on mode
    if (config.mode === 'genre') {
      console.log(`🎸 Fetching songs for genre: ${config.value}...`);
      songs = await deezer.searchByGenre(config.value, config.totalRounds * config.songsPerRound);
    } else if (config.mode === 'artist') {
      console.log(`🎤 Fetching songs for artist: ${config.value}...`);
      songs = await deezer.searchByArtist(config.value, config.totalRounds * config.songsPerRound);
    } else if (config.mode === 'year') {
      const year = parseInt(config.value);
      console.log(`📅 Fetching songs for year: ${year}...`);
      songs = await deezer.searchByYear(year, config.totalRounds * config.songsPerRound);
    }

    console.log(`\n✅ TOTAL SONGS FOUND: ${songs.length}\n`);

    // Analyze artist distribution
    const artistMap = new Map<string, any[]>();
    for (const song of songs) {
      if (!artistMap.has(song.artist)) {
        artistMap.set(song.artist, []);
      }
      artistMap.get(song.artist)!.push(song);
    }

    console.log(`📋 ARTIST BREAKDOWN (Total Artists: ${artistMap.size}):`);
    console.log('-'.repeat(80));
    const sortedArtists = Array.from(artistMap.entries())
      .sort((a, b) => b[1].length - a[1].length);

    for (const [artist, artistSongs] of sortedArtists) {
      console.log(`  ${artist.padEnd(30)} → ${artistSongs.length} canciones`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎮 ROUND SIMULATION');
    console.log('='.repeat(80) + '\n');

    // Simulate rounds - select songs without repeating
    const usedSongIds = new Set<string>();
    
    for (let round = 0; round < config.totalRounds; round++) {
      const currentRound = round + 1;
      
      // Get available songs (not yet used)
      const availableSongs = songs.filter(s => !usedSongIds.has(s.id));
      
      if (availableSongs.length < config.songsPerRound) {
        console.log(`❌ Round ${currentRound}: Not enough songs! (${availableSongs.length} available < ${config.songsPerRound} needed)`);
        break;
      }
      
      // Select songs for this round
      const roundSongs = availableSongs.sort(() => Math.random() - 0.5).slice(0, config.songsPerRound);
      
      // Mark as used
      roundSongs.forEach(s => usedSongIds.add(s.id));
      
      console.log(`🎵 Round ${currentRound}/${config.totalRounds}`);
      for (const song of roundSongs) {
        console.log(`  • ${song.artist.padEnd(25)} → "${song.name}"`);
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('✨ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 4) {
  console.log(`
Usage: npx ts-node src/cli-test.ts <mode> <value> <totalRounds> <songsPerRound>

Examples:
  npx ts-node src/cli-test.ts genre rock 5 3
  npx ts-node src/cli-test.ts genre pop 20 6
  npx ts-node src/cli-test.ts artist "The Beatles" 5 3
  npx ts-node src/cli-test.ts year 1990 10 4
  `);
  process.exit(1);
}

const config: TestConfig = {
  mode: args[0] as any,
  value: args[1],
  totalRounds: parseInt(args[2]),
  songsPerRound: parseInt(args[3]),
};

runTest(config).catch(console.error);
