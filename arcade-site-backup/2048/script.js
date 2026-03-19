const SIZE = 4;
const MOVE_DURATION = 150;
const SPAWN_DELAY = 40;
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
let isAnimating = false;
let tileLayerEl = null;

bestEl.textContent = String(Number(localStorage.getItem(bestKey) || 0));
setupBoard();

function setupBoard() {
  boardEl.innerHTML = '';

  const backgroundLayer = document.createElement('div');
  backgroundLayer.className = 'board-background';

  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell empty';
    backgroundLayer.appendChild(cell);
  }

  tileLayerEl = document.createElement('div');
  tileLayerEl.className = 'tile-layer';

  boardEl.append(backgroundLayer, tileLayerEl);
}

function createEmptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function initGame() {
  board = createEmptyBoard();
  score = 0;
  isAnimating = false;
  updateScore();
  addRandomTile();
  addRandomTile();
  statusEl.textContent = 'Press any arrow key or swipe to begin.';
  renderBoard(board, { newTiles: getFilledCells(board) });
}

function updateScore() {
  scoreEl.textContent = String(score);
  const best = Math.max(score, Number(localStorage.getItem(bestKey) || 0));
  localStorage.setItem(bestKey, String(best));
  bestEl.textContent = String(best);
}

function getFilledCells(grid) {
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c]) cells.push(keyOf(r, c));
    }
  }
  return cells;
}

function addRandomTile(targetBoard = board) {
  const empty = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (targetBoard[r][c] === 0) empty.push({ r, c });
    }
  }

  if (!empty.length) return null;
  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  targetBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return { r, c, value: targetBoard[r][c] };
}

function cloneBoard(input) {
  return input.map(row => [...row]);
}

function boardsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function keyOf(r, c) {
  return `${r}-${c}`;
}

function positionFor(r, c) {
  return {
    x: `calc(${c} * ((100% - 30px) / 4) + ${c} * 10px)`,
    y: `calc(${r} * ((100% - 30px) / 4) + ${r} * 10px)`
  };
}

function buildTile(value, r, c, extraClasses = []) {
  const tile = document.createElement('div');
  tile.className = ['tile', `v${value}`, ...extraClasses].join(' ');
  tile.textContent = String(value);
  const { x, y } = positionFor(r, c);
  tile.style.left = x;
  tile.style.top = y;
  return tile;
}

function renderBoard(grid, { newTiles = [], mergedTiles = [], hiddenTiles = [] } = {}) {
  const newSet = new Set(newTiles);
  const mergedSet = new Set(mergedTiles);
  const hiddenSet = new Set(hiddenTiles);

  tileLayerEl.innerHTML = '';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = grid[r][c];
      if (!value) continue;
      const classes = [];
      const key = keyOf(r, c);
      if (newSet.has(key)) classes.push('tile-new');
      if (mergedSet.has(key)) classes.push('tile-merged');
      if (hiddenSet.has(key)) classes.push('tile-hidden');
      tileLayerEl.appendChild(buildTile(value, r, c, classes));
    }
  }
}

function processLine(cells) {
  const nonEmpty = cells.filter(cell => cell.value !== 0);
  const result = Array(SIZE).fill(0);
  const moves = [];
  const mergeTargets = [];
  let targetIndex = 0;

  for (let i = 0; i < nonEmpty.length; i++) {
    const current = nonEmpty[i];
    const next = nonEmpty[i + 1];

    if (next && next.value === current.value) {
      const mergedValue = current.value * 2;
      result[targetIndex] = mergedValue;
      moves.push({ from: current, toIndex: targetIndex, value: current.value });
      moves.push({ from: next, toIndex: targetIndex, value: next.value });
      mergeTargets.push({ index: targetIndex, value: mergedValue });
      score += mergedValue;
      i++;
    } else {
      result[targetIndex] = current.value;
      moves.push({ from: current, toIndex: targetIndex, value: current.value });
    }

    targetIndex++;
  }

  return { result, moves, mergeTargets };
}

