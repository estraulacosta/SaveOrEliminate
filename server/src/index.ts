import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import * as gameManager from './gameManager.js';
import type { GameConfig } from './types.js';
import * as deezer from './deezer.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://save-or-eliminate.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

app.use(cors({
  origin: [
    'https://save-or-eliminate.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', ({ playerName }) => {
    const room = gameManager.createRoom(playerName, socket.id);
    socket.join(room.id);
    socket.emit('room-created', room);
    console.log(`Room created: ${room.id} by ${playerName}`);
  });

  socket.on('join-room', ({ roomId, playerName }) => {
    const room = gameManager.joinRoom(roomId, playerName, socket.id);
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
    console.log('Starting game in room:', roomId, 'with config:', config);

    // Emitir evento de carga inicial
    io.to(roomId).emit('game-loading', { loadedYears: 0, totalYears: config.selectionType === 'year' && config.yearRange
      ? config.yearRange.end - config.yearRange.start + 1
      : 0
    });

    const success = await gameManager.startGame(roomId, config, (loadedYears, totalYears) => {
      // Emitir progreso de carga año a año
      io.to(roomId).emit('game-loading', { loadedYears, totalYears });
    });

    if (success) {
      const round = await gameManager.generateRound(roomId);
      if (round) {
        const room = gameManager.getRoom(roomId);
        const currentYear = config.selectionType === 'year' && config.yearRange 
          ? config.yearRange.start 
          : null;
        const currentDecade = config.selectionType === 'decade' && config.decadeRange
          ? config.decadeRange.start
          : null;
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
      io.to(roomId).emit('game-error', { message: 'No se pudo iniciar la partida.' });
    }
  });


  socket.on('start-timer', ({ roomId }) => {
    gameManager.startTimer(roomId);
    io.to(roomId).emit('timer-started');
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

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
