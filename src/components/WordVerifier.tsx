import React, { useState, useMemo } from "react";
import { Search, CheckCircle2, XCircle, Sparkles, ArrowRight, CornerDownLeft, ChevronDown, ChevronUp } from "lucide-react";
import { getValidWordsSet } from "../logic/wordList";
import { isOneLetterDiff, getDiffIndex, getNeighbors } from "../logic/solver";

interface WordVerifierProps {
  currentLadderWord: string;
  ladderHistory: string[];
  onPlayWord?: (word: string) => void;
  lang?: "en" | "cs";
}

export const WordVerifier: React.FC<WordVerifierProps> = ({
  currentLadderWord,
  ladderHistory,
  onPlayWord,
  lang = "en",
}) => {
  const [query, setQuery] = useState("");
  const [showNeighbors, setShowNeighbors] = useState(false);

  const cleanQuery = query.toUpperCase().trim();
  const wordSet = useMemo(() => getValidWordsSet(lang), [lang]);

  // Verification analysis
  const analysis = useMemo(() => {
    if (!cleanQuery) return null;

    if (cleanQuery.length !== 4) {
      return {
        status: "incomplete",
        inDict: false,
        canPlay: false,
        message: lang === "cs" ? "Zadej 4-písmenné slovo" : "Enter 4 letters to check",
      };
    }

    const inDict = wordSet.has(cleanQuery);
    if (!inDict) {
      return {
        status: "invalid",
        inDict: false,
        canPlay: false,
        message: lang === "cs" ? `'${cleanQuery}' není v českém slovníku` : `'${cleanQuery}' is not in dictionary`,
      };
    }

    const is1Diff = isOneLetterDiff(currentLadderWord, cleanQuery);
    const diffIdx = is1Diff ? getDiffIndex(currentLadderWord, cleanQuery) : -1;
    if (is1Diff) {
      return {
        status: "playable",
        inDict: true,
        canPlay: true,
        diffIdx,
        message:
          lang === "cs"
            ? `Platný tah! Změna písmene na pozici ${diffIdx + 1}`
            : `Valid next move! (Changes letter ${diffIdx + 1})`,
      };
    }

    return {
      status: "valid_word_only",
      inDict: true,
      canPlay: false,
      message:
        lang === "cs"
          ? `Platné slovo, ale neliší se právě o 1 písmeno od '${currentLadderWord}'`
          : `Valid word, but doesn't differ by 1 letter from '${currentLadderWord}'`,
    };
  }, [cleanQuery, currentLadderWord, lang, wordSet]);

  // Valid 1-letter neighbors for current word
  const availableNeighbors = useMemo(() => {
    return getNeighbors(currentLadderWord, wordSet);
  }, [currentLadderWord, wordSet]);

  const handlePlay = (wordToPlay: string) => {
    if (onPlayWord) {
      onPlayWord(wordToPlay);
      setQuery("");
    }
  };

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl text-zinc-100 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-amber-400" />
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            {lang === "cs" ? "Ověřovač slovníku" : "Word Verifier"}
          </h3>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">4-letter checker</span>
      </div>

      {/* Input Box */}
      <div className="relative">
        <input
          type="text"
          maxLength={4}
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          placeholder={lang === "cs" ? "Např. COOP, BOAT..." : "e.g. COOP, BOAT..."}
          className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-sm font-mono font-bold uppercase tracking-widest text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/80 transition"
        />
        {cleanQuery.length > 0 && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 p-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Verification Status Card */}
      {analysis && (
        <div
          className={`p-3 rounded-xl border text-xs flex flex-col gap-2 transition-all ${
            analysis.status === "playable"
              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
              : analysis.status === "valid_word_only"
              ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
              : analysis.status === "invalid"
              ? "bg-rose-950/40 border-rose-500/50 text-rose-300"
              : "bg-zinc-950/40 border-zinc-800 text-zinc-400"
          }`}
        >
          <div className="flex items-start gap-2">
            {analysis.inDict ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{analysis.message}</div>
          </div>

          {analysis.canPlay && onPlayWord && (
            <button
              type="button"
              onClick={() => handlePlay(cleanQuery)}
              className="mt-1 w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow"
            >
              <CornerDownLeft size={14} />
              <span>{lang === "cs" ? `Zahrát slovo '${cleanQuery}'` : `Play '${cleanQuery}' now`}</span>
            </button>
          )}
        </div>
      )}

      {/* Neighbor Explorer Accordion */}
      <div className="pt-1 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => setShowNeighbors((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-400" />
            <span>
              {lang === "cs"
                ? `Možné další tahy z '${currentLadderWord}' (${availableNeighbors.length})`
                : `Possible moves from '${currentLadderWord}' (${availableNeighbors.length})`}
            </span>
          </span>
          {showNeighbors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showNeighbors && (
          <div className="mt-2 max-h-32 overflow-y-auto pr-1 flex flex-wrap gap-1.5 scrollbar-thin scrollbar-thumb-zinc-700">
            {availableNeighbors.length > 0 ? (
              availableNeighbors.map((nbr) => (
                <button
                  key={nbr}
                  type="button"
                  onClick={() => handlePlay(nbr)}
                  className="px-2 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-mono font-semibold text-zinc-300 hover:text-amber-300 transition cursor-pointer flex items-center gap-1"
                >
                  <span>{nbr}</span>
                  <ArrowRight size={10} className="text-zinc-500" />
                </button>
              ))
            ) : (
              <span className="text-[11px] text-zinc-500 italic">
                {lang === "cs" ? "Žádné další tahy nenalezeny" : "No reachable neighbors found"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
