const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const controlButtons = document.querySelectorAll(".control");

const gridSize = 20;
const tileCount = canvas.width / gridSize;
const speed = 120;

let snake;
let direction;
let nextDirection;
let food;
let score;
let running;
let paused;
let gameLoop;

const bestScoreKey = "snake_best_score";
const savedBest = Number(localStorage.getItem(bestScoreKey) || 0);
bestEl.textContent = savedBest;

function randomPosition() {
  return {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount),
  };
}

function placeFood() {
  do {
    food = randomPosition();
  } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
}

function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  running = false;
  paused = false;
  scoreEl.textContent = score;
  statusEl.textContent = "Click the board or press a direction key to begin.";
  placeFood();
  draw();
  stopLoop();
}

function startGame() {
  if (running) return;
  running = true;
  paused = false;
  statusEl.textContent = "Game in progress";
  stopLoop();
  gameLoop = setInterval(update, speed);
}

function stopLoop() {
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }
}

function pauseGame() {
  if (!running) return;
  paused = !paused;
  statusEl.textContent = paused ? "Paused — press Space or tap Pause to continue." : "Game in progress";
}

function update() {
  if (paused) return;

  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  const hitWall = head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount;
  const hitSelf = snake.some(segment => segment.x === head.x && segment.y === head.y);

  if (hitWall || hitSelf) {
    gameOver();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 1;
    scoreEl.textContent = score;
    const best = Math.max(score, Number(localStorage.getItem(bestScoreKey) || 0));
    localStorage.setItem(bestScoreKey, best);
    bestEl.textContent = best;
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

function gameOver() {
  running = false;
  stopLoop();
  statusEl.textContent = `Game over — score ${score}. Press Enter or tap Restart.`;
  draw(true);
}

function draw(gameOverState = false) {
  ctx.fillStyle = "#eff6ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < tileCount; i++) {
    for (let j = 0; j < tileCount; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? "#dbeafe" : "#bfdbfe";
      ctx.fillRect(i * gridSize, j * gridSize, gridSize - 1, gridSize - 1);
    }
  }

  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize / 2.5, 0, Math.PI * 2);
  ctx.fill();

  snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? "#0f766e" : "#14b8a6";
    ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
  });

  if (gameOverState) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.32)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 32px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2);
  }
}

function setDirection(x, y) {
  if (!running) startGame();
  if (x === -direction.x && y === -direction.y) return;
  nextDirection = { x, y };
}

function handleDirectionName(name) {
  switch (name) {
    case "up":
      setDirection(0, -1);
      break;
    case "down":
      setDirection(0, 1);
      break;
    case "left":
      setDirection(-1, 0);
      break;
    case "right":
      setDirection(1, 0);
      break;
  }
}

document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowUp":
      event.preventDefault();
    case "w":
    case "W":
      setDirection(0, -1);
      break;
    case "ArrowDown":
      event.preventDefault();
    case "s":
    case "S":
      setDirection(0, 1);
      break;
    case "ArrowLeft":
      event.preventDefault();
    case "a":
    case "A":
      setDirection(-1, 0);
      break;
    case "ArrowRight":
      event.preventDefault();
    case "d":
    case "D":
      setDirection(1, 0);
      break;
    case " ":
      event.preventDefault();
      if (running) pauseGame();
      break;
    case "Enter":
      resetGame();
      startGame();
      break;
  }
});

canvas.addEventListener("click", () => {
  if (!running) {
    startGame();
  }
});

controlButtons.forEach((button) => {
  const activate = (event) => {
    event.preventDefault();
    const { direction: dir, action } = button.dataset;

    if (dir) {
      handleDirectionName(dir);
      return;
    }

    if (action === "pause") {
      if (!running) {
        startGame();
      } else {
        pauseGame();
      }
      return;
    }

    if (action === "restart") {
      resetGame();
      startGame();
    }
  };

  button.addEventListener("click", activate);
  button.addEventListener("touchstart", activate, { passive: false });
});

resetGame();
