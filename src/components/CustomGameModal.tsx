import React, { useState, useMemo, useEffect } from "react";
import { X, Sparkles, AlertCircle, ArrowRight, Play } from "lucide-react";
import { getValidWordsSet } from "../logic/wordList";
import { findShortestPath } from "../logic/solver";
import type { PuzzleInfo } from "../logic/gameState";

interface CustomGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCustom: (puzzle: PuzzleInfo) => void;
  lang?: "en" | "cs";
}

export const CustomGameModal: React.FC<CustomGameModalProps> = ({
  isOpen,
  onClose,
  onStartCustom,
  lang = "en",
}) => {
  const [startInput, setStartInput] = useState(lang === "cs" ? "MOST" : "GAME");
  const [targetInput, setTargetInput] = useState(lang === "cs" ? "KOZA" : "POOP");

  useEffect(() => {
    if (lang === "cs") {
      setStartInput("MOST");
      setTargetInput("KOZA");
    } else {
      setStartInput("GAME");
      setTargetInput("POOP");
    }
  }, [lang]);

  const s = startInput.toUpperCase().trim();
  const t = targetInput.toUpperCase().trim();
  const wordSet = useMemo(() => getValidWordsSet(lang), [lang]);

  const validation = useMemo(() => {
    if (s.length !== 4) return { ok: false, msg: lang === "cs" ? "Startovní slovo musí mít 4 písmena." : "Start word must be 4 letters." };
    if (t.length !== 4) return { ok: false, msg: lang === "cs" ? "Cílové slovo musí mít 4 písmena." : "Target word must be 4 letters." };
    if (!wordSet.has(s)) return { ok: false, msg: lang === "cs" ? `'${s}' není v českém slovníku.` : `'${s}' is not in dictionary.` };
    if (!wordSet.has(t)) return { ok: false, msg: lang === "cs" ? `'${t}' není v českém slovníku.` : `'${t}' is not in dictionary.` };
    if (s === t) return { ok: false, msg: lang === "cs" ? "Start a cíl nemohou být stejná slova." : "Start and target cannot be the same." };

    const path = findShortestPath(s, t, wordSet);
    if (!path) return { ok: false, msg: lang === "cs" ? `Mezi '${s}' a '${t}' neexistuje platná cesta.` : `No path exists between '${s}' and '${t}'.` };

    return { ok: true, par: path.length - 1, path };
  }, [s, t, lang, wordSet]);

  if (!isOpen) return null;

  const handleStart = () => {
    if (validation.ok && validation.path) {
      onStartCustom({
        id: `custom-${s}-${t}`,
        puzzleNumber: 0,
        startWord: s,
        targetWord: t,
        par: validation.par!,
        optimalPath: validation.path,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 shadow-2xl text-zinc-100">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-amber-400" size={22} />
          <h2 className="text-xl font-bold text-zinc-100">
            {lang === "cs" ? "Vlastní hádanka" : "Custom Puzzle"}
          </h2>
        </div>

        <p className="text-xs text-zinc-400 mb-4">
          {lang === "cs"
            ? "Zadej libovolná dvě 4-písmenná anglická slova a zahraj si vlastní žebříček."
            : "Choose any two 4-letter English words to create your own custom word ladder challenge."}
        </p>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              {lang === "cs" ? "Startovní slovo" : "Start Word"}
            </label>
            <input
              type="text"
              maxLength={4}
              value={startInput}
              onChange={(e) => setStartInput(e.target.value.toUpperCase())}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 font-mono text-lg font-bold text-emerald-400 uppercase tracking-widest focus:outline-none focus:border-emerald-500"
              placeholder="e.g. COLD"
            />
          </div>

          <div className="flex justify-center">
            <ArrowRight size={16} className="text-zinc-600 rotate-90" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              {lang === "cs" ? "Cílové slovo" : "Target Word"}
            </label>
            <input
              type="text"
              maxLength={4}
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value.toUpperCase())}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 font-mono text-lg font-bold text-amber-400 uppercase tracking-widest focus:outline-none focus:border-amber-500"
              placeholder="e.g. POOP"
            />
          </div>
        </div>

        {/* Validation result feedback */}
        <div className="mb-5">
          {validation.ok ? (
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 text-xs text-emerald-300 flex items-center justify-between">
              <span>{lang === "cs" ? "Platná hádanka nalezena!" : "Solvable ladder found!"}</span>
              <span className="font-mono font-bold text-sm text-emerald-400">
                PAR: {validation.par} {lang === "cs" ? "kroků" : "steps"}
              </span>
            </div>
          ) : (
            <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{validation.msg}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!validation.ok}
          onClick={handleStart}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-zinc-950 transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
        >
          <Play size={16} />
          <span>{lang === "cs" ? "Zahájit vlastní hru" : "Start Custom Game"}</span>
        </button>
      </div>
    </div>
  );
};
