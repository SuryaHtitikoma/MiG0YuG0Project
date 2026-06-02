/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Player, BoardState, CellValue } from '../types';
import { validateMove, isValidCoordinate } from '../utils/gameLogic';
import { sounds } from '../utils/audio';
import { AlertCircle } from 'lucide-react';

interface BoardProps {
  board: BoardState;
  turn: Player;
  onMakeMove: (r: number, c: number) => void;
  winner: Player | 'draw' | null;
  lastPlacedCell: [number, number] | null;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
}

// Convert row indices for Chinese labels: 8 -> 八, 1 -> 一
const CHINESE_ROW_LABELS = ['八', '七', '六', '五', '四', '三', '二', '一'];
const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const CHINESE_COL_LABELS = ['東', '南', '西', '北', '中', '發', '白', '萬'];

interface YugoSparklesProps {
  shape: 'circle' | 'oval' | 'triangle' | 'square';
}

interface SparkleParticle {
  id: number;
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  isStar: boolean;
  angle: number;
  spin: number;
}

function YugoSparkles({ shape }: YugoSparklesProps) {
  const particles = useMemo(() => {
    let count = 12;
    let minDistance = 15;
    let maxDistance = 35;
    let maxDuration = 1.0;
    
    if (shape === 'oval') {
      count = 20;
      minDistance = 20;
      maxDistance = 55;
      maxDuration = 1.2;
    } else if (shape === 'triangle') {
      count = 32;
      minDistance = 25;
      maxDistance = 75;
      maxDuration = 1.4;
    } else if (shape === 'square') {
      count = 48;
      minDistance = 30;
      maxDistance = 100;
      maxDuration = 1.6;
    }

    const goldColors = [
      '#ffe066', // bright light gold
      '#f59e0b', // warm golden amber
      '#fbbf24', // sparkling gold
      '#ffd700', // pure gold
      '#ffffff', // shining white spark
    ];

    const list: SparkleParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      const xEnd = Math.cos(angle) * distance;
      const yEnd = Math.sin(angle) * distance;
      
      const size = 3 + Math.random() * 5; // 3px to 8px
      const color = goldColors[Math.floor(Math.random() * goldColors.length)];
      const duration = 0.7 + Math.random() * (maxDuration - 0.7);
      const delay = Math.random() * 0.15; // slight stagger
      const isStar = Math.random() > 0.5; // 50% are stars
      const spin = (Math.random() - 0.5) * 720; // rotation angle

      list.push({
        id: i,
        xStart: 0,
        yStart: 0,
        xEnd,
        yEnd,
        size,
        color,
        duration,
        delay,
        isStar,
        angle,
        spin,
      });
    }
    return list;
  }, [shape]);

  // Ambient twinkling sparkles shown persistently around the gold piece
  const ambientCount = shape === 'circle' ? 1 : shape === 'oval' ? 2 : shape === 'triangle' ? 3 : 5;
  const ambientSparkles = useMemo(() => {
    const list = [];
    for (let i = 0; i < ambientCount; i++) {
      list.push({
        id: `ambient-${i}`,
        x: (Math.random() - 0.5) * 16,
        y: (Math.random() - 0.5) * 20,
        delay: Math.random() * 3,
        duration: 1.5 + Math.random() * 2,
      });
    }
    return list;
  }, [ambientCount]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center z-30">
      {/* Burst Explosion Particles on Mount */}
      {particles.map((p) => (
        <motion.div
          key={`burst-${p.id}`}
          initial={{ 
            x: 0, 
            y: 0, 
            scale: 0, 
            opacity: 1,
            rotate: 0 
          }}
          animate={{ 
            x: p.xEnd, 
            y: p.yEnd, 
            scale: [0, 1.6, 0.8, 0], 
            opacity: [1, 1, 0.5, 0],
            rotate: p.spin
          }}
          transition={{ 
            duration: p.duration, 
            delay: p.delay,
            ease: "easeOut"
          }}
          className="absolute flex items-center justify-center pointer-events-none"
          style={{ width: p.size, height: p.size }}
        >
          {p.isStar ? (
            <span 
              className="font-serif leading-none select-none"
              style={{ 
                color: p.color, 
                fontSize: `${p.size + 4}px`,
                textShadow: `0 0 5px ${p.color}, 0 0 10px ${p.color}`
              }}
            >
              ✦
            </span>
          ) : (
            <div 
              className="rounded-full h-full w-full"
              style={{ 
                backgroundColor: p.color,
                boxShadow: `0 0 6px ${p.color}, 0 0 12px ${p.color}`
              }}
            />
          )}
        </motion.div>
      ))}

      {/* Ambient Twinkling Particles */}
      {ambientSparkles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 0.85, 0, 0], 
            scale: [0, 1.3, 0, 0],
            rotate: [0, 180, 360] 
          }}
          transition={{ 
            duration: p.duration, 
            repeat: Infinity, 
            delay: p.delay,
            repeatDelay: Math.random() * 2.5 + 1.5,
            ease: "easeInOut"
          }}
          className="absolute pointer-events-none"
          style={{ 
            left: `calc(50% + ${p.x}px)`, 
            top: `calc(50% + ${p.y}px)`, 
            color: '#fff99d',
          }}
        >
          <span 
            className="font-serif leading-none select-none text-[8px] sm:text-[11px]"
            style={{ textShadow: '0 0 4px #fbbf24' }}
          >
            ✦
          </span>
        </motion.div>
      ))}
    </div>
  );
}

