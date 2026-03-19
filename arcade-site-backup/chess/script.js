const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const turnIndicatorEl = document.getElementById('turn-indicator');
const modeIndicatorEl = document.getElementById('mode-indicator');
const modeSelectEl = document.getElementById('mode-select');
const sideSelectEl = document.getElementById('side-select');
const sideGroupEl = document.querySelector('.side-group');
const newGameBtn = document.getElementById('new-game-btn');
const capturedWhiteEl = document.getElementById('captured-white');
const capturedBlackEl = document.getElementById('captured-black');

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const PIECES = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
};
const PIECE_VALUES = { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000 };
const KNIGHT_OFFSETS = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const KING_OFFSETS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

let state = null;
let selected = null;
let legalMoves = [];
let aiTimer = null;

function createInitialBoard() {
  const back = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));

  for (let col = 0; col < 8; col++) {
    board[0][col] = { color: 'black', type: back[col] };
    board[1][col] = { color: 'black', type: 'pawn' };
    board[6][col] = { color: 'white', type: 'pawn' };
    board[7][col] = { color: 'white', type: back[col] };
  }

  return board;
}

function createInitialState() {
  return {
    board: createInitialBoard(),
    turn: 'white',
    mode: modeSelectEl.value,
    humanColor: sideSelectEl.value,
    castling: {
      white: { kingSide: true, queenSide: true },
      black: { kingSide: true, queenSide: true }
    },
    enPassant: null,
    capturedWhite: [],
    capturedBlack: [],
    status: 'White to move.',
    result: null,
    lastMove: null
  };
}

function cloneState(input) {
  return {
    ...input,
    board: input.board.map(row => row.map(piece => piece ? { ...piece } : null)),
    castling: {
      white: { ...input.castling.white },
      black: { ...input.castling.black }
    },
    enPassant: input.enPassant ? { ...input.enPassant } : null,
    capturedWhite: [...input.capturedWhite],
    capturedBlack: [...input.capturedBlack],
    lastMove: input.lastMove ? { ...input.lastMove } : null
  };
}

function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function opposite(color) {
  return color === 'white' ? 'black' : 'white';
}

function getModeLabel(mode) {
  return ({ human: 'Two Players', 'ai-easy': 'AI Easy', 'ai-medium': 'AI Medium', 'ai-hard': 'AI Hard' })[mode] || 'Two Players';
}

function coordToName(row, col) {
  return `${FILES[col]}${8 - row}`;
}

function getPiece(board, row, col) {
  return inBounds(row, col) ? board[row][col] : null;
}

function isSquareAttacked(board, row, col, byColor) {
  const pawnDir = byColor === 'white' ? -1 : 1;
  for (const dc of [-1, 1]) {
    const pawn = getPiece(board, row - pawnDir, col + dc);
    if (pawn && pawn.color === byColor && pawn.type === 'pawn') return true;
  }

  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const piece = getPiece(board, row + dr, col + dc);
    if (piece && piece.color === byColor && piece.type === 'knight') return true;
  }

  const straightDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dr, dc] of straightDirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const piece = board[r][c];
      if (piece) {
        if (piece.color === byColor && (piece.type === 'rook' || piece.type === 'queen')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [dr, dc] of diagDirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const piece = board[r][c];
      if (piece) {
        if (piece.color === byColor && (piece.type === 'bishop' || piece.type === 'queen')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  for (const [dr, dc] of KING_OFFSETS) {
    const piece = getPiece(board, row + dr, col + dc);
    if (piece && piece.color === byColor && piece.type === 'king') return true;
  }

  return false;
}

function findKing(board, color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color && piece.type === 'king') return { row, col };
    }
  }
  return null;
}

function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king.row, king.col, opposite(color));
}

function pushSlidingMoves(board, moves, row, col, color, dirs) {
  for (const [dr, dc] of dirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const target = board[r][c];
      if (!target) {
        moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c });
      } else {
        if (target.color !== color) {
          moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c });
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

