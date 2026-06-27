/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Clock, Heart, Award, ShieldAlert } from 'lucide-react';
import { sounds } from '../utils/audio';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  const playClick = () => {
    sounds.playClick();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          {/* Overlay click */}
          <div className="absolute inset-0" onClick={() => { playClick(); onClose(); }} />

          {/* Scroll container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            id="rules-scroll-modal"
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#faf8f2] border-8 border-double border-[#8b261a] rounded-2xl shadow-2xl z-10 flex flex-col scrollbar-thin overflow-x-hidden"
          >
            {/* Scroll Handles Decorators */}
            <div className="absolute left-[-12px] top-6 bottom-6 w-3 bg-[#cbb27a] rounded-full shadow-inner border border-[#8b261a]/30 hidden sm:block" />
            <div className="absolute right-[-12px] top-6 bottom-6 w-3 bg-[#cbb27a] rounded-full shadow-inner border border-[#8b261a]/30 hidden sm:block" />

            {/* Header */}
            <div className="sticky top-0 bg-[#faf8f2] border-b border-[#8b261a]/20 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 text-[#8b261a]">
                <BookOpen className="w-6 h-6 shrink-0" />
                <h2 className="text-xl font-bold tracking-tight font-serif">Kanon Aturan MigoYugo (Mahjong Edition)</h2>
              </div>
              <button
                id="close-rules"
                onClick={() => { playClick(); onClose(); }}
                className="p-1 rounded-full hover:bg-red-100 text-gray-500 hover:text-red-700 transition"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 text-[#242424] font-sans leading-relaxed text-sm">
              
              {/* Intro */}
              <div className="bg-[#ede7d5] p-4 rounded-lg border-l-4 border-[#8b261a]">
                <p className="italic font-serif text-[#5a4220]">
                  "MigoYugo adalah permainan papan strategi abstrak dua pemain yang menuntut kalkulasi penuh tanpa ada unsur keberuntungan. Dalam edisi Mahjong ini, bidak diwakili oleh Ubin Dragon tradisional yang memikat."
                </p>
              </div>

              {/* 1. Komponen & Papan */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[#8b261a] border-b border-[#8b261a]/10 pb-1 flex items-center gap-1">
                  <span className="text-[#cbb27a]">🀄</span> 1. Papan & Bidak Main
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li><strong>Papan:</strong> Bidang 8x8 yang terdiri dari 64 kotak (Kolom A-H dari kiri ke kanan; Baris 1-8 dari bawah ke atas).</li>
                  <li><strong>Migo (Bidak Biasa):</strong> Ubin Mahjong standar yang diletakkan bergantian oleh pemain.</li>
                  <li><strong>Yugo (Bidak Abadi):</strong> Tercipta ketika Migo membentuk baris 4. Ditandai dengan permata emas bersinar di tengahnya. Yugo <strong>tidak pernah bisa dipindahkan atau dihapus</strong> dari papan sampai akhir permainan.</li>
                </ul>
              </div>

              {/* 2. No Long Lines rule */}
              <div className="space-y-2 bg-[#fdfaf2] p-4 rounded-lg border border-[#cbb27a]/30">
                <h3 className="text-base font-bold text-[#b45309] flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 shrink-0" /> Aturan Mutlak: No Long Lines (Dilarang Baris Panjang)
                </h3>
                <p className="text-gray-700 font-serif">
                  Pemain <strong>DILARANG KERAS</strong> membuat baris tak terputus yang berisi <strong>lebih dari 4 ubin sewarna</strong> (baik kombinasi Migo maupun Yugo) secara horizontal, vertikal, maupun diagonal.
                </p>
                <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-xs text-amber-850">
                  ⚠️ <em>Langkah yang akan mengakibatkan 5 ubin sewarna berturut-turut atau lebih adalah ilegal dan akan ditolak oleh sistem.</em>
                </div>
              </div>

              {/* 3. Cara Terciptanya Yugo */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[#8b261a] border-b border-[#8b261a]/10 pb-1 flex items-center gap-1">
                  <span className="text-[#cbb27a]">♦️</span> 2. Pembentukan Yugo & Variasi Tingkat Poin
                </h3>
                <p className="text-gray-700">
                  Bila Anda meletakkan Migo yang berhasil menyusun tepat <strong>satu atau lebih garis beruntun bernilai persis 4 ubin sewarna</strong> (horizontal, vertikal, diagonal):
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-gray-700 text-xs shadow-2xs p-3 bg-[#ede7d5]/30 rounded border border-amber-900/5 mb-3">
                  <li>Ubin yang baru saja Anda letakkan berubah wujud menjadi <strong>Yugo</strong> yang abadi (kekal di papan).</li>
                  <li>Semua <strong>Migos (bidak biasa)</strong> yang berada di sepanjang garis 4 bernilai tadi langsung <strong>dimusnahkan (dihapus)</strong> dari papan.</li>
                  <li>Yugo lama yang sudah terbentuk sebelumnya di garis tersebut <strong>tidak terpengaruh</strong> (tetap tinggal di papan).</li>
                </ol>

                {/* New Point Variation Guide */}
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3 space-y-2.5">
                  <span className="text-xs font-bold text-amber-900 block font-serif">🏺 Variasi Pembentukan & Poin Segel Yugo:</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-white rounded border border-amber-100 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-yellow-400 border border-amber-500 flex items-start justify-center text-[10px] font-bold text-amber-900">◯</div>
                      <div>
                        <div className="font-bold text-gray-800">1 Baris (Lingkaran)</div>
                        <div className="text-amber-700 font-mono text-[10px]">Nilai: 1 Poin</div>
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded border border-amber-100 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-yellow-400 border border-amber-500 flex items-center justify-center text-[10px] font-bold text-amber-900">𓍢</div>
                      <div>
                        <div className="font-bold text-gray-800">2 Baris (Oval)</div>
                        <div className="text-amber-700 font-mono text-[10px]">Nilai: 2 Poin</div>
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded border border-amber-100 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-sm bg-yellow-400 border border-amber-500 flex items-center justify-center text-[10px] font-bold text-amber-950">△</div>
                      <div>
                        <div className="font-bold text-gray-800">3 Baris (Segitiga)</div>
                        <div className="text-amber-700 font-mono text-[10px]">Nilai: 5 Poin</div>
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded border border-amber-100 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-xs bg-yellow-400 border border-amber-500 flex items-center justify-center text-[10px] font-bold text-amber-950">☐</div>
                      <div>
                        <div className="font-bold text-gray-800">4 Baris (Persegi)</div>
                        <div className="text-amber-700 font-mono text-[10px]">Nilai: 10 Poin</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Kondisi Menang */}
              <div className="space-y-3 bg-[#fdfbfc] p-4 rounded-lg border border-[#8b261a]/20">
                <h3 className="text-base font-bold text-[#8b261a] flex items-center gap-2">
                  <Award className="w-5 h-5 shrink-0 text-[#cbb27a]" /> 3. Kondisi Kemenangan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 bg-white p-3 rounded border border-gray-100">
                    <h4 className="font-bold text-[#8b261a] text-xs uppercase tracking-wider flex items-center gap-1">
                      <span>👑</span> Igo (Menang Instan)
                    </h4>
                    <p className="text-xs text-gray-700">
                      Anda berhasil menyusun <strong>4 Yugo berturut-turut</strong> secara lurus (horizontal, vertikal, diagonal) dari warna Anda sendiri. Anda menang seketika!
                    </p>
                  </div>
                  <div className="space-y-1 bg-white p-3 rounded border border-gray-100">
                    <h4 className="font-bold text-[#2e6f40] text-xs uppercase tracking-wider flex items-center gap-1">
                      <span>⚖️</span> Wego (Penghitungan Poin)
                    </h4>
                    <p className="text-xs text-gray-700">
                      Bila giliran tiba namun <strong>tiada langkah legal tersisa</strong> atau papan <strong>sepenuhnya penuh (64 petak)</strong>: game berakhir (Wego). Pemain dengan <strong>Total Poin Yugo tertinggi</strong> menang! (Jumlah ubin Yugo digunakan sebagai pemecah nilai seri).
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Aturan Lain */}
              <div className="space-y-2 text-xs text-gray-500 border-t border-gray-200 pt-4 flex flex-wrap gap-x-6 justify-between">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-[#8b261a]" /> Pemain kalah instan bila waktu jam catur habis!</span>
                <span className="flex items-center gap-1"><Heart className="w-4 h-4 text-[#8b261a]" /> Menyerah (Resign) menyatakan lawan sebagai pemenang.</span>
              </div>

            </div>

            {/* Footer button */}
            <div className="p-4 bg-[#ede7d5]/50 border-t border-[#8b261a]/10 flex justify-end">
              <button
                id="rules-ok-btn"
                onClick={() => { playClick(); onClose(); }}
                className="px-6 py-2 bg-[#8b261a] text-white font-serif rounded-lg hover:bg-[#6c1e14] active:scale-95 transition shadow-md font-bold text-sm"
              >
                Saya Mengerti
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
