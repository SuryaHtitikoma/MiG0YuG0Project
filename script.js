/* =========================================================
   MigoYugo — script.js  (Chinese / Mahjong Edition)
   - Mode: 2 Players only
   - Pieces: Mahjong SVG tiles (White=ivory+green, Black=green+ivory)
   - Win effect: konfeti + modal glow
   - Day/Night toggle
   ========================================================= */

const BS = 8;
const COLS = ["a", "b", "c", "d", "e", "f", "g", "h"];
const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

let board = [];
let currentTurn = 1;
let moveHistory = [];
let historySnaps = [];
let gameActive = false;
let paused = false;
let timers = { 1: 600, 2: 600 };
let timerInterval = null;
let yugos = { 1: 0, 2: 0 };
let moveCount = 0;
let lastMove = null;
let reviewMode = false;
let reviewStep = 0;

/* =========================================================
   MAHJONG SVG TILES
   white  = ivory tile body + deep green Chinese character 中
   black  = deep green tile body + ivory Chinese character 發
   ========================================================= */
function makeTileSVG(isWhite) {
  if (isWhite) {
    // Ivory/cream tile — green character 中 (zhong = center/middle)
    return `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
<!-- Tile body -->
<rect x="2" y="2" width="40" height="40" rx="4"
  fill="url(#wbody)" stroke="#8ab88a" stroke-width="1.5"/>
<!-- Inner frame -->
<rect x="5" y="5" width="34" height="34" rx="2.5"
  fill="none" stroke="#a8d0a8" stroke-width="1" opacity="0.7"/>
<!-- Corner dots -->
<circle cx="8" cy="8" r="1.5" fill="#6aaa6a" opacity="0.5"/>
<circle cx="36" cy="8" r="1.5" fill="#6aaa6a" opacity="0.5"/>
<circle cx="8" cy="36" r="1.5" fill="#6aaa6a" opacity="0.5"/>
<circle cx="36" cy="36" r="1.5" fill="#6aaa6a" opacity="0.5"/>
<!-- Character 中 in deep green -->
<text x="22" y="30" text-anchor="middle"
  font-family="serif" font-size="22" font-weight="bold"
  fill="#1a5a12" opacity="0.92"
  style="letter-spacing:0">中</text>
<!-- Subtle shine -->
<ellipse cx="18" cy="12" rx="7" ry="4"
  fill="white" opacity="0.18"/>
<defs>
  <linearGradient id="wbody" x1="0" y1="0" x2="0.4" y2="1">
    <stop offset="0%"   stop-color="#f4fff4"/>
    <stop offset="50%"  stop-color="#e0f5e0"/>
    <stop offset="100%" stop-color="#c8eac8"/>
  </linearGradient>
</defs>
    </svg>`;
  } else {
    // Deep green tile — ivory character 發 (fa = prosperity)
    return `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
<!-- Tile body -->
<rect x="2" y="2" width="40" height="40" rx="4"
  fill="url(#bbody)" stroke="#0e2a08" stroke-width="1.5"/>
<!-- Inner frame -->
<rect x="5" y="5" width="34" height="34" rx="2.5"
  fill="none" stroke="rgba(180,240,150,0.2)" stroke-width="1"/>
<!-- Corner dots -->
<circle cx="8" cy="8" r="1.5" fill="#90d070" opacity="0.35"/>
<circle cx="36" cy="8" r="1.5" fill="#90d070" opacity="0.35"/>
<circle cx="8" cy="36" r="1.5" fill="#90d070" opacity="0.35"/>
<circle cx="36" cy="36" r="1.5" fill="#90d070" opacity="0.35"/>
<!-- Character 發 in ivory -->
<text x="22" y="30" text-anchor="middle"
  font-family="serif" font-size="22" font-weight="bold"
  fill="#e8f8d8" opacity="0.95"
  style="letter-spacing:0">發</text>
<!-- Subtle shine -->
<ellipse cx="16" cy="11" rx="7" ry="3.5"
  fill="white" opacity="0.08"/>
<defs>
  <linearGradient id="bbody" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0%"   stop-color="#2e6a1e"/>
    <stop offset="50%"  stop-color="#1e4e12"/>
    <stop offset="100%" stop-color="#122e0a"/>
  </linearGradient>
</defs>
    </svg>`;
  }
}

