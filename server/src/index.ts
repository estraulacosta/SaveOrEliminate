import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import * as gameManager from './gameManager.js';
import type { GameConfig, Room } from './types.js';
import * as deezer from './deezer.js';

// Función para serializar Room (remover Maps y Sets que no se pueden enviar por socket.io)
function serializeRoom(room: Room): any {
  return {
    id: room.id,
    players: room.players,
    gameConfig: room.gameConfig,
    currentRound: room.currentRound,
    allSongs: room.allSongs,
    usedSongIds: Array.from(room.usedSongIds || []),
    totalRounds: room.totalRounds,
    isGameStarted: room.isGameStarted,
    createdAt: room.createdAt,
    disconnectedPlayers: room.disconnectedPlayers ? Array.from(room.disconnectedPlayers.entries()) : [],
    waitingPlayers: room.waitingPlayers ? Array.from(room.waitingPlayers) : [],
  };
}

const app = express();
const httpServer = createServer(app);

// Serve static files from client build (relative to current working directory)
const clientBuildPath = path.join(process.cwd(), 'client', 'dist');

// Log startup info
console.log('=== Server Starting ===');
console.log('CWD:', process.cwd());
console.log('Client Build Path:', clientBuildPath);
console.log('Client Build exists:', fs.existsSync(clientBuildPath));
console.log('Index.html exists:', fs.existsSync(path.join(clientBuildPath, 'index.html')));

// CORS configuration for Railway and development
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'https://save-or-eliminate.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://192.168.1.50:5173',
      'http://192.168.1.50:3001',
      'http://192.168.0.15:5173',
      'http://192.168.0.15:3001',
      'http://26.255.231.234:5173',
      'http://26.255.231.234:3001',
    ];
    
    // In production (Railway), allow the same origin
    if (process.env.NODE_ENV === 'production') {
      callback(null, true);
    } else if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true,
};

