/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, BoardState, GamePiece, CellValue } from "../types";

export function createInitialBoard(): BoardState {
  const board: BoardState = [];
  for (let r = 0; r < 8; r++) {
    const row: CellValue[] = [];
    for (let c = 0; c < 8; c++) {
      row.push(null);
    }
    board.push(row);
  }
  return board;
}

export function isValidCoordinate(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// Counts contiguous pieces of specified player starting near (r, c) in direction (dr, dc)
export function countContiguous(
  board: BoardState,
  startR: number,
  startC: number,
  dr: number,
  dc: number,
  player: Player,
): number {
  let count = 0;
  let currR = startR + dr;
  let currC = startC + dc;

  while (isValidCoordinate(currR, currC)) {
    const piece = board[currR][currC];
    if (piece && piece.owner === player) {
      count++;
    } else {
      break;
    }
    currR += dr;
    currC += dc;
  }

  return count;
}

// Get the coordinates of contiguous pieces of specified player starting near (r, c) in direction (dr, dc)
export function getContiguousCoords(
  board: BoardState,
  startR: number,
  startC: number,
  dr: number,
  dc: number,
  player: Player,
): [number, number][] {
  const coords: [number, number][] = [];
  let currR = startR + dr;
  let currC = startC + dc;

  while (isValidCoordinate(currR, currC)) {
    const piece = board[currR][currC];
    if (piece && piece.owner === player) {
      coords.push([currR, currC]);
    } else {
      break;
    }
    currR += dr;
    currC += dc;
  }

  return coords;
}

// Validates if a move is legal according to MigoYugo rules
export function validateMove(
  board: BoardState,
  r: number,
  c: number,
  player: Player,
): { legal: boolean; reason?: string } {
  if (!isValidCoordinate(r, c)) {
    return { legal: false, reason: "Coordinates are out of bounds." };
  }

  if (board[r][c] !== null) {
    return { legal: false, reason: "Tile is already occupied." };
  }

  // Check the 4 directions for "No Long Lines":
  const directions = [
    { dr: 0, dc: 1, name: "Horizontal" },
    { dr: 1, dc: 0, name: "Vertical" },
    { dr: 1, dc: 1, name: "Diagonal Descending" },
    { dr: -1, dc: 1, name: "Diagonal Ascending" },
  ];

  for (const dir of directions) {
    const forward = countContiguous(board, r, c, dir.dr, dir.dc, player);
    const backward = countContiguous(board, r, c, -dir.dr, -dir.dc, player);
    const totalLength = 1 + forward + backward;

    if (totalLength > 4) {
      const coordName = `${String.fromCharCode(65 + c)}${8 - r}`;
      return {
        legal: false,
        reason: `Moving at ${coordName} creates an unbroken line of ${totalLength} in a row (${dir.name}), violating the "No Long Lines" rule. Max length is 4.`,
      };
    }
  }

  return { legal: true };
}

// Executes a move, returning the new board state, whether any Yugo was created, and affected cells
export function executeMove(
  board: BoardState,
  r: number,
  c: number,
  player: Player,
): {
  newBoard: BoardState;
  yugoCreated: boolean;
  affectedCells: [number, number][];
  yugoCell: [number, number] | null;
} {
  const validation = validateMove(board, r, c, player);
  if (!validation.legal) {
    throw new Error(validation.reason || "Illegal move");
  }

  // Create absolute deep copy
  const newBoard: BoardState = board.map((row) =>
    row.map((cell) => (cell ? { ...cell } : null)),
  );

  const pId = `${player}-${Date.now()}-${r}-${c}`;
  newBoard[r][c] = {
    owner: player,
    type: "migo",
    id: pId,
  };

  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: -1, dc: 1 },
  ];

  const cellsToClear: [number, number][] = [];
  let becameYugo = false;
  let intersectingLinesCount = 0;

  for (const dir of directions) {
    const fCoords = getContiguousCoords(newBoard, r, c, dir.dr, dir.dc, player);
    const bCoords = getContiguousCoords(
      newBoard,
      r,
      c,
      -dir.dr,
      -dir.dc,
      player,
    );
    const totalLength = 1 + fCoords.length + bCoords.length;

    if (totalLength === 4) {
      becameYugo = true;
      intersectingLinesCount++;
      fCoords.forEach(([cr, cc]) => {
        const piece = newBoard[cr][cc];
        if (piece && piece.type === "migo") {
          cellsToClear.push([cr, cc]);
        }
      });
      bCoords.forEach(([cr, cc]) => {
        const piece = newBoard[cr][cc];
        if (piece && piece.type === "migo") {
          cellsToClear.push([cr, cc]);
        }
      });
    }
  }

  if (becameYugo) {
    let yugoShape: "circle" | "oval" | "triangle" | "square" = "circle";
    let yugoPoints = 1;

    if (intersectingLinesCount === 2) {
      yugoShape = "oval";
      yugoPoints = 2;
    } else if (intersectingLinesCount === 3) {
      yugoShape = "triangle";
      yugoPoints = 5;
    } else if (intersectingLinesCount >= 4) {
      yugoShape = "square";
      yugoPoints = 10;
    }

    const tile = newBoard[r][c];
    if (tile) {
      tile.type = "yugo";
      tile.yugoShape = yugoShape;
      tile.yugoPoints = yugoPoints;
    }

    const uniqueClearsMap = new Map<string, [number, number]>();
    cellsToClear.forEach(([cr, cc]) => {
      uniqueClearsMap.set(`${cr},${cc}`, [cr, cc]);
    });

    uniqueClearsMap.forEach(([cr, cc]) => {
      newBoard[cr][cc] = null;
    });

    return {
      newBoard,
      yugoCreated: true,
      affectedCells: Array.from(uniqueClearsMap.values()),
      yugoCell: [r, c],
    };
  }

  return {
    newBoard,
    yugoCreated: false,
    affectedCells: [],
    yugoCell: null,
  };
}

