/**
 * ═══════════════════════════════════════════════════════════════
 *  TIC·TAC·TOE — ARCADE EDITION
 *  game.js — Complete game logic
 *
 *  Features:
 *   • PvP and vs-AI (unbeatable Minimax with α-β pruning) modes
 *   • Score tracking (X wins, O wins, draws) persisted to localStorage
 *   • Winner detection with animated highlight + canvas win-line
 *   • Web Audio API sound effects (no external files needed)
 *   • Result overlay with context-aware messages
 *   • Restart (new round) and Reset (clear scores) controls
 *   • Mute toggle
 *   • Responsive, accessible
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   1. CONSTANTS & CONFIG
───────────────────────────────────────────────────────────── */

/** All possible winning combinations (indices into board array) */
const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

/** AI simulated "thinking" delay in ms — feels more natural */
const AI_DELAY_MS = 420;

/** localStorage key for score persistence */
const STORAGE_KEY = 'ttt_arcade_scores';

/* ─────────────────────────────────────────────────────────────
   2. STATE
───────────────────────────────────────────────────────────── */

let state = {
  /**
   * board: Array of 9 cells. Each is '' | 'X' | 'O'.
   * Index layout:
   *   0 | 1 | 2
   *   3 | 4 | 5
   *   6 | 7 | 8
   */
  board: Array(9).fill(''),

  /** currentPlayer: 'X' | 'O' */
  currentPlayer: 'X',

  /** gameMode: 'pvp' | 'ai' */
  gameMode: 'pvp',

  /** gameOver: true when round is complete */
  gameOver: false,

  /** winner: 'X' | 'O' | 'draw' | null */
  winner: null,

  /** winningCombo: array of 3 indices or null */
  winningCombo: null,

  /** scores: persistent tallies */
  scores: { X: 0, O: 0, draws: 0 },

  /** muted: sound on/off */
  muted: false,
};

/* ─────────────────────────────────────────────────────────────
   3. DOM REFERENCES
───────────────────────────────────────────────────────────── */

const dom = {
  board:          document.getElementById('board'),
  cells:          document.querySelectorAll('.cell'),
  statusText:     document.getElementById('statusText'),
  statusIndicator:document.getElementById('statusIndicator'),
  scoreXVal:      document.getElementById('scoreXVal'),
  scoreOVal:      document.getElementById('scoreOVal'),
  scoreDrawVal:   document.getElementById('scoreDrawVal'),
  scoreCardX:     document.getElementById('scoreX'),
  scoreCardO:     document.getElementById('scoreO'),
  labelX:         document.getElementById('labelX'),
  labelO:         document.getElementById('labelO'),
  btnPvP:         document.getElementById('btnPvP'),
  btnAI:          document.getElementById('btnAI'),
  btnRestart:     document.getElementById('btnRestart'),
  btnReset:       document.getElementById('btnReset'),
  btnMute:        document.getElementById('btnMute'),
  overlay:        document.getElementById('overlay'),
  overlaySymbol:  document.getElementById('overlaySymbol'),
  overlayTitle:   document.getElementById('overlayTitle'),
  overlaySub:     document.getElementById('overlaySub'),
  overlayBtn:     document.getElementById('overlayBtn'),
  winLineCanvas:  document.getElementById('winLineCanvas'),
};

/* ─────────────────────────────────────────────────────────────
   4. WEB AUDIO ENGINE
   All sounds synthesized via Web Audio API — zero external files.
───────────────────────────────────────────────────────────── */

let audioCtx = null;

/** Lazily initialise AudioContext on first user gesture */
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * playTone — plays a synthesised sound effect
 * @param {Object} options - frequency, type, duration, gainPeak, frequencyEnd
 */
function playTone({ frequency = 440, type = 'sine', duration = 0.15, gainPeak = 0.4, frequencyEnd = null, delay = 0 }) {
  if (state.muted) return;
  try {
    const ctx = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

    // Optional frequency sweep
    if (frequencyEnd !== null) {
      osc.frequency.linearRampToValueAtTime(frequencyEnd, ctx.currentTime + delay + duration);
    }

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  } catch (e) {
    // Audio not supported — silently fail
  }
}

