import React from "react";
import { Delete, CornerDownLeft } from "lucide-react";

interface VirtualKeyboardProps {
  onChar: (char: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  targetWord?: string;
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onChar,
  onEnter,
  onDelete,
  targetWord = "POOP",
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
    <div className="w-full max-w-lg mx-auto px-1 sm:px-2 pt-2 pb-3 select-none">
      <div className="flex flex-col gap-1.5 items-center">
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={`row-${rowIdx}`} className="flex gap-1 sm:gap-1.5 w-full justify-center">
            {row.map((key) => {
              if (key === "ENTER") {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleClick(key)}
                    className="flex-[1.5] h-12 sm:h-13 flex items-center justify-center font-bold text-xs sm:text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow transition-all cursor-pointer"
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
                    className="flex-[1.5] h-12 sm:h-13 flex items-center justify-center font-bold rounded-lg bg-zinc-700 hover:bg-zinc-600 active:scale-95 text-zinc-200 shadow transition-all cursor-pointer"
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
                  className={`flex-1 h-12 sm:h-13 flex items-center justify-center font-semibold text-base sm:text-lg rounded-lg active:scale-95 transition-all cursor-pointer ${
                    isTargetChar
                      ? "bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30"
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