function getPseudoMoves(stateInput, row, col) {
  const board = stateInput.board;
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const { color, type } = piece;

  if (type === 'pawn') {
    const dir = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    const oneAhead = row + dir;
    if (inBounds(oneAhead, col) && !board[oneAhead][col]) {
      moves.push({ fromRow: row, fromCol: col, toRow: oneAhead, toCol: col });
      const twoAhead = row + dir * 2;
      if (row === startRow && !board[twoAhead][col]) {
        moves.push({ fromRow: row, fromCol: col, toRow: twoAhead, toCol: col, doubleStep: true });
      }
    }

    for (const dc of [-1, 1]) {
      const targetRow = row + dir;
      const targetCol = col + dc;
      if (!inBounds(targetRow, targetCol)) continue;
      const target = board[targetRow][targetCol];
      if (target && target.color !== color) {
        moves.push({ fromRow: row, fromCol: col, toRow: targetRow, toCol: targetCol });
      }
      if (stateInput.enPassant && stateInput.enPassant.row === targetRow && stateInput.enPassant.col === targetCol) {
        moves.push({ fromRow: row, fromCol: col, toRow: targetRow, toCol: targetCol, enPassant: true });
      }
    }
  }

  if (type === 'knight') {
    for (const [dr, dc] of KNIGHT_OFFSETS) {
      const r = row + dr;
      const c = col + dc;
      if (!inBounds(r, c)) continue;
      const target = board[r][c];
      if (!target || target.color !== color) {
        moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c });
      }
    }
  }

  if (type === 'bishop') pushSlidingMoves(board, moves, row, col, color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
  if (type === 'rook') pushSlidingMoves(board, moves, row, col, color, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
  if (type === 'queen') pushSlidingMoves(board, moves, row, col, color, [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]);

  if (type === 'king') {
    for (const [dr, dc] of KING_OFFSETS) {
      const r = row + dr;
      const c = col + dc;
      if (!inBounds(r, c)) continue;
      const target = board[r][c];
      if (!target || target.color !== color) {
        moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c });
      }
    }

    const rights = stateInput.castling[color];
    const homeRow = color === 'white' ? 7 : 0;
    if (row === homeRow && col === 4 && !isInCheck(board, color)) {
      if (rights.kingSide && !board[homeRow][5] && !board[homeRow][6] &&
          board[homeRow][7]?.type === 'rook' && board[homeRow][7]?.color === color &&
          !isSquareAttacked(board, homeRow, 5, opposite(color)) && !isSquareAttacked(board, homeRow, 6, opposite(color))) {
        moves.push({ fromRow: row, fromCol: col, toRow: homeRow, toCol: 6, castle: 'kingSide' });
      }
      if (rights.queenSide && !board[homeRow][1] && !board[homeRow][2] && !board[homeRow][3] &&
          board[homeRow][0]?.type === 'rook' && board[homeRow][0]?.color === color &&
          !isSquareAttacked(board, homeRow, 3, opposite(color)) && !isSquareAttacked(board, homeRow, 2, opposite(color))) {
        moves.push({ fromRow: row, fromCol: col, toRow: homeRow, toCol: 2, castle: 'queenSide' });
      }
    }
  }

  return moves;
}

function applyMove(stateInput, move) {
  const next = cloneState(stateInput);
  const piece = next.board[move.fromRow][move.fromCol];
  const target = next.board[move.toRow][move.toCol];
  const moverColor = piece.color;

  if (target) {
    if (moverColor === 'white') next.capturedWhite.push(target);
    else next.capturedBlack.push(target);
  }

  next.board[move.fromRow][move.fromCol] = null;

  if (move.enPassant) {
    const captureRow = move.fromRow;
    const capturedPawn = next.board[captureRow][move.toCol];
    if (capturedPawn) {
      if (moverColor === 'white') next.capturedWhite.push(capturedPawn);
      else next.capturedBlack.push(capturedPawn);
    }
    next.board[captureRow][move.toCol] = null;
  }

  next.board[move.toRow][move.toCol] = piece;

  if (piece.type === 'king') {
    next.castling[moverColor].kingSide = false;
    next.castling[moverColor].queenSide = false;
    if (move.castle === 'kingSide') {
      next.board[move.toRow][5] = next.board[move.toRow][7];
      next.board[move.toRow][7] = null;
    }
    if (move.castle === 'queenSide') {
      next.board[move.toRow][3] = next.board[move.toRow][0];
      next.board[move.toRow][0] = null;
    }
  }

  if (piece.type === 'rook') {
    if (move.fromRow === 7 && move.fromCol === 0) next.castling.white.queenSide = false;
    if (move.fromRow === 7 && move.fromCol === 7) next.castling.white.kingSide = false;
    if (move.fromRow === 0 && move.fromCol === 0) next.castling.black.queenSide = false;
    if (move.fromRow === 0 && move.fromCol === 7) next.castling.black.kingSide = false;
  }

  if (target?.type === 'rook') {
    if (move.toRow === 7 && move.toCol === 0) next.castling.white.queenSide = false;
    if (move.toRow === 7 && move.toCol === 7) next.castling.white.kingSide = false;
    if (move.toRow === 0 && move.toCol === 0) next.castling.black.queenSide = false;
    if (move.toRow === 0 && move.toCol === 7) next.castling.black.kingSide = false;
  }

  if (piece.type === 'pawn' && (move.toRow === 0 || move.toRow === 7)) {
    next.board[move.toRow][move.toCol] = { color: moverColor, type: 'queen' };
    move.promotion = 'queen';
  }

  if (piece.type === 'pawn' && Math.abs(move.toRow - move.fromRow) === 2) {
    next.enPassant = { row: (move.toRow + move.fromRow) / 2, col: move.fromCol };
  } else {
    next.enPassant = null;
  }

  next.turn = opposite(stateInput.turn);
  next.lastMove = { ...move, piece: piece.type, color: moverColor };
  return next;
}

