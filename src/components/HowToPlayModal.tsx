import React from "react";
import { X, Sparkles, AlertCircle, ArrowRight } from "lucide-react";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "en" | "cs";
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose, lang = "en" }) => {
  if (!isOpen) return null;

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

        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🎯</span>
          <h2 className="text-xl font-bold text-amber-400">
            {lang === "cs" ? "Jak hrát Word Ladder" : "How to Play Word Ladder"}
          </h2>
        </div>

        <div className="space-y-4 text-sm text-zinc-300">
          <p>
            {lang === "cs"
              ? "Cílem hry je proměnit počáteční 4-písmenné slovo v cílové slovo (např. BOAT ➔ COOP nebo COLD ➔ WARM) v co nejmenším počtu kroků."
              : "Transform the starting 4-letter word into the goal target word (e.g. BOAT ➔ COOP or COLD ➔ WARM) in as few steps as possible."}
          </p>

          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-zinc-200 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Sparkles size={14} className="text-amber-400" />
              {lang === "cs" ? "Pravidla žebříčku slov" : "Word Ladder Rules"}
            </h3>

            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">1.</span>
                <span>
                  {lang === "cs"
                    ? "V každém tahu smíš změnit právě jedno písmeno."
                    : "Change exactly one letter at a time."}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">2.</span>
                <span>
                  {lang === "cs"
                    ? "Každé mezilehlé slovo musí být platné 4-písmenné anglické slovo ze slovníku."
                    : "Every intermediate step must be a valid 4-letter English word."}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">3.</span>
                <span>
                  {lang === "cs"
                    ? "Můžeš využít postranní Ověřovač slovníku pro kontrolu slov ještě před tahem."
                    : "Use the built-in Word Verifier sidebar to test any word before playing it."}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-200 mb-2 text-xs uppercase tracking-wider">
              {lang === "cs" ? "Příklad postupu (BOAT ➔ COOP):" : "Example Walkthrough (BOAT ➔ COOP):"}
            </h4>
            <div className="flex flex-col gap-1.5 items-center bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="bg-zinc-800 px-2 py-1 rounded text-emerald-400 font-bold">BOAT</span>
                <span className="text-zinc-500 text-[10px]">{lang === "cs" ? "Start" : "Start"}</span>
              </div>
              <ArrowRight size={12} className="text-zinc-600 rotate-90" />
              <div className="flex items-center gap-2">
                <span className="bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                  <span className="text-amber-400 font-bold">C</span>OAT
                </span>
                <span className="text-zinc-500 text-[10px]">{lang === "cs" ? "B ➔ C" : "B ➔ C"}</span>
              </div>
              <ArrowRight size={12} className="text-zinc-600 rotate-90" />
              <div className="flex items-center gap-2">
                <span className="bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                  C<span className="text-amber-400 font-bold">H</span>AT
                </span>
                <span className="text-zinc-500 text-[10px]">{lang === "cs" ? "O ➔ H" : "O ➔ H"}</span>
              </div>
              <ArrowRight size={12} className="text-zinc-600 rotate-90" />
              <div className="flex items-center gap-2">
                <span className="bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                  CH<span className="text-amber-400 font-bold">O</span>P
                </span>
                <span className="text-zinc-500 text-[10px]">{lang === "cs" ? "A ➔ O, T ➔ P" : "T ➔ P"}</span>
              </div>
              <ArrowRight size={12} className="text-zinc-600 rotate-90" />
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-1 rounded font-bold">
                  C<span className="text-amber-400">O</span>OP
                </span>
                <span className="text-amber-400 font-bold text-[10px]">{lang === "cs" ? "Cíl! 🎯" : "Goal! 🎯"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 text-xs text-emerald-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{lang === "cs" ? "Co je PAR?" : "What is PAR?"} </span>
              {lang === "cs"
                ? "PAR je minimální teoretický počet tahů potřebný k vyřešení hádanky, vypočtený naším AI grafovým algoritmem. Zkus uhrát PAR nebo ještě lepší výsledek!"
                : "PAR is the shortest possible path to victory calculated by our graph solver algorithm. Try to match or beat PAR!"}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-zinc-950 transition cursor-pointer shadow-lg shadow-amber-500/20"
        >
          {lang === "cs" ? "Rozumím, jdeme hrát!" : "Got it, let's play!"}
        </button>
      </div>
    </div>
  );
};
