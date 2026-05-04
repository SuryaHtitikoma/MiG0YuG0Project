/* =========================================================
   MigoYugo — script.js
   - Mode: 2 Players only (AI dihapus)
   - Win effect: konfeti + modal glow
   - Day/Night toggle
   ========================================================= */

const BS   = 8;
const COLS = ["a","b","c","d","e","f","g","h"];
const DIRS = [[0,1],[1,0],[1,1],[1,-1]];

// State
let board        = [];
let currentTurn  = 1;
let moveHistory  = [];
let historySnaps = [];
let gameActive   = false;
let paused       = false;
let timers       = { 1: 600, 2: 600 };
let timerInterval = null;
let yugos        = { 1: 0, 2: 0 };
let moveCount    = 0;
let lastMove     = null;
let reviewMode   = false;
let reviewStep   = 0;

// ---- MODE SELECTION ----
function startGameWithMode() {
  document.getElementById("modeScreen").style.display = "none";
  document.getElementById("gameWrap").classList.add("visible");

  document.getElementById("topName").textContent    = "Player 2";
  document.getElementById("bottomName").textContent = "Player 1";
  document.getElementById("modeLabel").textContent  = "2 Players";
  document.getElementById("diffLabel").textContent  = "Local Co-op";
  document.getElementById("modeIcon").textContent   = "👥";

  initAndStart();
}

// ---- INIT ----
function initAndStart() {
  clearInterval(timerInterval);
  board        = Array.from({ length: BS }, () => Array(BS).fill(0));
  currentTurn  = 1;
  moveHistory  = [];
  historySnaps = [];
  gameActive   = true;
  paused       = false;
  reviewMode   = false;
  yugos        = { 1: 0, 2: 0 };
  moveCount    = 0;
  lastMove     = null;
  timers       = { 1: 600, 2: 600 };

  document.getElementById("historyList").innerHTML = "";
  document.getElementById("passNotice").classList.remove("show");
  document.getElementById("pauseBtn").textContent = "Pause";
  document.getElementById("pauseBtn").onclick = pauseResume;

  stopConfetti();
  document.getElementById("modal").classList.remove("win-glow");

  renderBoard();
  updateYugoDisplay();
  updateTimerDisplay();
  updateTurnHL();
  startTimer();
  setStatus("White moves first!", "white-turn");
}

// ---- RENDER ----
function renderBoard() {
  const grid = document.getElementById("boardGrid");
  grid.innerHTML = "";
  for (let r = BS - 1; r >= 0; r--) {
    for (let c = 0; c < BS; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      if (lastMove && lastMove.r === r && lastMove.c === c)
        cell.classList.add("highlight-last");

      const v = board[r][c];
      if (v !== 0) {
        const isW = v === 1 || v === 3;
        const isY = v === 3 || v === 4;
        const p   = document.createElement("div");
        p.className = "migo " + (isW ? "white" : "black");
        if (lastMove && lastMove.r === r && lastMove.c === c)
          p.classList.add("pop");
        if (isY) {
          const d = document.createElement("div");
          d.className = "yugo-dot";
          p.appendChild(d);
        }
        cell.appendChild(p);
        cell.classList.add("occupied");
      }
      cell.addEventListener("click", () => onCellClick(r, c));
      grid.appendChild(cell);
    }
  }

  const labels = document.getElementById("colLabels");
  labels.innerHTML = "";
  COLS.forEach(c => {
    const l = document.createElement("div");
    l.className = "col-label";
    l.textContent = c;
    labels.appendChild(l);
  });
}

function updateTurnHL() {
  const top = document.getElementById("topBar");
  const bot = document.getElementById("bottomBar");
  top.classList.toggle("active-turn", currentTurn === 2);
  bot.classList.toggle("active-turn", currentTurn === 1);

  if (gameActive && !paused) {
    const notice = document.getElementById("passNotice");
    notice.classList.add("show");
    setTimeout(() => notice.classList.remove("show"), 2000);
  }
}

// ---- CLICK ----
function onCellClick(r, c) {
  if (!gameActive || paused || reviewMode) return;
  if (board[r][c] !== 0) return;
  if (!isLegal(r, c, currentTurn)) {
    setStatus("Illegal! Line of 5+ not allowed.", "warn");
    return;
  }
  makeMove(r, c, currentTurn);
}

