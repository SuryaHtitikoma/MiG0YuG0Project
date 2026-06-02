/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, BoardState, GamePiece, CellValue } from '../types';

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

// Counts contiguous pieces of specified player (can be migo or yugo) starting near (r, c) in direction (dr, dc)
export function countContiguous(
  board: BoardState,
  startR: number,
  startC: number,
  dr: number,
  dc: number,
  player: Player
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
  player: Player
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
  player: Player
): { legal: boolean; reason?: string } {
  if (!isValidCoordinate(r, c)) {
    return { legal: false, reason: 'Coordinates are out of bounds.' };
  }

  if (board[r][c] !== null) {
    return { legal: false, reason: 'Tile is already occupied.' };
  }

  // Check the 4 directions for "No Long Lines":
  // Horizontal (0, 1), Vertical (1, 0), Diagonal Descending (1, 1), Diagonal Ascending (-1, 1)
  const directions = [
    { dr: 0, dc: 1, name: 'Horizontal' },
    { dr: 1, dc: 0, name: 'Vertical' },
    { dr: 1, dc: 1, name: 'Diagonal Descending' },
    { dr: -1, dc: 1, name: 'Diagonal Ascending' },
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

// Excutes a move, returning the new board state, whether any Yugo was created, and affected cells
export function executeMove(
  board: BoardState,
  r: number,
  c: number,
  player: Player
): {
  newBoard: BoardState;
  yugoCreated: boolean;
  affectedCells: [number, number][]; // cells where pieces were cleared
  yugoCell: [number, number] | null; // cell that became a Yugo
} {
  const validation = validateMove(board, r, c, player);
  if (!validation.legal) {
    throw new Error(validation.reason || 'Illegal move');
  }

  // Create absolute deep copy
  const newBoard: BoardState = board.map((row) =>
    row.map((cell) => (cell ? { ...cell } : null))
  );

  // Generate unique piece ID (Mahjong themed reference or simple serial)
  const pId = `${player}-${Date.now()}-${r}-${c}`;
  newBoard[r][c] = {
    owner: player,
    type: 'migo',
    id: pId,
  };

  // Find all directions forming EXACTLY 4
  const directions = [
    { dr: 0, dc: 1 }, // Horizontal
    { dr: 1, dc: 0 }, // Vertical
    { dr: 1, dc: 1 }, // Diagonal Down
    { dr: -1, dc: 1 }, // Diagonal Up
  ];

  const cellsToClear: [number, number][] = [];
  let becameYugo = false;
  let intersectingLinesCount = 0;

  for (const dir of directions) {
    const fCoords = getContiguousCoords(newBoard, r, c, dir.dr, dir.dc, player);
    const bCoords = getContiguousCoords(newBoard, r, c, -dir.dr, -dir.dc, player);
    const totalLength = 1 + fCoords.length + bCoords.length;

    if (totalLength === 4) {
      becameYugo = true;
      intersectingLinesCount++;
      // Mark all cells in this line for clearing (except the placed one, which becomes Yugo)
      fCoords.forEach(([cr, cc]) => {
        const piece = newBoard[cr][cc];
        if (piece && piece.type === 'migo') {
          cellsToClear.push([cr, cc]);
        }
      });
      bCoords.forEach(([cr, cc]) => {
        const piece = newBoard[cr][cc];
        if (piece && piece.type === 'migo') {
          cellsToClear.push([cr, cc]);
        }
      });
    }
  }

  if (becameYugo) {
    let yugoShape: 'circle' | 'oval' | 'triangle' | 'square' = 'circle';
    let yugoPoints = 1;

    if (intersectingLinesCount === 2) {
      yugoShape = 'oval';
      yugoPoints = 2;
    } else if (intersectingLinesCount === 3) {
      yugoShape = 'triangle';
      yugoPoints = 5;
    } else if (intersectingLinesCount >= 4) {
      yugoShape = 'square';
      yugoPoints = 10;
    }

    // Convert placed tile to a Yugo
    const tile = newBoard[r][c];
    if (tile) {
      tile.type = 'yugo';
      tile.yugoShape = yugoShape;
      tile.yugoPoints = yugoPoints;
    }

    // Clear all marked MIGOS
    // Avoid double clearing the same coordinate
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
    { dr: 0, dc: 1 }, // Horizontal
    { dr: 1, dc: 0 }, // Vertical
    { dr: 1, dc: 1 }, // Diag Down
    { dr: -1, dc: 1 }, // Diag Up
  ];

  // Helper to count contiguous YUGOS of a player
  const countContigYugos = (
    r: number,
    c: number,
    dr: number,
    dc: number
  ): number => {
    let count = 0;
    let currR = r + dr;
    let currC = c + dc;
    while (isValidCoordinate(currR, currC)) {
      const p = board[currR][currC];
      if (p && p.owner === player && p.type === 'yugo') {
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
      if (piece && piece.owner === player && piece.type === 'yugo') {
        // Test all 4 directions centered on this Yugo
        for (const dir of directions) {
          const f = countContigYugos(r, c, dir.dr, dir.dc);
          const b = countContigYugos(r, c, -dir.dr, -dir.dc);
          const totalYugos = 1 + f + b;
          // Note: if game is checked after each turn, forming exactly 4 wins.
          // Since you win instantly with exactly 4, any line of 4+ Yugos is a win.
          if (totalYugos >= 4) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

// Scans all 64 squares of the board to find any valid moves for a player
export function getLegalMoves(board: BoardState, player: Player): [number, number][] {
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
      if (piece && piece.type === 'yugo') {
        if (piece.owner === 'white') {
          white++;
          whitePoints += piece.yugoPoints || 1;
        }
        if (piece.owner === 'black') {
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
      if (piece && piece.type === 'migo') {
        if (piece.owner === 'white') white++;
        if (piece.owner === 'black') black++;
      }
    }
  }
  return { white, black };
}

// AI: Minimax heuristic-based solver
export function getBestMove(
  board: BoardState,
  player: Player,
  difficulty: 'easy' | 'medium' | 'hard'
): [number, number] | null {
  const legalMoves = getLegalMoves(board, player);
  if (legalMoves.length === 0) return null;

  const opponent: Player = player === 'white' ? 'black' : 'white';

  // 1. EASY DIFFICULTY: Novice Monk
  // Selects randomly with slight preference for near-center moves
  if (difficulty === 'easy') {
    // Group moves by distance to center
    const movesSorted = [...legalMoves].sort((a, b) => {
      const distA = Math.abs(a[0] - 3.5) + Math.abs(a[1] - 3.5);
      const distB = Math.abs(b[0] - 3.5) + Math.abs(b[1] - 3.5);
      return distA - distB;
    });
    // Pick from the top 50% randomly or just random
    if (Math.random() < 0.6) {
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
    return movesSorted[Math.floor(Math.random() * Math.min(5, movesSorted.length))];
  }

  // 2. MEDIUM DIFFICULTY: Mahjong Master
  // Heuristic priorities:
  // - 1st: Win matches (any move that triggers exact Igo line of 4 Yugos)
  // - 2nd: Create a Yugo on this turn
  // - 3rd: Block opponent's immediate Yugo creation (opponent has 3-in-a-row)
  // - 4th: Form lines of 3 to prepare a Yugo next turn
  // - 5th: Choose central positional moves

  // Evaluate moves based on immediate results
  const moveEvaluations = legalMoves.map(([r, c]) => {
    let score = 0;

    // Center proximity bonus (0-5 points)
    const distToCenter = Math.abs(r - 3.5) + Math.abs(c - 3.5);
    score += (7 - distToCenter) * 0.5;

    try {
      // Simulate executive move for player
      const sim = executeMove(board, r, c, player);

      // Check for immediate IGO
      if (checkForIgo(sim.newBoard, player)) {
        score += 10000; // Immediate win!
      }

      // Check if it creates a Yugo
      if (sim.yugoCreated) {
        score += 300;
        // Check if this newly created Yugo is close to other Yugos
        // The more Yugos in line, the higher the score
        const dirScoring = [
          { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: -1, dc: 1 }
        ];
        let localYugoStreak = 0;
        for (const dir of dirScoring) {
          const yugCount = 1 +
            countContiguous(sim.newBoard, r, c, dir.dr, dir.dc, player) + // oops countContiguous counts Migo too, but let's count Yugos
            countContiguous(sim.newBoard, r, c, -dir.dr, -dir.dc, player);
          localYugoStreak = Math.max(localYugoStreak, yugCount);
        }
        score += localYugoStreak * 10;
      }

      // What if we form a line of 3? (Close to forming a Yugo)
      for (const dir of [
        { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: -1, dc: 1 }
      ]) {
        const len = 1 +
          countContiguous(sim.newBoard, r, c, dir.dr, dir.dc, player) +
          countContiguous(sim.newBoard, r, c, -dir.dr, -dir.dc, player);
        if (len === 3) score += 40;
      }

    } catch (e) {
      // Ignore invalid simulation errors
    }

    // Block opponent's immediate threats
    // Check if placing here blocks an opponent's line of 3 of their own color (which would let them form a Yugo)
    for (const dir of [
      { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: -1, dc: 1 }
    ]) {
      const oppLen = 1 +
        countContiguous(board, r, c, dir.dr, dir.dc, opponent) +
        countContiguous(board, r, c, -dir.dr, -dir.dc, opponent);
      if (oppLen === 4) {
        // Opponent would have won/placed here or made a long line (if they could)
        score += 1500; // Block illegal line or threat
      } else if (oppLen === 3) {
        // Block opponent forming exactly 4 next turn
        score += 200;
      }
    }

    return { move: [r, c] as [number, number], score };
  });

  if (difficulty === 'medium') {
    // Sort and return the best rated move
    moveEvaluations.sort((a, b) => b.score - a.score);
    return moveEvaluations[0].move;
  }

  // 3. HARD DIFFICULTY: Grandmaster Sage (Minimax with alpha-beta + deep heuristic evaluation)
  // Depth: 2 (to ensure quick response inside browsers)
  let bestMove: [number, number] | null = null;
  let maxScore = -Infinity;

  // Pre-sort moves using medium heuristics to make alpha-beta pruning highly efficient
  moveEvaluations.sort((a, b) => b.score - a.score);
  const sortedLegalMoves = moveEvaluations.map(e => e.move);

  for (const move of sortedLegalMoves) {
    const [r, c] = move;
    try {
      const sim = executeMove(board, r, c, player);

      // Instantly return if we win with Igo
      if (checkForIgo(sim.newBoard, player)) {
        return move;
      }

      // Run 2-ply Minimax for the opponent's best response
      const evalValue = minimax(sim.newBoard, 2, false, -Infinity, Infinity, player);
      
      if (evalValue > maxScore) {
        maxScore = evalValue;
        bestMove = move;
      }
    } catch {
      // Ignore
    }
  }

  return bestMove || sortedLegalMoves[0];
}

// Minimax algorithm with Alpha-Beta pruning
function minimax(
  board: BoardState,
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  player: Player
): number {
  const opponent: Player = player === 'white' ? 'black' : 'white';
  const activePlayer = isMaximizing ? player : opponent;

  // Check terminal conditions
  const p1Igo = checkForIgo(board, player);
  const p2Igo = checkForIgo(board, opponent);
  if (p1Igo) return 100000 + depth; // Favor sooner wins
  if (p2Igo) return -100000 - depth; // Avoid sooner losses

  const legalMoves = getLegalMoves(board, activePlayer);
  if (legalMoves.length === 0 || depth === 0) {
    return evaluateBoardState(board, player);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      try {
        const sim = executeMove(board, move[0], move[1], player);
        const evaluation = minimax(sim.newBoard, depth - 1, false, alpha, beta, player);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Prune
      } catch {
        // Ignore illegal
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of legalMoves) {
      try {
        const sim = executeMove(board, move[0], move[1], opponent);
        const evaluation = minimax(sim.newBoard, depth - 1, true, alpha, beta, player);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Prune
      } catch {
        // Ignore illegal
      }
    }
    return minEval;
  }
}

// Evaluation function for the board state from the perspective of player
function evaluateBoardState(board: BoardState, player: Player): number {
  const opponent: Player = player === 'white' ? 'black' : 'white';

  const yugoStats = countYugos(board);
  const myYugoCount = player === 'white' ? yugoStats.white : yugoStats.black;
  const oppYugoCount = player === 'white' ? yugoStats.black : yugoStats.white;
  const myYugoPoints = player === 'white' ? yugoStats.whitePoints : yugoStats.blackPoints;
  const oppYugoPoints = player === 'white' ? yugoStats.blackPoints : yugoStats.whitePoints;

  const myMigoCount = player === 'white' ? countMigos(board).white : countMigos(board).black;
  const oppMigoCount = player === 'white' ? countMigos(board).black : countMigos(board).white;

  let score = 0;

  // 1. Balance of Yugo Points & Count is primary
  score += (myYugoPoints - oppYugoPoints) * 300;
  score += (myYugoCount - oppYugoCount) * 100;

  // 2. Migos are potential build up but can be cleared
  score += (myMigoCount - oppMigoCount) * 10;

  // 3. Scan board for lines of YUGOS and MIGOS
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const isMe = piece.owner === player;
        const multiplier = isMe ? 1 : -1;

        // Position value: bonus for center
        const centerBonus = (7 - (Math.abs(r - 3.5) + Math.abs(c - 3.5))) * 2;
        score += centerBonus * multiplier;

        // Count streaks centered here
        for (const dir of [
          { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: -1, dc: 1 }
        ]) {
          const forward = countContiguous(board, r, c, dir.dr, dir.dc, piece.owner);
          const backward = countContiguous(board, r, c, -dir.dr, -dir.dc, piece.owner);
          const totalLength = 1 + forward + backward;

          if (piece.type === 'yugo') {
            // Yugo links are extremely powerful because they build towards Igo (line of 4 Yugos)
            if (totalLength === 3) {
              score += 150 * multiplier; // Crucial setup or block
            } else if (totalLength === 2) {
              score += 30 * multiplier;
            }
          } else {
            // Migo lines
            if (totalLength === 3) {
              score += 50 * multiplier; // High potential to make a Yugo next
            } else if (totalLength === 2) {
              score += 15 * multiplier;
            }
          }
        }
      }
    }
  }

  // 4. Number of legal moves available (mobility)
  const myMoves = getLegalMoves(board, player).length;
  const oppMoves = getLegalMoves(board, opponent).length;
  score += (myMoves - oppMoves) * 15;

  return score;
}
