/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Player = 'white' | 'black'; // 'white' = Player 1 (Red Zhong), 'black' = Player 2 (Green Fa)

export type PieceType = 'migo' | 'yugo';

export interface GamePiece {
  owner: Player;
  type: PieceType;
  id: string; // for React motion animations key stability
  yugoShape?: 'circle' | 'oval' | 'triangle' | 'square';
  yugoPoints?: number;
}

export type CellValue = GamePiece | null;

export type BoardState = CellValue[][]; // 8x8 grid: index 0 is top (Row 8), index 7 is bottom (Row 1)

export interface GameSettings {
  p1Name: string;
  p2Name: string;
  gameMode: 'local' | 'ai';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  clockEnabled: boolean;
  clockTimeLimit: number; // in seconds
}

export interface GameStats {
  whiteYugos: number;
  blackYugos: number;
  whiteYugoPoints: number;
  blackYugoPoints: number;
  whiteMigos: number;
  blackMigos: number;
  emptySquares: number;
}

export interface GameState {
  board: BoardState;
  turn: Player;
  winner: Player | 'draw' | null;
  winType: 'igo' | 'wego' | 'resign' | 'timeout' | null;
  history: { board: BoardState; turn: Player }[];
  p1TimeLeft: number; // in seconds
  p2TimeLeft: number; // in seconds
  isTimerRunning: boolean;
  selectedCell: [number, number] | null; // for visual highlighting
  lastPlacedCell: [number, number] | null; // of last placed piece
  isYugoCreatedThisTurn: boolean;
}