// ---- LEGAL CHECK ----
function isLegal(r, c, color) {
  board[r][c] = color;
  const bad = over4(r, c, color);
  board[r][c] = 0;
  return !bad;
}
function over4(r, c, color) {
  const mine = color === 1 ? [1,3] : [2,4];
  for (const [dr, dc] of DIRS) {
    let cnt = 1, nr = r+dr, nc = c+dc;
    while (ib(nr,nc) && mine.includes(board[nr][nc])) { cnt++; nr+=dr; nc+=dc; }
    nr = r-dr; nc = c-dc;
    while (ib(nr,nc) && mine.includes(board[nr][nc])) { cnt++; nr-=dr; nc-=dc; }
    if (cnt > 4) return true;
  }
  return false;
}
function ib(r, c) { return r >= 0 && r < BS && c >= 0 && c < BS; }

// ---- MAKE MOVE ----
function makeMove(r, c, color) {
  board[r][c] = color;
  moveCount++;
  lastMove = { r, c };

  const lines = find4(r, c, color);
  let yf = lines.length > 0;
  if (yf) {
    for (const line of lines)
      for (const [lr, lc] of line)
        if (board[lr][lc] === color) board[lr][lc] = 0;
    board[r][c] = color === 1 ? 3 : 4;
    yugos[color]++;
    updateYugoDisplay();
  }

  const mn   = COLS[c] + (r+1) + (yf ? "*" : "");
  const snap  = JSON.parse(JSON.stringify(board));
  const snapY = JSON.parse(JSON.stringify(yugos));
  moveHistory.push({ r, c, color, mn, snap, snapY });
  historySnaps.push(snap);
  addHistory(moveCount, mn, color);
  renderBoard();

  if (checkIgo(color)) { endGame(color, "igo"); return; }

  currentTurn = color === 1 ? 2 : 1;
  if (!hasLegal(currentTurn)) { endGame(null, "wego"); return; }

  updateTurnHL();
  if (yf) {
    const who = color === 1 ? "White" : "Black";
    setStatus(`${who} formed a Yugo! ⭕`, "yugo");
    setTimeout(() => afterMove(), 1100);
  } else {
    afterMove();
  }
}

function afterMove() {
  if (!gameActive) return;
  const who = currentTurn === 1 ? "Player 1 (White)" : "Player 2 (Black)";
  setStatus(who + "'s turn", currentTurn === 1 ? "white-turn" : "black-turn");
}

// ---- LINE DETECTION ----
function find4(r, c, color) {
  const mine = color === 1 ? [1,3] : [2,4];
  const lines = [];
  for (const [dr, dc] of DIRS) {
    const line = [[r, c]];
    let nr = r+dr, nc = c+dc;
    while (ib(nr,nc) && mine.includes(board[nr][nc])) { line.push([nr,nc]); nr+=dr; nc+=dc; }
    nr = r-dr; nc = c-dc;
    while (ib(nr,nc) && mine.includes(board[nr][nc])) { line.unshift([nr,nc]); nr-=dr; nc-=dc; }
    if (line.length === 4) lines.push(line);
  }
  return lines;
}
function checkIgo(color) {
  const yv = color === 1 ? 3 : 4;
  for (let r = 0; r < BS; r++)
    for (let c = 0; c < BS; c++) {
      if (board[r][c] !== yv) continue;
      for (const [dr, dc] of DIRS) {
        let cnt = 1, nr = r+dr, nc = c+dc;
        while (ib(nr,nc) && board[nr][nc] === yv) { cnt++; nr+=dr; nc+=dc; }
        if (cnt >= 4) return true;
      }
    }
  return false;
}
function hasLegal(color) {
  for (let r = 0; r < BS; r++)
    for (let c = 0; c < BS; c++)
      if (board[r][c] === 0 && isLegal(r, c, color)) return true;
  return false;
}