/** Individual named sound effects */
const SFX = {
  /** X places a mark — sharp blip */
  placeX() {
    playTone({ frequency: 880, type: 'square', duration: 0.1, gainPeak: 0.25, frequencyEnd: 660 });
  },

  /** O places a mark — softer tone */
  placeO() {
    playTone({ frequency: 440, type: 'sine', duration: 0.12, gainPeak: 0.25, frequencyEnd: 550 });
  },

  /** Win fanfare — ascending arpeggio */
  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      playTone({ frequency: freq, type: 'square', duration: 0.18, gainPeak: 0.2, delay: i * 0.1 });
    });
  },

  /** Draw — descending neutral chord */
  draw() {
    playTone({ frequency: 392, type: 'triangle', duration: 0.3, gainPeak: 0.2, frequencyEnd: 294 });
    playTone({ frequency: 294, type: 'triangle', duration: 0.4, gainPeak: 0.15, delay: 0.1, frequencyEnd: 220 });
  },

  /** Button click — quick tick */
  click() {
    playTone({ frequency: 300, type: 'square', duration: 0.06, gainPeak: 0.15 });
  },

  /** Mode switch */
  modeSwitch() {
    playTone({ frequency: 600, type: 'sine', duration: 0.1, gainPeak: 0.2, frequencyEnd: 800 });
  },
};

/* ─────────────────────────────────────────────────────────────
   5. SCORE PERSISTENCE
───────────────────────────────────────────────────────────── */

function loadScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.scores = { X: saved.X || 0, O: saved.O || 0, draws: saved.draws || 0 };
    }
  } catch (e) {
    // Ignore — use defaults
  }
}

function saveScores() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.scores));
  } catch (e) { /* silent */ }
}

/* ─────────────────────────────────────────────────────────────
   6. CORE GAME LOGIC
───────────────────────────────────────────────────────────── */

/**
 * checkWinner — Scans WIN_COMBOS for a filled triple.
 * @param {string[]} board - 9-element board array
 * @returns {{ winner: string, combo: number[] } | null}
 */
function checkWinner(board) {
  for (const combo of WIN_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo };
    }
  }
  return null;
}

/**
 * isDraw — returns true if board is full with no winner.
 * @param {string[]} board
 */
function isDraw(board) {
  return board.every(cell => cell !== '');
}

/**
 * getEmptyCells — returns indices of empty cells.
 * @param {string[]} board
 */
function getEmptyCells(board) {
  return board.map((v, i) => v === '' ? i : -1).filter(i => i !== -1);
}

/* ─────────────────────────────────────────────────────────────
   7. MINIMAX AI WITH ALPHA-BETA PRUNING
   The AI always plays as 'O'. Minimax explores all futures and
   returns the optimal score. Alpha-beta pruning eliminates
   branches that can't affect the result, making it faster.
───────────────────────────────────────────────────────────── */

/**
 * minimax — recursive minimax with alpha-beta pruning.
 *
 * @param {string[]} board    - current board snapshot
 * @param {boolean}  isMax   - true if maximising ('O'), false if minimising ('X')
 * @param {number}   alpha   - best score maximiser can guarantee
 * @param {number}   beta    - best score minimiser can guarantee
 * @param {number}   depth   - current recursion depth (used for score weighting)
 * @returns {number} heuristic score (+10 = AI wins, -10 = human wins, 0 = draw)
 */
function minimax(board, isMax, alpha, beta, depth) {
  const result = checkWinner(board);

  // Terminal states — weight by depth so AI prefers faster wins
  if (result) {
    return result.winner === 'O' ? 10 - depth : depth - 10;
  }
  if (isDraw(board)) return 0;

  const empty = getEmptyCells(board);

  if (isMax) {
    // AI's turn — maximise score
    let best = -Infinity;
    for (const idx of empty) {
      board[idx] = 'O';
      const score = minimax(board, false, alpha, beta, depth + 1);
      board[idx] = '';
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break; // Beta cutoff — prune remaining branches
    }
    return best;
  } else {
    // Human's turn — minimise score
    let best = Infinity;
    for (const idx of empty) {
      board[idx] = 'X';
      const score = minimax(board, true, alpha, beta, depth + 1);
      board[idx] = '';
      best = Math.min(best, score);
      beta = Math.min(beta, best);
      if (beta <= alpha) break; // Alpha cutoff — prune remaining branches
    }
    return best;
  }
}

/**
 * getBestMove — evaluates all empty cells and returns the index
 * of the optimal move for the AI ('O').
 * @param {string[]} board
 * @returns {number} index of best cell
 */
