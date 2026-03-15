import { io, Socket } from 'socket.io-client';

// Conectar al servidor: en producción usa la variable de entorno, en desarrollo usa localhost
const getServerUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  
  const isProduction = !window.location.hostname.includes('localhost') && 
                       !window.location.hostname.includes('127.0.0.1');
  
  if (isProduction) {
    // En producción, usa la variable de entorno VITE_API_URL
    // Si no está configurada, intenta usar el mismo dominio
    return (import.meta as any).env.VITE_API_URL || window.location.origin;
  }
  
  return 'http://localhost:3001';
};

export const socket: Socket = io(getServerUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: Infinity
});
