# 🚂 Railway Setup Guide - Save or Eliminate

Configuré tu proyecto para Railway. Aquí está lo que necesitas hacer:

## ✅ Ya Hecho (Automatizado)

- ✅ Servidor actualizado para servir el cliente estático
- ✅ CORS configurado dinámicamente para Railway
- ✅ `railway.json` configurado para construir todo automáticamente
- ✅ Cliente y servidor compilados exitosamente

## 🚀 Pasos en Railway (Takes 2 minutes)

### 1. Ve a Dashboard de Railway
- Abre https://railway.app/dashboard

### 2. Nuevo Proyecto
- Click en **"Create a New Project"**
- Selecciona **"Deploy from GitHub"**
- Selecciona tu repositorio: `SaveOrEliminate`

### 3. Espera la Deploy
Railway automáticamente:
- ✅ Detecta `railway.json`
- ✅ Construye cliente (`npm run build`)
- ✅ Construye servidor (`npm run build`)
- ✅ Arranca el servidor
- ✅ Te da una URL pública (ej: `https://save-or-eliminate-prod.up.railway.app`)

### 4. Listo! ✨
Tu app estará disponible en todos lados en 3-5 minutos

---

## 📋 Lo Que Railway Hace Automático

```
railway.json:
├─ Build: Construye cliente en dist/ + servidor en dist/
├─ Run: ejecuta `cd server && npm start`
├─ Sirve archivos estáticos del cliente desde /
└─ Pasa PORT automático al servidor (no tuvo que configurar nada)
```

## 🔄 Cómo Actualizar

Cada vez que hagas push a GitHub:
1. Railway detecta automáticamente los cambios
2. Recompila y redeploy en ~2 minutos
3. Tu app se actualiza sin downtime

## 🎮 Jugar en Línea

Una vez deployado:
- Comparte el URL: `https://save-or-eliminate-prod.up.railway.app` (o el tuyo)
- Allá pueden crear salas y jugar con amigos
- Y funcionará perfectamente sin configurar nada más

## ❓ Si Algo Falla

### Error de Build
- Ve a Railway Dashboard → Project → Deployment Logs
- Ver qué error sale exactamente

### Conexión del Cliente
- El cliente automáticamente se conecta a `window.location.origin` (Railway URL)
- Sin necesidad de variables de entorno

### Port Issues
- Railway automáticamente asigna un puerto
- Nuestro servidor está configurado para usarlo

---

## 📝 Notas Técnicas

- **Cliente + Servidor en un solo deploy**: Más barato y más rápido
- **Sin configuración manual**: railway.json lo hace todo
- **CORS dinámico**: Se adapta automáticamente en producción
- **WebSockets**: Railway soporta Socket.io perfectamente
- **Gratis**: Con $5/mes de crédito eres bueno para proyectos pequeños

¡Listo! Solo conecta el repo en Railway y espera 3-5 minutos. 🚀
