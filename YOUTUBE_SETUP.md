# YouTube API Setup - Configuración Rápida

## ✅ Ventajas de YouTube Music
- **GRATUITO** - No requiere cuenta premium
- **API gratuita** - YouTube Data API v3 tiene cuota diaria gratis
- **Acceso completo** - Toda la música de YouTube disponible
- **Fácil integración** - Solo necesitas API Key

## 🚀 Pasos para obtener tu API Key (5 minutos)

### 1. Crear proyecto en Google Cloud Console
1. Ve a: https://console.cloud.google.com/
2. Click en "Seleccionar proyecto" → "Nuevo proyecto"
3. Nombre: `SaveOrEliminate` (o el que quieras)
4. Click "Crear"

### 2. Habilitar YouTube Data API v3
1. En el menú lateral: APIs y servicios → Biblioteca
2. Busca: **YouTube Data API v3**
3. Click en el resultado
4. Click botón **"HABILITAR"**

### 3. Crear API Key
1. En el menú lateral: APIs y servicios → Credenciales
2. Click botón **"+ CREAR CREDENCIALES"**
3. Selecciona: **Clave de API**
4. Se generará tu API Key (algo como: `AIzaSyB...`)
5. ¡Copia la API Key!

### 4. Configurar en tu app
Abre el archivo `/server/.env` y agrega:

```env
YOUTUBE_API_KEY=TU_API_KEY_AQUI
```

### 5. ¡Listo!
Ya puedes usar el juego con YouTube Music. La música se reproducirá automáticamente.

## 📊 Límites de cuota (gratis)
- **10,000 unidades por día** (gratis)
- Cada búsqueda = 100 unidades
- **= 100 búsquedas por día GRATIS**
- Suficiente para múltiples partidas

## 🎵 Cómo funciona
1. El backend busca videos en YouTube con la API
2. El frontend reproduce los videos en modo embed (10 segundos cada uno)
3. Los jugadores votan igual que antes
4. ¡Sin necesidad de login ni cuentas premium!

## 🔒 Seguridad (Opcional)
Si quieres restringir tu API Key:
1. En Google Cloud Console → Credenciales → Tu API Key
2. Click en "Restricciones de clave"
3. Restricciones de aplicación: **Direcciones IP** → Agrega tu IP
4. O restricción de API: Solo **YouTube Data API v3**

## 💡 Diferencias vs Spotify
- ✅ No requiere OAuth ni login
- ✅ No requiere cuenta premium  
- ✅ Totalmente gratuito
- ✅ Más resultados de búsqueda
- ⚠️ Los videos incluyen publicidad (a veces)
- ⚠️ Algunos videos pueden estar bloqueados por región

## ❓ ¿Problemas?
Si ves error "Invalid API Key":
1. Verifica que copiaste bien la key en .env
2. Espera 1-2 minutos (la API tarda en activarse)
3. Reinicia el servidor: `npm run dev`

Si ves "Quota exceeded":
- Has alcanzado el límite diario (10,000 unidades)
- Se resetea a medianoche (hora del Pacífico)
- Considera crear otra API Key de respaldo

## 🎮 ¡A jugar!
Tu juego ahora funciona con YouTube Music sin necesidad de cuentas premium.
