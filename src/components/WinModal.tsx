import React, { useState } from "react";
import { X, Sparkles, Share2, Check, ArrowRight, RotateCw, Play } from "lucide-react";
import type { PuzzleInfo, GameMode } from "../logic/gameState";
import { generateShareText } from "../logic/gameState";

interface WinModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzle: PuzzleInfo;
  userPath: string[];
  mode: GameMode;
  onNextPuzzle?: () => void;
  onSwitchToUnlimited?: () => void;
  lang?: "en" | "cs";
}

export const WinModal: React.FC<WinModalProps> = ({
  isOpen,
  onClose,
  puzzle,
  userPath,
  mode,
  onNextPuzzle,
  onSwitchToUnlimited,
  lang = "en",
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const stepsTaken = userPath.length - 1;
  const parDiff = stepsTaken - puzzle.par;

  const handleShare = async () => {
    const text = generateShareText(mode, puzzle, userPath);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-3xl p-6 sm:p-7 shadow-2xl text-zinc-100 max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Celebration Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 text-3xl mb-3 shadow-[0_0_24px_rgba(245,158,11,0.3)] animate-bounce">
            🎯
          </div>
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">
            {lang === "cs" ? "Úspěšně vyřešeno!" : "Ladder Completed!"}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {mode === "daily"
              ? lang === "cs"
                ? `Denní výzva #${puzzle.puzzleNumber}`
                : `Daily Challenge #${puzzle.puzzleNumber}`
              : lang === "cs"
              ? "Tréninkový režim"
              : "Unlimited Practice"}
          </p>
        </div>

        {/* Score & Par Badge */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 mb-5 flex items-center justify-around text-center">
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">
              {lang === "cs" ? "Tvé kroky" : "Your Steps"}
            </div>
            <div className="text-3xl font-extrabold text-amber-400 font-mono">{stepsTaken}</div>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">PAR</div>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">{puzzle.par}</div>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wider mb-0.5">
              {lang === "cs" ? "Hodnocení" : "Result"}
            </div>
            <div className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1 justify-center">
              {parDiff < 0 ? (
                <>
                  <Sparkles size={14} className="text-amber-400" />
                  {lang === "cs" ? "Pod PARem! 🔥" : "Under Par! 🔥"}
                </>
              ) : parDiff === 0 ? (
                <>
                  <Sparkles size={14} className="text-amber-400" />
                  {lang === "cs" ? "Přesně PAR! ⭐" : "Par Match! ⭐"}
                </>
              ) : (
                <span className="text-zinc-300">+{parDiff}</span>
              )}
            </div>
          </div>
        </div>

        {/* Solution Comparison */}
        <div className="space-y-3 mb-6 text-xs">
          {/* Player's path */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
            <div className="font-semibold text-zinc-300 mb-2 flex items-center justify-between">
              <span>{lang === "cs" ? "Tvá cesta:" : "Your Ladder Path:"}</span>
              <span className="text-amber-400 font-mono font-bold">{stepsTaken} steps</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 font-mono">
              {userPath.map((word, i) => (
                <React.Fragment key={`user-path-${i}`}>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      i === 0
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-700/50"
                        : i === userPath.length - 1
                        ? "bg-amber-950 text-amber-300 border border-amber-700/50"
                        : "bg-zinc-800 text-zinc-200"
                    }`}
                  >
                    {word}
                  </span>
                  {i < userPath.length - 1 && <ArrowRight size={10} className="text-zinc-600" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Optimal Par Path */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
            <div className="font-semibold text-zinc-400 mb-2 flex items-center justify-between">
              <span>{lang === "cs" ? "Příklad optimální cesty (AI Solver):" : "Sample Optimal Path (AI Solver):"}</span>
              <span className="text-emerald-400 font-mono font-bold">{puzzle.par} steps</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 font-mono">
              {puzzle.optimalPath.map((word, i) => (
                <React.Fragment key={`opt-path-${i}`}>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      i === 0
                        ? "bg-emerald-950 text-emerald-300"
                        : i === puzzle.optimalPath.length - 1
                        ? "bg-amber-950 text-amber-300"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                    }`}
                  >
                    {word}
                  </span>
                  {i < puzzle.optimalPath.length - 1 && (
                    <ArrowRight size={10} className="text-zinc-700" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
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

          {mode === "unlimited" && onNextPuzzle && (
            <button
              type="button"
              onClick={onNextPuzzle}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-bold text-zinc-100 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCw size={16} />
              <span>{lang === "cs" ? "Další náhodná hádanka" : "Next Random Puzzle"}</span>
            </button>
          )}

          {mode === "daily" && onSwitchToUnlimited && (
            <button
              type="button"
              onClick={onSwitchToUnlimited}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-bold text-zinc-100 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play size={16} />
              <span>{lang === "cs" ? "Hrát neomezený trénink" : "Play Unlimited Practice"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
