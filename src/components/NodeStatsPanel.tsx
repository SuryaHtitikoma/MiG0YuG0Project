/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { SearchStats } from "../utils/gameLogic";
import { Cpu, BarChart2, Zap } from "lucide-react";

interface NodeStatsPanelProps {
  stats: SearchStats | null;
  isThinking: boolean;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  novice: "Novice",
  master: "Master",
  grandmaster: "Grandmaster",
};

export default function NodeStatsPanel({
  stats,
  isThinking,
}: NodeStatsPanelProps) {
  return (
    <div className="w-full bg-[#0d1f17] border border-emerald-900/60 rounded-lg p-3 font-mono text-xs select-none">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 border-b border-emerald-900/40 pb-2">
        <BarChart2 className="w-3.5 h-3.5 text-[#cbb27a]" />
        <span className="text-[#cbb27a] font-bold font-serif text-[11px] tracking-wider uppercase">
          Analisis Node AI
        </span>
        {isThinking && (
          <span className="ml-auto text-emerald-400 text-[10px] animate-pulse flex items-center gap-1">
            <Cpu className="w-3 h-3 animate-spin" /> Menghitung...
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!stats ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-gray-600 italic text-center py-2 text-[10px]"
          >
            Data node akan muncul setelah AI bergerak pertama kali.
          </motion.p>
        ) : (
          <motion.div
            key={`${stats.nodesWithAB}-${stats.nodesWithoutAB}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            {/* Difficulty & Depth badge */}
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">
                Mode:{" "}
                <span className="text-emerald-400 font-bold">
                  {DIFFICULTY_LABELS[stats.difficulty] ?? stats.difficulty}
                </span>
              </span>
              <span className="text-gray-500">
                Depth:{" "}
                <span className="text-emerald-400 font-bold">
                  {stats.depth}
                </span>
              </span>
              {stats.bestMove && (
                <span className="text-gray-500">
                  Move:{" "}
                  <span className="text-[#cbb27a] font-bold">
                    {String.fromCharCode(65 + stats.bestMove[1])}
                    {8 - stats.bestMove[0]}
                  </span>
                </span>
              )}
            </div>

            {/* Node count comparison bars */}
            <div className="space-y-1.5">
              {/* Alpha-Beta row */}
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> Alpha-Beta (Aktif)
                  </span>
                  <span className="text-emerald-300 font-bold">
                    {stats.nodesWithAB.toLocaleString()} node
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="text-gray-600 text-[9px] mt-0.5 text-right">
                  {stats.timeWithAB.toFixed(1)} ms
                </div>
              </div>

              {/* Minimax murni row */}
              {stats.nodesWithoutAB > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-red-400 text-[10px] font-bold">
                      Minimax Murni (Simulasi)
                    </span>
                    <span className="text-red-300 font-bold">
                      {stats.nodesWithoutAB.toLocaleString()} node
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    {/* Bar merah selalu penuh karena ini baseline */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, (stats.nodesWithoutAB / Math.max(stats.nodesWithoutAB, 1)) * 100)}%`,
                      }}
                      transition={{
                        duration: 0.5,
                        ease: "easeOut",
                        delay: 0.1,
                      }}
                      className="h-2 rounded-full bg-red-500"
                    />
                  </div>
                  <div className="text-gray-600 text-[9px] mt-0.5 text-right">
                    {stats.timeWithoutAB.toFixed(1)} ms
                  </div>
                </div>
              )}
            </div>

            {/* Efficiency summary */}
            {stats.nodesWithoutAB > 0 && (
              <div className="mt-2 bg-[#162f22] rounded p-2 border border-emerald-900/30 space-y-1">
                {/* Pruning bar visual */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">Efisiensi Pemangkasan:</span>
                  <span
                    className={`font-bold ${stats.pruningEfficiency >= 50 ? "text-emerald-400" : "text-yellow-400"}`}
                  >
                    {stats.pruningEfficiency}% node dipangkas
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.pruningEfficiency}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                    className={`h-1.5 rounded-full ${stats.pruningEfficiency >= 50 ? "bg-emerald-400" : "bg-yellow-400"}`}
                  />
                </div>

                {/* Speedup ratio */}
                {stats.timeWithoutAB > 0 && stats.timeWithAB > 0 && (
                  <div className="flex items-center justify-between text-[10px] pt-0.5">
                    <span className="text-gray-400">Percepatan Waktu:</span>
                    <span className="text-[#cbb27a] font-bold">
                      {(stats.timeWithoutAB / stats.timeWithAB).toFixed(1)}×
                      lebih cepat
                    </span>
                  </div>
                )}

                {/* Node saved */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">Node Dihemat:</span>
                  <span className="text-[#cbb27a] font-bold">
                    {(
                      stats.nodesWithoutAB - stats.nodesWithAB
                    ).toLocaleString()}{" "}
                    node
                  </span>
                </div>
              </div>
            )}

            {/* Note: pure minimax runs at depth-1 */}
            {stats.nodesWithoutAB > 0 && (
              <p className="text-gray-700 text-[9px] italic leading-tight">
                * Simulasi Minimax murni dijalankan pada depth {stats.depth - 1}{" "}
                (1 lebih rendah) untuk menjaga responsivitas UI.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
