import { io, Socket } from 'socket.io-client';

// Conectar al servidor: en producción usa el mismo dominio, en desarrollo usa localhost:3001
const getServerUrl = () => {
  // En desarrollo local (localhost), conecta al puerto 3001
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:3001`;
  }
  
  // En red local (IP privada), conecta al mismo host en puerto 3001
  if (window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.') || window.location.hostname.startsWith('26.')) {
    return `http://${window.location.hostname}:3001`;
  }
  
  // En producción (Railway o cualquier servidor), usa el mismo origen
  return window.location.origin;
};

export const socket: Socket = io(getServerUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: Infinity
});