// ---- END GAME ----
function endGame(winner, type) {
  gameActive = false;
  clearInterval(timerInterval);
  document.getElementById("passNotice").classList.remove("show");

  const wN = "Player 1 (White)";
  const bN = "Player 2 (Black)";
  let title = "", msg = "";

  if (type === "igo") {
    const who = winner === 1 ? wN : bN;
    title = "Igo! 🎉";
    msg   = `${who} wins with 4 Yugos in a row!`;
  } else if (type === "wego") {
    if (yugos[1] > yugos[2])      { title = `Wego! ${wN} Wins!`; msg = "Most Yugos on the board!"; }
    else if (yugos[2] > yugos[1]) { title = `Wego! ${bN} Wins!`; msg = "Most Yugos on the board!"; }
    else                           { title = "It's a Draw!";       msg = "Equal Yugos — game drawn."; }
  } else if (type === "timeout") {
    const who = winner === 1 ? wN : bN;
    title = "Time's Up!";
    msg   = `${who} wins — opponent ran out of time!`;
  }

  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalMsg").textContent   = msg;
  document.getElementById("mWS").textContent        = yugos[1];
  document.getElementById("mBS").textContent        = yugos[2];
  document.getElementById("modalBackdrop").classList.add("show");
  setStatus(title);

  // Visual effect: konfeti + glow (skip jika draw)
  const isDraw = (type === "wego" && yugos[1] === yugos[2]);
  if (!isDraw) {
    startConfetti(winner);
    document.getElementById("modal").classList.add("win-glow");
  }
}

// ---- TIMER ----
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (paused || !gameActive) return;
    timers[currentTurn]--;
    updateTimerDisplay();
    if (timers[currentTurn] <= 0)
      endGame(currentTurn === 1 ? 2 : 1, "timeout");
  }, 1000);
}
function updateTimerDisplay() {
  function f(s) {
    return Math.floor(s/60) + ":" + String(Math.max(0, s%60)).padStart(2,"0");
  }
  document.getElementById("topTimer").textContent    = f(timers[2]);
  document.getElementById("bottomTimer").textContent = f(timers[1]);
}

// ---- CONTROLS ----
function pauseResume() {
  if (!gameActive) return;
  paused = !paused;
  document.getElementById("pauseBtn").textContent = paused ? "Resume" : "Pause";
  if (!paused) { startTimer(); afterMove(); }
  else         { clearInterval(timerInterval); setStatus("Game paused."); }
}
function updateYugoDisplay() {
  document.getElementById("topYugos").textContent    = yugos[2];
  document.getElementById("bottomYugos").textContent = yugos[1];
}
function addHistory(num, mn, color) {
  const list   = document.getElementById("historyList");
  const rowNum = Math.ceil(num / 2);
  let row = list.querySelector(`[data-row="${rowNum}"]`);
  if (!row) {
    row = document.createElement("div");
    row.className  = "history-row";
    row.dataset.row = rowNum;
    const n = document.createElement("span"); n.className = "move-num"; n.textContent = rowNum+".";
    const w = document.createElement("span"); w.className = "move move-w";
    const b = document.createElement("span"); b.className = "move move-b";
    row.append(n, w, b);
    list.appendChild(row);
  }
  const slot = color === 1 ? row.querySelector(".move-w") : row.querySelector(".move-b");
  slot.textContent = mn;
  if (mn.includes("*")) slot.classList.add("yugo");
  list.scrollTop = list.scrollHeight;
}
function setStatus(msg, cls) {
  const el = document.getElementById("statusMsg");
  el.textContent = msg;
  el.className   = "status-msg " + (cls || "");
}

// ---- UNDO ----
function undoMove() {
  if (!gameActive || reviewMode || moveHistory.length === 0) return;
  moveHistory.pop();
  historySnaps.pop();
  moveCount--;
  if (historySnaps.length > 0) {
    board = JSON.parse(JSON.stringify(historySnaps[historySnaps.length - 1]));
    yugos = JSON.parse(JSON.stringify(moveHistory[moveHistory.length - 1]?.snapY || { 1:0, 2:0 }));
  } else {
    board = Array.from({ length: BS }, () => Array(BS).fill(0));
    yugos = { 1: 0, 2: 0 };
  }
  lastMove = moveHistory.length > 0
    ? { r: moveHistory[moveHistory.length-1].r, c: moveHistory[moveHistory.length-1].c }
    : null;
  currentTurn = 1;
  updateYugoDisplay();
  renderBoard();
  updateTurnHL();
  document.getElementById("historyList").innerHTML = "";
  moveHistory.forEach((m, i) => addHistory(i+1, m.mn, m.color));
  setStatus("Undone! White to move.", "white-turn");
}