function getBestMove(board) {
  let bestScore = -Infinity;
  let bestIdx   = -1;

  for (const idx of getEmptyCells(board)) {
    board[idx] = 'O';
    const score = minimax(board, false, -Infinity, Infinity, 0);
    board[idx] = '';
    if (score > bestScore) {
      bestScore = score;
      bestIdx   = idx;
    }
  }
  return bestIdx;
}

/* ─────────────────────────────────────────────────────────────
   8. WIN LINE CANVAS
   Draws an animated glowing line through the winning cells.
───────────────────────────────────────────────────────────── */

/**
 * drawWinLine — animates a neon line through winning cells.
 * @param {number[]} combo - array of 3 winning cell indices
 * @param {string}   player - 'X' | 'O'
 */
function drawWinLine(combo, player) {
  const canvas = dom.winLineCanvas;
  const ctx    = canvas.getContext('2d');
  const rect   = dom.board.getBoundingClientRect();

  canvas.width  = rect.width;
  canvas.height = rect.height;

  // Get center coordinates of each winning cell
  const cellEls = Array.from(dom.cells);
  const centers = combo.map(idx => {
    const cellRect = cellEls[idx].getBoundingClientRect();
    return {
      x: cellRect.left + cellRect.width  / 2 - rect.left,
      y: cellRect.top  + cellRect.height / 2 - rect.top,
    };
  });

  const start = centers[0];
  const end   = centers[2];
  const color = player === 'X' ? '#ff2d78' : '#00f5ff';

  let progress = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    progress = Math.min(progress + 0.07, 1);

    const cx = start.x + (end.x - start.x) * progress;
    const cy = start.y + (end.y - start.y) * progress;

    // Outer glow
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(cx, cy);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 14;
    ctx.globalAlpha = 0.15;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Core line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(cx, cy);
    ctx.lineWidth   = 4;
    ctx.globalAlpha = 0.9;
    ctx.stroke();

    if (progress < 1) {
      requestAnimationFrame(draw);
    }
  }

  requestAnimationFrame(draw);
}

/* ─────────────────────────────────────────────────────────────
   9. UI UPDATE FUNCTIONS
───────────────────────────────────────────────────────────── */

/** updateScoreDisplay — syncs score numbers to DOM */
function updateScoreDisplay() {
  dom.scoreXVal.textContent    = state.scores.X;
  dom.scoreOVal.textContent    = state.scores.O;
  dom.scoreDrawVal.textContent = state.scores.draws;
}

/** updatePlayerLabels — adjusts labels for AI mode */
function updatePlayerLabels() {
  dom.labelX.textContent = 'PLAYER 1';
  dom.labelO.textContent = state.gameMode === 'ai' ? 'AI' : 'PLAYER 2';
}

/** updateStatusBar — reflects current turn or game result */
function updateStatusBar() {
  const ind = dom.statusIndicator;
  const txt = dom.statusText;

  if (state.gameOver) {
    if (state.winner === 'draw') {
      ind.className = 'status-indicator draw';
      txt.textContent = "IT'S A DRAW!";
    } else {
      ind.className = 'status-indicator win';
      const name = state.winner === 'X' ? 'PLAYER 1' :
                   (state.gameMode === 'ai' ? 'AI' : 'PLAYER 2');
      txt.textContent = `${name} WINS!`;
    }
  } else {
    const isX = state.currentPlayer === 'X';
    ind.className = `status-indicator ${isX ? 'x' : 'o'}-turn`;
    const label = isX ? 'PLAYER X' :
                  (state.gameMode === 'ai' ? 'AI' : 'PLAYER O');
    txt.textContent = `${label}'S TURN`;
  }
}

/** highlightActiveScoreCard — glows the current player's card */
function highlightActiveScoreCard() {
  dom.scoreCardX.classList.toggle('active-x', state.currentPlayer === 'X' && !state.gameOver);
  dom.scoreCardO.classList.toggle('active-o', state.currentPlayer === 'O' && !state.gameOver);
}

/** bumpScore — triggers bump animation on a score value */
function bumpScore(player) {
  const el = player === 'X' ? dom.scoreXVal :
             player === 'O' ? dom.scoreOVal : dom.scoreDrawVal;
  el.classList.remove('bump');
  void el.offsetWidth; // Force reflow to restart animation
  el.classList.add('bump');
}

