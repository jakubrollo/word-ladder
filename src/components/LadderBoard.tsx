import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowDown, ArrowRight, ArrowUp, Sparkles, Target, CornerDownLeft } from "lucide-react";
import { getPathDistanceInfo } from "../logic/solver";
import { VALID_WORDS_SET } from "../logic/wordList";
import { calculatePar, isOneLetterDiff } from "../logic/solver";

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

interface TierWordNode {
  word: string;
  isStart: boolean;
  isLatest: boolean;
  stepIndices: number[];
  latestStepIndex: number;
  latestDelta: number;
  changedIndex: number;
}

interface SvgEdge {
  id: string;
  d: string;
  isLatest: boolean;
  fromWord: string;
  toWord: string;
  stepIndex: number;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [svgEdges, setSvgEdges] = useState<SvgEdge[]>([]);

  // Compute step distance metrics for every step in path
  const stepsInfo = useMemo(() => {
    return getPathDistanceInfo(path, targetWord);
  }, [path, targetWord]);

  // Current active word & distance
  const currentStep = stepsInfo[stepsInfo.length - 1];
  const currentDist = currentStep ? currentStep.distance : par;
  const currentActiveWord = path[path.length - 1];

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

  // Determine max distance tier to render
  const maxTier = useMemo(() => {
    const highestInPath = Math.max(...stepsInfo.map((s) => s.distance), par);
    return Math.max(highestInPath, 4);
  }, [stepsInfo, par]);

  // Group steps by their distance tier, deduplicating words on the same level
  const tiers = useMemo(() => {
    const tierList: Array<{
      dist: number;
      uniqueWords: TierWordNode[];
      isGoal: boolean;
    }> = [];

    for (let d = maxTier; d >= 0; d--) {
      const wordsMap = new Map<string, TierWordNode>();

      for (const step of stepsInfo) {
        if (step.distance === d) {
          const existing = wordsMap.get(step.word);
          const isLatestStep = step.stepIndex === path.length - 1 && !isWon;

          if (!existing) {
            wordsMap.set(step.word, {
              word: step.word,
              isStart: step.stepIndex === 0,
              isLatest: isLatestStep,
              stepIndices: [step.stepIndex],
              latestStepIndex: step.stepIndex,
              latestDelta: step.delta,
              changedIndex: step.changedIndex,
            });
          } else {
            existing.stepIndices.push(step.stepIndex);
            existing.latestStepIndex = step.stepIndex;
            existing.latestDelta = step.delta;
            existing.changedIndex = step.changedIndex;
            if (isLatestStep) {
              existing.isLatest = true;
            }
          }
        }
      }

      // Re-verify isLatest against current active word
      for (const node of wordsMap.values()) {
        node.isLatest = node.word === currentActiveWord && !isWon && node.latestStepIndex === path.length - 1;
      }

      tierList.push({
        dist: d,
        uniqueWords: Array.from(wordsMap.values()),
        isGoal: d === 0,
      });
    }

    return tierList;
  }, [currentActiveWord, isWon, maxTier, path.length, stepsInfo]);