function applyMove(direction) {
  const oldBoard = cloneBoard(board);
  const nextBoard = createEmptyBoard();
  const moves = [];
  const mergeTargets = [];

  if (direction === 'left' || direction === 'right') {
    for (let r = 0; r < SIZE; r++) {
      const cells = [];
      for (let i = 0; i < SIZE; i++) {
        const c = direction === 'left' ? i : SIZE - 1 - i;
        cells.push({ r, c, value: oldBoard[r][c] });
      }

      const line = processLine(cells);
      for (let i = 0; i < SIZE; i++) {
        const c = direction === 'left' ? i : SIZE - 1 - i;
        nextBoard[r][c] = line.result[i];
      }

      for (const move of line.moves) {
        const c = direction === 'left' ? move.toIndex : SIZE - 1 - move.toIndex;
        moves.push({ from: move.from, to: { r, c }, value: move.value });
      }

      for (const merge of line.mergeTargets) {
        const c = direction === 'left' ? merge.index : SIZE - 1 - merge.index;
        mergeTargets.push({ r, c, value: merge.value });
      }
    }
  } else {
    for (let c = 0; c < SIZE; c++) {
      const cells = [];
      for (let i = 0; i < SIZE; i++) {
        const r = direction === 'up' ? i : SIZE - 1 - i;
        cells.push({ r, c, value: oldBoard[r][c] });
      }

      const line = processLine(cells);
      for (let i = 0; i < SIZE; i++) {
        const r = direction === 'up' ? i : SIZE - 1 - i;
        nextBoard[r][c] = line.result[i];
      }

      for (const move of line.moves) {
        const r = direction === 'up' ? move.toIndex : SIZE - 1 - move.toIndex;
        moves.push({ from: move.from, to: { r, c }, value: move.value });
      }

      for (const merge of line.mergeTargets) {
        const r = direction === 'up' ? merge.index : SIZE - 1 - merge.index;
        mergeTargets.push({ r, c, value: merge.value });
      }
    }
  }

  return {
    moved: !boardsEqual(oldBoard, nextBoard),
    oldBoard,
    nextBoard,
    moves,
    mergeTargets
  };
}

function animateMove(oldBoard, nextBoard, moves, mergeTargets, spawnedTile) {
  isAnimating = true;

  const hiddenTargets = [...new Set(moves.map(({ to }) => keyOf(to.r, to.c)))];
  renderBoard(nextBoard, { hiddenTiles: hiddenTargets });

  const overlay = document.createElement('div');
  overlay.className = 'tile-overlay';

  for (const move of moves) {
    if (!move.value) continue;
    const tile = buildTile(move.value, move.from.r, move.from.c, ['tile-moving']);
    const deltaX = move.to.c - move.from.c;
    const deltaY = move.to.r - move.from.r;
    tile.style.setProperty('--move-x', `calc(${deltaX} * ((100% - 30px) / 4) + ${deltaX} * 10px)`);
    tile.style.setProperty('--move-y', `calc(${deltaY} * ((100% - 30px) / 4) + ${deltaY} * 10px)`);
    overlay.appendChild(tile);
  }

  boardEl.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.querySelectorAll('.tile-moving').forEach(tile => tile.classList.add('is-moving'));
  });

  window.setTimeout(() => {
    overlay.remove();
    renderBoard(nextBoard, {
      mergedTiles: mergeTargets.map(({ r, c }) => keyOf(r, c)),
      newTiles: spawnedTile ? [keyOf(spawnedTile.r, spawnedTile.c)] : []
    });
    isAnimating = false;
  }, MOVE_DURATION + SPAWN_DELAY);
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
  if (isAnimating) return;

  const previousScore = score;
  const move = applyMove(direction);
  if (!move.moved) {
    score = previousScore;
    return;
  }

  board = move.nextBoard;
  const spawnedTile = addRandomTile(board);
  updateScore();
  animateMove(move.oldBoard, board, move.moves, move.mergeTargets, spawnedTile);

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
  if (isAnimating) return;

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