/** showOverlay — displays end-of-round result overlay */
function showOverlay() {
  const { winner, gameMode } = state;

  if (winner === 'draw') {
    dom.overlaySymbol.textContent = '—';
    dom.overlaySymbol.className = 'overlay-symbol draw-sym';
    dom.overlayTitle.textContent = "IT'S A DRAW";
    dom.overlaySub.textContent  = 'NEITHER SIDE PREVAILED';
  } else {
    dom.overlaySymbol.textContent = winner;
    dom.overlaySymbol.className   = `overlay-symbol ${winner.toLowerCase()}`;

    if (gameMode === 'ai' && winner === 'O') {
      dom.overlayTitle.textContent = 'AI WINS';
      dom.overlaySub.textContent  = 'THE MACHINE IS UNBEATABLE\nBETTER LUCK NEXT TIME';
    } else if (gameMode === 'ai' && winner === 'X') {
      dom.overlayTitle.textContent = 'YOU WIN!';
      dom.overlaySub.textContent  = "INCREDIBLE!\nYOU BEAT THE AI!";
    } else {
      dom.overlayTitle.textContent = `PLAYER ${winner} WINS!`;
      dom.overlaySub.textContent  = 'WELL PLAYED!';
    }
  }

  dom.overlay.setAttribute('aria-hidden', 'false');
  dom.overlay.classList.add('active');
}

/** hideOverlay — closes result overlay */
function hideOverlay() {
  dom.overlay.classList.remove('active');
  dom.overlay.setAttribute('aria-hidden', 'true');
}

/* ─────────────────────────────────────────────────────────────
   10. GAME FLOW
───────────────────────────────────────────────────────────── */

/**
 * handleMove — processes a player's move at given cell index.
 * @param {number} index - 0-8 cell index
 */
function handleMove(index) {
  // Guard: cell must be empty, game must be in progress
  if (state.board[index] !== '' || state.gameOver) return;

  const player = state.currentPlayer;

  // Update board state
  state.board[index] = player;

  // Update cell DOM
  const cell = dom.cells[index];
  cell.textContent = player;
  cell.classList.add(player.toLowerCase(), 'played', 'pop');
  cell.disabled = true;
  cell.setAttribute('aria-label', `Cell ${index + 1}: ${player}`);

  // Play placement sound
  player === 'X' ? SFX.placeX() : SFX.placeO();

  // Check for winner
  const result = checkWinner(state.board);
  if (result) {
    endGame(result.winner, result.combo);
    return;
  }

  // Check for draw
  if (isDraw(state.board)) {
    endGame('draw', null);
    return;
  }

  // Switch player
  state.currentPlayer = player === 'X' ? 'O' : 'X';
  updateStatusBar();
  highlightActiveScoreCard();

  // If AI mode and it's AI's turn, trigger AI move
  if (state.gameMode === 'ai' && state.currentPlayer === 'O') {
    scheduleAiMove();
  }
}

/**
 * endGame — called when a winner or draw is detected.
 * @param {string} winner - 'X' | 'O' | 'draw'
 * @param {number[]|null} combo - winning cell indices
 */
function endGame(winner, combo) {
  state.gameOver     = true;
  state.winner       = winner;
  state.winningCombo = combo;

  // Disable all remaining cells
  dom.board.classList.add('disabled');
  dom.cells.forEach(c => { c.disabled = true; });

  if (winner !== 'draw') {
    // Highlight winning cells
    combo.forEach(idx => {
      dom.cells[idx].classList.add('winner');
    });
    // Draw animated win line on canvas
    drawWinLine(combo, winner);
    // Update scores
    state.scores[winner]++;
    bumpScore(winner);
    SFX.win();
  } else {
    state.scores.draws++;
    bumpScore('draw');
    SFX.draw();
  }

  updateScoreDisplay();
  saveScores();
  updateStatusBar();
  highlightActiveScoreCard();

  // Show overlay after a short delay so animations play first
  setTimeout(showOverlay, 900);
}

/**
 * scheduleAiMove — debounces AI move with visual "thinking" state.
 */