export default function Board({
  board,
  turn,
  onMakeMove,
  winner,
  lastPlacedCell,
  errorMessage,
  setErrorMessage,
}: BoardProps) {
  
  const handleCellClick = (r: number, c: number) => {
    if (winner) return;

    // Check legality first
    const check = validateMove(board, r, c, turn);
    if (!check.legal) {
      sounds.playClick(); // play light warning clack
      setErrorMessage(check.reason || 'Langkah tidak diperbolehkan!');
      // auto-clear error message after 5 seconds
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return;
    }

    setErrorMessage(null);
    onMakeMove(r, c);
  };

  return (
    <div id="mahjong-table-outer" className="w-full flex flex-col items-center select-none">
      
      {/* Toast Alert for illegal moves */}
      <div className="h-10 w-full max-w-lg mb-2 flex items-center justify-center">
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 bg-[#fef2f2] border border-red-200 text-red-700 px-3 py-1 rounded-full text-xs font-medium shadow-sm max-w-full text-center"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-650" />
            <span className="truncate">{errorMessage}</span>
          </motion.div>
        )}
      </div>

      {/* Main Board Framing */}
      <div 
        id="board-framing-box" 
        className="relative bg-[#1e201a] p-4 sm:p-6 rounded-2xl shadow-2xl border-4 border-[#3a2010] outline-8 outline-double outline-[#8b261a]"
      >
        {/* Mahogany Inner Rim */}
        <div className="absolute inset-2 border border-[#8b261a]/30 rounded-xl pointer-events-none" />

        <div className="relative flex flex-col">
          {/* Top Column Labels */}
          <div className="flex pl-8 pr-8 pb-1 justify-between select-none">
            {COLUMN_LABELS.map((col, cIdx) => (
              <div 
                key={`top-col-${col}`} 
                className="w-8 sm:w-12 text-center flex flex-col items-center justify-center text-xs font-mono font-bold text-[#cbb27a]/80"
              >
                <span>{col}</span>
                <span className="text-[9px] text-[#faf8f2]/30 font-sans leading-none">{CHINESE_COL_LABELS[cIdx]}</span>
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Left Row Labels */}
            <div className="flex flex-col justify-between pr-2 py-2 select-none">
              {CHINESE_ROW_LABELS.map((chLabel, rIdx) => (
                <div 
                  key={`left-row-${8 - rIdx}`} 
                  className="h-8 sm:h-12 w-6 flex flex-col items-end justify-center text-xs font-mono font-bold text-[#cbb27a]/80 leading-none"
                >
                  <span className="text-[10px] text-[#faf8f2]/30 font-sans">{chLabel}</span>
                  <span>{8 - rIdx}</span>
                </div>
              ))}
            </div>

            {/* The 8x8 Grid */}
            <div 
              id="mahjong-green-felt"
              className="grid grid-cols-8 grid-rows-8 gap-[3px] bg-[#0d2f21] p-2.5 rounded-lg border-2 border-[#16412f] shadow-inner"
            >
              {board.map((rowArr, rIdx) =>
                rowArr.map((cell, cIdx) => {
                  const isLastPlaced = lastPlacedCell && lastPlacedCell[0] === rIdx && lastPlacedCell[1] === cIdx;
                  const canPlace = !cell && validateMove(board, rIdx, cIdx, turn).legal;
                  const cellCoordsName = `${COLUMN_LABELS[cIdx]}${8 - rIdx}`;

                  return (
                    <div
                      key={`cell-${rIdx}-${cIdx}`}
                      id={`cell-${cellCoordsName}`}
                      onClick={() => handleCellClick(rIdx, cIdx)}
                      className={`
                        relative w-8 h-10 sm:w-12 sm:h-15 rounded-sm transition-all duration-200 cursor-pointer flex items-center justify-center
                        ${cell ? 'bg-transparent' : 'bg-[#153e2e] border border-[#1d4f3b]/50 hover:bg-[#1a4f3b] hover:border-emerald-500/40'}
                      `}
                    >
                      {/* Grid Background Dot (Traditional board accent) */}
                      {!cell && (
                        <div className={`w-1 h-1 rounded-full ${canPlace ? 'bg-emerald-600/50' : 'bg-red-950/40'}`} />
                      )}

                      {/* Ghost preview of next move on hover */}
                      {!cell && canPlace && !winner && (
                        <div className="absolute inset-0 opacity-0 hover:opacity-20 transition-opacity flex items-center justify-center">
                          <div className="w-7 h-9 sm:w-10 sm:h-13 bg-[#faf8f2] border border-gray-350 rounded shadow flex items-center justify-center text-base sm:text-2xl font-bold font-serif">
                            {turn === 'white' ? (
                              <span className="text-red-650">中</span>
                            ) : (
                              <span className="text-emerald-700">發</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Display Occupied Tile */}
                      {cell && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0, y: -8 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                          className="relative w-8.5 h-10.5 sm:w-11 sm:h-14 group"
                        >
                          {/* 3D Mahjong Tile Backing (Jade green/bamboo color) */}
                          <div className="absolute -bottom-[2px] right-[1px] w-full h-full bg-[#135d46] border-b border-r border-[#0d4634] rounded shadow-md" />
                          <div className="absolute -bottom-[1px] right-[2px] w-full h-full bg-[#1b7c5e] rounded" />

                          {/* Mahjong Bone Interface Face */}
                          <div 
                            className={`
                              absolute -top-[1.5px] -left-[1px] w-full h-full bg-[#faf8f2] hover:bg-[#fffff9] border-t border-l border-white rounded-sm flex flex-col items-center justify-center transition-transform duration-100 shadow-xs
                              ${isLastPlaced ? 'border-2 border-amber-500' : 'border border-gray-200'}
                              ${cell.type === 'yugo' ? 'ring-2 ring-yellow-400 ring-inset ring-offset-[0.5px]' : ''}
                            `}
                          >
                            {/* Inner character engraving */}
                            <span 
                              className={`
                                font-serif font-bold text-center select-none text-[15px] sm:text-[23px] leading-none mb-1
                                ${cell.owner === 'white' ? 'text-red-650 drop-shadow-[0.5px_0.5px_0_rgba(139,38,26,0.2)]' : 'text-emerald-700 drop-shadow-[0.5px_0.5px_0_rgba(15,81,59,0.2)]'}
                              `}
                            >
                              {cell.owner === 'white' ? '中' : '發'}
                            </span>

                            {/* Center Gemstone representation for Yugo */}
                            {cell.type === 'yugo' && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                {/* Golden sparkles component with custom intensity */}
                                <YugoSparkles shape={cell.yugoShape || 'circle'} />

                                {/* Golden pulsing jewel aura */}
                                <motion.div 
                                  animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.8, 0.6] }}
                                  transition={{ repeat: Infinity, duration: 2.5 }}
                                  className="absolute w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-yellow-400/25 blur-[2.5px]"
                                />
                                {/* Shape container */}
                                <div className="z-10 flex flex-col items-center justify-center">
                                  <svg 
                                    viewBox="0 0 24 24" 
                                    className="w-3.5 h-3.5 sm:w-5 sm:h-5 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.3)]"
                                  >
                                    <defs>
                                      <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#ffe066" />
                                        <stop offset="50%" stopColor="#f59e0b" />
                                        <stop offset="100%" stopColor="#b45309" />
                                      </linearGradient>
                                    </defs>
                                    {(!cell.yugoShape || cell.yugoShape === 'circle') && (
                                      <circle cx="12" cy="12" r="8" fill="url(#gold-grad)" stroke="#92400e" strokeWidth="1.5" />
                                    )}
                                    {cell.yugoShape === 'oval' && (
                                      <ellipse cx="12" cy="12" rx="5" ry="8" fill="url(#gold-grad)" stroke="#92400e" strokeWidth="1.5" />
                                    )}
                                    {cell.yugoShape === 'triangle' && (
                                      <polygon points="12,3 3,19 21,19" fill="url(#gold-grad)" stroke="#92400e" strokeWidth="1.5" />
                                    )}
                                    {cell.yugoShape === 'square' && (
                                      <rect x="4" y="4" width="16" height="16" rx="2" fill="url(#gold-grad)" stroke="#92400e" strokeWidth="1.5" />
                                    )}
                                  </svg>
                                  {/* Score overlay tag */}
                                  <span className="text-[7px] sm:text-[9px] font-mono font-bold text-amber-950 mt-0.5 bg-yellow-100/95 px-0.5 sm:px-1 border border-yellow-300 rounded-sm leading-none shadow-2xs">
                                    {cell.yugoPoints || 1}p
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Mini indicator labels for columns/rows in corners of tiles (traditional design) */}
                            <div className="absolute top-[1.5px] left-[1.5px] text-[6px] sm:text-[8px] text-gray-400 leading-none scale-90">
                              {cell.owner === 'white' ? '伍' : '财'}
                            </div>

                            {/* Small highlight corner for last placed piece */}
                            {isLastPlaced && (
                              <div className="absolute top-0 right-0 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-bl-full" />
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Row Labels */}
            <div className="flex flex-col justify-between pl-2 py-2 select-none">
              {CHINESE_ROW_LABELS.map((chLabel, rIdx) => (
                <div 
                  key={`right-row-${8 - rIdx}`} 
                  className="h-8 sm:h-12 w-6 flex flex-col items-start justify-center text-xs font-mono font-bold text-[#cbb27a]/80 leading-none"
                >
                  <span className="text-[10px] text-[#faf8f2]/30 font-sans">{chLabel}</span>
                  <span>{8 - rIdx}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Column Labels */}
          <div className="flex pl-8 pr-8 pt-1 justify-between select-none">
            {COLUMN_LABELS.map((col, cIdx) => (
              <div 
                key={`bottom-col-${col}`} 
                className="w-8 sm:w-12 text-center flex flex-col items-center justify-center text-xs font-mono font-bold text-[#cbb27a]/80"
              >
                <span className="text-[9px] text-[#faf8f2]/30 font-sans leading-none mb-0.5">{CHINESE_COL_LABELS[cIdx]}</span>
                <span>{col}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
      
      {/* Board Footnote / Status help info */}
      <p className="text-[10px] sm:text-xs text-[#faf8f2]/50 mt-4 italic text-center font-serif leading-tight">
        * Letakkan ubin Mahjong bergantian. Aturan No Long Lines melarang 5+ berturut-turut.<br />
        Garis 4 Migo utuh melebur menjadi Yugo abadi berhias permata emas 🪙.
      </p>

    </div>
  );
}