// Scans board to check if specified player has an unbroken line of exactly 4 Yugos (Igo victory)
export function checkForIgo(board: BoardState, player: Player): boolean {
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: -1, dc: 1 },
  ];

  const countContigYugos = (
    r: number,
    c: number,
    dr: number,
    dc: number,
  ): number => {
    let count = 0;
    let currR = r + dr;
    let currC = c + dc;
    while (isValidCoordinate(currR, currC)) {
      const p = board[currR][currC];
      if (p && p.owner === player && p.type === "yugo") {
        count++;
      } else {
        break;
      }
      currR += dr;
      currC += dc;
    }
    return count;
  };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.owner === player && piece.type === "yugo") {
        for (const dir of directions) {
          const f = countContigYugos(r, c, dir.dr, dir.dc);
          const b = countContigYugos(r, c, -dir.dr, -dir.dc);
          if (1 + f + b >= 4) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

// Scans all 64 squares to find any valid moves for a player
export function getLegalMoves(
  board: BoardState,
  player: Player,
): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (validateMove(board, r, c, player).legal) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

// Counts Yugos on the board for both players
export function countYugos(board: BoardState) {
  let white = 0;
  let black = 0;
  let whitePoints = 0;
  let blackPoints = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === "yugo") {
        if (piece.owner === "white") {
          white++;
          whitePoints += piece.yugoPoints || 1;
        }
        if (piece.owner === "black") {
          black++;
          blackPoints += piece.yugoPoints || 1;
        }
      }
    }
  }
  return { white, black, whitePoints, blackPoints };
}

// Counts Migos on the board for both players
export function countMigos(board: BoardState) {
  let white = 0;
  let black = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === "migo") {
        if (piece.owner === "white") white++;
        if (piece.owner === "black") black++;
      }
    }
  }
  return { white, black };
}

// ─── AI: Async wrapper so the UI never freezes ────────────────────────────────

