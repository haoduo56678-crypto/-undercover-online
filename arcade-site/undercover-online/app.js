const app = document.getElementById('app');
const resetLocalBtn = document.getElementById('reset-local-btn');
const storedNickname = localStorage.getItem('undercover-online-name') || '';
const storedRoomCode = localStorage.getItem('undercover-online-room') || '';

const state = {
  connected: false,
  room: null,
  playerId: null,
  me: null,
  message: '',
  revealVisible: false,
  nicknameDraft: storedNickname,
  createNicknameDraft: storedNickname,
  roomCodeDraft: storedRoomCode,
  joinNicknameDraft: storedNickname,
};

const socket = io({ transports: ['websocket', 'polling'] });

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setMessage(text) {
  state.message = text || '';
  render();
}

function saveIdentity(name, roomCode) {
  if (name) localStorage.setItem('undercover-online-name', name);
  if (roomCode) localStorage.setItem('undercover-online-room', roomCode);
}

function syncRoom(room) {
  state.room = room;
  state.me = room?.players?.find((player) => player.id === state.playerId) || null;
  if (state.me?.name) {
    state.nicknameDraft = state.me.name;
    state.createNicknameDraft = state.me.name;
    state.joinNicknameDraft = state.me.name;
  }
  if (room?.code) {
    state.roomCodeDraft = room.code;
    saveIdentity(state.me?.name || state.nicknameDraft, room.code);
  }
  render();
}

socket.on('connect', () => {
  state.connected = true;
  render();
});

socket.on('disconnect', () => {
  state.connected = false;
  render();
});

socket.on('room:update', (payload) => {
  state.playerId = payload.playerId;
  syncRoom(payload.room);
});

socket.on('room:error', (payload) => {
  setMessage(payload.message || 'Something went wrong.');
});

socket.on('room:deleted', () => {
  state.room = null;
  state.me = null;
  state.playerId = null;
  state.revealVisible = false;
  localStorage.removeItem('undercover-online-room');
  setMessage('The room was closed.');
});

socket.on('state:notice', (payload) => {
  setMessage(payload.message || '');
});

resetLocalBtn.addEventListener('click', () => {
  localStorage.removeItem('undercover-online-name');
  localStorage.removeItem('undercover-online-room');
  state.nicknameDraft = '';
  state.createNicknameDraft = '';
  state.joinNicknameDraft = '';
  state.roomCodeDraft = '';
  setMessage('Saved nickname cleared on this device.');
});

function emit(eventName, payload) {
  socket.emit(eventName, payload);
}

function handleCreateRoom(event) {
  event.preventDefault();
  const name = state.createNicknameDraft.trim();
  if (!name) return setMessage('Enter a nickname first.');
  saveIdentity(name, '');
  emit('room:create', { name });
}

function handleJoinRoom(event) {
  event.preventDefault();
  const name = state.joinNicknameDraft.trim();
  const code = state.roomCodeDraft.trim().toUpperCase();
  if (!name || !code) return setMessage('Enter both a room code and nickname.');
  saveIdentity(name, code);
  emit('room:join', { code, name });
}

function copyRoomCode() {
  if (!state.room?.code) return;
  navigator.clipboard?.writeText(state.room.code)
    .then(() => setMessage(`Room code ${state.room.code} copied.`))
    .catch(() => setMessage(`Room code: ${state.room.code}`));
}

function leaveRoom() {
  emit('room:leave', {});
  localStorage.removeItem('undercover-online-room');
  state.room = null;
  state.me = null;
  state.playerId = null;
  state.revealVisible = false;
  render();
}

function startGame() { emit('game:start', {}); }
function finishReveal() { state.revealVisible = false; emit('game:finishReveal', {}); }
function finishDescription() { emit('game:finishDescription', {}); }
function castVote(targetId) { emit('game:vote', { targetId }); }
function continueRound() { emit('game:nextRound', {}); }
function playAgain() { state.revealVisible = false; emit('game:playAgain', {}); }

