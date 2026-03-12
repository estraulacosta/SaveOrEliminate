# Solución: Error 403 de YouTube API

## Problema
La API de YouTube está devolviendo error 403:
- **Cuota diaria excedida** (10,000 unidades/día)
- **API key inválida o con restricciones**

## Solución Rápida

### Opción 1: Crear Nueva API Key

1. Ve a https://console.cloud.google.com/apis/credentials
2. Selecciona tu proyecto
3. Click en "Crear credenciales" → "Clave de API"
4. **IMPORTANTE**: No agregues restricciones por ahora
5. Copia la nueva API key
6. Actualiza `server/.env`:
   ```
   YOUTUBE_API_KEY=TU_NUEVA_CLAVE_AQUI
   ```

### Opción 2: Verificar Cuota

1. Ve a https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
2. Revisa cuánta cuota has usado hoy
3. Si está al 100%, espera hasta mañana (se resetea a medianoche PT)

### Opción 3: Habilitar la API

1. Ve a https://console.cloud.google.com/apis/library/youtube.googleapis.com
2. Asegúrate de que diga **"API habilitada"**
3. Si no está habilitada, haz click en **"HABILITAR"**

## Optimizaciones Implementadas

Mientras tanto, he optimizado el código:

✅ **Caché de 5 minutos** - Reduce llamadas repetidas
✅ **Solo 1 llamada a la API** en vez de 2
✅ **Filtro `videoDuration: medium`** - Excluye shorts automáticamente
✅ **Mejor manejo de errores** - Muestra el problema específico

## Reiniciar el Servidor

Después de actualizar la API key:

```bash
# Detener servidor
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Reiniciar
cd server
npm start
```

## Alternativa Temporal: API Key de Prueba

Si necesitas una prueba rápida, puedes crear un nuevo proyecto en Google Cloud:
1. https://console.cloud.google.com/
2. Crear nuevo proyecto
3. Habilitar YouTube Data API v3
4. Crear API Key SIN restricciones
5. Usar esa key temporalmente
