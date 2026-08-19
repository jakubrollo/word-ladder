import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getDiffIndex } from "../logic/solver";

interface LadderBoardProps {
  startWord: string;
  targetWord: string;
  path: string[];
  currentInput: string;
  isWon: boolean;
  par: number;
  shakeRow: boolean;
  errorMessage: string | null;
  onTileClick?: (index: number) => void;
}

export const LadderBoard: React.FC<LadderBoardProps> = ({
  startWord,
  targetWord,
  path,
  currentInput,
  isWon,
  par,
  shakeRow,
  errorMessage,
}) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when path updates or user types
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [path.length, currentInput]);

  const stepsTaken = path.length - 1;

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 py-2 select-none">
      {/* Top Status Banner */}
      <div className="flex items-center justify-between w-full mb-3 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 text-xs sm:text-sm text-zinc-400">
        <div className="flex items-center gap-2">
          <span>Steps:</span>
          <span className="font-mono font-bold text-amber-400 text-base">{stepsTaken}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Par:</span>
          <span className="font-mono font-bold text-emerald-400 text-base">{par}</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
            ({stepsTaken <= par ? "Optimal" : `+${stepsTaken - par}`})
          </span>
        </div>
      </div>

      {/* Ladder Container */}
      <div className="w-full max-h-[48vh] sm:max-h-[52vh] overflow-y-auto pr-1 flex flex-col items-center gap-2.5 scrollbar-thin scrollbar-thumb-zinc-700">
        {/* Start Word Row */}
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center justify-between w-full max-w-[280px] mb-1 px-1">
            <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
              Start Word
            </span>
            <span className="text-[10px] text-zinc-500">Step 0</span>
          </div>
          <div className="flex gap-2">
            {startWord.split("").map((letter, i) => (
              <div
                key={`start-${i}`}
                className="w-13 h-13 sm:w-14 sm:h-14 flex items-center justify-center font-bold text-xl sm:text-2xl rounded-xl bg-zinc-800/90 text-emerald-300 border-2 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
              >
                {letter}
              </div>
            ))}
          </div>
        </div>

        {/* Previous Steps in Ladder */}
        <AnimatePresence>
          {path.slice(1).map((word, stepIdx) => {
            const prevWord = path[stepIdx];
            const changedIdx = getDiffIndex(prevWord, word);
            const isLatest = stepIdx === path.length - 2;

            return (
              <motion.div
                key={`step-${stepIdx}-${word}`}
                initial={{ opacity: 0, scale: 0.85, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center w-full"
              >
                {/* Connector line */}
                <div className="w-0.5 h-2.5 bg-zinc-700 my-0.5" />

                <div className="flex items-center justify-between w-full max-w-[280px] mb-1 px-1">
                  <span className="text-[10px] text-zinc-400">Step {stepIdx + 1}</span>
                  {isLatest && !isWon && (
                    <span className="text-[10px] text-amber-400 font-mono">Current</span>
                  )}
                </div>

                <div className="flex gap-2">
                  {word.split("").map((letter, i) => {
                    const isChanged = i === changedIdx;
                    return (
                      <div
                        key={`letter-${i}`}
                        className={`w-13 h-13 sm:w-14 sm:h-14 flex items-center justify-center font-bold text-xl sm:text-2xl rounded-xl transition-all duration-300 ${
                          isChanged
                            ? "bg-amber-500/20 text-amber-300 border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                            : "bg-zinc-800/80 text-zinc-100 border border-zinc-700"
                        }`}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Current Active Input Row (if game not won) */}
        {!isWon && (
          <div className="flex flex-col items-center w-full mt-1">
            <div className="w-0.5 h-2.5 bg-amber-500/50 my-0.5 animate-pulse" />

            <div className="flex items-center justify-between w-full max-w-[280px] mb-1 px-1">
              <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                Your Next Move
              </span>
              <span className="text-[10px] text-zinc-500">
                Change 1 letter from {path[path.length - 1]}
              </span>
            </div>

            <motion.div
              animate={shakeRow ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
              transition={{ duration: 0.35 }}
              className="flex gap-2"
            >
              {[0, 1, 2, 3].map((i) => {
                const char = currentInput[i] || "";
                const isCurrentCursor = i === currentInput.length && currentInput.length < 4;
                const prevWord = path[path.length - 1];
                const prevChar = prevWord ? prevWord[i] : "";
                const isDifferent = char && char !== prevChar;

                return (
                  <div
                    key={`input-${i}`}
                    className={`w-13 h-13 sm:w-14 sm:h-14 flex items-center justify-center font-bold text-xl sm:text-2xl rounded-xl transition-all ${
                      char
                        ? isDifferent
                          ? "bg-amber-500/25 text-amber-200 border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                          : "bg-zinc-800 text-zinc-100 border-2 border-zinc-500"
                        : isCurrentCursor
                        ? "bg-zinc-900/90 text-zinc-400 border-2 border-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                        : "bg-zinc-900/60 text-zinc-600 border border-zinc-800"
                    }`}
                  >
                    {char}
                  </div>
                );
              })}
            </motion.div>

            {/* Error Message Toast */}
            <div className="h-6 mt-1 flex items-center justify-center">
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-medium text-rose-400 bg-rose-950/80 border border-rose-800/80 px-2.5 py-0.5 rounded-full"
                  >
                    {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Target Word Row */}
        <div className="flex flex-col items-center w-full mt-2 pt-1 border-t border-zinc-800/80">
          <div className="flex items-center justify-between w-full max-w-[280px] mb-1 px-1">
            <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1">
              Target Goal 🎯
            </span>
            <span className="text-[10px] text-zinc-500">Destination</span>
          </div>
          <div className="flex gap-2">
            {targetWord.split("").map((letter, i) => (
              <div
                key={`target-${i}`}
                className={`w-13 h-13 sm:w-14 sm:h-14 flex items-center justify-center font-bold text-xl sm:text-2xl rounded-xl ${
                  isWon
                    ? "bg-emerald-500/20 text-emerald-300 border-2 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.3)] animate-bounce"
                    : "bg-zinc-900 text-zinc-400 border border-dashed border-zinc-700"
                }`}
              >
                {letter}
              </div>
            ))}
          </div>
        </div>

        <div ref={scrollEndRef} />
      </div>
    </div>
  );
};