function playerLine(player) {
  const tags = [];
  if (player.id === state.room?.hostId) tags.push('<span class="badge host">Host</span>');
  if (player.id === state.playerId) tags.push('<span class="badge you">You</span>');
  if (!player.alive) tags.push('<span class="badge out">Out</span>');
  return `
    <li class="list-item">
      <span>${escapeHtml(player.name)}</span>
      <span>${tags.join(' ') || '<span class="small">Alive</span>'}</span>
    </li>
  `;
}

function revealPanel() {
  if (!state.me) return '';
  const stage = state.room.stage;
  if (stage !== 'reveal') {
    return `
      <div class="card panel">
        <h2>Your Secret Word</h2>
        <div class="notice">Words are only shown during the reveal phase.</div>
      </div>
    `;
  }

  if (state.me.revealDone) {
    return `
      <div class="card panel">
        <h2>Your Secret Word</h2>
        <div class="notice">You already locked in your reveal for this round. Wait for everyone else.</div>
      </div>
    `;
  }

  const word = state.revealVisible ? escapeHtml(state.me.word || '') : 'Tap reveal when only you can see the screen.';
  return `
    <div class="card panel">
      <div class="stage-title">
        <h2>Your Secret Word</h2>
        <span class="badge">Private</span>
      </div>
      <p class="muted">Role: <strong class="${state.me.role === 'undercover' ? 'role-undercover' : 'role-civilian'}">${state.me.role === 'undercover' ? 'Undercover' : 'Civilian'}</strong></p>
      <div class="word-box">${word}</div>
      <div class="actions">
        <button class="primary-btn" type="button" data-action="toggle-reveal">${state.revealVisible ? 'Hide Word' : 'Reveal My Word'}</button>
        <button class="secondary-btn" type="button" data-action="finish-reveal" ${state.revealVisible ? '' : 'disabled'}>I Saw It</button>
      </div>
    </div>
  `;
}

