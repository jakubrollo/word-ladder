import React from "react";
import { X, Sparkles, AlertCircle, ArrowDown, ArrowRight, ArrowUp, Smartphone } from "lucide-react";

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
          <Sparkles size={22} className="text-amber-400" />
          <h2 className="text-xl font-bold text-amber-400">
            {lang === "cs" ? "Jak hrát Word Ladder" : "How to Play Word Ladder"}
          </h2>
        </div>

        <div className="space-y-4 text-sm text-zinc-300">
          <p>
            {lang === "cs"
              ? "Cílem hry je proměnit počáteční 4-písmenné slovo v cílové slovo (např. BOAT ➔ COOP) v co nejmenším počtu kroků."
              : "Transform the starting 4-letter word into the goal target word (e.g. BOAT ➔ COOP) in as few steps as possible."}
          </p>

          {/* Rules Card */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 space-y-2.5">
            <h3 className="font-semibold text-zinc-200 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Sparkles size={14} className="text-amber-400" />
              {lang === "cs" ? "Základní pravidla" : "Core Rules"}
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
                    ? "Každé slovo musí být platné anglické slovo ze slovníku."
                    : "Every intermediate step must be a valid 4-letter English word."}
                </span>
              </li>
            </ul>
          </div>

          {/* Distance Elevation Visualization Explanation */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-2.5">
            <h3 className="font-semibold text-amber-400 text-xs uppercase tracking-wider">
              {lang === "cs" ? "📊 Úrovně vzdálenosti (Elevation Grid)" : "📊 Distance Elevation Tiers"}
            </h3>
            <p className="text-xs text-zinc-400">
              {lang === "cs"
                ? "Každé zadané slovo se automaticky zařadí do úrovně podle toho, jak blízko je k cíli:"
                : "Each word you play is automatically placed on an elevation tier based on how close you are to the goal:"}
            </p>

            <div className="space-y-2 text-xs font-medium">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300">
                <ArrowDown size={16} className="text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold">{lang === "cs" ? "Řádek níže:" : "Row below:"} </span>
                  {lang === "cs" ? "Přiblížil/a ses k cíli (méně kroků do cíle)." : "You got closer (fewer steps needed to goal)."}
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300">
                <ArrowRight size={16} className="text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold">{lang === "cs" ? "Vedle na stejném řádku:" : "Next to it in same row:"} </span>
                  {lang === "cs" ? "Vzdálenost se nezměnila (neutrální tah)." : "Distance didn't change (neutral move)."}
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300">
                <ArrowUp size={16} className="text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold">{lang === "cs" ? "Řádek výše:" : "Line above:"} </span>
                  {lang === "cs" ? "Vzdálil/a ses od cíle (počet kroků vzrostl)." : "You got farther away (step count increased)."}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Keyboard Tip */}
          <div className="flex items-start gap-2 bg-indigo-950/40 border border-indigo-800/40 rounded-xl p-3 text-xs text-indigo-300">
            <Smartphone size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{lang === "cs" ? "Ovládání na telefonu: " : "Phone Control: "}</span>
              {lang === "cs"
                ? "Stačí klepnout na herní pole a otevře se ti tvá nativní klávesnice telefonu pro snadné a rychlé psaní."
                : "Simply tap the board or input boxes to open your phone's native keyboard for fast typing."}
            </div>
          </div>

          {/* PAR explanation */}
          <div className="flex items-start gap-2 bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-3 text-xs text-emerald-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{lang === "cs" ? "Co je PAR?" : "What is PAR?"} </span>
              {lang === "cs"
                ? "PAR je minimální možný počet kroků k vyřešení hádanky, vypočtený naším AI grafovým algoritmem."
                : "PAR is the theoretical minimum number of steps to reach the goal calculated by our BFS algorithm."}
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