/* Yugo tile — same tile but with red dot overlay (handled via .yugo-dot in CSS) */

/* =========================================================
   MODE SELECTION
   ========================================================= */
function startGameWithMode() {
  const menu = document.getElementById("modeScreen");
  const game = document.getElementById("gameWrap");

  document.getElementById("topName").textContent = "Player 2";
  document.getElementById("bottomName").textContent = "Player 1";
  document.getElementById("modeLabel").textContent = "2 Players";
  document.getElementById("diffLabel").textContent = "Local Co-op";
  document.getElementById("modeIcon").textContent = "👥";

  // Fade out menu
  menu.classList.add("fade-out");

  setTimeout(() => {
    menu.classList.add("hidden");
    menu.classList.remove("fade-out");

    // Prepare game: tampil tapi transparan
    game.classList.add("visible", "scene", "fade-in-start");

    // Trigger reflow supaya transisi jalan
    void game.offsetWidth;

    game.classList.add("fade-in-active");
    game.classList.remove("fade-in-start");

    // Bersihkan class transisi setelah selesai
    game.addEventListener(
      "transitionend",
      () => {
        game.classList.remove("scene", "fade-in-active");
      },
      { once: true },
    );

    initAndStart();
  }, 420); // durasi sama dengan fade-out CSS (0.45s ≈ 420ms)
}

/* =========================================================
   INIT
   ========================================================= */
function initAndStart() {
  clearInterval(timerInterval);
  board = Array.from({ length: BS }, () => Array(BS).fill(0));
  currentTurn = 1;
  moveHistory = [];
  historySnaps = [];
  gameActive = true;
  paused = false;
  reviewMode = false;
  yugos = { 1: 0, 2: 0 };
  moveCount = 0;
  lastMove = null;
  timers = { 1: 600, 2: 600 };

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
  setStatus("White moves first! ⬜", "white-turn");
}

/* =========================================================
   RENDER BOARD
   ========================================================= */
