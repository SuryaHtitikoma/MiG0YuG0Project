/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Player, GameSettings, GameStats as StatsType } from '../types';
import { sounds } from '../utils/audio';
import { 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  RotateCcw, 
  Flag,
  Clock, 
  Cpu, 
  User, 
  Sparkles 
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface GameStatsProps {
  stats: StatsType;
  turn: Player;
  winner: Player | 'draw' | null;
  settings: GameSettings;
  p1TimeLeft: number;
  p2TimeLeft: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenRules: () => void;
  onRestart: () => void;
  onResign: () => void;
  onGetAiHint: () => void;
}

export default function GameStats({
  stats,
  turn,
  winner,
  settings,
  p1TimeLeft,
  p2TimeLeft,
  isMuted,
  onToggleMute,
  onOpenRules,
  onRestart,
  onResign,
  onGetAiHint,
}: GameStatsProps) {

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const playClick = () => {
    sounds.playClick();
  };

  return (
    <div id="game-stats-panel" className="w-full max-w-lg bg-[#faf8f2] rounded-xl border-4 border-[#8b261a] p-4 shadow-xl text-[#242424] flex flex-col gap-4">
      {/* Upper Control Bar (Mute, Rules, Reset, Resign) */}
      <div className="flex items-center justify-between border-b border-[#8b261a]/15 pb-3">
        <div className="flex items-center gap-2">
          {/* Mute button */}
          <button
            id="toggle-sound-btn"
            onClick={() => {
              onToggleMute();
            }}
            className="p-1 px-2 text-xs font-serif bg-[#ede7d5] border border-[#cbb27a]/60 rounded-md text-[#8b261a] hover:bg-[#e4dcbf] transition flex items-center gap-1 font-bold"
            title={isMuted ? 'Buka Suara' : 'Senyap'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'MUTE' : 'SOUND'}</span>
          </button>

          {/* Rules button */}
          <button
            id="open-rules-btn"
            onClick={() => {
              playClick();
              onOpenRules();
            }}
            className="p-1 px-2 text-xs font-serif bg-[#ede7d5] border border-[#cbb27a]/60 rounded-md text-[#8b261a] hover:bg-[#e4dcbf] transition flex items-center gap-1 font-bold"
          >
            <HelpCircle className="w-4 h-4" />
            <span>ATURAN</span>
          </button>
        </div>

        {/* Tactical Actions */}
        <div className="flex items-center gap-1.5">
          {/* Hint generator (Gemini or Chess Sage) */}
          {!winner && settings.gameMode === 'local' && (
            <button
              id="ai-hint-btn"
              onClick={() => {
                playClick();
                onGetAiHint();
              }}
              className="p-1.5 py-1 text-xs font-serif bg-yellow-50 hover:bg-yellow-100 border border-yellow-300 rounded-md text-yellow-800 transition flex items-center gap-1"
              title="Dapatkan Bisikan Strategi Naga"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span className="font-bold">BISIKAN NAGA</span>
            </button>
          )}

          {/* Reset */}
          <button
            id="reset-game-btn"
            onClick={() => {
              playClick();
              onRestart();
            }}
            className="p-1 px-1.5 text-xs font-serif bg-[#8b261a] hover:bg-[#6c1e14] text-white rounded-md transition flex items-center gap-1 font-bold shadow-xs active:scale-95"
            title="Mulai Ulang Game"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">MULAI ULANG</span>
          </button>

          {/* Resign */}
          {!winner && (
            <button
              id="resign-game-btn"
              onClick={() => {
                playClick();
                onResign();
              }}
              className="p-1 px-1.5 text-xs font-serif bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md transition flex items-center gap-1 font-bold active:scale-95"
              title="Menyerah pasrah"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">RESIGN</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Players */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* PLAYER 1: RED ZHONG (WHITE) */}
        <div 
          id="player-white-stat-box"
          className={`
            relative p-3 rounded-xl border transition-all duration-300 flex flex-col justify-between h-34
            ${turn === 'white' && !winner ? 'bg-[#fdf3f2] border-[#8b261a] ring-2 ring-red-200 shadow-md' : 'bg-white border-gray-200 opacity-80'}
          `}
        >
          {/* Active Turn Gilded Dragon Ribbon */}
          {turn === 'white' && !winner && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#8b261a] rounded-t-xl" />
          )}

          {/* Player Identity Block */}
          <div className="flex items-start gap-2">
            <div className="w-8 h-10 bg-[#faf8f2] border border-red-700 rounded-sm flex items-center justify-center font-serif text-xl text-red-650 font-bold shrink-0 shadow-sm relative overflow-hidden">
              中
              <div className="absolute bottom-0 inset-x-0 h-1 bg-red-700" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold font-serif text-[#8b261a] flex items-center gap-1 truncate" title={settings.p1Name}>
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>{settings.p1Name}</span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono font-bold">Warna Bidak: Putih</div>
            </div>
          </div>

          {/* Game Stats counters (Migos, Yugos) */}
          <div className="flex justify-between items-center bg-[#ede7d5]/40 p-1.5 px-2.5 rounded-lg border border-amber-900/5 mt-1.5">
            <div className="text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Migo</div>
              <div className="text-sm font-bold font-mono text-gray-700">{stats.whiteMigos}</div>
            </div>
            <div className="w-px h-6 bg-amber-900/10" />
            <div className="text-center">
              <div className="text-[10px] text-[#b45309] uppercase tracking-wider font-bold">Yugo (Skor)</div>
              <div className="text-xs font-bold font-mono text-amber-650 flex flex-col items-center justify-center">
                <span className="text-gray-500 leading-tight">{stats.whiteYugos} Ubin</span>
                <span className="text-amber-605 font-bold leading-tight flex items-center justify-center gap-0.5">{stats.whiteYugoPoints} Pts 🪙</span>
              </div>
            </div>
          </div>

          {/* Timer displaying */}
          {settings.clockEnabled && (
            <div className={`mt-2 flex items-center justify-center gap-1 p-1 rounded font-mono text-xs font-bold leading-none
              ${p1TimeLeft <= 30 && turn === 'white' && !winner ? 'bg-red-50 text-red-600 animate-pulse' : 'text-gray-600'}
            `}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{formatTime(p1TimeLeft)}</span>
            </div>
          )}
        </div>

        {/* PLAYER 2: GREEN FA (BLACK) */}
        <div 
          id="player-black-stat-box"
          className={`
            relative p-3 rounded-xl border transition-all duration-300 flex flex-col justify-between h-34
            ${turn === 'black' && !winner ? 'bg-[#f1faf5] border-emerald-600 ring-2 ring-emerald-100 shadow-md' : 'bg-white border-gray-200 opacity-80'}
          `}
        >
          {/* Active Turn Gilded Dragon Ribbon */}
          {turn === 'black' && !winner && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-xl" />
          )}

          {/* Player Identity Block */}
          <div className="flex items-start gap-2">
            <div className="w-8 h-10 bg-[#faf8f2] border border-emerald-700 rounded-sm flex items-center justify-center font-serif text-xl text-emerald-700 font-bold shrink-0 shadow-sm relative overflow-hidden">
              發
              <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-700" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold font-serif text-emerald-800 flex items-center gap-1 truncate" title={settings.p2Name}>
                {settings.gameMode === 'ai' ? (
                  <Cpu className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                ) : (
                  <User className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{settings.p2Name}</span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono font-bold">Warna Bidak: Hitam</div>
            </div>
          </div>

          {/* Game Stats counters (Migos, Yugos) */}
          <div className="flex justify-between items-center bg-[#ede7d5]/40 p-1.5 px-2.5 rounded-lg border border-amber-900/5 mt-1.5">
            <div className="text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Migo</div>
              <div className="text-sm font-bold font-mono text-gray-700">{stats.blackMigos}</div>
            </div>
            <div className="w-px h-6 bg-amber-900/10" />
            <div className="text-center">
              <div className="text-[10px] text-[#b45309] uppercase tracking-wider font-bold">Yugo (Skor)</div>
              <div className="text-xs font-bold font-mono text-amber-650 flex flex-col items-center justify-center">
                <span className="text-gray-500 leading-tight">{stats.blackYugos} Ubin</span>
                <span className="text-amber-605 font-bold leading-tight flex items-center justify-center gap-0.5">{stats.blackYugoPoints} Pts 🪙</span>
              </div>
            </div>
          </div>

          {/* Timer displaying */}
          {settings.clockEnabled && (
            <div className={`mt-2 flex items-center justify-center gap-1 p-1 rounded font-mono text-xs font-bold leading-none
              ${p2TimeLeft <= 30 && turn === 'black' && !winner ? 'bg-red-50 text-red-600 animate-pulse' : 'text-gray-600'}
            `}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{formatTime(p2TimeLeft)}</span>
            </div>
          )}
        </div>

      </div>

      {/* Table Status Centerpiece Decorative */}
      <div className="bg-[#ede7d5]/50 border border-[#cbb27a]/40 rounded-lg p-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-emerald-950 font-serif font-bold text-yellow-500 text-[10px] sm:text-xs flex items-center justify-center border border-yellow-400">
            {turn === 'white' ? '東' : '南'}
          </div>
          <span className="font-semibold text-gray-600">
            Arah Turn ({turn === 'white' ? 'Angin Timur' : 'Angin Selatan'})
          </span>
        </div>
        <div className="text-right text-gray-500 font-bold font-mono">
          Kosong: {stats.emptySquares} / 64
        </div>
      </div>
    </div>
  );
}
