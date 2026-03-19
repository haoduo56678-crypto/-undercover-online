const SIZE = 4;
const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart-btn');

const bestKey = 'game_2048_best';
let board = [];
let score = 0;
let startX = 0;
let startY = 0;

bestEl.textContent = String(Number(localStorage.getItem(bestKey) || 0));

function createEmptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function initGame() {
  board = createEmptyBoard();
  score = 0;
  updateScore();
  addRandomTile();
  addRandomTile();
  statusEl.textContent = 'Press any arrow key or swipe to begin.';
  render();
}

function updateScore() {
  scoreEl.textContent = String(score);
  const best = Math.max(score, Number(localStorage.getItem(bestKey) || 0));
  localStorage.setItem(bestKey, String(best));
  bestEl.textContent = String(best);
}

function addRandomTile() {
  const empty = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) empty.push({ r, c });
    }
  }

  if (!empty.length) return;
  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function slideAndMerge(line) {
  const values = line.filter(Boolean);
  const merged = [];

  for (let i = 0; i < values.length; i++) {
    if (values[i] === values[i + 1]) {
      const value = values[i] * 2;
      merged.push(value);
      score += value;
      i++;
    } else {
      merged.push(values[i]);
    }
  }

  while (merged.length < SIZE) merged.push(0);
  return merged;
}

function cloneBoard(input) {
  return input.map(row => [...row]);
}

function boardsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function moveLeft() {
  const old = cloneBoard(board);
  board = board.map(row => slideAndMerge(row));
  return !boardsEqual(old, board);
}

function moveRight() {
  const old = cloneBoard(board);
  board = board.map(row => slideAndMerge([...row].reverse()).reverse());
  return !boardsEqual(old, board);
}

function moveUp() {
  const old = cloneBoard(board);
  for (let c = 0; c < SIZE; c++) {
    const col = [];
    for (let r = 0; r < SIZE; r++) col.push(board[r][c]);
    const merged = slideAndMerge(col);
    for (let r = 0; r < SIZE; r++) board[r][c] = merged[r];
  }
  return !boardsEqual(old, board);
}

function moveDown() {
  const old = cloneBoard(board);
  for (let c = 0; c < SIZE; c++) {
    const col = [];
    for (let r = 0; r < SIZE; r++) col.push(board[r][c]);
    const merged = slideAndMerge(col.reverse()).reverse();
    for (let r = 0; r < SIZE; r++) board[r][c] = merged[r];
  }
  return !boardsEqual(old, board);
}

function hasMovesLeft() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = board[r][c];
      if (value === 0) return true;
      if (c < SIZE - 1 && value === board[r][c + 1]) return true;
      if (r < SIZE - 1 && value === board[r + 1][c]) return true;
    }
  }
  return false;
}

function handleMove(direction) {
  let moved = false;
  if (direction === 'left') moved = moveLeft();
  if (direction === 'right') moved = moveRight();
  if (direction === 'up') moved = moveUp();
  if (direction === 'down') moved = moveDown();

  if (!moved) return;

  addRandomTile();
  updateScore();
  render();

  const won = board.flat().some(value => value >= 2048);
  if (won) {
    statusEl.textContent = 'Nice — you reached 2048! Keep going if you want.';
    return;
  }

  if (!hasMovesLeft()) {
    statusEl.textContent = 'Game over — no moves left. Press Restart.';
  } else {
    statusEl.textContent = 'Game in progress';
  }
}

function render() {
  boardEl.innerHTML = '';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = board[r][c];
      const cell = document.createElement('div');
      cell.className = `cell ${value ? `v${value}` : 'empty'}`;
      cell.textContent = value ? String(value) : '';
      boardEl.appendChild(cell);
    }
  }
}

document.addEventListener('keydown', (event) => {
  const keyMap = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    a: 'left', A: 'left', d: 'right', D: 'right', w: 'up', W: 'up', s: 'down', S: 'down'
  };

  const direction = keyMap[event.key];
  if (!direction) return;

  if (event.key.startsWith('Arrow')) {
    event.preventDefault();
  }

  handleMove(direction);
});

boardEl.addEventListener('touchstart', (event) => {
  const touch = event.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;
}, { passive: true });

boardEl.addEventListener('touchend', (event) => {
  const touch = event.changedTouches[0];
  const dx = touch.clientX - startX;
  const dy = touch.clientY - startY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (Math.max(absX, absY) < 24) return;

  if (absX > absY) {
    handleMove(dx > 0 ? 'right' : 'left');
  } else {
    handleMove(dy > 0 ? 'down' : 'up');
  }
}, { passive: true });

restartBtn.addEventListener('click', initGame);

initGame();
