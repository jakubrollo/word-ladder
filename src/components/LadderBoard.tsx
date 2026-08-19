import React, { useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowDown, ArrowRight, ArrowUp, CornerDownLeft } from "lucide-react";
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

  // Compute 2D Grid Layout
  const { gridNodes, maxCol, maxRow, activeNode, verticalConnectors } = useMemo(() => {
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

    // Vertical connectors between consecutive rows at specific columns
    // Map key: `${col},${rowBetween}` -> "down" | "up"
    const vertMap = new Map<string, "down" | "up">();
    for (let i = 0; i < path.length - 1; i++) {
      const fromNode = nodeMap.get(path[i])!;
      const toNode = nodeMap.get(path[i + 1])!;
      if (fromNode.col === toNode.col && fromNode.row !== toNode.row) {
        if (toNode.row < fromNode.row) {
          // Descending down (e.g. from row 3 to row 2) -> connector below row 3
          vertMap.set(`${fromNode.col},${fromNode.row}`, "down");
        } else {
          // Ascending up (e.g. from row 2 to row 3) -> connector above row 2
          vertMap.set(`${fromNode.col},${toNode.row}`, "up");
        }
      }
    }

    return {
      gridNodes: nodes,
      maxCol: currentMaxCol,
      maxRow: currentMaxRow,
      activeNode: currentActive,
      verticalConnectors: vertMap,
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

  // Fast cell lookup
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
      className="flex flex-col items-center w-full max-w-xl mx-auto px-2 select-none"
    >
      {/* Top Status Banner */}
      <div className="flex items-center justify-between w-full mb-3 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-zinc-300 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">{lang === "cs" ? "Kroků:" : "Steps:"}</span>
          <span className="font-bold text-amber-400 text-base">{path.length - 1}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">Par:</span>
          <span className="font-bold text-emerald-400 text-base">{par}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">{lang === "cs" ? "Vzdálenost:" : "Distance:"}</span>
          <span
            className={`font-bold px-2 py-0.5 rounded text-xs ${
              currentDist === 0
                ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                : currentDist <= 2
                ? "bg-amber-950 text-amber-300 border border-amber-700"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {currentDist} {lang === "cs" ? "kroků" : "steps"}
          </span>
        </div>
      </div>

      {/* Path Breadcrumbs Trail */}
      {path.length > 1 && (
        <div className="w-full mb-3 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-thin text-xs font-mono">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold shrink-0">
            {lang === "cs" ? "Cesta:" : "Trail:"}
          </span>
          {path.map((word, idx) => {
            const isLast = idx === path.length - 1;
            return (
              <React.Fragment key={`trail-${idx}-${word}`}>
                <span
                  className={`px-1.5 py-0.5 rounded font-bold shrink-0 transition-all ${
                    idx === 0
                      ? "text-emerald-400 bg-emerald-950/60"
                      : isLast
                      ? "text-amber-300 bg-amber-950/80 border border-amber-500"
                      : "text-zinc-300 bg-zinc-800"
                  }`}
                >
                  {word}
                </span>
                {!isLast && <span className="text-zinc-500 font-bold shrink-0">➔</span>}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* 2D Grid Elevation Board */}
      <div className="w-full max-h-[46vh] sm:max-h-[50vh] overflow-auto pr-1 flex flex-col items-center gap-1 scrollbar-thin scrollbar-thumb-zinc-700">
        {rowTiers.map((r) => {
          const isGoalRow = r === 0;
          const isCurrentActiveRow = currentDist === r && !isWon;
          const rowHasNodes = gridNodes.some((n) => n.row === r);

          return (
            <div key={`tier-row-${r}`} className="w-full flex flex-col items-center">
              {/* Row Container */}
              <div
                className={`w-full rounded-xl p-2.5 transition-all flex flex-col gap-1 border ${
                  isGoalRow
                    ? isWon
                      ? "bg-emerald-950/40 border-emerald-500/60"
                      : "bg-zinc-900/90 border-amber-500/40"
                    : isCurrentActiveRow
                    ? "bg-zinc-900 border-amber-500/50 shadow-sm"
                    : rowHasNodes
                    ? "bg-zinc-900/60 border-zinc-800"
                    : "bg-zinc-950/30 border-zinc-900/60 opacity-40"
                }`}
              >
                {/* Row Header Label */}
                <div className="flex items-center justify-between text-[11px] font-mono px-1">
                  <span
                    className={`font-bold uppercase tracking-wider ${
                      isGoalRow
                        ? "text-amber-400"
                        : r === 1
                        ? "text-emerald-400"
                        : "text-zinc-400"
                    }`}
                  >
                    {isGoalRow
                      ? lang === "cs"
                        ? "CÍL (0 kroků) 🎯"
                        : "GOAL (0 steps) 🎯"
                      : lang === "cs"
                      ? `${r} kroků k cíli`
                      : `${r} steps to goal`}
                  </span>

                  {isCurrentActiveRow && (
                    <span className="text-[10px] font-bold text-amber-400 font-mono">
                      ◀ {lang === "cs" ? "Zde jsi" : "You are here"}
                    </span>
                  )}
                </div>

                {/* Horizontal Grid Columns in this Row */}
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {Array.from({ length: maxCol + 1 }).map((_, c) => {
                    const node = cellMap.get(`${c},${r}`);
                    const hasRightSibling = c < maxCol && cellMap.has(`${c + 1},${r}`);

                    // Goal Word in Tier 0
                    if (isGoalRow && c === (activeNode?.col ?? 0)) {
                      return (
                        <div
                          key={`goal-word-${c}`}
                          className={`flex items-center gap-1 p-1.5 rounded-lg border ${
                            isWon
                              ? "bg-emerald-950 border-emerald-400 shadow animate-bounce"
                              : "bg-zinc-900 border-2 border-dashed border-zinc-700"
                          }`}
                        >
                          {targetWord.split("").map((ch, i) => (
                            <div
                              key={`target-c-${i}`}
                              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center font-bold text-base rounded font-mono ${
                                isWon
                                  ? "bg-emerald-600 text-white"
                                  : "bg-zinc-800 text-zinc-300"
                              }`}
                            >
                              {ch}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    // Word Card in this Cell
                    if (node) {
                      return (
                        <React.Fragment key={`node-cell-${node.word}-${c}-${r}`}>
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className={`flex flex-col items-center p-1.5 rounded-lg border transition-all ${
                              node.isLatest
                                ? "bg-zinc-900 border-2 border-amber-400 shadow-md ring-2 ring-amber-400/20"
                                : node.isStart
                                ? "bg-zinc-900 border-2 border-emerald-600/70"
                                : "bg-zinc-900 border-2 border-zinc-700"
                            }`}
                          >
                            {/* Wordle-style 4 Letter Tiles */}
                            <div className="flex gap-1">
                              {node.word.split("").map((ch, i) => {
                                const isChanged = node.changedIndex === i && !node.isStart;
                                return (
                                  <div
                                    key={`tile-${node.word}-${i}`}
                                    className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center font-bold text-base rounded font-mono transition-colors ${
                                      node.isStart
                                        ? "bg-emerald-700/40 text-emerald-200 border border-emerald-500/40"
                                        : isChanged
                                        ? "bg-amber-500 text-zinc-950 font-extrabold"
                                        : "bg-zinc-800 text-white border border-zinc-700"
                                    }`}
                                  >
                                    {ch}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>

                          {/* Horizontal Arrow to Right Sibling */}
                          {hasRightSibling && (
                            <div className="flex items-center text-amber-400 font-bold px-0.5">
                              <ArrowRight size={16} />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    }

                    // Empty spacer slot to keep column alignment
                    return (
                      <div
                        key={`empty-cell-${c}-${r}`}
                        className="w-[148px] sm:w-[164px] shrink-0"
                        aria-hidden="true"
                      />
                    );
                  })}
                </div>
              </div>

              {/* Vertical Connector Arrow between Row r and Row r-1 */}
              {r > 0 && (
                <div className="w-full flex items-center gap-2 px-3 py-0.5">
                  {Array.from({ length: maxCol + 1 }).map((_, c) => {
                    const vertType = verticalConnectors.get(`${c},${r}`);
                    return (
                      <div
                        key={`vert-conn-${c}-${r}`}
                        className="w-[148px] sm:w-[164px] flex items-center justify-center shrink-0 h-4 text-xs font-bold font-mono"
                      >
                        {vertType === "down" ? (
                          <div className="flex items-center gap-0.5 text-emerald-400 animate-pulse">
                            <ArrowDown size={14} />
                            <span className="text-[10px]">-1</span>
                          </div>
                        ) : vertType === "up" ? (
                          <div className="flex items-center gap-0.5 text-rose-400">
                            <ArrowUp size={14} />
                            <span className="text-[10px]">+1</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div ref={scrollEndRef} />
      </div>

      {/* Wordle-Style Active Input Bar */}
      {!isWon && (
        <div className="w-full mt-3 flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-lg">
          <div className="flex items-center justify-between w-full max-w-[280px] mb-2 text-xs font-mono text-zinc-400">
            <span className="font-bold text-amber-400 uppercase">
              {lang === "cs" ? "Tvůj tah" : "Your Move"}
            </span>
            <span>
              from: <span className="font-bold text-white">{path[path.length - 1]}</span>
            </span>
          </div>

          {/* 4 Wordle Input Boxes & Transparent Native Input */}
          <div className="relative w-full max-w-[280px] flex items-center justify-center gap-2">
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

            {/* Wordle-style 4 Large Tile Squares */}
            <motion.div
              animate={shakeRow ? { x: [-6, 6, -4, 4, -2, 2, 0] } : {}}
              transition={{ duration: 0.3 }}
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
                    key={`wordle-input-${i}`}
                    className={`w-12 h-12 sm:w-13 sm:h-13 flex items-center justify-center font-bold text-xl rounded-md font-mono transition-all ${
                      char
                        ? isDifferent
                          ? "bg-amber-500/20 text-amber-300 border-2 border-amber-400"
                          : "bg-zinc-800 text-white border-2 border-zinc-600"
                        : isCurrentCursor
                        ? "bg-zinc-900 text-zinc-400 border-2 border-amber-400 animate-pulse"
                        : "bg-zinc-950 text-zinc-600 border-2 border-zinc-800"
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
              className="h-12 sm:h-13 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 font-bold text-white transition flex items-center justify-center cursor-pointer"
              title="Submit Word"
            >
              <CornerDownLeft size={18} />
            </button>
          </div>

          {/* Validation Status Preview */}
          <div className="h-6 mt-1.5 flex items-center justify-center text-xs font-mono">
            <AnimatePresence mode="wait">
              {errorMessage ? (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="font-bold text-rose-400 bg-rose-950/80 border border-rose-800 px-2.5 py-0.5 rounded"
                >
                  {errorMessage}
                </motion.div>
              ) : inputPreview ? (
                <motion.div
                  key="prev"
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`font-bold px-2.5 py-0.5 rounded border ${
                    inputPreview.status === "closer"
                      ? "text-emerald-300 bg-emerald-950/80 border-emerald-700"
                      : inputPreview.status === "neutral"
                      ? "text-amber-300 bg-amber-950/80 border-amber-700"
                      : inputPreview.status === "farther"
                      ? "text-rose-300 bg-rose-950/80 border-rose-700"
                      : "text-zinc-400 bg-zinc-950 border-zinc-800"
                  }`}
                >
                  {inputPreview.text}
                </motion.div>
              ) : (
                <span className="text-[11px] text-zinc-500">
                  {lang === "cs" ? "Klepnutím piš na klávesnici" : "Tap to type on keyboard"}
                </span>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
