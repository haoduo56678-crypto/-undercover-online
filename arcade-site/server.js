const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = Number(process.env.PORT || 3000);
const WORD_PAIRS = [
  ['Coffee', 'Milk Tea'],
  ['Subway', 'Bus'],
  ['Cat', 'Dog'],
  ['Burger', 'Pizza'],
  ['Apple', 'Pear'],
  ['Basketball', 'Soccer'],
  ['Sprite', 'Coke'],
  ['Teacher', 'Principal'],
  ['Toothbrush', 'Comb'],
  ['Phone', 'Tablet'],
  ['Hot Pot', 'Barbecue'],
  ['Airplane', 'High-Speed Rail'],
  ['Rain', 'Snow'],
  ['Notebook', 'Textbook'],
  ['Orange Juice', 'Lemonade'],
  ['Cake', 'Donut']
];

const rooms = new Map();

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function roomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function shuffle(array) {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function getAlivePlayers(room) {
  return room.players.filter((player) => player.alive);
}

function sanitizeRoomFor(socketId, room) {
  return {
    code: room.code,
    hostId: room.hostId,
    stage: room.stage,
    round: room.round,
    civilianWord: room.stage === 'gameOver' ? room.civilianWord : '',
    undercoverWord: room.stage === 'gameOver' ? room.undercoverWord : '',
    turnPlayerId: room.turnPlayerId,
    lastEliminatedPlayerId: room.lastEliminatedPlayerId,
    voteCounts: room.voteCounts,
    votes: room.votes,
    result: room.result,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      alive: player.alive,
      connected: player.connected,
      role: room.stage === 'gameOver' || player.id === socketId ? player.role : null,
      word: player.id === socketId && room.stage === 'reveal' && !player.revealDone ? player.word : '',
      revealDone: player.revealDone,
    }))
  };
}

function broadcastRoom(code, notice) {
  const room = rooms.get(code);
  if (!room) return;
  room.players.forEach((player) => {
    io.to(player.id).emit('room:update', {
      playerId: player.id,
      room: sanitizeRoomFor(player.id, room)
    });
    if (notice) {
      io.to(player.id).emit('state:notice', { message: notice });
    }
  });
}

function emitError(socket, message) {
  socket.emit('room:error', { message });
}

function createRoomFor(socket, name) {
  const code = roomCode();
  const player = {
    id: socket.id,
    name,
    role: 'observer',
    word: '',
    alive: true,
    connected: true,
    revealDone: false,
  };
  const room = {
    code,
    hostId: socket.id,
    stage: 'lobby',
    round: 1,
    players: [player],
    civilianWord: '',
    undercoverWord: '',
    turnPlayerId: null,
    turnOrder: [],
    votes: {},
    voteCounts: {},
    lastEliminatedPlayerId: null,
    result: null,
  };
  rooms.set(code, room);
  socket.data.roomCode = code;
  socket.join(code);
  broadcastRoom(code, `Room ${code} created.`);
}

function joinRoom(socket, code, name) {
  const room = rooms.get(code);
  if (!room) return emitError(socket, 'Room not found.');
  if (room.players.length >= 8) return emitError(socket, 'Room is full.');
  if (room.stage !== 'lobby') return emitError(socket, 'Game already started.');
  if (room.players.some((player) => player.name.toLowerCase() === name.toLowerCase())) return emitError(socket, 'That nickname is already taken in this room.');

  const player = {
    id: socket.id,
    name,
    role: 'observer',
    word: '',
    alive: true,
    connected: true,
    revealDone: false,
  };
  room.players.push(player);
  socket.data.roomCode = code;
  socket.join(code);
  broadcastRoom(code, `${name} joined room ${code}.`);
}

function assignWords(room) {
  const [civilianWord, undercoverWord] = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
  const shuffledIds = shuffle(room.players.map((player) => player.id));
  const undercoverId = shuffledIds[0];
  room.civilianWord = civilianWord;
  room.undercoverWord = undercoverWord;
  room.round = 1;
  room.stage = 'reveal';
  room.turnPlayerId = null;
  room.turnOrder = [];
  room.votes = {};
  room.voteCounts = {};
  room.lastEliminatedPlayerId = null;
  room.result = null;
  room.players.forEach((player) => {
    player.connected = true;
    player.alive = true;
    player.revealDone = false;
    player.role = player.id === undercoverId ? 'undercover' : 'civilian';
    player.word = player.role === 'undercover' ? undercoverWord : civilianWord;
  });
}

function checkWin(room) {
  const alive = getAlivePlayers(room);
  const undercover = alive.find((player) => player.role === 'undercover');
  if (!undercover) {
    return { winner: 'civilian', message: 'The undercover was caught. Civilians win!' };
  }
  if (alive.length <= 2) {
    return { winner: 'undercover', message: 'The undercover survived to the final two. Undercover wins!' };
  }
  return null;
}

function beginDescriptionStage(room) {
  room.stage = 'describe';
  room.turnOrder = getAlivePlayers(room).map((player) => player.id);
  room.turnPlayerId = room.turnOrder[0] || null;
  room.votes = {};
  room.voteCounts = {};
}

function advanceDescription(room) {
  const index = room.turnOrder.indexOf(room.turnPlayerId);
  if (index === -1 || index === room.turnOrder.length - 1) {
    room.stage = 'vote';
    room.turnPlayerId = null;
    room.votes = {};
    room.voteCounts = {};
    return;
  }
  room.turnPlayerId = room.turnOrder[index + 1];
}