function scheduleAiMove() {
  // Disable board during AI's turn
  dom.board.classList.add('disabled');
  dom.cells.forEach(c => {
    if (!c.classList.contains('played')) c.classList.add('thinking');
  });

  setTimeout(() => {
    // Remove thinking state
    dom.cells.forEach(c => c.classList.remove('thinking'));

    if (!state.gameOver) {
      dom.board.classList.remove('disabled');
      const bestIdx = getBestMove([...state.board]);
      handleMove(bestIdx);
    }
  }, AI_DELAY_MS);
}

/**
 * restartRound — clears the board for a new round, keeps scores.
 */
function restartRound() {
  SFX.click();
  hideOverlay();

  // Clear board state
  state.board         = Array(9).fill('');
  state.gameOver      = false;
  state.winner        = null;
  state.winningCombo  = null;

  // Reset to X's turn (in AI mode, human always goes first)
  state.currentPlayer = 'X';

  // Clear cell DOM
  dom.cells.forEach(cell => {
    cell.textContent = '';
    cell.className   = 'cell'; // reset all classes
    cell.disabled    = false;
    const idx = cell.getAttribute('data-index');
    cell.setAttribute('aria-label', `Cell ${Number(idx) + 1}`);
  });

  // Clear win-line canvas
  const canvas = dom.winLineCanvas;
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  dom.board.classList.remove('disabled');
  updateStatusBar();
  highlightActiveScoreCard();
}

/**
 * resetScores — resets all score tallies to zero.
 */
function resetScores() {
  SFX.click();
  state.scores = { X: 0, O: 0, draws: 0 };
  saveScores();
  updateScoreDisplay();
  restartRound();
}

/**
 * switchMode — toggles between PvP and AI.
 * @param {string} mode - 'pvp' | 'ai'
 */
function switchMode(mode) {
  if (mode === state.gameMode) return;
  SFX.modeSwitch();
  state.gameMode = mode;

  // Update button styles
  dom.btnPvP.classList.toggle('active', mode === 'pvp');
  dom.btnAI.classList.toggle('active', mode === 'ai');

  updatePlayerLabels();
  resetScores();
}

/* ─────────────────────────────────────────────────────────────
   11. EVENT LISTENERS
───────────────────────────────────────────────────────────── */

/** Board cell clicks */
dom.cells.forEach(cell => {
  cell.addEventListener('click', () => {
    if (state.gameMode === 'ai' && state.currentPlayer === 'O') return; // Block clicks during AI turn
    handleMove(Number(cell.getAttribute('data-index')));
  });
});

/** Mode buttons */
dom.btnPvP.addEventListener('click', () => switchMode('pvp'));
dom.btnAI.addEventListener('click',  () => switchMode('ai'));

/** Restart / Reset */
dom.btnRestart.addEventListener('click', restartRound);
dom.btnReset.addEventListener('click',   resetScores);

/** Overlay play-again button */
dom.overlayBtn.addEventListener('click', restartRound);

/** Mute toggle */
dom.btnMute.addEventListener('click', () => {
  state.muted = !state.muted;
  dom.btnMute.textContent = state.muted ? '🔇' : '🔊';
  dom.btnMute.title = state.muted ? 'Unmute sound' : 'Mute sound';
  if (!state.muted) SFX.click(); // Confirm sound is on
});

/** Keyboard shortcuts */
document.addEventListener('keydown', e => {
  if (e.key === 'r' || e.key === 'R') restartRound();
  if (e.key === 'm' || e.key === 'M') dom.btnMute.click();
  if (e.key === 'Escape') hideOverlay();
});

/* ─────────────────────────────────────────────────────────────
   12. INITIALISATION
───────────────────────────────────────────────────────────── */

function init() {
  loadScores();
  updateScoreDisplay();
  updatePlayerLabels();
  updateStatusBar();
  highlightActiveScoreCard();

  // Resize canvas when window resizes (for win-line accuracy)
  window.addEventListener('resize', () => {
    const canvas = dom.winLineCanvas;
    const ctx    = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Redraw win-line if game is over
    if (state.winningCombo && state.winner !== 'draw') {
      drawWinLine(state.winningCombo, state.winner);
    }
  });

  console.log('%c TIC·TAC·TOE ARCADE ', 'background:#9b5cff;color:#fff;font-family:monospace;font-size:14px;padding:4px 8px;border-radius:4px;');
  console.log('%c Minimax AI active. Alpha-beta pruning enabled. ', 'color:#00f5ff;font-family:monospace;');
}

init();
