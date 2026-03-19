const ROWS = 9;
const COLS = 9;
const MINE_COUNT = 10;

const boardEl = document.getElementById('board');
const minesLeftEl = document.getElementById('mines-left');
const timerEl = document.getElementById('timer');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');

let board = [];
let firstClick = true;
let gameOver = false;
let revealedCount = 0;
let flagsUsed = 0;
let seconds = 0;
let timer = null;

function createBoard() {
  board = [];
  boardEl.innerHTML = '';
  firstClick = true;
  gameOver = false;
  revealedCount = 0;
  flagsUsed = 0;
  seconds = 0;
  updateMinesLeft();
  timerEl.textContent = '0';
  statusEl.textContent = 'Click any cell to begin.';
  stopTimer();

  for (let row = 0; row < ROWS; row++) {
    const currentRow = [];
    for (let col = 0; col < COLS; col++) {
      const cell = {
        row,
        col,
        mine: false,
        revealed: false,
        flagged: false,
        adjacent: 0,
        element: document.createElement('button'),
      };

      cell.element.className = 'cell';
      cell.element.addEventListener('click', () => handleLeftClick(cell));
      cell.element.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        handleRightClick(cell);
      });

      boardEl.appendChild(cell.element);
      currentRow.push(cell);
    }
    board.push(currentRow);
  }
}

function placeMines(safeCell) {
  let placed = 0;
  while (placed < MINE_COUNT) {
    const row = Math.floor(Math.random() * ROWS);
    const col = Math.floor(Math.random() * COLS);
    const cell = board[row][col];
    if (cell.mine) continue;
    if (cell.row === safeCell.row && cell.col === safeCell.col) continue;
    cell.mine = true;
    placed++;
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      board[row][col].adjacent = countAdjacentMines(row, col);
    }
  }
}

function countAdjacentMines(row, col) {
  let count = 0;
  forEachNeighbor(row, col, (neighbor) => {
    if (neighbor.mine) count++;
  });
  return count;
}

function forEachNeighbor(row, col, callback) {
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r === row && c === col) continue;
      if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue;
      callback(board[r][c]);
    }
  }
}

function handleLeftClick(cell) {
  if (gameOver || cell.flagged) return;

  if (cell.revealed) {
    const didFlag = autoFlagFromNumber(cell);
    if (!didFlag) {
      autoRevealFromNumber(cell);
    }
    checkWin();
    return;
  }

  if (firstClick) {
    placeMines(cell);
    startTimer();
    firstClick = false;
    statusEl.textContent = 'Game in progress';
  }

  revealCell(cell);
  checkWin();
}

function handleRightClick(cell) {
  if (gameOver || cell.revealed) return;

  cell.flagged = !cell.flagged;
  cell.element.textContent = cell.flagged ? '🚩' : '';
  cell.element.classList.toggle('flagged', cell.flagged);
  flagsUsed += cell.flagged ? 1 : -1;
  updateMinesLeft();
}

function revealCell(cell) {
  if (cell.revealed || cell.flagged) return;

  cell.revealed = true;
  cell.element.classList.add('revealed');
  revealedCount++;

  if (cell.mine) {
    cell.element.textContent = '💣';
    cell.element.classList.add('mine');
    loseGame();
    return;
  }

  if (cell.adjacent > 0) {
    cell.element.textContent = String(cell.adjacent);
    cell.element.classList.add(`n${cell.adjacent}`);
    return;
  }

  forEachNeighbor(cell.row, cell.col, (neighbor) => {
    if (!neighbor.revealed) revealCell(neighbor);
  });
}

function getNeighborState(cell) {
  const hidden = [];
  const flagged = [];

  forEachNeighbor(cell.row, cell.col, (neighbor) => {
    if (neighbor.flagged) {
      flagged.push(neighbor);
    } else if (!neighbor.revealed) {
      hidden.push(neighbor);
    }
  });

  return { hidden, flagged };
}

function setFlag(cell, flagged) {
  if (cell.revealed || cell.flagged === flagged) return;
  cell.flagged = flagged;
  cell.element.textContent = flagged ? '🚩' : '';
  cell.element.classList.toggle('flagged', flagged);
  flagsUsed += flagged ? 1 : -1;
  updateMinesLeft();
}

function autoFlagFromNumber(cell) {
  if (!cell.revealed || cell.adjacent <= 0) return false;

  const { hidden, flagged } = getNeighborState(cell);
  const remainingMines = cell.adjacent - flagged.length;

  if (hidden.length === 0 || remainingMines <= 0) return false;

  if (hidden.length === remainingMines) {
    hidden.forEach((neighbor) => setFlag(neighbor, true));
    statusEl.textContent = `Auto-flagged ${hidden.length} mine${hidden.length === 1 ? '' : 's'} from the ${cell.adjacent}.`;
    return true;
  }

  return false;
}

function autoRevealFromNumber(cell) {
  if (!cell.revealed || cell.adjacent <= 0 || gameOver) return false;

  const { hidden, flagged } = getNeighborState(cell);

  if (hidden.length === 0 || flagged.length !== cell.adjacent) return false;

  hidden.forEach((neighbor) => revealCell(neighbor));

  if (!gameOver) {
    statusEl.textContent = `Auto-opened ${hidden.length} safe cell${hidden.length === 1 ? '' : 's'} from the ${cell.adjacent}.`;
  }

  return true;
}

function revealAllMines() {
  board.flat().forEach((cell) => {
    if (cell.mine) {
      cell.element.textContent = '💣';
      cell.element.classList.add('revealed', 'mine');
    }
  });
}

function loseGame() {
  gameOver = true;
  stopTimer();
  revealAllMines();
  statusEl.textContent = 'You hit a mine. Press Restart to try again.';
}

function checkWin() {
  const safeCells = ROWS * COLS - MINE_COUNT;
  if (revealedCount === safeCells && !gameOver) {
    gameOver = true;
    stopTimer();
    statusEl.textContent = `You won in ${seconds} second${seconds === 1 ? '' : 's'}!`;
    board.flat().forEach((cell) => {
      if (cell.mine && !cell.flagged) {
        cell.flagged = true;
        cell.element.textContent = '🚩';
        cell.element.classList.add('flagged');
      }
    });
    flagsUsed = MINE_COUNT;
    updateMinesLeft();
  }
}

function updateMinesLeft() {
  minesLeftEl.textContent = String(MINE_COUNT - flagsUsed);
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    seconds += 1;
    timerEl.textContent = String(seconds);
  }, 1000);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

resetBtn.addEventListener('click', createBoard);

createBoard();