  // Calculate SVG curved arrow paths connecting each sequential move in path
  const updateSvgEdges = useCallback(() => {
    if (!containerRef.current || path.length <= 1) {
      setSvgEdges([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const edges: SvgEdge[] = [];

    // Track move pairs to offset return/backtrack arrows
    const pairCounts: Record<string, number> = {};

    for (let i = 0; i < path.length - 1; i++) {
      const fromWord = path[i];
      const toWord = path[i + 1];
      if (fromWord === toWord) continue;

      const fromEl = tileRefs.current[fromWord];
      const toEl = tileRefs.current[toWord];
      if (!fromEl || !toEl) continue;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;

      const x2 = toRect.left + toRect.width / 2 - containerRect.left;
      const y2 = toRect.top + toRect.height / 2 - containerRect.top;

      // Unique pair key to calculate curve offset for back-and-forth arrows
      const pairKey = [fromWord, toWord].sort().join("<->");
      pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
      const occurrence = pairCounts[pairKey];

      // Calculate control point for curved arrow
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      // Perpendicular offset
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const perpX = -dy / len;
      const perpY = dx / len;

      // Alternate curve side if moving back and forth between same pair
      const offsetMag = occurrence % 2 === 1 ? 16 + (occurrence - 1) * 6 : -16 - (occurrence - 2) * 6;
      const ctrlX = midX + perpX * offsetMag;
      const ctrlY = midY + perpY * offsetMag;

      const isLatest = i === path.length - 2 && !isWon;
      const toStep = stepsInfo[i + 1];
      const delta = toStep ? toStep.delta : 0;

      edges.push({
        id: `edge-${i}-${fromWord}-${toWord}`,
        d: `M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${x2} ${y2}`,
        isLatest,
        fromWord,
        toWord,
        stepIndex: i + 1,
        delta,
      });
    }

    setSvgEdges(edges);
  }, [isWon, path, stepsInfo]);

  useEffect(() => {
    // Small timeout to allow DOM layout to settle after state updates
    const timer = setTimeout(updateSvgEdges, 60);
    window.addEventListener("resize", updateSvgEdges);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateSvgEdges);
    };
  }, [updateSvgEdges, path, tiers]);

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
      className="flex flex-col items-center w-full max-w-xl mx-auto px-2 sm:px-4 py-2 select-none"
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

      {/* Path Breadcrumbs Trail showing sequential arrow moves */}
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

      {/* Distance Elevation Graph / Ladder Container */}
      <div
        ref={containerRef}
        className="relative w-full max-h-[46vh] sm:max-h-[50vh] overflow-y-auto pr-1 flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-zinc-700"
      >
        {/* SVG Curved Arrows Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
          aria-hidden="true"
        >
          <defs>
            {/* Active move arrow marker */}
            <marker
              id="arrowhead-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
            </marker>

            {/* Past move arrow marker */}
            <marker
              id="arrowhead-past"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
            </marker>
          </defs>

          {/* Render connecting path arrows */}
          {svgEdges.map((edge) => (
            <g key={edge.id}>
              {/* Outer glow for latest move */}
              {edge.isLatest && (
                <path
                  d={edge.d}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="6"
                  strokeOpacity="0.25"
                  strokeLinecap="round"
                />
              )}
              {/* Main arrow line */}
              <path
                d={edge.d}
                fill="none"
                stroke={edge.isLatest ? "#f59e0b" : "#10b981"}
                strokeWidth={edge.isLatest ? 2.5 : 1.8}
                strokeOpacity={edge.isLatest ? 1 : 0.65}
                strokeDasharray={edge.isLatest ? undefined : "4 3"}
                markerEnd={edge.isLatest ? "url(#arrowhead-active)" : "url(#arrowhead-past)"}
              />
            </g>
          ))}
        </svg>

        {/* Elevation Tiers */}
        {tiers.map((tier) => {
          const isCurrentActiveTier = currentDist === tier.dist && !isWon;
          const hasWords = tier.uniqueWords.length > 0;
          const isGoalTier = tier.isGoal;

          return (
            <div
              key={`tier-${tier.dist}`}
              className={`w-full rounded-2xl p-2.5 sm:p-3 transition-all duration-300 border ${
                isGoalTier
                  ? isWon
                    ? "bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    : "bg-zinc-950/80 border-amber-500/30"
                  : isCurrentActiveTier
                  ? "bg-zinc-900/90 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                  : hasWords
                  ? "bg-zinc-900/60 border-zinc-800/80"
                  : "bg-zinc-950/30 border-zinc-900 opacity-60"
              }`}
            >
              {/* Tier Header Label */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded-md ${
                      isGoalTier
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : tier.dist === 1
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {isGoalTier
                      ? lang === "cs"
                        ? "CÍL (0 kroků) 🎯"
                        : "GOAL (0 steps) 🎯"
                      : lang === "cs"
                      ? `${tier.dist} kroků k cíli`
                      : `${tier.dist} steps from Goal`}
                  </span>

                  {isCurrentActiveTier && (
                    <span className="text-[10px] font-bold text-amber-400 animate-pulse">
                      ◀ {lang === "cs" ? "Aktuální úroveň" : "Current Level"}
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-zinc-500 font-mono">
                  {tier.uniqueWords.length} {tier.uniqueWords.length === 1 ? "word" : "words"}
                </span>
              </div>

              {/* Unique words placed in this elevation tier */}
              <div className="flex flex-wrap items-center gap-3">
                {tier.uniqueWords.map((node) => {
                  const isStartOnly = node.isStart && node.stepIndices.length === 1;

                  // Label display e.g. "START", "#1", or "START, #2"
                  const stepLabel = node.stepIndices
                    .map((idx) => (idx === 0 ? "START" : `#${idx}`))
                    .join(", ");

                  return (
                    <motion.div
                      key={`tier-${tier.dist}-${node.word}`}
                      ref={(el) => {
                        tileRefs.current[node.word] = el;
                      }}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className={`relative flex flex-col items-center p-2 rounded-xl border transition-all ${
                        node.isLatest
                          ? "bg-amber-950/50 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-4 ring-amber-400/25 z-20"
                          : isStartOnly
                          ? "bg-emerald-950/40 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                          : "bg-zinc-800/80 border-zinc-700"
                      }`}
                    >
                      {/* Active Current Pill Tag */}
                      {node.isLatest && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-zinc-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow">
                          {lang === "cs" ? "Aktuální" : "Current"}
                        </div>
                      )}

                      {/* Step Tag & Direction Badge */}
                      <div className="flex items-center justify-between w-full mb-1 text-[10px] font-mono px-1">
                        <span className="text-zinc-300 font-bold">{stepLabel}</span>

                        {node.latestStepIndex > 0 && (
                          <span
                            className={`flex items-center gap-0.5 font-bold ${
                              node.latestDelta < 0
                                ? "text-emerald-400"
                                : node.latestDelta === 0
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {node.latestDelta < 0 ? (
                              <>
                                <ArrowDown size={11} />
                                <span>-1</span>
                              </>
                            ) : node.latestDelta === 0 ? (
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
                              className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-base sm:text-lg rounded-lg ${
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
                })}

                {/* Target Goal Word in Tier 0 */}
                {isGoalTier && (
                  <div
                    ref={(el) => {
                      tileRefs.current[targetWord] = el;
                    }}
                    className={`flex flex-col items-center p-2 rounded-xl border ${
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
                          className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-base sm:text-lg rounded-lg ${
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
                )}

                {/* Empty slot placeholder for tiers with no words */}
                {!hasWords && !isGoalTier && (
                  <div className="text-xs text-zinc-600 italic py-1 px-2 font-mono">
                    {lang === "cs" ? "Zatím žádné slovo v této úrovni" : "No words at this level yet"}
                  </div>
                )}
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