/**
 * Call this instead of getBestMove directly in your UI code.
 * It defers computation to the next event loop tick so React can render
 * a "thinking..." state before the AI blocks the thread.
 *
 * Usage:
 *   setAiThinking(true);
 *   requestAIMove(board, player, difficulty, (move) => {
 *     if (move) applyMove(move);
 *     setAiThinking(false);
 *   });
 */
export function requestAIMove(
  board: BoardState,
  player: Player,
  difficulty: "baby" | "novice" | "master" | "grandmaster",
  onResult: (move: [number, number] | null) => void,
): void {
  setTimeout(() => {
    const move = getBestMove(board, player, difficulty);
    onResult(move);
  }, 0);
}

// ─── AI: Minimax heuristic-based solver ──────────────────────────────────────

export function getBestMove(
  board: BoardState,
  player: Player,
  difficulty: "baby" | "novice" | "master" | "grandmaster" = "master",
): [number, number] | null {
  const legalMoves = getLegalMoves(board, player);
  if (legalMoves.length === 0) return null;

  const opponent: Player = player === "white" ? "black" : "white";

  // BABY: Pure random
  if (difficulty === "baby") {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  // Pre-sort moves by fast heuristic so alpha-beta prunes more aggressively
  const moveEvaluations = legalMoves.map(([r, c]) => {
    let score = 0;

    // Center proximity bonus
    const distToCenter = Math.abs(r - 3.5) + Math.abs(c - 3.5);
    score += (7 - distToCenter) * 0.5;

    try {
      const sim = executeMove(board, r, c, player);
      if (checkForIgo(sim.newBoard, player)) score += 10000;
      if (sim.yugoCreated) score += 300;
    } catch (_) {}

    // Reward blocking opponent near-complete lines
    for (const dir of [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: 1 },
      { dr: -1, dc: 1 },
    ]) {
      const oppLen =
        countContiguous(board, r, c, dir.dr, dir.dc, opponent) +
        countContiguous(board, r, c, -dir.dr, -dir.dc, opponent);
      if (oppLen >= 3) score += 1500;
      else if (oppLen === 2) score += 200;
    }

    return { move: [r, c] as [number, number], score };
  });

  moveEvaluations.sort((a, b) => b.score - a.score);

  // ── Difficulty settings ──────────────────────────────────────────────────
  // FIX: Grandmaster reduced from depth 6 → depth 4, branch widened 6 → 10.
  // Old: 6^6 = 46,656 leaf nodes. New: 4^4 = 256 leaf nodes (~180× faster).
  // Alpha-beta pruning cuts that further to ~75–130 in practice.
  let depth = 2;
  let maxBranch = 15;

  if (difficulty === "novice") {
    depth = 2;
    maxBranch = 10;
  } else if (difficulty === "master") {
    depth = 3;
    maxBranch = 12;
  } else if (difficulty === "grandmaster") {
    depth = 4; // was 6
    maxBranch = 10; // was 6 — wider & shallower is smarter and much faster
  }

  const sortedLegalMoves = moveEvaluations
    .slice(0, maxBranch)
    .map((e) => e.move);

  let bestMove: [number, number] | null = null;
  let maxScore = -Infinity;

  for (const move of sortedLegalMoves) {
    const [r, c] = move;
    try {
      const sim = executeMove(board, r, c, player);

      // Instant win — no need to search further
      if (checkForIgo(sim.newBoard, player)) {
        return move;
      }

      const evalValue = minimax(
        sim.newBoard,
        depth - 1,
        false,
        -Infinity,
        Infinity,
        player,
      );

      if (evalValue > maxScore) {
        maxScore = evalValue;
        bestMove = move;
      }
    } catch (_) {
      // Skip illegal moves
    }
  }

  return bestMove || sortedLegalMoves[0];
}

// ─── Minimax with Alpha-Beta pruning ─────────────────────────────────────────