function stagePanel() {
  if (!state.room || !state.me) return '';
  const { stage, turnPlayerId, round, players, voteCounts = {}, result, lastEliminatedPlayerId, votes } = state.room;
  const alivePlayers = players.filter((player) => player.alive);
  const currentTurn = players.find((player) => player.id === turnPlayerId);
  const eliminatedPlayer = players.find((player) => player.id === lastEliminatedPlayerId);

  if (stage === 'lobby') {
    return `
      <div class="card panel">
        <h2>Lobby</h2>
        <div class="notice">The host can start once 3-8 players have joined.</div>
        <div class="status-line"><span>Players</span><strong>${players.length} / 8</strong></div>
        <div class="status-line"><span>Mode</span><strong>Online multiplayer MVP</strong></div>
        <div class="actions">
          ${state.playerId === state.room.hostId ? `<button class="primary-btn" type="button" data-action="start-game">Start Game</button>` : '<span class="small">Waiting for the host to start.</span>'}
        </div>
      </div>
    `;
  }

  if (stage === 'reveal') {
    const doneCount = players.filter((player) => player.revealDone).length;
    return `
      <div class="card panel">
        <div class="stage-title">
          <h2>Round ${round} · Reveal</h2>
          <span class="badge">${doneCount} / ${players.length} ready</span>
        </div>
        <p class="muted">Each player privately reveals their own word on their own device.</p>
        <div class="notice">No pass-the-phone setup anymore. Everyone can reveal in parallel.</div>
      </div>
    `;
  }

  if (stage === 'describe') {
    const isMyTurn = turnPlayerId === state.playerId;
    return `
      <div class="card panel">
        <div class="stage-title">
          <h2>Round ${round} · Description</h2>
          <span class="badge">${currentTurn ? escapeHtml(currentTurn.name) : 'Waiting'}</span>
        </div>
        <p class="muted">Give one clue without saying the exact word.</p>
        <div class="notice">${isMyTurn ? 'It is your turn to speak. After describing aloud, tap the button below.' : `It is ${escapeHtml(currentTurn?.name || 'another player')}'s turn.`}</div>
        <div class="actions" style="margin-top: 16px;">
          ${isMyTurn ? '<button class="primary-btn" type="button" data-action="finish-description">I Finished My Clue</button>' : ''}
        </div>
      </div>
    `;
  }

  if (stage === 'vote') {
    const hasVoted = Boolean(votes?.[state.playerId]);
    const myTargets = alivePlayers.filter((player) => player.id !== state.playerId);
    return `
      <div class="card panel">
        <div class="stage-title">
          <h2>Round ${round} · Voting</h2>
          <span class="badge">${Object.keys(votes || {}).length} / ${alivePlayers.length} votes</span>
        </div>
        <p class="muted">Vote for the person you suspect. You cannot vote for yourself.</p>
        ${hasVoted ? '<div class="notice">Your vote is locked in. Waiting for everyone else.</div>' : `
          <div class="stack">
            ${myTargets.map((player) => `<button class="vote-action" type="button" data-vote="${player.id}">${escapeHtml(player.name)}</button>`).join('')}
          </div>
        `}
        <ul class="summary-list" style="margin-top: 16px;">
          ${alivePlayers.map((player) => `<li class="summary-item"><span>${escapeHtml(player.name)}</span><strong>${votes?.[player.id] ? 'Voted' : 'Waiting'}</strong></li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (stage === 'roundResult') {
    const entries = Object.entries(voteCounts);
    return `
      <div class="card panel">
        <h2>Round ${round} Result</h2>
        <p><strong>${escapeHtml(eliminatedPlayer?.name || 'Unknown')}</strong> was eliminated.</p>
        <p>Role: <strong class="${eliminatedPlayer?.role === 'undercover' ? 'role-undercover' : 'role-civilian'}">${eliminatedPlayer?.role === 'undercover' ? 'Undercover' : 'Civilian'}</strong></p>
        <p>Word: <strong>${escapeHtml(eliminatedPlayer?.word || '')}</strong></p>
        ${state.playerId === state.room.hostId ? '<button class="primary-btn" type="button" data-action="continue-round">Next Round</button>' : '<div class="notice">Waiting for the host to continue.</div>'}
        <ul class="summary-list" style="margin-top: 16px;">
          ${entries.map(([playerId, count]) => {
            const player = players.find((entry) => entry.id === playerId);
            return `<li class="summary-item"><span>${escapeHtml(player?.name || 'Unknown')}</span><strong>${count} vote${count === 1 ? '' : 's'}</strong></li>`;
          }).join('')}
        </ul>
      </div>
    `;
  }

  if (stage === 'gameOver') {
    return `
      <div class="card panel">
        <h2>Game Over</h2>
        <p class="win">${escapeHtml(result?.message || '')}</p>
        <div class="notice" style="margin: 16px 0; text-align: left;">
          <p><strong>Civilian word:</strong> ${escapeHtml(state.room.civilianWord || '')}</p>
          <p><strong>Undercover word:</strong> ${escapeHtml(state.room.undercoverWord || '')}</p>
        </div>
        <ul class="summary-list">
          ${players.map((player) => `<li class="summary-item"><span>${escapeHtml(player.name)}</span><strong class="${player.role === 'undercover' ? 'role-undercover' : player.role === 'civilian' ? 'role-civilian' : 'role-observer'}">${player.role === 'undercover' ? 'Undercover' : player.role === 'civilian' ? 'Civilian' : 'Observer'}</strong></li>`).join('')}
        </ul>
        <div class="actions" style="margin-top: 16px;">
          ${state.playerId === state.room.hostId ? '<button class="primary-btn" type="button" data-action="play-again">Play Again</button>' : '<div class="notice">Waiting for the host to start a new game.</div>'}
        </div>
      </div>
    `;
  }

  return '';
}

function roomView() {
  const room = state.room;
  return `
    <section class="grid two">
      <div class="stack">
        <div class="card panel">
          <div class="stage-title">
            <div>
              <h2>Room <span class="code">${escapeHtml(room.code)}</span></h2>
              <p class="muted">Share this code with other devices on the same server.</p>
            </div>
            <div class="actions">
              <button class="ghost-btn" type="button" data-action="copy-code">Copy Code</button>
              <button class="danger-btn" type="button" data-action="leave-room">Leave</button>
            </div>
          </div>
          <div class="status-line"><span>Connection</span><strong>${state.connected ? 'Connected' : 'Reconnecting...'}</strong></div>
          <div class="status-line"><span>Host</span><strong>${escapeHtml(room.players.find((p) => p.id === room.hostId)?.name || '')}</strong></div>
          <div class="status-line"><span>Stage</span><strong>${escapeHtml(room.stage)}</strong></div>
        </div>
        ${stagePanel()}
      </div>
      <div class="stack">
        ${revealPanel()}
        <div class="card panel">
          <h2>Players</h2>
          <ul class="list">
            ${room.players.map(playerLine).join('')}
          </ul>
        </div>
      </div>
    </section>
  `;
}

function landingView() {
  return `
    <section class="grid two">
      <form class="card panel stack" id="create-room-form">
        <div>
          <h2>Create Room</h2>
          <p class="muted">Start a room and become the host.</p>
        </div>
        <label class="stack">
          <span>Nickname</span>
          <input id="create-name" maxlength="20" placeholder="Your nickname" value="${escapeHtml(state.createNicknameDraft)}" />
        </label>
        <button class="primary-btn" type="submit">Create Room</button>
      </form>

      <form class="card panel stack" id="join-room-form">
        <div>
          <h2>Join Room</h2>
          <p class="muted">Enter the host's room code from another device.</p>
        </div>
        <label class="stack">
          <span>Room Code</span>
          <input id="join-code" maxlength="6" placeholder="ABCD" value="${escapeHtml(state.roomCodeDraft)}" />
        </label>
        <label class="stack">
          <span>Nickname</span>
          <input id="join-name" maxlength="20" placeholder="Your nickname" value="${escapeHtml(state.joinNicknameDraft)}" />
        </label>
        <button class="primary-btn" type="submit">Join Room</button>
      </form>
    </section>
  `;
}

function render() {
  app.innerHTML = `
    ${state.room ? roomView() : landingView()}
    <p class="message">${escapeHtml(state.message || '')}</p>
  `;

  const createForm = document.getElementById('create-room-form');
  const joinForm = document.getElementById('join-room-form');
  if (createForm) {
    const input = document.getElementById('create-name');
    input.addEventListener('input', (event) => { state.createNicknameDraft = event.target.value; });
    createForm.addEventListener('submit', handleCreateRoom);
  }
  if (joinForm) {
    document.getElementById('join-code').addEventListener('input', (event) => {
      state.roomCodeDraft = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      event.target.value = state.roomCodeDraft;
    });
    document.getElementById('join-name').addEventListener('input', (event) => { state.joinNicknameDraft = event.target.value; });
    joinForm.addEventListener('submit', handleJoinRoom);
  }

  document.querySelector('[data-action="toggle-reveal"]')?.addEventListener('click', () => {
    state.revealVisible = !state.revealVisible;
    render();
  });
  document.querySelector('[data-action="finish-reveal"]')?.addEventListener('click', finishReveal);
  document.querySelector('[data-action="copy-code"]')?.addEventListener('click', copyRoomCode);
  document.querySelector('[data-action="leave-room"]')?.addEventListener('click', leaveRoom);
  document.querySelector('[data-action="start-game"]')?.addEventListener('click', startGame);
  document.querySelector('[data-action="finish-description"]')?.addEventListener('click', finishDescription);
  document.querySelector('[data-action="continue-round"]')?.addEventListener('click', continueRound);
  document.querySelector('[data-action="play-again"]')?.addEventListener('click', playAgain);
  document.querySelectorAll('[data-vote]').forEach((button) => {
    button.addEventListener('click', () => castVote(button.dataset.vote));
  });
}

render();
