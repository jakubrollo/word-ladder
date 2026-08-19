import React from "react";
import { Delete, CornerDownLeft } from "lucide-react";

interface VirtualKeyboardProps {
  onChar: (char: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  targetWord?: string;
  lang?: "en" | "cs";
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
];

const CZECH_ACCENTS_ROW = ["Á", "Č", "Ď", "É", "Ě", "Í", "Ň", "Ó", "Ř", "Š", "Ť", "Ú", "Ů", "Ý", "Ž"];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onChar,
  onEnter,
  onDelete,
  targetWord = "POOP",
  lang = "en",
}) => {
  const targetChars = new Set(targetWord.toUpperCase().split(""));

  const handleClick = (key: string) => {
    if (key === "ENTER") {
      onEnter();
    } else if (key === "BACKSPACE") {
      onDelete();
    } else {
      onChar(key);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-1 sm:px-2 pt-1 pb-3 select-none touch-manipulation">
      <div className="flex flex-col gap-1.5 items-center">
        {/* Czech Diacritics Row */}
        {lang === "cs" && (
          <div className="flex gap-1 w-full justify-center overflow-x-auto py-0.5 scrollbar-none px-1">
            {CZECH_ACCENTS_ROW.map((key) => {
              const isTargetChar = targetChars.has(key);
              return (
                <button
                  key={`cz-${key}`}
                  type="button"
                  onClick={() => handleClick(key)}
                  className={`h-9 px-1.5 sm:px-2 min-w-[24px] sm:min-w-[32px] flex items-center justify-center font-bold text-xs sm:text-sm rounded-md active:scale-95 transition-all cursor-pointer select-none touch-manipulation ${
                    isTargetChar
                      ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50"
                      : "bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60"
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        )}

        {/* Standard Keyboard Rows */}
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={`row-${rowIdx}`} className="flex gap-1 sm:gap-1.5 w-full justify-center">
            {row.map((key) => {
              if (key === "ENTER") {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleClick(key)}
                    className="flex-[1.5] h-11 sm:h-12 flex items-center justify-center font-bold text-xs sm:text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow transition-all cursor-pointer select-none touch-manipulation"
                    aria-label="Enter guess"
                  >
                    <span className="hidden sm:inline">ENTER</span>
                    <CornerDownLeft className="sm:hidden" size={16} />
                  </button>
                );
              }

              if (key === "BACKSPACE") {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleClick(key)}
                    className="flex-[1.5] h-11 sm:h-12 flex items-center justify-center font-bold rounded-lg bg-zinc-700 hover:bg-zinc-600 active:scale-95 text-zinc-200 shadow transition-all cursor-pointer select-none touch-manipulation"
                    aria-label="Backspace"
                  >
                    <Delete size={18} />
                  </button>
                );
              }

              const isTargetChar = targetChars.has(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleClick(key)}
                  className={`flex-1 h-11 sm:h-12 flex items-center justify-center font-semibold text-base sm:text-lg rounded-lg active:scale-95 transition-all cursor-pointer select-none touch-manipulation ${
                    isTargetChar
                      ? "bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60"
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
