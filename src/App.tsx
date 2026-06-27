/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Player, 
  BoardState, 
  GameSettings, 
  GameStats as StatsType 
} from './types';
import { 
  createInitialBoard, 
  executeMove, 
  checkForIgo, 
  getLegalMoves, 
  countYugos, 
  countMigos, 
  getBestMove 
} from './utils/gameLogic';
import { sounds } from './utils/audio';

import Board from './components/Board';
import GameStats from './components/GameStats';
import RulesModal from './components/RulesModal';

import { 
  Play, 
  User, 
  Cpu, 
  Clock as ClockIcon, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  Award, 
  Flame, 
  Sparkles, 
  AlertTriangle 
} from 'lucide-react';

export default function App() {
  // Game states
  const [phase, setPhase] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [board, setBoard] = useState<BoardState>(createInitialBoard());
  const [turn, setTurn] = useState<Player>('white');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [winType, setWinType] = useState<'igo' | 'wego' | 'resign' | 'timeout' | null>(null);
  const [history, setHistory] = useState<{ board: BoardState; turn: Player }[]>([]);
  
  // Settings State
  const [settings, setSettings] = useState<GameSettings>({
    p1Name: 'Pemain Merah',
    p2Name: 'Pemain Hijau',
    gameMode: 'local',
    playerColor: 'white',
    aiDifficulty: 'master',
    clockEnabled: false,
    clockTimeLimit: 180, // 3 minutes default
  });

  // Clock variables
  const [p1TimeLeft, setP1TimeLeft] = useState<number>(180);
  const [p2TimeLeft, setP2TimeLeft] = useState<number>(180);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  // Error management
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio mute State
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Modal control
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);

  // Game coordinates
  const [lastPlacedCell, setLastPlacedCell] = useState<[number, number] | null>(null);

  // AI thinking visual indicator
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Dragon Hint Whispers State
  const [dragonHint, setDragonHint] = useState<{
    coordinate: [number, number];
    wisdom: string;
  } | null>(null);

  // Load sound configurations on startup
  useEffect(() => {
    setIsMuted(sounds.isMuted());
  }, []);

  // Sync mute state
  const handleToggleMute = () => {
    const nextMuted = sounds.toggleMute();
    setIsMuted(nextMuted);
    sounds.playClick();
  };

  // 1. GAME TIMER countdown loop
  useEffect(() => {
    if (phase !== 'playing' || !settings.clockEnabled || winner) {
      setIsTimerActive(false);
      return;
    }

    setIsTimerActive(true);
    const interval = setInterval(() => {
      if (turn === 'white') {
        setP1TimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeExpiration('white');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setP2TimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeExpiration('black');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, turn, winner, settings.clockEnabled]);

  // Handle timeout losses
  const handleTimeExpiration = (losingPlayer: Player) => {
    const winningPlayer: Player = losingPlayer === 'white' ? 'black' : 'white';
    setWinner(winningPlayer);
    setWinType('timeout');
    setPhase('gameover');
    sounds.playGong();
  };

  // 2. COMPUTER AI TURN TRIGGERS
  useEffect(() => {
    const isAiTurn = settings.gameMode === 'ai' && (
      (settings.playerColor === 'white' && turn === 'black') || 
      (settings.playerColor === 'black' && turn === 'white')
    );

    if (phase !== 'playing' || winner || !isAiTurn) {
      return;
    }

    setIsAiThinking(true);
    setDragonHint(null); // Clear hint so opponent doesn't see

    // Simulate thinking delay so AI feels realistic and meditative
    const thinkingDelay = settings.aiDifficulty === 'baby' ? 600 : settings.aiDifficulty === 'novice' ? 800 : settings.aiDifficulty === 'master' ? 1200 : 1600;

    const timer = setTimeout(() => {
      const bestMove = getBestMove(board, turn, settings.aiDifficulty);
      if (bestMove) {
        processMove(bestMove[0], bestMove[1], turn);
      } else {
        // AI has no moves, immediate Wego!
        triggerWegoEnd();
      }
      setIsAiThinking(false);
    }, thinkingDelay);

    return () => clearTimeout(timer);
  }, [phase, turn, winner, settings.gameMode, settings.aiDifficulty, settings.playerColor]);

  // Main board move executor
  const processMove = (r: number, c: number, activePlayer: Player) => {
    try {
      // Save history for potential undo or stats
      setHistory((prev) => [...prev, { board, turn }]);

      const { newBoard, yugoCreated, affectedCells, yugoCell } = executeMove(board, r, c, activePlayer);

      setBoard(newBoard);
      setLastPlacedCell([r, c]);

      // Sound play
      if (yugoCreated) {
        sounds.playYugoChime();
      } else {
        sounds.playClack();
      }

      // Check immediate Igo win
      if (checkForIgo(newBoard, activePlayer)) {
        setWinner(activePlayer);
        setWinType('igo');
        setPhase('gameover');
        sounds.playVictory();
        return;
      }

      // Switch turn
      const nextPlayer: Player = activePlayer === 'white' ? 'black' : 'white';

      // Verify if next player has any legal moves. If not, trigger Wego!
      const nextLegalMoves = getLegalMoves(newBoard, nextPlayer);
      if (nextLegalMoves.length === 0) {
        triggerWegoEndWithBoard(newBoard);
        return;
      }

      setTurn(nextPlayer);
      setDragonHint(null); // Reset hint for the next turn
    } catch (err: any) {
      setErrorMessage(err?.message || 'Langkah ilegal');
    }
  };

  // Trigger pass-and-play moves
  const handleUserMove = (r: number, c: number) => {
    // block moves if AI is active thinking or it's AI's turn
    const isAiTurn = settings.gameMode === 'ai' && (
      (settings.playerColor === 'white' && turn === 'black') || 
      (settings.playerColor === 'black' && turn === 'white')
    );
    if (isAiTurn) return;
    processMove(r, c, turn);
  };

  // Trigger Wego game end
  const triggerWegoEnd = () => {
    triggerWegoEndWithBoard(board);
  };

  const triggerWegoEndWithBoard = (currentBoard: BoardState) => {
    const scores = countYugos(currentBoard);
    let finalWinner: Player | 'draw' = 'draw';
    if (scores.whitePoints > scores.blackPoints) {
      finalWinner = 'white';
    } else if (scores.blackPoints > scores.whitePoints) {
      finalWinner = 'black';
    } else if (scores.white > scores.black) {
      finalWinner = 'white';
    } else if (scores.black > scores.white) {
      finalWinner = 'black';
    }

    setWinner(finalWinner);
    setWinType('wego');
    setPhase('gameover');
    sounds.playGong();
  };

  // Get Move Hints with traditional Asian wisdom comments (The Master Mind Sage hints)
  const handleGetAiHint = () => {
    const move = getBestMove(board, turn, 'grandmaster');
    if (!move) {
      setErrorMessage('Tiada langkah legal tersisa untuk diberikan bimbingan.');
      return;
    }

    const colStr = String.fromCharCode(65 + move[1]);
    const rowStr = 8 - move[0];

    // Traditional Chinese / Asian strategies translated corresponding to coordinates
    const wisdomPills = [
      `Letakkan di ${colStr}${rowStr}. "Mengetuk kayu untuk memanggil naga". Langkah ini menata struktur pertahanan mahakarya Anda.`,
      `Pilih petak ${colStr}${rowStr}. "Menjebak elang dengan ranting bambu". Ini melindungi sudut bernilai dari kepungan lawan.`,
      `Bidikan bijak di ${colStr}${rowStr}. "Mengamati awan dari puncak gunung". Ini membatasi opsi ekspansi baris musuh secara presisi.`,
      `Sandarkan ubin di ${colStr}${rowStr}. "Menyeberangi sungai dengan rakit bambu". Memotong rangkaian diagonal lawan sebelum terlambat!`,
      `Sasar koordinat ${colStr}${rowStr}. "Mendahului petir dengan keheningan". Langkah ini meningkatkan peluang pembentukan Yugo taktis.`,
      `Garis takdir menuju ${colStr}${rowStr}. "Menyapu daun di pelataran kuil". Singkirkan ambisi lawan dan dominasi pusat energi papan.`
    ];

    const randomWisdom = wisdomPills[Math.floor(Math.random() * wisdomPills.length)];

    setDragonHint({
      coordinate: move,
      wisdom: randomWisdom
    });

    sounds.playYugoChime(); // small pleasant crystal sound
  };

  // Run resignation
  const handleResign = () => {
    const opp: Player = turn === 'white' ? 'black' : 'white';
    setWinner(opp);
    setWinType('resign');
    setPhase('gameover');
    sounds.playGong();
  };

  // Start a fresh new round
  const handleStartGame = () => {
    sounds.playGong();
    setBoard(createInitialBoard());
    setTurn('white');
    setWinner(null);
    setWinType(null);
    setHistory([]);
    setLastPlacedCell(null);
    setDragonHint(null);
    setErrorMessage(null);
    setP1TimeLeft(settings.clockTimeLimit);
    setP2TimeLeft(settings.clockTimeLimit);
    setPhase('playing');
  };

  // Score stats calculator
  const computedYugos = countYugos(board);
  const stats: StatsType = {
    whiteYugos: computedYugos.white,
    blackYugos: computedYugos.black,
    whiteYugoPoints: computedYugos.whitePoints,
    blackYugoPoints: computedYugos.blackPoints,
    whiteMigos: countMigos(board).white,
    blackMigos: countMigos(board).black,
    emptySquares: board.flat().filter(cell => cell === null).length,
  };

  const p1DisplayName = settings.gameMode === 'ai' && settings.playerColor === 'black' ? 'Suhu Komputer' : settings.p1Name;
  const p2DisplayName = settings.gameMode === 'ai' && settings.playerColor === 'white' ? 'Suhu Komputer' : settings.p2Name;

  return (
    <div className="min-h-screen bg-[#11241a] text-[#fbf9f4] flex flex-col items-center justify-between p-4 selection:bg-red-700 selection:text-white font-sans overflow-x-hidden relative">
      
      {/* Visual Traditional Lattice/Clouds Corner Backdrops */}
      <div className="absolute top-0 left-0 w-36 h-36 bg-gradient-to-br from-[#8b261a]/10 to-transparent pointer-events-none rounded-br-full" />
      <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-[#8b261a]/10 to-transparent pointer-events-none rounded-bl-full" />

      {/* Header Banner */}
      <header className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[#8b261a]/20 pb-4 mb-4 select-none">
        <div className="flex items-center gap-3">
          {/* Animated Thematic Icon */}
          <div className="w-12 h-14 bg-[#faf8f2] border-2 border-[#8b261a] rounded flex flex-col items-center justify-center font-serif text-2xl font-bold text-red-650 shadow-md relative shrink-0">
            中
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-red-650" />
            {/* Jewel */}
            <div className="absolute w-2 h-2 bg-yellow-400 border border-white rounded-full top-[10%] right-[10%] shadow" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif text-[#faf8f2]">
              MigoYugo <span className="text-[#cbb27a] font-light text-xl sm:text-2xl">Mahjong</span>
            </h1>
            <p className="text-xs text-[#faf8f2]/60 font-serif leading-none mt-0.5">Abstract Strategy of Complete Information • Est. 2026</p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2">
          {phase === 'playing' && (
            <div className="text-[11px] font-mono bg-emerald-950/85 px-3 py-1 border border-[#1d4f3b] rounded-full text-[#cbb27a] font-bold flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              GAME SEDANG BERJALAN
            </div>
          )}
          <button
            id="global-rules-btn"
            onClick={() => { sounds.playClick(); setIsRulesOpen(true); }}
            className="p-2 bg-[#1b3d2f] hover:bg-[#255240] rounded-md transition border border-emerald-800 text-[#faf8f2]"
            title="Kanal Aturan Permainan"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Primary Layout Center */}
      <main className="w-full max-w-5xl flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 py-2 z-10">
        
        {/* ================= PHASE 1: MAIN LOBBY MENU ================= */}
        <AnimatePresence mode="wait">
          {phase === 'menu' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              id="lobby-layout-box"
              className="w-full max-w-lg bg-[#faf8f2] text-[#242424] rounded-2xl border-8 border-double border-[#8b261a] p-5 sm:p-7 shadow-2xl flex flex-col gap-6"
            >
              <div className="text-center space-y-2">
                <span className="text-xs font-serif font-bold tracking-widest text-[#8b261a] uppercase">Pilih Arena & Pendekar</span>
                <h2 className="text-3xl font-bold font-serif text-[#8b261a]">Mata Angin Naga</h2>
                <p className="text-xs text-gray-500 font-serif">Konfigurasikan gaya bermain Anda untuk memulai pertempuran pikiran MigoYugo.</p>
              </div>

              {/* Game Mode Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider font-serif">Mode Permainan</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="mode-local-btn"
                    onClick={() => {
                      sounds.playClick();
                      setSettings(prev => ({ ...prev, gameMode: 'local', p2Name: 'Pemain Hijau' }));
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition flex flex-col justify-between h-20 
                      ${settings.gameMode === 'local' 
                        ? 'border-[#8b261a] bg-[#fdf3f2] text-[#8b261a]' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    <User className="w-5 h-5 text-red-700" />
                    <div>
                      <div className="text-xs font-bold font-serif leading-none">Lokal 2-Pemain</div>
                      <span className="text-[10px] text-gray-500 leading-none">Pass-and-Play bergantian</span>
                    </div>
                  </button>

                  <button
                    id="mode-ai-btn"
                    onClick={() => {
                      sounds.playClick();
                      setSettings(prev => ({ ...prev, gameMode: 'ai', p2Name: 'Suhu Komputer' }));
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition flex flex-col justify-between h-20 
                      ${settings.gameMode === 'ai' 
                        ? 'border-[#8b261a] bg-[#fdf3f2] text-[#8b261a]' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    <Cpu className="w-5 h-5 text-blue-700" />
                    <div>
                      <div className="text-xs font-bold font-serif leading-none">VS Komputer AI</div>
                      <span className="text-[10px] text-gray-500 leading-none">Uji nalar melawan Suhu</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Dynamic Sub-Settings for AI Difficulty and Color */}
              {settings.gameMode === 'ai' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="space-y-4 border-t border-gray-200/65 pt-3 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider font-serif">Pilih Pendekar Anda</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          sounds.playClick();
                          setSettings(prev => ({ ...prev, playerColor: 'white' }));
                        }}
                        className={`p-2 rounded text-xs leading-tight border font-serif text-center font-bold flex items-center justify-center gap-2 transition
                          ${settings.playerColor === 'white' 
                            ? 'bg-red-50 text-red-800 border-red-300 ring-1 ring-red-500' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                      >
                        <span className="text-red-700 text-lg">中</span> Pendekar Merah (Pertama)
                      </button>
                      <button
                        onClick={() => {
                          sounds.playClick();
                          setSettings(prev => ({ ...prev, playerColor: 'black' }));
                        }}
                        className={`p-2 rounded text-xs leading-tight border font-serif text-center font-bold flex items-center justify-center gap-2 transition
                          ${settings.playerColor === 'black' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                      >
                        <span className="text-emerald-700 text-lg">發</span> Pendekar Hijau (Kedua)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider font-serif">Tingkat Kesaktian Komputer</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(['baby', 'novice', 'master', 'grandmaster'] as const).map((diff) => {
                        const diffLabels = { baby: 'Baby Naga', novice: 'Novice Monk', master: 'Mahjong Master', grandmaster: 'Grandmaster' };
                        return (
                          <button
                            key={`diff-${diff}`}
                            id={`diff-${diff}-btn`}
                            onClick={() => {
                              sounds.playClick();
                              setSettings(prev => ({ ...prev, aiDifficulty: diff }));
                            }}
                            className={`p-1 sm:p-2 rounded text-[10px] sm:text-xs leading-tight border font-serif text-center font-bold capitalize transition
                              ${settings.aiDifficulty === diff 
                                ? 'bg-[#8b261a] text-white border-[#8b261a]' 
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                          >
                            {diffLabels[diff]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Player names inputs */}
              <div className="space-y-3.5 border-t border-gray-200/65 pt-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider font-serif">Pendekar Merah (Mulai Pertama)</label>
                  <div className="relative flex items-center">
                    {settings.gameMode === 'ai' && settings.playerColor === 'black' ? (
                      <Cpu className="absolute left-3 w-4 h-4 text-red-650" />
                    ) : (
                      <User className="absolute left-3 w-4 h-4 text-red-650" />
                    )}
                    <input
                      id="p1-name-input"
                      type="text"
                      maxLength={18}
                      value={settings.gameMode === 'ai' && settings.playerColor === 'black' ? 'Suhu Komputer' : settings.p1Name}
                      disabled={settings.gameMode === 'ai' && settings.playerColor === 'black'}
                      onChange={(e) => setSettings(prev => ({ ...prev, p1Name: e.target.value || 'Pemain Merah' }))}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#8b261a] focus:border-[#8b261a] disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder="Nama Pendekar Merah"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider font-serif">Pendekar Hijau (Kedua)</label>
                  <div className="relative flex items-center">
                    {settings.gameMode === 'ai' && settings.playerColor === 'white' ? (
                      <Cpu className="absolute left-3 w-4 h-4 text-emerald-700" />
                    ) : (
                      <User className="absolute left-3 w-4 h-4 text-emerald-700" />
                    )}
                    <input
                      id="p2-name-input"
                      type="text"
                      maxLength={18}
                      value={settings.gameMode === 'ai' && settings.playerColor === 'white' ? 'Suhu Komputer' : settings.p2Name}
                      disabled={settings.gameMode === 'ai' && settings.playerColor === 'white'}
                      onChange={(e) => setSettings(prev => ({ ...prev, p2Name: e.target.value || 'Pemain Hijau' }))}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#8b261a] focus:border-[#8b261a] disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder="Nama Pendekar Hijau"
                    />
                  </div>
                </div>
              </div>

              {/* Game Timers Configuration */}
              <div className="space-y-3 border-t border-gray-200/65 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-700 font-serif">Aktifkan Jam Catur</span>
                    <span className="text-[10px] text-gray-500">Kekalahan instan bila waktu habis</span>
                  </div>
                  <button
                    id="toggle-clock-btn"
                    onClick={() => {
                      sounds.playClick();
                      setSettings(prev => ({ ...prev, clockEnabled: !prev.clockEnabled }));
                    }}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none
                      ${settings.clockEnabled ? 'bg-[#8b261a]' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200
                      ${settings.clockEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {settings.clockEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="grid grid-cols-4 gap-2 pt-1"
                  >
                    {([60, 180, 300, 600] as const).map((time) => {
                      const timeLabels = { 60: '1 Menit', 180: '3 Menit', 300: '5 Menit', 600: '10 Menit' };
                      return (
                        <button
                          key={`time-${time}`}
                          id={`time-${time}-btn`}
                          onClick={() => {
                            sounds.playClick();
                            setSettings(prev => ({ ...prev, clockTimeLimit: time }));
                          }}
                          className={`p-1.5 rounded text-[10px] sm:text-xs font-mono font-bold text-center border transition
                            ${settings.clockTimeLimit === time 
                              ? 'bg-[#8b261a] text-white border-[#8b261a]' 
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {timeLabels[time]}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </div>

              {/* Start Trigger Button */}
              <button
                id="start-match-btn"
                onClick={handleStartGame}
                className="w-full mt-2 py-3 bg-[#8b261a] hover:bg-[#6c1e14] text-white rounded-xl font-serif text-base font-bold shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current shrink-0" />
                <span>MULAI PERMAINAN</span>
              </button>
            </motion.div>
          )}

          {/* ================= PHASE 2: INTERNAL ACTIVE GAMEPLAY PLATFORM ================= */}
          {phase === 'playing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8"
            >
              {/* Left Column: Board and Dragon Whisperer */}
              <div className="flex flex-col items-center gap-4 w-full max-w-lg lg:max-w-xl shrink-0">
                {/* AI Thinking Floating Banner Overlay */}
                <div className="h-6 w-full flex items-center justify-center">
                  {isAiThinking && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-blue-900/90 border border-blue-500/30 text-blue-200 px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-serif font-bold tracking-wider flex items-center gap-2 shadow-md animate-pulse"
                    >
                      <Cpu className="w-3.5 h-3.5 text-blue-400 rotate-180 animate-spin" />
                      <span>SUHU MAHJONG SEDANG MERENUNGI LANGKAH...</span>
                    </motion.div>
                  )}
                </div>

                <Board
                  board={board}
                  turn={turn}
                  onMakeMove={handleUserMove}
                  winner={winner}
                  lastPlacedCell={lastPlacedCell}
                  errorMessage={errorMessage}
                  setErrorMessage={setErrorMessage}
                />

                {/* Dragon Whispers Advice panel representation */}
                {dragonHint && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    id="dragon-wisdom-box"
                    className="w-full bg-amber-50 rounded-xl border border-amber-300 p-3.5 shadow-md flex items-start gap-2.5"
                  >
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-serif font-bold text-amber-900 flex items-center gap-1.5">
                        <span>🐉</span> Bisikan Taktis Naga Langit (Saran: {String.fromCharCode(65 + dragonHint.coordinate[1])}{8 - dragonHint.coordinate[0]})
                      </h4>
                      <p className="text-xs text-amber-850 mt-1 italic leading-relaxed font-serif">
                        {dragonHint.wisdom}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right Column: Score stats Dashboard & controls */}
              <div className="flex flex-col items-center gap-4 w-full max-w-lg lg:max-w-md">
                <GameStats
                  stats={stats}
                  turn={turn}
                  winner={winner}
                  settings={settings}
                  p1TimeLeft={p1TimeLeft}
                  p2TimeLeft={p2TimeLeft}
                  isMuted={isMuted}
                  onToggleMute={handleToggleMute}
                  onOpenRules={() => setIsRulesOpen(true)}
                  onRestart={handleStartGame}
                  onResign={handleResign}
                  onGetAiHint={handleGetAiHint}
                />

                {/* Side Aesthetics Panel: Live action log ticker */}
                <div className="w-full bg-[#162f22] p-3 rounded-lg border border-emerald-800/40 select-none text-[10px] sm:text-xs">
                  <span className="font-bold font-serif text-[#cbb27a] block mb-1">LOG PERANG MAHJONG:</span>
                  <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-thin text-emerald-300/80 font-mono">
                    {lastPlacedCell ? (
                      <div className="flex justify-between">
                        <span>Langkah Terakhir:</span>
                        <span className="text-[#cbb27a] font-bold">
                          {turn === 'black' ? p1DisplayName : p2DisplayName} meletakkan di {String.fromCharCode(65 + lastPlacedCell[1])}{8 - lastPlacedCell[0]}
                        </span>
                      </div>
                    ) : (
                      <div className="text-gray-400 font-serif italic text-center py-2">Permainan dimulai. Angin Timur bertiup kencang...</div>
                    )}
                    {stats.whiteYugos > 0 && (
                      <div className="text-red-300/85 flex justify-between">
                        <span>Yugo Merah Tercipta:</span>
                        <span>{stats.whiteYugos} Terbuka</span>
                      </div>
                    )}
                    {stats.blackYugos > 0 && (
                      <div className="text-emerald-200/85 flex justify-between">
                        <span>Yugo Hijau Tercipta:</span>
                        <span>{stats.blackYugos} Terbuka</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= PHASE 3: GAME OVER CELEBRATION ROUND ================= */}
          {phase === 'gameover' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              id="gameover-scroll-box"
              className="w-full max-w-lg bg-[#faf8f2] text-[#242424] rounded-2xl border-8 border-double border-[#8b261a] p-6 sm:p-8 shadow-2xl flex flex-col gap-6 select-none relative overflow-hidden"
            >
              {/* Visual elements */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#8b261a]/5 rounded-bl-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#8b261a]/5 rounded-tr-full pointer-events-none" />

              <div className="text-center space-y-2">
                <Award className="w-12 h-12 mx-auto text-yellow-500 animate-bounce" />
                <span className="text-xs font-serif font-bold tracking-widest text-[#8b261a] uppercase leading-none">Puncak Pertempuran Pikiran</span>
                <h2 className="text-3xl font-bold font-serif text-[#8b261a] leading-tight">KITAB KEMENANGAN</h2>
              </div>

              {/* Winner Details representation */}
              <div className="bg-[#ede7d5] p-5 rounded-xl border border-amber-900/10 text-center space-y-2">
                {winner === 'draw' ? (
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold font-serif text-[#8b261a]">KEDUA PENDEKAR SEIMBANG (SERI)</h3>
                    <p className="text-xs text-gray-600 font-serif">Kekuatan batin keduanya sama tangguhnya di bawah kolong langit.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-[#b45309] uppercase tracking-wider font-bold">PEMULIA SEJATI</span>
                    <h3 className="text-2xl font-black font-serif text-red-850">
                      🎉 {winner === 'white' ? p1DisplayName : p2DisplayName} 🎉
                    </h3>
                    <p className="text-xs text-gray-700 italic font-serif">
                      {winner === 'white' 
                        ? '"Merah laksana fajar, keberaniannya meruntuhkan gunung lawan."' 
                        : '"Hijau laksana bambu perkasa, ketenangannya membalikkan keadaan tak terbendung."'}
                    </p>
                  </div>
                )}

                {/* Win Type badge */}
                <div className="mt-3.5 inline-block bg-[#8b261a] text-[#faf8f2] text-[10px] sm:text-xs font-serif font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-yellow-300">
                  {winType === 'igo' && '🏅 MENANG MUTLAK - IGO (4 YUGO SEGARIS)'}
                  {winType === 'wego' && '⚖️ MENANG POIN - WEGO (TAK ADA LANGKAH SAH)'}
                  {winType === 'resign' && '🏳️ MENANG RESIGNATION (LAWAN MENYERAH)'}
                  {winType === 'timeout' && '⏳ MENANG WAKTU (JAM CATUR EXPIRED)'}
                </div>
              </div>

              {/* Game stats summary */}
              <div className="grid grid-cols-2 gap-4 text-xs font-serif bg-white p-4 rounded-xl border border-gray-150">
                <div className="space-y-2 text-center border-r border-gray-200">
                  <span className="text-xs font-bold text-[#8b261a] block border-b border-[#8b261a]/10 pb-1 flex items-center justify-center gap-1">
                    <span className="text-red-700">中</span> {p1DisplayName}
                  </span>
                  <div className="flex justify-around pt-1">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Migo</span>
                      <span className="font-bold text-gray-700 font-mono">{stats.whiteMigos}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-500 block uppercase font-bold">Yugo (Poin)</span>
                      <span className="font-bold text-amber-600 font-mono flex items-center justify-center gap-0.5">
                        <span>{stats.whiteYugos}</span>
                        <span>🪙</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <span className="text-xs font-bold text-emerald-800 block border-b border-emerald-800/10 pb-1 flex items-center justify-center gap-1">
                    <span className="text-emerald-700">發</span> {p2DisplayName}
                  </span>
                  <div className="flex justify-around pt-1">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Migo</span>
                      <span className="font-bold text-gray-700 font-mono">{stats.blackMigos}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-500 block uppercase font-bold">Yugo (Poin)</span>
                      <span className="font-bold text-amber-600 font-mono flex items-center justify-center gap-0.5">
                        <span>{stats.blackYugos}</span>
                        <span>🪙</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lobby redirector */}
              <div className="flex gap-3">
                <button
                  id="go-back-lobby-btn"
                  onClick={() => { sounds.playClick(); setPhase('menu'); }}
                  className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-bold font-serif transition active:scale-95 text-center"
                >
                  Kembali ke Menu
                </button>
                <button
                  id="play-again-btn"
                  onClick={handleStartGame}
                  className="flex-1 py-2.5 bg-[#8b261a] hover:bg-[#6c1e14] text-[#faf8f2] rounded-lg text-sm font-bold font-serif transition shadow-md active:scale-95 text-center"
                >
                  Tanding Ulang
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Rules Modal Overlay Component */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Traditional Footer */}
      <footer className="w-full text-center text-gray-500 font-serif text-[10px] sm:text-xs select-none border-t border-[#8b261a]/15 pt-4 mt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>© 2026 MigoYugo Mahjong • Dirancang dengan penuh filosofi budi pekerti mahakarya timur.</span>
        <div className="flex gap-3 text-[#cbb27a]/70 font-semibold">
          <span>A-H (Barat/Timur)</span>
          <span>•</span>
          <span>1-8 (Bumi/Langit)</span>
        </div>
      </footer>

    </div>
  );
}
