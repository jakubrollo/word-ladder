import React, { useState } from "react";
import { X, Trophy, Flame, Target, Share2, Check } from "lucide-react";
import type { GameStats, PuzzleInfo, GameMode } from "../logic/gameState";
import { generateShareText } from "../logic/gameState";

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
  currentPuzzle?: PuzzleInfo;
  currentPath?: string[];
  currentMode?: GameMode;
  isWon?: boolean;
  lang?: "en" | "cs";
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  currentPuzzle,
  currentPath,
  currentMode,
  isWon,
  lang = "en",
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const winPercentage =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  const handleShare = async () => {
    if (!currentPuzzle || !currentPath || !currentMode) return;
    const text = generateShareText(currentMode, currentPuzzle, currentPath);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  // Find max count for distribution bar scaling
  const distValues = Object.values(stats.distribution) as number[];
  const maxDist = Math.max(...distValues, 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 shadow-2xl text-zinc-100 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-5">
          <Trophy className="text-amber-400" size={24} />
          <h2 className="text-xl font-bold text-zinc-100">
            {lang === "cs" ? "Herní statistiky" : "Game Statistics"}
          </h2>
        </div>

        {/* 4 Key Stat Cards */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 text-center">
            <div className="text-2xl font-bold text-zinc-100">{stats.gamesPlayed}</div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
              {lang === "cs" ? "Odehráno" : "Played"}
            </div>
          </div>
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 text-center">
            <div className="text-2xl font-bold text-emerald-400">{winPercentage}%</div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
              {lang === "cs" ? "Výhry" : "Win %"}
            </div>
          </div>
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 text-center">
            <div className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-0.5">
              <Flame size={18} className="text-amber-400" />
              {stats.currentStreak}
            </div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
              {lang === "cs" ? "Série" : "Streak"}
            </div>
          </div>
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 text-center">
            <div className="text-2xl font-bold text-indigo-400 flex items-center justify-center gap-0.5">
              <Target size={18} className="text-indigo-400" />
              {stats.parOrBetter}
            </div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
              {lang === "cs" ? "Par zápasů" : "Par Match"}
            </div>
          </div>
        </div>

        {/* Guess / Step Distribution */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            {lang === "cs" ? "Distribuce počtu kroků" : "Step Count Distribution"}
          </h3>
          <div className="space-y-1.5 font-mono text-xs">
            {[2, 3, 4, 5, 6, 7].map((steps) => {
              const count = stats.distribution[steps] || 0;
              const pct = (count / maxDist) * 100;
              return (
                <div key={steps} className="flex items-center gap-2">
                  <span className="w-5 text-right text-zinc-400 font-bold">
                    {steps === 7 ? "7+" : steps}
                  </span>
                  <div className="flex-1 bg-zinc-950/80 rounded-md h-5 overflow-hidden flex items-center p-0.5">
                    <div
                      style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                      className={`h-full rounded transition-all duration-500 flex items-center justify-end px-1.5 text-[11px] font-bold ${
                        count > 0 ? "bg-amber-500 text-zinc-950" : "bg-transparent text-zinc-600"
                      }`}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Share Button if current puzzle is completed */}
        {isWon && currentPuzzle && currentPath && (
          <div className="pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleShare}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={18} />
                  <span>{lang === "cs" ? "Zkopírováno do schránky!" : "Copied to Clipboard!"}</span>
                </>
              ) : (
                <>
                  <Share2 size={18} />
                  <span>{lang === "cs" ? "Sdílet výsledek" : "Share Result"}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
