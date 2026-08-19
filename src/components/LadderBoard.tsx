import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CornerDownLeft, Target, ArrowRight, ArrowDown, ArrowUp, CornerDownRight } from "lucide-react";
import { getValidWordsSet } from "../logic/wordList";
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
  row: number; // distance to target (e.g. 5, 4, 3, 2, 1, 0)
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
  const boardRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const wordSet = useMemo(() => getValidWordsSet(lang), [lang]);

  // Compute 2D Grid Layout where:
  // - row = distance to target (Y-axis)
  // - col = branch column (X-axis)
  const { gridNodes, maxCol, maxRow, activeNode, cellMap, connections } = useMemo(() => {
    const nodeMap = new Map<string, GridWordNode>();
    const occupied = new Set<string>(); // "col,row"
    const nodes: GridWordNode[] = [];

    let currentMaxCol = 0;
    let currentMaxRow = Math.max(par, 4);

    for (let i = 0; i < path.length; i++) {
      const word = path[i];
      const dist = calculatePar(word, targetWord, wordSet);
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
            // Horizontal move (same distance) -> shift to next column on same row
            col = prevNode.col + 1;
            while (occupied.has(`${col},${dist}`)) {
              col++;
            }
          } else {
            // Vertical move (closer or farther) -> stay in the EXACT column of parent word
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
        const prevDist = i > 0 ? calculatePar(prevWord, targetWord, wordSet) : dist;
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
        const prevDist = calculatePar(prevWord, targetWord, wordSet);
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

    // Build cell map
    const map = new Map<string, GridWordNode>();
    for (const node of nodes) {
      map.set(`${node.col},${node.row}`, node);
    }

    // Build path connections for pure DOM arrows
    const conns: {
      isLatest: boolean;
      type: "horizontal" | "down" | "up";
      fromCol: number;
      toCol: number;
      fromRow: number;
      toRow: number;
    }[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const fromWord = path[i];
      const toWord = path[i + 1];
      if (fromWord === toWord) continue;

      const fromNode = nodeMap.get(fromWord);
      const toNode = nodeMap.get(toWord);
      if (!fromNode || !toNode) continue;

      const isLatest = i === path.length - 2 && !isWon;

      let type: "horizontal" | "down" | "up" = "horizontal";
      if (fromNode.row > toNode.row) type = "down";
      else if (fromNode.row < toNode.row) type = "up";

      conns.push({
        isLatest,
        type,
        fromCol: fromNode.col,
        toCol: toNode.col,
        fromRow: fromNode.row,
        toRow: toNode.row,
      });
    }

    return {
      gridNodes: nodes,
      maxCol: currentMaxCol,
      maxRow: currentMaxRow,
      activeNode: currentActive,
      cellMap: map,
      connections: conns,
    };
  }, [isWon, par, path, targetWord, wordSet]);

  // Current distance to goal
  const currentDist = activeNode ? activeNode.row : calculatePar(path[path.length - 1], targetWord, wordSet);

  // Real-time preview of user's active 4-letter input
  const inputPreview = useMemo(() => {
    const clean = currentInput.toUpperCase().trim();
    if (clean.length !== 4) return null;

    if (!wordSet.has(clean)) {
      return { status: "invalid", text: lang === "cs" ? "Není ve slovníku" : "Not in dictionary" };
    }

    const lastWord = path[path.length - 1];
    if (!isOneLetterDiff(lastWord, clean)) {
      return { status: "not_1_diff", text: lang === "cs" ? "Změň 1 písmeno" : "Must change 1 letter" };
    }

    const nextDist = calculatePar(clean, targetWord, wordSet);
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

  const cellWidthClass = "w-[144px] sm:w-[156px]";
  const gapWidthClass = "w-6 sm:w-8";

  return (
    <div
      onClick={handleBoardClick}
      className="flex flex-col items-center w-full max-w-2xl mx-auto px-2 select-none"
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
        <div className="w-full mb-3 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-1.5 overflow-x-auto scrollbar-thin text-xs font-mono">
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

      {/* 2D Grid Board */}
      <div
        ref={boardRef}
        className="relative w-full max-h-[48vh] sm:max-h-[52vh] overflow-auto pr-1 flex flex-col items-start gap-0 scrollbar-thin scrollbar-thumb-zinc-700"
      >
        <div className="flex flex-col min-w-max p-2 mx-auto">
          {rowTiers.map((r, rowIndex) => {
            const isGoalRow = r === 0;
            const isCurrentActiveRow = currentDist === r && !isWon;
            const rowHasNodes = gridNodes.some((n) => n.row === r);

            return (
              <React.Fragment key={`tier-group-${r}`}>
                {/* Main Tier Container */}
                <div
                  className={`w-full rounded-xl p-2.5 transition-all flex flex-col gap-2 border ${
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
                  <div className="flex items-center justify-between text-[11px] font-mono px-1 mb-1">
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
                          ? "CÍL (0 kroků)"
                          : "GOAL (0 steps)"
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

                  {/* Matrix Columns in this Row */}
                  <div className="flex items-center">
                    {Array.from({ length: maxCol + 1 }).map((_, c) => {
                      const node = cellMap.get(`${c},${r}`);
                      const hConn = connections.find(
                        (conn) =>
                          conn.type === "horizontal" &&
                          conn.fromRow === r &&
                          Math.min(conn.fromCol, conn.toCol) <= c &&
                          Math.max(conn.fromCol, conn.toCol) > c
                      );

                      return (
                        <React.Fragment key={`cell-${c}-${r}`}>
                          <div className={`${cellWidthClass} shrink-0 flex justify-center`}>
                            {isGoalRow && c === (activeNode?.col ?? 0) ? (
                              <div
                                ref={(el) => {
                                  tileRefs.current[targetWord] = el;
                                }}
                                className={`flex items-center gap-1 p-1.5 rounded-lg border shrink-0 ${
                                  isWon
                                    ? "bg-emerald-950 border-emerald-400 shadow animate-bounce"
                                    : "bg-zinc-900 border-2 border-dashed border-zinc-700"
                                }`}
                              >
                                {targetWord.split("").map((ch, i) => (
                                  <div
                                    key={`target-c-${i}`}
                                    className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center font-bold text-base rounded font-mono ${
                                      isWon ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-300"
                                    }`}
                                  >
                                    {ch}
                                  </div>
                                ))}
                              </div>
                            ) : node ? (
                              <motion.div
                                ref={(el) => {
                                  tileRefs.current[node.word] = el;
                                }}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className={`flex flex-col items-center p-1.5 rounded-lg border shrink-0 transition-all ${
                                  node.isLatest
                                    ? "bg-zinc-900 border-2 border-amber-400 shadow-md ring-2 ring-amber-400/20"
                                    : node.isStart
                                    ? "bg-zinc-900 border-2 border-emerald-600/70"
                                    : "bg-zinc-900 border-2 border-zinc-700"
                                }`}
                              >
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
                            ) : (
                              <div className="h-10" aria-hidden="true" />
                            )}
                          </div>

                          {/* Horizontal Arrow Spacer */}
                          {c < maxCol && (
                            <div className={`${gapWidthClass} shrink-0 flex items-center justify-center`}>
                              {hConn && (
                                <ArrowRight
                                  className={hConn.isLatest ? "text-amber-400" : "text-zinc-600"}
                                  strokeWidth={hConn.isLatest ? 3 : 2}
                                  size={20}
                                />
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Vertical Arrow Spacers Row */}
                {rowIndex < rowTiers.length - 1 && (
                  <div className="flex items-center w-full py-1 opacity-90">
                    {Array.from({ length: maxCol + 1 }).map((_, c) => {
                      const straightDown = connections.find(
                        (conn) =>
                          conn.type === "down" &&
                          conn.fromRow === r &&
                          conn.toRow === r - 1 &&
                          conn.fromCol === c &&
                          conn.toCol === c
                      );
                      const straightUp = connections.find(
                        (conn) =>
                          conn.type === "up" &&
                          conn.fromRow === r - 1 &&
                          conn.toRow === r &&
                          conn.fromCol === c &&
                          conn.toCol === c
                      );
                      const diagDown = connections.find(
                        (conn) =>
                          conn.type === "down" &&
                          conn.fromRow === r &&
                          conn.toRow === r - 1 &&
                          conn.toCol === c &&
                          conn.fromCol !== c
                      );

                      const vConn = straightDown || diagDown || straightUp;
                      let Icon = ArrowDown;
                      if (straightUp) Icon = ArrowUp;
                      else if (diagDown) Icon = CornerDownRight;

                      return (
                        <React.Fragment key={`v-gap-${c}-${r}`}>
                          <div className={`${cellWidthClass} shrink-0 flex justify-center`}>
                            {vConn && (
                              <Icon
                                className={vConn.isLatest ? "text-amber-400" : "text-zinc-600"}
                                strokeWidth={vConn.isLatest ? 3 : 2}
                                size={22}
                              />
                            )}
                          </div>
                          {c < maxCol && <div className={`${gapWidthClass} shrink-0`} />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
          <div ref={scrollEndRef} className="h-4" />
        </div>
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