// ---- REVIEW ----
function reviewGame() {
  if (historySnaps.length === 0) return;
  reviewMode = true;
  gameActive = false;
  clearInterval(timerInterval);
  reviewStep = 0;
  board      = JSON.parse(JSON.stringify(historySnaps[0]));
  lastMove   = { r: moveHistory[0].r, c: moveHistory[0].c };
  renderBoard();
  document.getElementById("pauseBtn").textContent = "Next ▶";
  document.getElementById("pauseBtn").onclick = reviewNext;
  setStatus(`Review: Move 1 of ${historySnaps.length}`);
}
function reviewNext() {
  reviewStep++;
  if (reviewStep >= historySnaps.length) {
    reviewStep = historySnaps.length - 1;
    setStatus("End of game."); return;
  }
  board    = JSON.parse(JSON.stringify(historySnaps[reviewStep]));
  lastMove = { r: moveHistory[reviewStep].r, c: moveHistory[reviewStep].c };
  renderBoard();
  setStatus(`Review: Move ${reviewStep+1} of ${historySnaps.length}`);
}

// ---- MENU / RESET ----
function confirmReset() {
  if (!gameActive || confirm("Reset current game?")) {
    document.getElementById("pauseBtn").onclick = pauseResume;
    initAndStart();
  }
}
function playAgain() {
  document.getElementById("modalBackdrop").classList.remove("show");
  document.getElementById("pauseBtn").onclick = pauseResume;
  initAndStart();
}
function goToMenu() {
  clearInterval(timerInterval);
  gameActive = false;
  stopConfetti();
  document.getElementById("modal").classList.remove("win-glow");
  document.getElementById("modalBackdrop").classList.remove("show");
  document.getElementById("gameWrap").classList.remove("visible");
  document.getElementById("modeScreen").style.display = "block";
  document.getElementById("pauseBtn").textContent = "Pause";
  document.getElementById("pauseBtn").onclick = pauseResume;
}
function toggleRules() {
  document.getElementById("rulesPanel").classList.toggle("show");
}

// =============================================
// ---- CONFETTI WIN EFFECT ----
// =============================================
let confettiRAF = null;
let confettiParticles = [];

function startConfetti(winner) {
  const canvas = document.getElementById("confetti-canvas");
  canvas.classList.add("active");
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx    = canvas.getContext("2d");
  const colors = winner === 1
    ? ["#ffffff","#d0d8f0","#3a6fd6","#f0c040","#e74c3c"]
    : ["#1a1a2e","#5a5a7a","#3a6fd6","#f0c040","#e74c3c"];

  confettiParticles = Array.from({ length: 120 }, () => ({
    x:     Math.random() * canvas.width,
    y:     Math.random() * -200,
    r:     Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    vy:    Math.random() * 3 + 2,
    vx:    (Math.random() - 0.5) * 3,
    spin:  (Math.random() - 0.5) * 0.2,
    angle: Math.random() * Math.PI * 2,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));

  function drawConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticles.forEach(p => {
      p.y     += p.vy;
      p.x     += p.vx;
      p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.r, -p.r/2, p.r*2, p.r);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
      // reset jika keluar layar
      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    });
    confettiRAF = requestAnimationFrame(drawConfetti);
  }

  if (confettiRAF) cancelAnimationFrame(confettiRAF);
  drawConfetti();

  // Auto-stop setelah 5 detik
  setTimeout(() => stopConfetti(), 5000);
}

function stopConfetti() {
  if (confettiRAF) { cancelAnimationFrame(confettiRAF); confettiRAF = null; }
  const canvas = document.getElementById("confetti-canvas");
  if (canvas) {
    canvas.classList.remove("active");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// =============================================
// ---- DAY/NIGHT TOGGLE ----
// =============================================
document.addEventListener("click", e => {
  const tar = e.target;
  // Hapus class pristine saat toggle diklik (dari snippet)
  if (tar.name === "toggle") {
    tar.removeAttribute("class");
    // Apply night mode ke body
    document.body.classList.toggle("night-mode", tar.checked);
  }
});

// ---- INIT ON LOAD ----
board = Array.from({ length: BS }, () => Array(BS).fill(0));
renderBoard();
