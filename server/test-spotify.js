import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testSpotify() {
  try {
    // Get token
    const auth = Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64');
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', 
      'grant_type=client_credentials', 
      { headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    const token = tokenRes.data.access_token;
    console.log('✅ Token obtenido\n');

    // Test 1: Búsqueda simple
    console.log('Test 1: Búsqueda simple "Olivia Rodrigo"');
    const test1 = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: 'Olivia Rodrigo', type: 'track', limit: 5, market: 'US' }
    });
    console.log(`Resultados: ${test1.data.tracks.items.length}`);
    console.log(`Con preview: ${test1.data.tracks.items.filter(t => t.preview_url).length}`);
    if (test1.data.tracks.items[0]) {
      console.log(`Ejemplo: ${test1.data.tracks.items[0].name} - Preview: ${test1.data.tracks.items[0].preview_url ? 'SI' : 'NO'}\n`);
    }

    // Test 2: Búsqueda por género
    console.log('Test 2: Género "pop"');
    const test2 = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: 'genre:pop', type: 'track', limit: 5, market: 'US' }
    });
    console.log(`Resultados: ${test2.data.tracks.items.length}`);
    console.log(`Con preview: ${test2.data.tracks.items.filter(t => t.preview_url).length}\n`);

    // Test 3: Búsqueda por año
    console.log('Test 3: Año 2023');
    const test3 = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: 'year:2023', type: 'track', limit: 5, market: 'US' }
    });
    console.log(`Resultados: ${test3.data.tracks.items.length}`);
    console.log(`Con preview: ${test3.data.tracks.items.filter(t => t.preview_url).length}\n`);

  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.statusText);
    console.error('Query:', error.config?.params);
  }
}

testSpotify();
