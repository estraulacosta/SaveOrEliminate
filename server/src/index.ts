import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import * as path from 'path';
import * as gameManager from './gameManager.js';
import type { GameConfig } from './types.js';
import * as deezer from './deezer.js';

const app = express();
const httpServer = createServer(app);

// Serve static files from client build (relative to current working directory)
const clientBuildPath = path.join(process.cwd(), 'client', 'dist');

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
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).send('Error loading page');
    }
  });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', ({ playerName, playerAvatar }) => {
    const room = gameManager.createRoom(playerName, socket.id, playerAvatar);
    socket.join(room.id);
    socket.emit('room-created', room);
    console.log(`Room created: ${room.id} by ${playerName}`);
  });

  socket.on('join-room', ({ roomId, playerName, playerAvatar }) => {
    const room = gameManager.joinRoom(roomId, playerName, socket.id, playerAvatar);
    if (room) {
      socket.join(roomId);
      socket.emit('room-joined', room);
      io.to(roomId).emit('player-joined', room);
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
    gameManager.submitVote(roomId, socket.id, songId);
    const room = gameManager.getRoom(roomId);
    if (room?.currentRound) {
      io.to(roomId).emit('vote-submitted', {
        votes: room.currentRound.votes,
        players: room.players,
      });
    }
  });

  socket.on('next-round', async ({ roomId }) => {
    const round = await gameManager.generateRound(roomId);
    const room = gameManager.getRoom(roomId);
    
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
    io.to(roomId).emit('game-reset', room);
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

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const result = gameManager.findAndRemovePlayerFromAllRooms(socket.id);
    if (result) {
      const { roomId, room, playerName } = result;
      
      if (room.players.length > 0) {
        // Notificar a los otros jugadores
        io.to(roomId).emit('player-left', {
          room: room,
          message: `${playerName} se ha desconectado`
        });
      } else {
        console.log(`Room ${roomId} deleted (no players left)`);
      }
    }
  });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Accessible locally at http://192.168.1.50:${PORT}`);
});