function getLegalMovesForPiece(stateInput, row, col) {
  const piece = stateInput.board[row][col];
  if (!piece || piece.color !== stateInput.turn) return [];
  const pseudo = getPseudoMoves(stateInput, row, col);
  return pseudo.filter((move) => {
    const preview = applyMove(stateInput, { ...move });
    return !isInCheck(preview.board, piece.color);
  });
}

function getAllLegalMoves(stateInput, color = stateInput.turn) {
  const originalTurn = stateInput.turn;
  stateInput.turn = color;
  const moves = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = stateInput.board[row][col];
      if (!piece || piece.color !== color) continue;
      for (const move of getLegalMovesForPiece(stateInput, row, col)) {
        moves.push(move);
      }
    }
  }
  stateInput.turn = originalTurn;
  return moves;
}

function getQueenThreatMap(board) {
  const threatened = new Set();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.type !== 'queen') continue;
      if (isSquareAttacked(board, row, col, opposite(piece.color))) {
        threatened.add(`${row},${col}`);
      }
    }
  }
  return threatened;
}

function evaluateBoard(stateInput, color) {
  let score = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = stateInput.board[row][col];
      if (!piece) continue;
      const sign = piece.color === color ? 1 : -1;
      score += PIECE_VALUES[piece.type] * sign;

      const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);
      if (piece.type !== 'king') score += (4 - centerDist) * 4 * sign;
      if (piece.type === 'pawn') score += ((piece.color === 'white' ? (6 - row) : (row - 1)) * 8) * sign;
    }
  }

  const ownMoves = getAllLegalMoves(cloneState(stateInput), color).length;
  const enemyMoves = getAllLegalMoves(cloneState(stateInput), opposite(color)).length;
  score += (ownMoves - enemyMoves) * 3;
  return score;
}

