import React, { useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowDown, ArrowRight, ArrowUp, Sparkles, Target, CornerDownLeft } from "lucide-react";
import { VALID_WORDS_SET } from "../logic/wordList";
import { calculatePar, isOneLetterDiff, getDiffIndex } from "../logic/solver";

interface LadderBoardProps {
  startWord: string;
  targetWord: string;
  path: string[];
  currentInput: string;
  isWon: boolean;
  par: number;
  shakeRow: boolean;
  errorMessage: string | null;
  onInputChange: (val: string) => void;
  onSubmitGuess: () => void;
  lang?: "en" | "cs";
}

interface GridWordNode {
  word: string;
  col: number;
  row: number; // distance to target (e.g. 3, 2, 1, 0)
  stepIndices: number[];
  latestStepIndex: number;
  isLatest: boolean;
  isStart: boolean;
  changedIndex: number;
  delta: number;
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
  onInputChange,
  onSubmitGuess,
  lang = "en",
}) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute 2D Grid Layout where:
  // - row = distance to target (Y-axis)
  // - col = branch column (X-axis, words coming from same parent stay in same column)
  const { gridNodes, maxCol, maxRow, activeNode } = useMemo(() => {
    const nodeMap = new Map<string, GridWordNode>();
    const occupied = new Set<string>(); // "col,row"
    const nodes: GridWordNode[] = [];

    let currentMaxCol = 0;
    let currentMaxRow = Math.max(par, 4);

    for (let i = 0; i < path.length; i++) {
      const word = path[i];
      const dist = calculatePar(word, targetWord);
      currentMaxRow = Math.max(currentMaxRow, dist);

      let node = nodeMap.get(word);
      if (!node) {
        let col = 0;
        if (i === 0) {
          col = 0;
        } else {
          const prevWord = path[i - 1];
          const prevNode = nodeMap.get(prevWord)!;

          if (dist === prevNode.row) {
            // Horizontal step (same distance) -> move right on the same row
            col = prevNode.col + 1;
            while (occupied.has(`${col},${dist}`)) {
              col++;
            }
          } else {
            // Vertical step (closer or farther) -> stay in the EXACT column of the word you came from!
            col = prevNode.col;
            while (occupied.has(`${col},${dist}`)) {
              col++;
            }
          }
        }

        occupied.add(`${col},${dist}`);
        currentMaxCol = Math.max(currentMaxCol, col);

        const prevWord = i > 0 ? path[i - 1] : word;
        const changedIndex = i > 0 ? getDiffIndex(prevWord, word) : -1;
        const prevDist = i > 0 ? calculatePar(prevWord, targetWord) : dist;
        const delta = dist - prevDist;

        node = {
          word,
          col,
          row: dist,
          stepIndices: [i],
          latestStepIndex: i,
          isLatest: i === path.length - 1 && !isWon,
          isStart: i === 0,
          changedIndex,
          delta,
        };

        nodeMap.set(word, node);
        nodes.push(node);
      } else {
        // Revisit existing node in graph
        node.stepIndices.push(i);
        node.latestStepIndex = i;
        const prevWord = path[i - 1];
        const prevDist = calculatePar(prevWord, targetWord);
        node.delta = dist - prevDist;
        node.changedIndex = getDiffIndex(prevWord, word);
      }
    }

    // Mark current active node
    const lastWord = path[path.length - 1];
    let currentActive: GridWordNode | null = null;
    for (const node of nodes) {
      node.isLatest = node.word === lastWord && !isWon && node.latestStepIndex === path.length - 1;
      if (node.isLatest) currentActive = node;
    }

    return {
      gridNodes: nodes,
      maxCol: currentMaxCol,
      maxRow: currentMaxRow,
      activeNode: currentActive,
    };
  }, [isWon, par, path, targetWord]);

  // Current distance to goal
  const currentDist = activeNode ? activeNode.row : calculatePar(path[path.length - 1], targetWord);

  // Real-time preview of user's active 4-letter input
  const inputPreview = useMemo(() => {
    const clean = currentInput.toUpperCase().trim();
    if (clean.length !== 4) return null;

    if (!VALID_WORDS_SET.has(clean)) {
      return { status: "invalid", text: lang === "cs" ? "Není ve slovníku" : "Not in dictionary" };
    }

    const lastWord = path[path.length - 1];
    if (!isOneLetterDiff(lastWord, clean)) {
      return { status: "not_1_diff", text: lang === "cs" ? "Změň 1 písmeno" : "Must change 1 letter" };
    }

    const nextDist = calculatePar(clean, targetWord);
    if (nextDist < currentDist) {
      return {
        status: "closer",
        text: lang === "cs" ? `O 1 krok blíž k cíli! (Tier ${nextDist})` : `1 step closer! (Tier ${nextDist})`,
        delta: -1,
      };
    } else if (nextDist === currentDist) {
      return {
        status: "neutral",
        text: lang === "cs" ? `Stejná vzdálenost (Tier ${nextDist})` : `Same distance (Tier ${nextDist})`,
        delta: 0,
      };
    } else {
      return {
        status: "farther",
        text: lang === "cs" ? `O 1 krok dál od cíle (Tier ${nextDist})` : `1 step farther (Tier ${nextDist})`,
        delta: 1,
      };
    }
  }, [currentDist, currentInput, lang, path, targetWord]);

  // Map for fast O(1) lookup of node at (col, row)
  const cellMap = useMemo(() => {
    const map = new Map<string, GridWordNode>();
    for (const node of gridNodes) {
      map.set(`${node.col},${node.row}`, node);
    }
    return map;
  }, [gridNodes]);

  // Generate row tiers array from maxRow down to 0
  const rowTiers = useMemo(() => {
    const rows: number[] = [];
    for (let r = maxRow; r >= 0; r--) {
      rows.push(r);
    }
    return rows;
  }, [maxRow]);

  // Auto focus native input when user taps board or mounts
  const handleBoardClick = () => {
    if (!isWon) {
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [path.length]);

  return (
    <div
      onClick={handleBoardClick}
      className="flex flex-col items-center w-full max-w-2xl mx-auto px-2 sm:px-4 py-2 select-none"
    >
      {/* Top Status Banner */}
      <div className="flex items-center justify-between w-full mb-3 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs sm:text-sm text-zinc-300 shadow">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">{lang === "cs" ? "Odehráno kroků:" : "Steps:"}</span>
          <span className="font-mono font-bold text-amber-400 text-base">{path.length - 1}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Par:</span>
          <span className="font-mono font-bold text-emerald-400 text-base">{par}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-zinc-400">{lang === "cs" ? "Vzdálenost k cíli:" : "To Goal:"}</span>
          <span
            className={`font-bold px-2 py-0.5 rounded-full ${
              currentDist === 0
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : currentDist <= 2
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-zinc-800 text-zinc-300 border border-zinc-700"
            }`}
          >
            {currentDist} {lang === "cs" ? "kroků" : "steps"}
          </span>
        </div>
      </div>

      {/* Path Breadcrumbs Trail */}
      {path.length > 1 && (
        <div className="w-full mb-2.5 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-thin text-xs font-mono">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold shrink-0">
            {lang === "cs" ? "Cesta:" : "Trail:"}
          </span>
          {path.map((word, idx) => {
            const isLast = idx === path.length - 1;
            return (
              <React.Fragment key={`trail-${idx}-${word}`}>
                <span
                  className={`px-2 py-0.5 rounded font-bold shrink-0 transition-all ${
                    idx === 0
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700/50"
                      : isLast
                      ? "bg-amber-500/20 text-amber-300 border-2 border-amber-400 shadow animate-pulse"
                      : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                  }`}
                >
                  {word}
                </span>
                {!isLast && <span className="text-amber-400 font-bold shrink-0">➔</span>}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* 2D Grid Elevation Board Container */}
      <div className="w-full max-h-[48vh] sm:max-h-[52vh] overflow-auto pr-1 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-zinc-700">
        {rowTiers.map((r) => {
          const isGoalRow = r === 0;
          const isCurrentActiveRow = currentDist === r && !isWon;
          const rowHasNodes = gridNodes.some((n) => n.row === r);

          return (
            <div
              key={`row-tier-${r}`}
              className={`w-full rounded-2xl p-2.5 sm:p-3 transition-all duration-300 border ${
                isGoalRow
                  ? isWon
                    ? "bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    : "bg-zinc-950/80 border-amber-500/30"
                  : isCurrentActiveRow
                  ? "bg-zinc-900/90 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                  : rowHasNodes
                  ? "bg-zinc-900/60 border-zinc-800/80"
                  : "bg-zinc-950/30 border-zinc-900 opacity-50"
              }`}
            >
              {/* Row Header Indicator */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded-md ${
                      isGoalRow
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : r === 1
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {isGoalRow
                      ? lang === "cs"
                        ? "CÍL (0 kroků) 🎯"
                        : "GOAL (0 steps) 🎯"
                      : lang === "cs"
                      ? `${r} kroků k cíli`
                      : `${r} steps from Goal`}
                  </span>

                  {isCurrentActiveRow && (
                    <span className="text-[10px] font-bold text-amber-400 animate-pulse">
                      ◀ {lang === "cs" ? "Aktuální úroveň" : "Current Level"}
                    </span>
                  )}
                </div>
              </div>

              {/* Matrix of Columns in this Row Tier */}
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {Array.from({ length: maxCol + 1 }).map((_, c) => {
                  const node = cellMap.get(`${c},${r}`);

                  // If this is Goal Tier (r = 0) and column is 0 (or winning column), show Target Word
                  if (isGoalRow && c === (activeNode?.col ?? 0)) {
                    return (
                      <div
                        key={`goal-tile-${c}`}
                        className={`flex flex-col items-center p-2 rounded-xl border min-w-[130px] sm:min-w-[145px] ${
                          isWon
                            ? "bg-emerald-500/20 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.3)] animate-bounce"
                            : "bg-zinc-900/80 border-dashed border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1 text-[10px] font-mono px-1">
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <Target size={11} /> {lang === "cs" ? "CÍL" : "TARGET"}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {targetWord.split("").map((ch, i) => (
                            <div
                              key={`target-char-${i}`}
                              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-sm sm:text-base rounded-lg ${
                                isWon
                                  ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400"
                                  : "bg-zinc-950 text-zinc-400 border border-zinc-800"
                              }`}
                            >
                              {ch}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // If there is a Word Node at this (c, r) coordinate
                  if (node) {
                    const isStartOnly = node.isStart && node.stepIndices.length === 1;
                    const stepLabel = node.stepIndices
                      .map((idx) => (idx === 0 ? "START" : `#${idx}`))
                      .join(", ");

                    return (
                      <motion.div
                        key={`node-${node.word}-${c}-${r}`}
                        layout
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        className={`relative flex flex-col items-center p-2 rounded-xl border transition-all min-w-[130px] sm:min-w-[145px] ${
                          node.isLatest
                            ? "bg-amber-950/50 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-4 ring-amber-400/25 z-20"
                            : isStartOnly
                            ? "bg-emerald-950/40 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                            : "bg-zinc-800/80 border-zinc-700"
                        }`}
                      >
                        {/* Active Current Pill Tag */}
                        {node.isLatest && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-zinc-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                            {lang === "cs" ? "Aktuální" : "Current"}
                          </div>
                        )}

                        {/* Step Tag & Direction Badge */}
                        <div className="flex items-center justify-between w-full mb-1 text-[10px] font-mono px-1">
                          <span className="text-zinc-300 font-bold">{stepLabel}</span>

                          {node.latestStepIndex > 0 && (
                            <span
                              className={`flex items-center gap-0.5 font-bold ${
                                node.delta < 0
                                  ? "text-emerald-400"
                                  : node.delta === 0
                                  ? "text-amber-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {node.delta < 0 ? (
                                <>
                                  <ArrowDown size={11} />
                                  <span>-1</span>
                                </>
                              ) : node.delta === 0 ? (
                                <>
                                  <ArrowRight size={11} />
                                  <span>=</span>
                                </>
                              ) : (
                                <>
                                  <ArrowUp size={11} />
                                  <span>+1</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>

                        {/* 4 Letter Tiles */}
                        <div className="flex gap-1">
                          {node.word.split("").map((ch, i) => {
                            const isChanged = node.changedIndex === i && !isStartOnly;
                            return (
                              <div
                                key={`letter-${node.word}-${i}`}
                                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-sm sm:text-base rounded-lg ${
                                  node.isLatest
                                    ? "bg-amber-500/25 text-amber-200 border-2 border-amber-400 font-extrabold"
                                    : isStartOnly
                                    ? "bg-zinc-900 text-emerald-300 border border-emerald-500/40"
                                    : isChanged
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-400 shadow"
                                    : "bg-zinc-900/90 text-zinc-100 border border-zinc-700/80"
                                }`}
                              >
                                {ch}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  }

                  // Empty Slot Spacer: Maintains column vertical alignment across all tiers!
                  return (
                    <div
                      key={`empty-slot-${c}-${r}`}
                      className="min-w-[130px] sm:min-w-[145px] h-12 sm:h-14 border border-dashed border-zinc-900/60 rounded-xl flex items-center justify-center text-[10px] text-zinc-700/50 font-mono"
                    >
                      ·
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div ref={scrollEndRef} />
      </div>

      {/* Active Input Bar & Mobile Native Keyboard Input */}
      {!isWon && (
        <div className="w-full mt-3 flex flex-col items-center bg-zinc-900/95 border border-zinc-800 rounded-2xl p-3 sm:p-4 shadow-xl">
          <div className="flex items-center justify-between w-full max-w-[320px] mb-1.5 px-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} />
              {lang === "cs" ? "Tvůj další tah" : "Your Next Move"}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              from <span className="font-bold text-zinc-200">{path[path.length - 1]}</span>
            </span>
          </div>

          {/* 4 Interactive Letter Slots & Hidden Real Native Input */}
          <div className="relative w-full max-w-[320px] flex items-center justify-center gap-2">
            {/* Real HTML Input for Mobile Native Keyboard */}
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={4}
              value={currentInput}
              onChange={(e) => onInputChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmitGuess();
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              aria-label="Enter 4-letter guess"
            />

            {/* Visual 4-Letter Display Tiles */}
            <motion.div
              animate={shakeRow ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
              transition={{ duration: 0.35 }}
              className="flex gap-2 flex-1 justify-center"
            >
              {[0, 1, 2, 3].map((i) => {
                const char = currentInput[i] || "";
                const isCurrentCursor = i === currentInput.length && currentInput.length < 4;
                const prevWord = path[path.length - 1];
                const prevChar = prevWord ? prevWord[i] : "";
                const isDifferent = char && char !== prevChar;

                return (
                  <div
                    key={`input-slot-${i}`}
                    className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center font-bold text-xl sm:text-2xl rounded-xl transition-all ${
                      char
                        ? isDifferent
                          ? "bg-amber-500/25 text-amber-200 border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                          : "bg-zinc-800 text-zinc-100 border-2 border-zinc-600"
                        : isCurrentCursor
                        ? "bg-zinc-900 text-zinc-400 border-2 border-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                        : "bg-zinc-950 text-zinc-600 border border-zinc-800"
                    }`}
                  >
                    {char}
                  </div>
                );
              })}
            </motion.div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={onSubmitGuess}
              disabled={currentInput.length !== 4}
              className="h-12 sm:h-14 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 font-bold text-white transition flex items-center justify-center gap-1 shadow cursor-pointer"
              title="Submit Word"
            >
              <CornerDownLeft size={18} />
            </button>
          </div>

          {/* Real-time Distance Preview or Error Message */}
          <div className="h-6 mt-2 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {errorMessage ? (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-semibold text-rose-400 bg-rose-950/80 border border-rose-800/80 px-3 py-0.5 rounded-full"
                >
                  {errorMessage}
                </motion.div>
              ) : inputPreview ? (
                <motion.div
                  key="prev"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`text-xs font-semibold px-3 py-0.5 rounded-full border ${
                    inputPreview.status === "closer"
                      ? "text-emerald-300 bg-emerald-950/70 border-emerald-700/70"
                      : inputPreview.status === "neutral"
                      ? "text-amber-300 bg-amber-950/70 border-amber-700/70"
                      : inputPreview.status === "farther"
                      ? "text-rose-300 bg-rose-950/70 border-rose-700/70"
                      : "text-zinc-400 bg-zinc-950 border-zinc-800"
                  }`}
                >
                  {inputPreview.text}
                </motion.div>
              ) : (
                <span className="text-[11px] text-zinc-500">
                  {lang === "cs" ? "Klepnutím otevři klávesnici v mobilu" : "Tap to open mobile keyboard & type"}
                </span>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
