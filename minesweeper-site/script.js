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
  statusEl.textContent = '点击任意格开始';
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
  if (gameOver || cell.flagged || cell.revealed) return;

  if (firstClick) {
    placeMines(cell);
    startTimer();
    firstClick = false;
    statusEl.textContent = '游戏进行中';
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
  statusEl.textContent = '你踩到雷了，点“重新开始”再来一局';
}

function checkWin() {
  const safeCells = ROWS * COLS - MINE_COUNT;
  if (revealedCount === safeCells && !gameOver) {
    gameOver = true;
    stopTimer();
    statusEl.textContent = `你赢了！用时 ${seconds} 秒`;
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
