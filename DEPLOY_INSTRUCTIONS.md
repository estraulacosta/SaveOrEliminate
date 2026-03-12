# Save or Eliminate - Guía de Despliegue

## 📦 Preparación

Tu proyecto ya está listo para desplegar. Sigue estos pasos:

## 1️⃣ Instalar Git (si no lo tienes)

Descarga e instala Git desde: https://git-scm.com/download/win

## 2️⃣ Subir a GitHub

```bash
# Abre una nueva terminal PowerShell después de instalar Git
cd C:\Users\Usuario\Documents\SaveOrEliminate

# Inicializar repositorio
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit - Save or Eliminate Game"

# Crear repositorio en GitHub (ve a https://github.com/new)
# Nómbralo: save-or-eliminate

# Conectar y pushear (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/save-or-eliminate.git
git branch -M main
git push -u origin main
```

## 3️⃣ Desplegar el BACKEND en Railway

1. Ve a https://railway.app/
2. Login con GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Selecciona tu repositorio
5. Railway detectará automáticamente el proyecto
6. En Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
7. En "Variables":
   - Agrega: `YOUTUBE_API_KEY` = `AIzaSyCEaTVzcsayN0LZ2nkGZP52UgGyLNS1WJk`
8. **Copia la URL generada** (ejemplo: `https://save-or-eliminate-production.up.railway.app`)

## 4️⃣ Actualizar URL del Backend en el Cliente

Edita el archivo `client/src/socket.ts`:

```typescript
import { io } from 'socket.io-client';

// Reemplaza con la URL de Railway que copiaste
const socket = io('https://TU-APP.up.railway.app');

export { socket };
```

Luego haz commit y push:
```bash
git add .
git commit -m "Update backend URL"
git push
```

## 5️⃣ Desplegar el FRONTEND en Vercel

1. Ve a https://vercel.com/
2. Login con GitHub
3. Click "Add New..." → "Project"
4. Importa tu repositorio `save-or-eliminate`
5. Configuración:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Click "Deploy"
7. ¡Listo! Vercel te dará una URL como: `https://save-or-eliminate.vercel.app`

## 🎮 ¡A JUGAR!

Tu juego estará disponible en:
- **Frontend**: https://save-or-eliminate.vercel.app
- **Backend**: https://tu-app.up.railway.app

---

## 🔄 Para actualizar después

```bash
# Hacer cambios en el código
git add .
git commit -m "Descripción de cambios"
git push

# Vercel y Railway se actualizarán automáticamente
```

## 🆓 Alternativa: Render.com para el Backend

Si Railway no funciona, usa Render.com:

1. Ve a https://render.com/
2. "New +" → "Web Service"
3. Conecta tu repositorio
4. Configuración:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Variables de entorno:
   - `YOUTUBE_API_KEY`: `AIzaSyCEaTVzcsayN0LZ2nkGZP52UgGyLNS1WJk`