function renderBoard() {
  const grid = document.getElementById("boardGrid");
  grid.innerHTML = "";

  for (let r = BS - 1; r >= 0; r--) {
    for (let c = 0; c < BS; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      const isLastMove = lastMove && lastMove.r === r && lastMove.c === c;
      if (isLastMove) cell.classList.add("highlight-last");

      const v = board[r][c];
      if (v !== 0) {
        const isW = v === 1 || v === 3;
        const isY = v === 3 || v === 4;

        const p = document.createElement("div");
        p.className = "migo " + (isW ? "white" : "black");
        if (isLastMove) p.classList.add("pop");

        // Inject Mahjong SVG tile
        p.innerHTML = makeTileSVG(isW);

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

  // Column labels
  const labels = document.getElementById("colLabels");
  labels.innerHTML = "";
  COLS.forEach((c) => {
    const l = document.createElement("div");
    l.className = "col-label";
    l.textContent = c;
    labels.appendChild(l);
  });
}

/* =========================================================
   TURN HIGHLIGHT
   ========================================================= */
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

/* =========================================================
   CLICK HANDLER
   ========================================================= */
function onCellClick(r, c) {
  if (!gameActive || paused || reviewMode) return;
  if (board[r][c] !== 0) return;
  if (!isLegal(r, c, currentTurn)) {
    setStatus("⛔ Illegal! Line of 5+ not allowed.", "warn");
    return;
  }
  makeMove(r, c, currentTurn);
}

/* =========================================================
   LEGAL CHECK
   ========================================================= */
function isLegal(r, c, color) {
  board[r][c] = color;
  const bad = over4(r, c, color);
  board[r][c] = 0;
  return !bad;
}
function over4(r, c, color) {
  const mine = color === 1 ? [1, 3] : [2, 4];
  for (const [dr, dc] of DIRS) {
    let cnt = 1,
      nr = r + dr,
      nc = c + dc;
    while (ib(nr, nc) && mine.includes(board[nr][nc])) {
      cnt++;
      nr += dr;
      nc += dc;
    }
    nr = r - dr;
    nc = c - dc;
    while (ib(nr, nc) && mine.includes(board[nr][nc])) {
      cnt++;
      nr -= dr;
      nc -= dc;
    }
    if (cnt > 4) return true;
  }
  return false;
}
function ib(r, c) {
  return r >= 0 && r < BS && c >= 0 && c < BS;
}

/* =========================================================
   MAKE MOVE
   ========================================================= */
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

  const mn = COLS[c] + (r + 1) + (yf ? "*" : "");
  const snap = JSON.parse(JSON.stringify(board));
  const snapY = JSON.parse(JSON.stringify(yugos));
  moveHistory.push({ r, c, color, mn, snap, snapY });
  historySnaps.push(snap);
  addHistory(moveCount, mn, color);
  renderBoard();

  if (checkIgo(color)) {
    endGame(color, "igo");
    return;
  }

  currentTurn = color === 1 ? 2 : 1;
  if (!hasLegal(currentTurn)) {
    endGame(null, "wego");
    return;
  }

  updateTurnHL();
  if (yf) {
    const who = color === 1 ? "⬜ White" : "🀄 Black";
    setStatus(`${who} formed a Yugo! ⭕`, "yugo");
    setTimeout(() => afterMove(), 1100);
  } else {
    afterMove();
  }
}

function afterMove() {
  if (!gameActive) return;
  const who = currentTurn === 1 ? "⬜ Player 1 (White)" : "🀄 Player 2 (Black)";
  setStatus(
    who + " — your turn!",
    currentTurn === 1 ? "white-turn" : "black-turn",
  );
}

/* =========================================================
   LINE DETECTION
   ========================================================= */
function find4(r, c, color) {
  const mine = color === 1 ? [1, 3] : [2, 4];
  const lines = [];
  for (const [dr, dc] of DIRS) {
    const line = [[r, c]];
    let nr = r + dr,
      nc = c + dc;
    while (ib(nr, nc) && mine.includes(board[nr][nc])) {
      line.push([nr, nc]);
      nr += dr;
      nc += dc;
    }
    nr = r - dr;
    nc = c - dc;
    while (ib(nr, nc) && mine.includes(board[nr][nc])) {
      line.unshift([nr, nc]);
      nr -= dr;
      nc -= dc;
    }
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
        let cnt = 1,
          nr = r + dr,
          nc = c + dc;
        while (ib(nr, nc) && board[nr][nc] === yv) {
          cnt++;
          nr += dr;
          nc += dc;
        }
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

/* =========================================================
   END GAME
   ========================================================= */
function endGame(winner, type) {
  gameActive = false;
  clearInterval(timerInterval);
  document.getElementById("passNotice").classList.remove("show");

  const wN = "Player 1 (White ⬜)";
  const bN = "Player 2 (Black 🀄)";
  let title = "",
    msg = "";

  if (type === "igo") {
    const who = winner === 1 ? wN : bN;
    title = "Igo! 🎉";
    msg = `${who} menang dengan 4 Yugo berturut-turut!`;
  } else if (type === "wego") {
    if (yugos[1] > yugos[2]) {
      title = `Wego! ${wN} Menang!`;
      msg = "Yugo terbanyak di papan!";
    } else if (yugos[2] > yugos[1]) {
      title = `Wego! ${bN} Menang!`;
      msg = "Yugo terbanyak di papan!";
    } else {
      title = "Seri! 平局";
      msg = "Kedua pemain sama — seri!";
    }
  } else if (type === "timeout") {
    const who = winner === 1 ? wN : bN;
    title = "Waktu Habis! ⏰";
    msg = `${who} menang — lawan kehabisan waktu!`;
  }

  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalMsg").textContent = msg;
  document.getElementById("mWS").textContent = yugos[1];
  document.getElementById("mBS").textContent = yugos[2];
  document.getElementById("modalBackdrop").classList.add("show");
  setStatus(title);

  const isDraw = type === "wego" && yugos[1] === yugos[2];
  if (!isDraw) {
    startConfetti(winner);
    document.getElementById("modal").classList.add("win-glow");
  }
}

/* =========================================================
   TIMER
   ========================================================= */
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (paused || !gameActive) return;
    timers[currentTurn]--;
    updateTimerDisplay();
    if (timers[currentTurn] <= 0) endGame(currentTurn === 1 ? 2 : 1, "timeout");
  }, 1000);
}
function updateTimerDisplay() {
  function f(s) {
    return (
      Math.floor(s / 60) + ":" + String(Math.max(0, s % 60)).padStart(2, "0")
    );
  }
  document.getElementById("topTimer").textContent = f(timers[2]);
  document.getElementById("bottomTimer").textContent = f(timers[1]);
}

/* =========================================================
   CONTROLS
   ========================================================= */
function pauseResume() {
  if (!gameActive) return;
  paused = !paused;
  document.getElementById("pauseBtn").textContent = paused ? "Resume" : "Pause";
  if (!paused) {
    startTimer();
    afterMove();
  } else {
    clearInterval(timerInterval);
    setStatus("Game dijeda... ⏸");
  }
}
function updateYugoDisplay() {
  document.getElementById("topYugos").textContent = yugos[2];
  document.getElementById("bottomYugos").textContent = yugos[1];
}
function addHistory(num, mn, color) {
  const list = document.getElementById("historyList");
  const rowNum = Math.ceil(num / 2);
  let row = list.querySelector(`[data-row="${rowNum}"]`);
  if (!row) {
    row = document.createElement("div");
    row.className = "history-row";
    row.dataset.row = rowNum;
    const n = document.createElement("span");
    n.className = "move-num";
    n.textContent = rowNum + ".";
    const w = document.createElement("span");
    w.className = "move move-w";
    const b = document.createElement("span");
    b.className = "move move-b";
    row.append(n, w, b);
    list.appendChild(row);
  }
  const slot =
    color === 1 ? row.querySelector(".move-w") : row.querySelector(".move-b");
  slot.textContent = mn;
  if (mn.includes("*")) slot.classList.add("yugo");
  list.scrollTop = list.scrollHeight;
}
function setStatus(msg, cls) {
  const el = document.getElementById("statusMsg");
  el.textContent = msg;
  el.className = "status-msg " + (cls || "");
}

/* =========================================================
   UNDO
   ========================================================= */
function undoMove() {
  if (!gameActive || reviewMode || moveHistory.length === 0) return;
  moveHistory.pop();
  historySnaps.pop();
  moveCount--;
  if (historySnaps.length > 0) {
    board = JSON.parse(JSON.stringify(historySnaps[historySnaps.length - 1]));
    yugos = JSON.parse(
      JSON.stringify(
        moveHistory[moveHistory.length - 1]?.snapY || { 1: 0, 2: 0 },
      ),
    );
  } else {
    board = Array.from({ length: BS }, () => Array(BS).fill(0));
    yugos = { 1: 0, 2: 0 };
  }
  lastMove =
    moveHistory.length > 0
      ? {
          r: moveHistory[moveHistory.length - 1].r,
          c: moveHistory[moveHistory.length - 1].c,
        }
      : null;
  currentTurn = 1;
  updateYugoDisplay();
  renderBoard();
  updateTurnHL();
  document.getElementById("historyList").innerHTML = "";
  moveHistory.forEach((m, i) => addHistory(i + 1, m.mn, m.color));
  setStatus("↩ Dibatalkan! White jalan dulu.", "white-turn");
}

/* =========================================================
   REVIEW
   ========================================================= */
function reviewGame() {
  if (historySnaps.length === 0) return;
  reviewMode = true;
  gameActive = false;
  clearInterval(timerInterval);
  reviewStep = 0;
  board = JSON.parse(JSON.stringify(historySnaps[0]));
  lastMove = { r: moveHistory[0].r, c: moveHistory[0].c };
  renderBoard();
  document.getElementById("pauseBtn").textContent = "Next ▶";
  document.getElementById("pauseBtn").onclick = reviewNext;
  setStatus(`Review: Langkah 1 dari ${historySnaps.length}`);
}
function reviewNext() {
  reviewStep++;
  if (reviewStep >= historySnaps.length) {
    reviewStep = historySnaps.length - 1;
    setStatus("Akhir permainan.");
    return;
  }
  board = JSON.parse(JSON.stringify(historySnaps[reviewStep]));
  lastMove = {
    r: moveHistory[reviewStep].r,
    c: moveHistory[reviewStep].c,
  };
  renderBoard();
  setStatus(`Review: Langkah ${reviewStep + 1} dari ${historySnaps.length}`);
}

/* =========================================================
   MENU / RESET
   ========================================================= */
function confirmReset() {
  if (!gameActive || confirm("Reset permainan sekarang?")) {
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

  const menu = document.getElementById("modeScreen");
  const game = document.getElementById("gameWrap");

  // Fade out game
  game.classList.add("scene", "fade-out");

  setTimeout(() => {
    game.classList.remove("visible", "scene", "fade-out");

    // Prepare menu: tampil tapi transparan
    menu.classList.remove("hidden");
    menu.style.display = "block";
    menu.classList.add("scene", "fade-in-start");

    void menu.offsetWidth; // trigger reflow

    menu.classList.add("fade-in-active");
    menu.classList.remove("fade-in-start");

    menu.addEventListener(
      "transitionend",
      () => {
        menu.classList.remove("scene", "fade-in-active");
      },
      { once: true },
    );

    document.getElementById("pauseBtn").textContent = "Pause";
    document.getElementById("pauseBtn").onclick = pauseResume;
  }, 420);
}
function toggleRules() {
  document.getElementById("rulesPanel").classList.toggle("show");
}

/* =========================================================
   CONFETTI — Chinese colors: red, gold, green
   ========================================================= */
let confettiRAF = null;
let confettiParticles = [];

function startConfetti(winner) {
  const canvas = document.getElementById("confetti-canvas");
  canvas.classList.add("active");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  // Chinese-themed palette
  const colors =
    winner === 1
      ? ["#f0fff0", "#a8e890", "#c0392b", "#d4a017", "#ffffff", "#3a8a28"] // white win: jade + gold + red
      : ["#1e5a14", "#3a8a28", "#d4a017", "#ffd84d", "#c0392b", "#90d870"]; // black win: deep green + gold

  // Mix of shapes: rect (tile-like), circle, diamond
  const SHAPES = ["rect", "circle", "diamond"];

  confettiParticles = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -250,
    r: Math.random() * 9 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    vy: Math.random() * 3.5 + 1.5,
    vx: (Math.random() - 0.5) * 3,
    spin: (Math.random() - 0.5) * 0.18,
    angle: Math.random() * Math.PI * 2,
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.08 + 0.02,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticles.forEach((p) => {
      p.y += p.vy;
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 0.8;
      p.angle += p.spin;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.92;

      if (p.shape === "rect") {
        ctx.fillRect(-p.r, -p.r * 0.55, p.r * 2, p.r * 1.1);
      } else if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // diamond
        ctx.beginPath();
        ctx.moveTo(0, -p.r);
        ctx.lineTo(p.r * 0.7, 0);
        ctx.lineTo(0, p.r);
        ctx.lineTo(-p.r * 0.7, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    });
    confettiRAF = requestAnimationFrame(draw);
  }

  if (confettiRAF) cancelAnimationFrame(confettiRAF);
  draw();
  setTimeout(() => stopConfetti(), 5500);
}

function stopConfetti() {
  if (confettiRAF) {
    cancelAnimationFrame(confettiRAF);
    confettiRAF = null;
  }
  const canvas = document.getElementById("confetti-canvas");
  if (canvas) {
    canvas.classList.remove("active");
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }
}

/* =========================================================
   DAY / NIGHT TOGGLE
   ========================================================= */
document.addEventListener("click", (e) => {
  const tar = e.target;
  if (tar.name === "toggle") {
    tar.removeAttribute("class");
    document.body.classList.toggle("night-mode", tar.checked);
  }
});

/* =========================================================
   INIT ON LOAD
   ========================================================= */
board = Array.from({ length: BS }, () => Array(BS).fill(0));
renderBoard();