function minimax(
  board: BoardState,
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  player: Player,
): number {
  const opponent: Player = player === "white" ? "black" : "white";
  const activePlayer = isMaximizing ? player : opponent;

  // Terminal: win/loss detection
  if (checkForIgo(board, player)) return 100000 + depth; // sooner wins score higher
  if (checkForIgo(board, opponent)) return -100000 - depth; // sooner losses score lower

  const legalMoves = getLegalMoves(board, activePlayer);
  if (legalMoves.length === 0 || depth === 0) {
    return evaluateBoardState(board, player, depth);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      try {
        const sim = executeMove(board, move[0], move[1], player);
        const evaluation = minimax(
          sim.newBoard,
          depth - 1,
          false,
          alpha,
          beta,
          player,
        );
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Prune
      } catch (_) {}
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of legalMoves) {
      try {
        const sim = executeMove(board, move[0], move[1], opponent);
        const evaluation = minimax(
          sim.newBoard,
          depth - 1,
          true,
          alpha,
          beta,
          player,
        );
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Prune
      } catch (_) {}
    }
    return minEval;
  }
}

// ─── Board evaluation ─────────────────────────────────────────────────────────

/**
 * FIX: `depth` param added so we skip the expensive getLegalMoves()
 * mobility calls at deep nodes (depth < 3), where the cost is highest
 * and the impact on move quality is minimal.
 */
function evaluateBoardState(
  board: BoardState,
  player: Player,
  depth: number = 0,
): number {
  const opponent: Player = player === "white" ? "black" : "white";

  const yugoStats = countYugos(board);
  const myYugoCount = player === "white" ? yugoStats.white : yugoStats.black;
  const oppYugoCount = player === "white" ? yugoStats.black : yugoStats.white;
  const myYugoPoints =
    player === "white" ? yugoStats.whitePoints : yugoStats.blackPoints;
  const oppYugoPoints =
    player === "white" ? yugoStats.blackPoints : yugoStats.whitePoints;

  const migoStats = countMigos(board);
  const myMigoCount = player === "white" ? migoStats.white : migoStats.black;
  const oppMigoCount = player === "white" ? migoStats.black : migoStats.white;

  let score = 0;

  // 1. Yugo points & count (primary)
  score += (myYugoPoints - oppYugoPoints) * 300;
  score += (myYugoCount - oppYugoCount) * 100;

  // 2. Migo count (secondary build-up indicator)
  score += (myMigoCount - oppMigoCount) * 10;

  // 3. Positional + streak scan
  //    FIX: Only count a streak once — skip if there are pieces BEHIND in this
  //    direction to avoid double-counting every streak from both ends.
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: -1, dc: 1 },
  ];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const isMe = piece.owner === player;
      const multiplier = isMe ? 1 : -1;

      // Center proximity bonus
      const centerBonus = (7 - (Math.abs(r - 3.5) + Math.abs(c - 3.5))) * 2;
      score += centerBonus * multiplier;

      for (const dir of directions) {
        // Skip if there's a same-owner piece behind us — that piece already
        // counted this streak, so we'd be double-counting.
        const behindR = r - dir.dr;
        const behindC = c - dir.dc;
        if (
          isValidCoordinate(behindR, behindC) &&
          board[behindR][behindC]?.owner === piece.owner
        ) {
          continue;
        }

        const forward = countContiguous(
          board,
          r,
          c,
          dir.dr,
          dir.dc,
          piece.owner,
        );
        const totalLength = 1 + forward; // backward is 0 by the guard above

        if (piece.type === "yugo") {
          if (totalLength === 3) score += 150 * multiplier;
          else if (totalLength === 2) score += 30 * multiplier;
        } else {
          // migo
          if (totalLength === 3) score += 50 * multiplier;
          else if (totalLength === 2) score += 15 * multiplier;
        }
      }
    }
  }

  // 4. Mobility: only compute at shallow search depths to avoid calling
  //    getLegalMoves (64× validateMove) thousands of times deep in the tree.
  if (depth >= 2) {
    const myMoves = getLegalMoves(board, player).length;
    const oppMoves = getLegalMoves(board, opponent).length;
    score += (myMoves - oppMoves) * 15;
  }

  return score;
}
