# 🎵 Save or Eliminate - Juego Musical Multijugador

Un juego multijugador donde escuchas canciones y votas para salvar o eliminar.

## ⚡ INICIO RÁPIDO (5 minutos)

### 1️⃣ Obtener API Key de YouTube (GRATIS)

1. Ve a: https://console.cloud.google.com/
2. Crear proyecto nuevo: "SaveOrEliminate"
3. Habilitar: **YouTube Data API v3**
4. Crear credenciales: **Clave de API**
5. Copiar tu API Key

**Ver guía detallada:** [YOUTUBE_SETUP.md](./YOUTUBE_SETUP.md)

### 2️⃣ Configurar API Key

Edita `/server/.env`:
```env
YOUTUBE_API_KEY=TU_API_KEY_AQUI
```

### 3️⃣ Instalar dependencias

```bash
# Backend
cd server
npm install

# Frontend  
cd ../client
npm install
```

### 4️⃣ Ejecutar el juego

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

### 5️⃣ Jugar

1. Abre: http://localhost:5173
2. Crea una sala
3. ¡Juega! 🎮

## 🎮 Características

- ✅ **Modo Solo** - Juega tú solo
- ✅ **Multijugador** - Hasta 10 jugadores
- ✅ **YouTube Music** - Miles de canciones gratis
- ✅ **Sin cuenta premium** - Totalmente gratuito
- ✅ **Previews de 10s** - Reproduce videos automáticamente
- ✅ **4 modos de juego**:
  - 🎤 Por Artista
  - 🎵 Por Género  
  - 📅 Por Año
  - 📆 Por Década

## 🔧 Tecnologías

- **Backend:** Node.js, Express, Socket.IO, TypeScript
- **Frontend:** React, Vite, TypeScript
- **API:** YouTube Data API v3 (gratis)

## 📊 Límites (Gratuitos)

- **10,000 unidades/día** en YouTube API
- **100 búsquedas/día** = Suficiente para múltiples partidas
- Se resetea a medianoche (hora del Pacífico)

## ❓ Problemas comunes

**Error "Invalid API Key"**
- Verifica que copiaste bien la key en `.env`
- Espera 1-2 minutos (la API tarda en activarse)
- Reinicia el servidor

**No encuentra canciones**
- Verifica que la API Key esté configurada
- Revisa la consola del servidor para errores

**Videos no reproducen**
- Algunos videos están bloqueados por región
- Intenta con otro artista/género

## 📝 Estructura del Proyecto

```
SaveOrEliminate/
├── server/           # Backend Node.js
│   ├── src/
│   │   ├── index.ts        # Socket.IO server
│   │   ├── gameManager.ts  # Lógica del juego
│   │   ├── youtube.ts      # Integración YouTube
│   │   └── types.ts        # TypeScript types
│   └── .env                # API Key aquí
├── client/           # Frontend React
│   └── src/
│       ├── screens/        # 14 pantallas del juego
│       └── socket.ts       # Cliente Socket.IO
└── YOUTUBE_SETUP.md  # Guía detallada YouTube
```

## 🎯 Cómo Jugar

1. **Crear Sala** - El host crea una sala y comparte el código
2. **Unirse** - Jugadores entran con el código
3. **Configurar** - Elegir modo (artista/género/año/década)
4. **Escuchar** - 10 segundos de preview de cada canción
5. **Votar** - Salvar o eliminar canciones
6. **Rondas** - Se eliminan canciones hasta quedar 1
7. **¡Ganador!** - La última canción es la ganadora

## 🚀 Despliegue (Opcional)

Para producción, necesitarás:
- Servidor Node.js (Heroku, Railway, etc.)
- Hosting estático (Vercel, Netlify, etc.)
- Variables de entorno configuradas

## 📜 Licencia

MIT - Usa libremente

---

**¿Necesitas ayuda?** Revisa [YOUTUBE_SETUP.md](./YOUTUBE_SETUP.md) para guía completa de YouTube API
