const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const questions = require('./questions.json');

const ADMIN_PIN = process.env.ADMIN_PIN || '1234';
const PORT = process.env.PORT || 3000;
const REVEAL_PAUSE_MS = 0; // il reveal dura finché l'admin non preme "prossima"

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ---------- STATO DEL GIOCO ----------
const game = {
  phase: 'LOBBY',        // LOBBY | QUESTION | REVEAL | FINAL
  currentIndex: -1,
  endsAt: null,
  timer: null,
  lastReveal: null,
  players: new Map(),    // name -> { name, score, socketId, answer, lastGain }
};

// ---------- FUNZIONI DI SUPPORTO ----------
function leaderboard() {
  return [...game.players.values()]
    .map(p => ({ name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

function publicQuestion() {
  const q = questions[game.currentIndex];
  return {
    index: game.currentIndex,
    total: questions.length,
    text: q.text,
    options: q.options,       // NON mandiamo mai "correct" ai client
    time: q.time,
    endsAt: game.endsAt,
    now: Date.now(),
  };
}

function connectedPlayers() {
  return [...game.players.values()].filter(p => p.socketId);
}

function broadcastLobby() {
  io.emit('lobby', { players: connectedPlayers().map(p => p.name) });
}

// ---------- LOGICA DI GIOCO ----------
function startQuestion() {
  game.currentIndex++;
  if (game.currentIndex >= questions.length) return endGame();

  const q = questions[game.currentIndex];
  game.phase = 'QUESTION';
  game.lastReveal = null;
  game.endsAt = Date.now() + q.time * 1000;
  game.players.forEach(p => { p.answer = null; p.lastGain = 0; });

  io.emit('question', publicQuestion());
  io.to('admin').emit('admin:progress', { answered: 0, total: connectedPlayers().length });
  clearTimeout(game.timer);
  game.timer = setTimeout(reveal, q.time * 1000);
}

function reveal() {
  if (game.phase !== 'QUESTION') return;
  clearTimeout(game.timer);
  game.phase = 'REVEAL';

  const q = questions[game.currentIndex];
  const board = leaderboard();

  // Ogni giocatore riceve il proprio esito personale
  game.players.forEach(p => {
    if (!p.socketId) return;
    const position = board.findIndex(b => b.name === p.name) + 1;
    io.to(p.socketId).emit('reveal', {
      correct: q.correct,
      yourAnswer: p.answer ? p.answer.choice : null,
      gain: p.lastGain,
      score: p.score,
      position,
      top: board.slice(0, 5),
      isLast: game.currentIndex === questions.length - 1,
    });
  });

  // Salviamo l'ultimo reveal, così la regia lo ritrova se ricarica la pagina
  game.lastReveal = {
    index: game.currentIndex,
    correct: q.correct,
    top: board.slice(0, 5),
    isLast: game.currentIndex === questions.length - 1,
  };
  io.to('admin').emit('admin:reveal', game.lastReveal);
}

function endGame() {
  game.phase = 'FINAL';
  io.emit('final', { leaderboard: leaderboard() });
}

function resetGame() {
  clearTimeout(game.timer);
  game.phase = 'LOBBY';
  game.currentIndex = -1;
  game.endsAt = null;
  game.lastReveal = null;
  game.players.forEach(p => { p.score = 0; p.answer = null; p.lastGain = 0; });
  io.emit('reset');
  broadcastLobby();
}

// Punteggio: 500 base + fino a 500 di bonus velocità
function computePoints(isCorrect, timeLeftMs, totalMs) {
  if (!isCorrect) return 0;
  return Math.round(500 + 500 * (timeLeftMs / totalMs));
}

// ---------- SOCKET.IO ----------
io.on('connection', (socket) => {

  // Il giocatore entra (o rientra) con un nome
  socket.on('join', (rawName, ack) => {
    const name = String(rawName || '').trim().slice(0, 20);
    if (!name) return ack?.({ ok: false, error: 'Inserisci un nome' });

    const existing = game.players.get(name);
    if (existing && existing.socketId && existing.socketId !== socket.id) {
      return ack?.({ ok: false, error: 'Nome già in uso' });
    }
    if (!existing && game.phase !== 'LOBBY') {
      return ack?.({ ok: false, error: 'Il gioco è già iniziato' });
    }

    const player = existing || { name, score: 0, answer: null, lastGain: 0 };
    player.socketId = socket.id;
    game.players.set(name, player);
    socket.data.name = name;

    ack?.({ ok: true, name, phase: game.phase });
    broadcastLobby();

    // Se rientra a gioco in corso, risincronizzalo
    if (game.phase === 'QUESTION') socket.emit('question', publicQuestion());
    if (game.phase === 'FINAL') socket.emit('final', { leaderboard: leaderboard() });
  });

  // Il giocatore risponde
  socket.on('answer', (choice) => {
    const player = game.players.get(socket.data.name);
    if (!player || game.phase !== 'QUESTION' || player.answer) return;
    if (![0, 1, 2, 3].includes(choice)) return;

    const q = questions[game.currentIndex];
    const timeLeft = game.endsAt - Date.now();
    if (timeLeft <= 0) return; // tardivo

    const isCorrect = choice === q.correct;
    const gain = computePoints(isCorrect, timeLeft, q.time * 1000);
    player.answer = { choice };
    player.lastGain = gain;
    player.score += gain;

    socket.emit('answer:ack');

    // Se hanno risposto tutti i connessi, chiudi subito la domanda
    const online = connectedPlayers();
    if (online.length && online.every(p => p.answer)) reveal();
    else io.to('admin').emit('admin:progress', {
      answered: online.filter(p => p.answer).length,
      total: online.length,
    });
  });

  // ----- ADMIN -----
  socket.on('admin:login', (pin, ack) => {
    if (pin !== ADMIN_PIN) return ack?.({ ok: false });
    socket.join('admin');
    const online = connectedPlayers();
    ack?.({
      ok: true,
      phase: game.phase,
      players: online.map(p => p.name),
      total: questions.length,
      question: game.phase === 'QUESTION' || game.phase === 'REVEAL' ? publicQuestion() : null,
      answered: online.filter(p => p.answer).length,
      reveal: game.phase === 'REVEAL' ? game.lastReveal : null,
      leaderboard: game.phase === 'FINAL' ? leaderboard() : null,
    });
  });

  const isAdmin = () => socket.rooms.has('admin');

  socket.on('admin:next', () => {
    if (!isAdmin()) return;
    if (game.phase === 'LOBBY' && connectedPlayers().length === 0) return;
    if (game.phase === 'LOBBY' || game.phase === 'REVEAL') startQuestion();
  });

  socket.on('admin:skip', () => { if (isAdmin()) reveal(); }); // chiude subito la domanda
  socket.on('admin:reset', () => { if (isAdmin()) resetGame(); });

  socket.on('disconnect', () => {
    const p = game.players.get(socket.data.name);
    if (p && p.socketId === socket.id) {
      p.socketId = null;
      broadcastLobby();
    }
  });
});

// ---------- SERVE ANGULAR (opzione B) ----------
const clientDist = path.join(__dirname, '../client/dist/client/browser');
app.use(express.static(clientDist));
app.use((req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), err => {
    if (err) res.status(404).send('Frontend non ancora buildato');
  });
});

server.listen(PORT, () => console.log(`Server su http://localhost:${PORT}`));