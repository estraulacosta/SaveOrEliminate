# Deployment Guide

## Frontend (Vercel)

1. Instala Vercel CLI:
```bash
npm install -g vercel
```

2. Desde la raíz del proyecto, ejecuta:
```bash
vercel
```

3. Sigue las instrucciones:
   - Set up and deploy? **Y**
   - Which scope? (selecciona tu cuenta)
   - Link to existing project? **N**
   - Project name? **save-or-eliminate**
   - In which directory is your code located? **.**
   - Want to override settings? **N**

## Backend (Railway.app - GRATIS)

1. Ve a https://railway.app/
2. Haz login con GitHub
3. Click en "New Project" → "Deploy from GitHub repo"
4. Selecciona el repositorio
5. Configura:
   - Root Directory: `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
6. Agrega variables de entorno:
   - `YOUTUBE_API_KEY`: tu API key de YouTube

7. Copia la URL del backend (ejemplo: `https://tu-app.railway.app`)

## Actualizar URL del Backend

En `client/src/socket.ts`, cambia:
```typescript
const socket = io('https://tu-app.railway.app');
```

Luego redeploya a Vercel:
```bash
vercel --prod
```

## Alternativa: Render.com

1. Ve a https://render.com/
2. New → Web Service
3. Conecta tu repositorio
4. Configuración:
   - Root Directory: `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: Node
5. Agrega variable de entorno `YOUTUBE_API_KEY`