function minimax(stateInput, depth, alpha, beta, maximizingColor) {
  const currentColor = stateInput.turn;
  const moves = getAllLegalMoves(cloneState(stateInput), currentColor);

  if (depth === 0 || moves.length === 0) {
    if (moves.length === 0) {
      if (isInCheck(stateInput.board, currentColor)) {
        return { score: currentColor === maximizingColor ? -999999 : 999999 };
      }
      return { score: 0 };
    }
    return { score: evaluateBoard(stateInput, maximizingColor) };
  }

  let bestMove = moves[0];

  if (currentColor === maximizingColor) {
    let bestScore = -Infinity;
    for (const move of moves) {
      const result = minimax(applyMove(stateInput, { ...move }), depth - 1, alpha, beta, maximizingColor);
      if (result.score > bestScore) {
        bestScore = result.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }
    return { score: bestScore, move: bestMove };
  }

  let bestScore = Infinity;
  for (const move of moves) {
    const result = minimax(applyMove(stateInput, { ...move }), depth - 1, alpha, beta, maximizingColor);
    if (result.score < bestScore) {
      bestScore = result.score;
      bestMove = move;
    }
    beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }
  return { score: bestScore, move: bestMove };
}

function chooseAiMove() {
  const color = state.turn;
  const moves = getAllLegalMoves(cloneState(state), color);
  if (!moves.length) return null;

  const mode = state.mode;
  if (mode === 'ai-easy') {
    const weighted = moves
      .map(move => {
        const target = state.board[move.toRow][move.toCol];
        const score = (target ? PIECE_VALUES[target.type] : 0) + Math.random() * 60;
        return { move, score };
      })
      .sort((a, b) => b.score - a.score);
    return weighted[Math.floor(Math.random() * Math.min(3, weighted.length))].move;
  }

  const depth = mode === 'ai-medium' ? 2 : 3;
  return minimax(cloneState(state), depth, -Infinity, Infinity, color).move;
}

function refreshGameStatus() {
  const moves = getAllLegalMoves(cloneState(state), state.turn);
  const inCheck = isInCheck(state.board, state.turn);

  if (!moves.length) {
    if (inCheck) {
      state.result = 'checkmate';
      state.status = `Checkmate — ${state.turn === 'white' ? 'Black' : 'White'} wins.`;
    } else {
      state.result = 'stalemate';
      state.status = 'Stalemate — draw.';
    }
    return;
  }

  state.result = null;
  state.status = `${capitalize(state.turn)} to move${inCheck ? ' — check.' : '.'}`;
}

function capitalize(text) {
  return text[0].toUpperCase() + text.slice(1);
}

function pieceAriaLabel(piece) {
  return `${capitalize(piece.color)} ${piece.type}`;
}

function createSvgPiece(piece, small = false) {
  const wrapper = document.createElement('span');
  wrapper.className = `${small ? 'captured-piece' : 'piece'} ${piece.color} ${piece.type}`;
  wrapper.setAttribute('role', 'img');
  wrapper.setAttribute('aria-label', pieceAriaLabel(piece));
  wrapper.innerHTML = getPieceSvgMarkup(piece.type);
  return wrapper;
}

function getPieceSvgMarkup(type) {
  const shared = `
    <defs>
      <linearGradient id="mainGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--piece-main)" />
        <stop offset="100%" stop-color="var(--piece-secondary)" />
      </linearGradient>
      <linearGradient id="shineGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,0.95)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="88" rx="22" ry="6" fill="var(--piece-shadow)" />
  `;

  const frameStart = `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${shared}`;
  const frameEnd = `</svg>`;

  const bodies = {
    pawn: `
      <circle cx="50" cy="28" r="10" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3.2" />
      <path d="M37 71c2-14 6-20 13-26 7 6 11 12 13 26" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3.2" stroke-linejoin="round" />
      <rect x="34" y="71" width="32" height="7" rx="3.5" fill="var(--piece-tertiary)" stroke="var(--piece-stroke)" stroke-width="3" />
      <rect x="28" y="79" width="44" height="7" rx="3.5" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3" />
      <path d="M42 23c4-4 12-4 16 0" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="2.5" stroke-linecap="round" />
    `,
    rook: `
      <path d="M31 24h8v8h6v-8h10v8h6v-8h8v12H31z" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3" stroke-linejoin="round" />
      <path d="M35 36h30l-3 12 5 20H33l5-20z" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3.2" stroke-linejoin="round" />
      <rect x="30" y="69" width="40" height="7" rx="3.5" fill="var(--piece-tertiary)" stroke="var(--piece-stroke)" stroke-width="3" />
      <rect x="24" y="78" width="52" height="8" rx="4" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3" />
      <path d="M38 42h24" stroke="rgba(255,255,255,0.52)" stroke-width="2.4" stroke-linecap="round" />
    `,
    knight: `
      <path d="M63 28c-4-4-11-6-17-2-9 6-7 17-13 20-6 3-8 10-6 19h37c-1-6 0-11 5-16 3-3 6-8 4-14-1-4-4-6-10-7z" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3.2" stroke-linejoin="round" />
      <path d="M45 40c6 0 12-4 15-8" fill="none" stroke="var(--piece-stroke)" stroke-width="3" stroke-linecap="round" />
      <circle cx="55" cy="35" r="2.5" fill="var(--piece-stroke)" />
      <rect x="31" y="69" width="38" height="7" rx="3.5" fill="var(--piece-tertiary)" stroke="var(--piece-stroke)" stroke-width="3" />
      <rect x="25" y="78" width="50" height="8" rx="4" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3" />
      <path d="M44 31c4-4 10-4 14-1" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="2.4" stroke-linecap="round" />
    `,
    bishop: `
      <path d="M50 20l7 8-4 6 6 8c5 6 5 14 1 23H40c-4-9-4-17 1-23l6-8-4-6z" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3.2" stroke-linejoin="round" />
      <path d="M50 24l-4 14" stroke="var(--piece-stroke)" stroke-width="3" stroke-linecap="round" />
      <circle cx="50" cy="18" r="4.5" fill="var(--piece-tertiary)" stroke="var(--piece-stroke)" stroke-width="3" />
      <rect x="32" y="69" width="36" height="7" rx="3.5" fill="var(--piece-tertiary)" stroke="var(--piece-stroke)" stroke-width="3" />
      <rect x="26" y="78" width="48" height="8" rx="4" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3" />
      <path d="M45 30c4-3 8-3 11 0" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2.3" stroke-linecap="round" />
    `,
    queen: `
      <circle cx="32" cy="24" r="4.5" fill="var(--piece-tertiary)" stroke="var(--piece-stroke)" stroke-width="3" />
      <circle cx="44" cy="18" r="4.5" fill="var(--piece-tertiary)" stroke="var(--piece-stroke)" stroke-width="3" />
      <circle cx="56" cy="18" r="4.5" fill="var(--piece-tertiary)" stroke="var(--piece-stroke)" stroke-width="3" />
      <circle cx="68" cy="24" r="4.5" fill="var(--piece-tertiary)" stroke="var(--piece-stroke)" stroke-width="3" />
      <path d="M31 29l8 12 11-15 11 15 8-12 4 7-8 30H35l-8-30z" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3.2" stroke-linejoin="round" />
      <path d="M38 48h24" stroke="rgba(255,255,255,0.54)" stroke-width="2.5" stroke-linecap="round" />
      <rect x="31" y="69" width="38" height="7" rx="3.5" fill="var(--piece-tertiary)" stroke="var(--piece-stroke)" stroke-width="3" />
      <rect x="25" y="78" width="50" height="8" rx="4" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3" />
    `,
    king: `
      <path d="M50 14v12" fill="none" stroke="var(--piece-stroke)" stroke-width="3.4" stroke-linecap="round" />
      <path d="M44 20h12" fill="none" stroke="var(--piece-stroke)" stroke-width="3.4" stroke-linecap="round" />
      <path d="M36 32c3-7 9-10 14-10s11 3 14 10l2 8c4 4 6 9 4 17H30c-2-8 0-13 4-17z" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3.2" stroke-linejoin="round" />
      <path d="M41 43h18" stroke="rgba(255,255,255,0.54)" stroke-width="2.4" stroke-linecap="round" />
      <rect x="31" y="61" width="38" height="7" rx="3.5" fill="var(--piece-tertiary)" stroke="var(--piece-stroke)" stroke-width="3" />
      <rect x="28" y="70" width="44" height="7" rx="3.5" fill="var(--piece-tertiary)" stroke="var(--piece-stroke)" stroke-width="3" />
      <rect x="24" y="79" width="52" height="8" rx="4" fill="url(#mainGrad)" stroke="var(--piece-stroke)" stroke-width="3" />
    `
  };

  return `${frameStart}${bodies[type]}${frameEnd}`;
}

function renderCaptured(container, pieces) {
  container.innerHTML = '';
  if (!pieces.length) {
    const empty = document.createElement('span');
    empty.className = 'empty-note';
    empty.textContent = 'None yet';
    container.appendChild(empty);
    return;
  }

  pieces.forEach((piece) => {
    container.appendChild(createSvgPiece(piece, true));
  });
}

function render() {
  boardEl.innerHTML = '';
  const queenThreats = getQueenThreatMap(state.board);
  const checkedKing = findKing(state.board, state.turn);
  const kingInCheck = checkedKing ? isInCheck(state.board, state.turn) : false;

  for (let visualRow = 0; visualRow < 8; visualRow++) {
    for (let visualCol = 0; visualCol < 8; visualCol++) {
      const boardRow = state.humanColor === 'black' ? 7 - visualRow : visualRow;
      const boardCol = state.humanColor === 'black' ? 7 - visualCol : visualCol;
      const piece = state.board[boardRow][boardCol];
      const square = document.createElement('button');
      square.type = 'button';
      square.className = `square ${(boardRow + boardCol) % 2 === 0 ? 'light' : 'dark'}`;
      square.dataset.row = String(boardRow);
      square.dataset.col = String(boardCol);
      square.setAttribute('aria-label', piece ? `${coordToName(boardRow, boardCol)} ${pieceAriaLabel(piece)}` : coordToName(boardRow, boardCol));

      if (selected && selected.row === boardRow && selected.col === boardCol) square.classList.add('selected');
      const moveMatch = legalMoves.find(move => move.toRow === boardRow && move.toCol === boardCol);
      if (moveMatch) square.classList.add(piece ? 'capture' : 'move');
      if (state.lastMove && (
        (state.lastMove.fromRow === boardRow && state.lastMove.fromCol === boardCol) ||
        (state.lastMove.toRow === boardRow && state.lastMove.toCol === boardCol)
      )) {
        square.classList.add('last-move');
      }
      if (checkedKing && checkedKing.row === boardRow && checkedKing.col === boardCol && kingInCheck) {
        square.classList.add('in-check');
      }

      if ((state.humanColor === 'black' ? boardCol === 7 : boardCol === 0)) {
        const rankLabel = document.createElement('span');
        rankLabel.className = 'square-label rank';
        rankLabel.textContent = String(8 - boardRow);
        square.appendChild(rankLabel);
      }

      if ((state.humanColor === 'black' ? boardRow === 0 : boardRow === 7)) {
        const fileLabel = document.createElement('span');
        fileLabel.className = 'square-label file';
        fileLabel.textContent = FILES[boardCol];
        square.appendChild(fileLabel);
      }

      if (piece) {
        const pieceEl = createSvgPiece(piece);
        if (piece.type === 'queen' && queenThreats.has(`${boardRow},${boardCol}`)) {
          pieceEl.classList.add('scared');
        }
        square.appendChild(pieceEl);
      }

      square.addEventListener('click', () => handleSquareClick(boardRow, boardCol));
      boardEl.appendChild(square);
    }
  }

  turnIndicatorEl.textContent = capitalize(state.turn);
  modeIndicatorEl.textContent = getModeLabel(state.mode);
  statusEl.textContent = state.status;
  renderCaptured(capturedWhiteEl, state.capturedWhite);
  renderCaptured(capturedBlackEl, state.capturedBlack);

  syncControlState();
}

function isHumanTurn() {
  return state.mode === 'human' || state.turn === state.humanColor;
}

function handleSquareClick(row, col) {
  if (state.result || !isHumanTurn()) return;
  const piece = state.board[row][col];

  if (selected) {
    const chosenMove = legalMoves.find(move => move.toRow === row && move.toCol === col);
    if (chosenMove) {
      commitMove(chosenMove);
      return;
    }
  }

  if (piece && piece.color === state.turn) {
    selected = { row, col };
    legalMoves = getLegalMovesForPiece(state, row, col);
  } else {
    selected = null;
    legalMoves = [];
  }

  render();
}

function commitMove(move) {
  clearTimeout(aiTimer);
  state = applyMove(state, { ...move });
  selected = null;
  legalMoves = [];
  refreshGameStatus();
  render();
  queueAiTurn();
}

function queueAiTurn() {
  clearTimeout(aiTimer);
  if (state.result || state.mode === 'human' || state.turn === state.humanColor) return;
  aiTimer = setTimeout(() => {
    const move = chooseAiMove();
    if (!move) {
      refreshGameStatus();
      render();
      return;
    }
    commitMove(move);
  }, 220);
}

function syncControlState() {
  const isHumanMode = modeSelectEl.value === 'human';
  sideGroupEl.classList.toggle('hidden', isHumanMode);
}

function startNewGame() {
  clearTimeout(aiTimer);
  selected = null;
  legalMoves = [];
  state = createInitialState();
  refreshGameStatus();
  render();
  queueAiTurn();
}

modeSelectEl.addEventListener('change', () => {
  syncControlState();
  startNewGame();
});

sideSelectEl.addEventListener('change', startNewGame);
newGameBtn.addEventListener('click', startNewGame);

document.addEventListener('keydown', (event) => {
  if (event.key.startsWith('Arrow') || event.key === ' ') {
    event.preventDefault();
  }
});

syncControlState();
startNewGame();
