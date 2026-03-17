import { io, Socket } from 'socket.io-client';

// Conectar al servidor: en producción usa la variable de entorno, en desarrollo usa localhost o IP local
const getServerUrl = () => {
  if (typeof window === 'undefined') return 'http://192.168.1.50:3001';
  
  const isProduction = !window.location.hostname.includes('localhost') && 
                       !window.location.hostname.includes('127.0.0.1') &&
                       !window.location.hostname.includes('192.168');
  
  if (isProduction) {
    // En producción, usa la variable de entorno VITE_API_URL
    // Si no está configurada, intenta usar el mismo dominio
    return (import.meta as any).env.VITE_API_URL || window.location.origin;
  }
  
  // En desarrollo, asume que estamos en la IP local
  return `http://${window.location.hostname}:3001`;
};

export const socket: Socket = io(getServerUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: Infinity
});