function finishVoting(room) {
  const tally = {};
  Object.values(room.votes).forEach((targetId) => {
    tally[targetId] = (tally[targetId] || 0) + 1;
  });
  room.voteCounts = tally;
  const maxVotes = Math.max(...Object.values(tally));
  const candidates = Object.entries(tally)
    .filter(([, count]) => count === maxVotes)
    .map(([playerId]) => playerId);
  const eliminatedId = candidates[Math.floor(Math.random() * candidates.length)];
  const eliminatedPlayer = room.players.find((player) => player.id === eliminatedId);
  if (eliminatedPlayer) eliminatedPlayer.alive = false;
  room.lastEliminatedPlayerId = eliminatedId;
  const result = checkWin(room);
  if (result) {
    room.result = result;
    room.stage = 'gameOver';
    room.turnPlayerId = null;
    return;
  }
  room.stage = 'roundResult';
  room.turnPlayerId = null;
}

function deleteRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  room.players.forEach((player) => io.to(player.id).emit('room:deleted'));
  rooms.delete(code);
}

function removePlayer(socket) {
  const code = socket.data.roomCode;
  if (!code || !rooms.has(code)) return;
  const room = rooms.get(code);
  const player = room.players.find((entry) => entry.id === socket.id);
  room.players = room.players.filter((entry) => entry.id !== socket.id);
  if (!room.players.length) {
    rooms.delete(code);
    return;
  }
  if (room.hostId === socket.id) {
    room.hostId = room.players[0].id;
  }
  if (room.stage === 'describe' && room.turnPlayerId === socket.id) {
    room.turnOrder = room.turnOrder.filter((id) => id !== socket.id);
    room.turnPlayerId = room.turnOrder[0] || null;
    if (!room.turnPlayerId) room.stage = 'vote';
  }
  if (room.stage === 'vote') {
    delete room.votes[socket.id];
    const alive = getAlivePlayers(room);
    if (alive.every((entry) => room.votes[entry.id])) {
      finishVoting(room);
    }
  }
  broadcastRoom(code, player ? `${player.name} left the room.` : 'A player left the room.');
}

app.use(express.static(__dirname));

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

io.on('connection', (socket) => {
  socket.on('room:create', ({ name }) => {
    if (!name || !String(name).trim()) return emitError(socket, 'Nickname is required.');
    createRoomFor(socket, String(name).trim().slice(0, 20));
  });

  socket.on('room:join', ({ code, name }) => {
    if (!code || !name) return emitError(socket, 'Room code and nickname are required.');
    joinRoom(socket, String(code).trim().toUpperCase(), String(name).trim().slice(0, 20));
  });

  socket.on('room:leave', () => {
    removePlayer(socket);
    socket.leave(socket.data.roomCode || '');
    socket.data.roomCode = null;
  });

  socket.on('game:start', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return emitError(socket, 'Room not found.');
    if (room.hostId !== socket.id) return emitError(socket, 'Only the host can start.');
    if (room.players.length < 3 || room.players.length > 8) return emitError(socket, 'You need 3-8 players.');
    assignWords(room);
    broadcastRoom(room.code, 'Game started. Reveal your word privately.');
  });

  socket.on('game:finishReveal', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.stage !== 'reveal') return;
    const player = room.players.find((entry) => entry.id === socket.id);
    if (!player) return;
    player.revealDone = true;
    if (room.players.every((entry) => entry.revealDone)) {
      beginDescriptionStage(room);
      broadcastRoom(room.code, 'All words revealed. Start giving clues in turn.');
      return;
    }
    broadcastRoom(room.code, `${player.name} is ready.`);
  });

  socket.on('game:finishDescription', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.stage !== 'describe') return;
    if (room.turnPlayerId !== socket.id) return emitError(socket, 'It is not your turn.');
    advanceDescription(room);
    broadcastRoom(room.code, room.stage === 'vote' ? 'Description phase complete. Time to vote.' : 'Next player, give your clue.');
  });

  socket.on('game:vote', ({ targetId }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.stage !== 'vote') return;
    const voter = room.players.find((entry) => entry.id === socket.id);
    const target = room.players.find((entry) => entry.id === targetId);
    if (!voter || !voter.alive) return;
    if (!target || !target.alive) return emitError(socket, 'Invalid vote target.');
    if (target.id === voter.id) return emitError(socket, 'You cannot vote for yourself.');
    room.votes[voter.id] = target.id;
    const alive = getAlivePlayers(room);
    if (alive.every((entry) => room.votes[entry.id])) {
      finishVoting(room);
      broadcastRoom(room.code, room.stage === 'gameOver' ? room.result.message : 'Voting complete. Round result is ready.');
      return;
    }
    broadcastRoom(room.code, `${voter.name} voted.`);
  });

  socket.on('game:nextRound', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) return emitError(socket, 'Only the host can continue.');
    if (room.stage !== 'roundResult') return;
    room.round += 1;
    room.stage = 'describe';
    room.turnOrder = getAlivePlayers(room).map((player) => player.id);
    room.turnPlayerId = room.turnOrder[0] || null;
    room.votes = {};
    room.voteCounts = {};
    room.lastEliminatedPlayerId = null;
    broadcastRoom(room.code, `Round ${room.round} begins. Start describing again.`);
  });

  socket.on('game:playAgain', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) return emitError(socket, 'Only the host can start a new game.');
    assignWords(room);
    broadcastRoom(room.code, 'New game started. Reveal your word privately.');
  });

  socket.on('disconnect', () => {
    removePlayer(socket);
  });
});

server.listen(PORT, () => {
  console.log(`Undercover Online MVP listening on http://localhost:${PORT}`);
});
