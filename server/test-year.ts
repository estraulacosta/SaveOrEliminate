import { searchByYear } from './src/deezer.ts';

async function main() {
  const years = [2000, 2001, 2002, 2003, 2004, 2020, 2024, 2026];
  for (const year of years) {
    const start = Date.now();
    const songs = await searchByYear(year, 25);
    console.log(`YEAR=${year} COUNT=${songs.length} TIME_MS=${Date.now() - start}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