const io = new Server(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(clientBuildPath));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// SPA fallback: serve index.html for non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  
  // Check if index.html exists
  if (!fs.existsSync(indexPath)) {
    console.error('[SPA] index.html not found at:', indexPath);
    return res.status(404).send('Client build not found. Please ensure client/dist/index.html exists.');
  }
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('[SPA] Error serving index.html:', err.message);
      res.status(500).send('Error loading page');
    }
  });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', ({ playerName, playerAvatar }) => {
    const room = gameManager.createRoom(playerName, socket.id, playerAvatar);
    socket.join(room.id);
    socket.emit('room-created', serializeRoom(room));
    console.log(`Room created: ${room.id} by ${playerName}`);
  });

  socket.on('join-room', ({ roomId, playerName, playerAvatar }) => {
    const room = gameManager.getRoom(roomId);
    if (!room) {
      socket.emit('error', { message: 'La sala no fue encontrada' });
      return;
    }
    
    // Si la partida está EN JUEGO, permitir que se "reúna" si estaba desconectado
    if (room.isGameStarted) {
      // Primero buscar por nombre exacto
      let disconnectedPlayerId: string | null = null;
      
      for (const [id, data] of room.disconnectedPlayers?.entries() || []) {
        if (data.name === playerName) {
          disconnectedPlayerId = id;
          break;
        }
      }
      
      // Si no encuentra por nombre exacto pero hay desconectados, tomar el primero disponible
      // Esto permite que se reconecte con un nombre diferente
      if (!disconnectedPlayerId && room.disconnectedPlayers && room.disconnectedPlayers.size > 0) {
        const firstKey = room.disconnectedPlayers.keys().next().value || null;
        if (firstKey) {
          disconnectedPlayerId = firstKey;
          console.log(`[join-room] Reconnecting ${playerName} with different name, using first disconnected player`);
        }
      }
      
      if (disconnectedPlayerId) {
        // Es una reconexión válida (mismo nombre o con nombre diferente)
        const disconnectedData = room.disconnectedPlayers?.get(disconnectedPlayerId);
        if (disconnectedData) {
          room.disconnectedPlayers?.delete(disconnectedPlayerId);
          room.players.push({
            id: socket.id,
            name: playerName, // Usar el nombre nuevo del jugador
            isHost: disconnectedData.isHost,
            avatar: playerAvatar
          });
          
          // Si hay una ronda activa, marcar jugador como en espera
          if (room.currentRound) {
            gameManager.addWaitingPlayer(roomId, socket.id);
            console.log(`${playerName} reconnected but has round active - marked as waiting`);
          }
          
          socket.join(roomId);
          socket.emit('room-rejoined', serializeRoom(room));
          io.to(roomId).emit('player-reconnected', {
            room: serializeRoom(room),
            message: `${playerName} se ha reconectado`
          });
          console.log(`${playerName} reconnected to active game in room ${roomId}`);
          return;
        }
      }
      
      // No hay desconectados para reconectar
      socket.emit('error', { message: 'Hay una partida en curso. ¿Deseas reconectarte?', canReconnect: true });
      return;
    }
    
    // Partida no activa: unirse normalmente
    const joinedRoom = gameManager.joinRoom(roomId, playerName, socket.id, playerAvatar);
    if (joinedRoom) {
      socket.join(roomId);
      socket.emit('room-joined', serializeRoom(joinedRoom));
      io.to(roomId).emit('player-joined', serializeRoom(joinedRoom));
      console.log(`${playerName} joined room ${roomId}`);
    } else {
      socket.emit('error', { message: 'La sala no fue encontrada o está llena' });
    }
  });

  socket.on('start-game', async ({ roomId, config }: { roomId: string; config: GameConfig }) => {
    console.log('=== START-GAME EVENT ===');
    console.log('RoomId:', roomId);
    console.log('Config received:', JSON.stringify(config, null, 2));

    // Emitir evento de carga inicial
    let totalYears = 1; // Por defecto 1 para otros modos (genre, artist, etc)
    if (config.selectionType === 'year' && config.yearRange) {
      totalYears = config.yearRange.end - config.yearRange.start + 1;
    }
    io.to(roomId).emit('game-loading', { loadedYears: 0, totalYears });

    const success = await gameManager.startGame(roomId, config, (loadedYears, totalYears) => {
      // Emitir progreso de carga año a año
      io.to(roomId).emit('game-loading', { loadedYears, totalYears });
    });

    if (success) {
      console.log('[start-game] StartGame returned success, generating first round...');
      const round = await gameManager.generateRound(roomId);
      if (round) {
        const room = gameManager.getRoom(roomId);
        const currentYear = config.selectionType === 'year' && config.yearRange 
          ? config.yearRange.start 
          : null;
        const currentDecade = config.selectionType === 'decade' && config.decadeRange
          ? config.decadeRange.start
          : null;
        console.log('[start-game] Emitting game-started with totalRounds:', room?.totalRounds);
        io.to(roomId).emit('game-started', { 
          round, 
          totalRounds: room?.totalRounds,
          currentYear,
          currentDecade,
          selectionType: config.selectionType,
          mode: config.mode
        });
        console.log(`Game started in room ${roomId}, round 1/${room?.totalRounds}`);
      } else {
        console.error(`Failed to generate first round in room ${roomId}`);
        io.to(roomId).emit('error', { message: 'Failed to generate first round' });
      }
    } else {
      console.error('[start-game] StartGame FAILED');
      io.to(roomId).emit('game-error', { message: 'No se pudo iniciar la partida.' });
    }
  });


  socket.on('start-timer', ({ roomId }) => {
    gameManager.startTimer(roomId);
    io.to(roomId).emit('timer-started');
  });

  socket.on('start-previews', ({ roomId }) => {
    console.log(`[start-previews] Host starting previews in room ${roomId}`);
    io.to(roomId).emit('previews-started');
  });

  socket.on('start-voting', ({ roomId }) => {
    console.log(`[start-voting] Host starting voting in room ${roomId}`);
    gameManager.startTimer(roomId);
    io.to(roomId).emit('voting-started');
  });

  socket.on('toggle-pause', ({ roomId }) => {
    gameManager.togglePause(roomId);
    const room = gameManager.getRoom(roomId);
    io.to(roomId).emit('timer-paused', { isPaused: room?.currentRound?.isPaused });
  });

  socket.on('submit-vote', ({ roomId, songId }) => {
    const success = gameManager.submitVote(roomId, socket.id, songId);
    const room = gameManager.getRoom(roomId);
    if (room?.currentRound) {
      io.to(roomId).emit('vote-submitted', {
        votes: room.currentRound.votes,
        players: room.players,
        waitingPlayers: room.waitingPlayers ? Array.from(room.waitingPlayers) : [],
        isWaitingPlayer: room.waitingPlayers?.has(socket.id) || false,
      });
    } else if (!success) {
      socket.emit('error', { message: 'No puedes votar - espera a la siguiente ronda' });
    }
  });

  socket.on('next-round', async ({ roomId }) => {
    const round = await gameManager.generateRound(roomId);
    const room = gameManager.getRoom(roomId);
    
    // Limpiar la lista de jugadores esperando para la nueva ronda
    gameManager.clearWaitingPlayers(roomId);
    
    if (round) {
      const currentYear = room?.gameConfig?.selectionType === 'year' && room.gameConfig.yearRange
        ? room.gameConfig.yearRange.start + (round.roundNumber - 1)
        : null;
      const currentDecade = room?.gameConfig?.selectionType === 'decade' && room.gameConfig.decadeRange
        ? room.gameConfig.decadeRange.start + (round.roundNumber - 1) * 10
        : null;
      io.to(roomId).emit('new-round', { 
        round, 
        totalRounds: room?.totalRounds,
        currentYear,
        currentDecade,
        selectionType: room?.gameConfig?.selectionType,
        mode: room?.gameConfig?.mode
      });
      console.log(`New round in room ${roomId}: ${round.roundNumber}/${room?.totalRounds}`);
    } else {
      io.to(roomId).emit('game-finished');
      console.log(`Game finished in room ${roomId}`);
    }
  });

  socket.on('end-game', ({ roomId }) => {
    console.log(`Host ended game in room ${roomId}`);
    io.to(roomId).emit('game-finished');
  });

  socket.on('reset-game', ({ roomId }) => {
    gameManager.resetGame(roomId);
    const room = gameManager.getRoom(roomId);
    if (room) {
      io.to(roomId).emit('game-reset', serializeRoom(room));
    }
  });

  socket.on('get-top-artists', async (callback) => {
    const artists = await deezer.getTopArtists();
    callback(artists);
  });

  socket.on('get-top-genres', async (callback) => {
    const genres = await deezer.getTopGenres();
    callback(genres);
  });

  socket.on('search-artists', async ({ query }, callback) => {
    const artists = await deezer.searchArtists(query);
    callback(artists);
  });

  socket.on('search-genres', async ({ query }, callback) => {
    const genres = await deezer.searchGenres(query);
    callback(genres);
  });

  socket.on('leave-room', ({ roomId }) => {
    console.log(`Player ${socket.id} is leaving room ${roomId}`);
    const room = gameManager.getRoom(roomId);
    
    if (room) {
      const player = room.players.find((p: any) => p.id === socket.id);
      if (player) {
        const playerName = player.name;
        const wasHost = player.isHost;
        
        // Remover jugador
        gameManager.removePlayer(roomId, socket.id);
        socket.leave(roomId);
        
        // Obtener sala actualizada
        const updatedRoom = gameManager.getRoom(roomId);
        
        if (updatedRoom && updatedRoom.players.length > 0) {
          // Si el que se fue era host, notificar nuevo host
          if (wasHost) {
            console.log(`Host left room ${roomId}. New host: ${updatedRoom.players[0].name}`);
          }
          
          // Notificar a los jugadores restantes
          io.to(roomId).emit('player-left', {
            room: serializeRoom(updatedRoom),
            message: `${playerName} se ha salido de la partida`
          });
        } else {
          console.log(`Room ${roomId} deleted (no players left)`);
        }
      }
    }
  });

  socket.on('transfer-host', ({ roomId, newHostId }) => {
    console.log(`Transferring host in room ${roomId} to player ${newHostId}`);
    
    const updatedRoom = gameManager.transferHost(roomId, newHostId);
    if (updatedRoom) {
      const newHostName = updatedRoom.players.find((p: any) => p.id === newHostId)?.name;
      io.to(roomId).emit('host-transferred', {
        room: serializeRoom(updatedRoom),
        message: `${newHostName} es el nuevo anfitrión`
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const result = gameManager.findAndMarkPlayerDisconnected(socket.id);
    if (result) {
      const { roomId, room, playerName } = result;
      
      if (room.isGameStarted) {
        // Partida activa: notificar que se desconectó pero puede reconectarse
        io.to(roomId).emit('player-disconnected', {
          room: serializeRoom(room),
          message: `${playerName} se ha desconectado`,
          canReconnect: true
        });
        console.log(`Player ${playerName} disconnected from active game in room ${roomId}`);
      } else if (room.players.length > 0) {
        // Sin partida: notificar salida
        io.to(roomId).emit('player-left', {
          room: serializeRoom(room),
          message: `${playerName} se ha desconectado`
        });
      } else {
        console.log(`Room ${roomId} deleted (no players left)`);
      }
    }
  });

  socket.on('reconnect-room', ({ roomId, playerId, playerName, playerAvatar }) => {
    console.log(`Player ${playerName} (old ID: ${playerId}) attempting to reconnect to room ${roomId}`);
    
    const room = gameManager.getRoom(roomId);
    if (!room) {
      socket.emit('error', { message: 'La sala no existe' });
      return;
    }
    
    // Buscar al jugador desconectado por ID (si tiene el mismo ID de socket)
    let wasDisconnected = room.disconnectedPlayers?.has(playerId);
    let disconnectedPlayerId = playerId;
    
    // Si no encuentra por ID, buscar por nombre (para reconexiones después de refresh)
    if (!wasDisconnected) {
      for (const [id, data] of room.disconnectedPlayers?.entries() || []) {
        if (data.name === playerName) {
          disconnectedPlayerId = id;
          wasDisconnected = true;
          break;
        }
      }
    }
    
    if (!wasDisconnected) {
      socket.emit('error', { message: 'No hay reconexión disponible para este jugador' });
      return;
    }
    
    // Remover del mapa de desconectados y agregar de vuelta con el nuevo socket ID
    const disconnectedData = room.disconnectedPlayers?.get(disconnectedPlayerId);
    if (!disconnectedData) {
      socket.emit('error', { message: 'Error al restaurar el jugador' });
      return;
    }
    
    room.disconnectedPlayers?.delete(disconnectedPlayerId);
    room.players.push({
      id: socket.id,
      name: playerName,
      isHost: disconnectedData.isHost,
      avatar: playerAvatar
    });
    
    const updatedRoom = gameManager.getRoom(roomId);
    if (!updatedRoom) {
      socket.emit('error', { message: 'Error al reconectar al jugador' });
      return;
    }
    
    socket.join(roomId);
    socket.emit('room-rejoined', serializeRoom(updatedRoom));
    
    // Notificar a los otros jugadores
    io.to(roomId).emit('player-reconnected', {
      room: serializeRoom(updatedRoom),
      message: `${playerName} se ha reconectado`
    });
    
    console.log(`${playerName} successfully reconnected to room ${roomId} with new socket ID`);
  });
});

const PORT = parseInt(process.env.PORT || '3001', 10);

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error(err);
  process.exit(1);
});

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION ===');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('=== Server Started Successfully ===');
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`URL: http://0.0.0.0:${PORT}`);
  console.log(`Client Build: ${clientBuildPath}`);
});
