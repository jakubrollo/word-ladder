import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  HelpCircle,
  Trophy,
  Volume2,
  VolumeX,
  Undo2,
  Lightbulb,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Calendar,
  Infinity as InfinityIcon,
  Sliders,
  Compass,
  Keyboard,
  Smartphone,
} from "lucide-react";
import { LadderBoard } from "./components/LadderBoard";
import { VirtualKeyboard } from "./components/VirtualKeyboard";
import { WordVerifier } from "./components/WordVerifier";
import { HowToPlayModal } from "./components/HowToPlayModal";
import { StatsModal } from "./components/StatsModal";
import { WinModal } from "./components/WinModal";
import { CustomGameModal } from "./components/CustomGameModal";
import { getValidWordsSet } from "./logic/wordList";
import { validateGuess, getNextHint, calculatePar } from "./logic/solver";
import type { GameMode, PuzzleInfo, GameStats } from "./logic/gameState";
import {
  getDailyPuzzle,
  getRandomPuzzle,
  loadStats,
  recordGameWin,
  sounds,
  getTodayDateString,
} from "./logic/gameState";

// Mini confetti particle system on canvas
function launchConfetti(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rot: number;
    vRot: number;
  }> = [];

  const colors = ["#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#8B5CF6", "#FBBF24"];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 100,
      y: canvas.height * 0.4 + (Math.random() - 0.5) * 50,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 1.2) * 12,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
    });
  }

  let frame = 0;
  function render() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.rot += p.vRot;
      if (p.y < canvas.height) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    }

    frame++;
    if (alive && frame < 180) {
      requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(render);
}

export default function App() {
  const [lang, setLang] = useState<"en" | "cs">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("portfolio-language") as "en" | "cs") || "cs";
    }
    return "cs";
  });

  const [mode, setMode] = useState<GameMode>("daily");
  const [puzzle, setPuzzle] = useState<PuzzleInfo>(() => getDailyPuzzle(lang));
  const [path, setPath] = useState<string[]>([puzzle.startWord]);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [isWon, setIsWon] = useState<boolean>(false);
  const [shakeRow, setShakeRow] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<GameStats>(() => loadStats());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [mobileVerifierOpen, setMobileVerifierOpen] = useState<boolean>(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState<boolean>(false);
  const [winGameData, setWinGameData] = useState<{ puzzle: PuzzleInfo; path: string[]; mode: GameMode } | null>(null);

  // Modals
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [showWin, setShowWin] = useState<boolean>(false);
  const [showCustom, setShowCustom] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync language with portfolio setting
  useEffect(() => {
    localStorage.setItem("portfolio-language", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // Load / initialize game state ONLY on language change
  useEffect(() => {
    if (mode === "daily") {
      const todayDaily = getDailyPuzzle(lang);
      setPuzzle(todayDaily);

      // Check if already won today in stats
      const todayKey = `${lang}-${getTodayDateString()}`;
      const savedDaily = stats.dailyCompleted[todayKey] || stats.dailyCompleted[getTodayDateString()];
      if (savedDaily && savedDaily.won && savedDaily.startWord === todayDaily.startWord) {
        setPath(savedDaily.path);
        setIsWon(true);
      } else {
        setPath([todayDaily.startWord]);
        setIsWon(false);
      }
      setCurrentInput("");
      setErrorMessage(null);
    } else if (mode === "unlimited") {
      const nextPuz = getRandomPuzzle(lang, 3, 5);
      setPuzzle(nextPuz);
      setPath([nextPuz.startWord]);
      setCurrentInput("");
      setIsWon(false);
      setErrorMessage(null);
    }
  }, [lang]);

  // Handle sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
  };

  // Switch to Unlimited mode
  const startUnlimited = useCallback(() => {
    const nextPuz = getRandomPuzzle(lang, 3, 5);
    setMode("unlimited");
    setPuzzle(nextPuz);
    setPath([nextPuz.startWord]);
    setCurrentInput("");
    setIsWon(false);
    setErrorMessage(null);
    setShowWin(false);
    setWinGameData(null);
  }, [lang]);

  // Switch to Daily mode
  const startDaily = useCallback(() => {
    const daily = getDailyPuzzle(lang);
    setMode("daily");
    setPuzzle(daily);

    const todayKey = `${lang}-${getTodayDateString()}`;
    const saved = stats.dailyCompleted[todayKey] || stats.dailyCompleted[getTodayDateString()];
    if (saved && saved.won && saved.startWord === daily.startWord) {
      setPath(saved.path);
      setIsWon(true);
    } else {
      setPath([daily.startWord]);
      setIsWon(false);
    }
    setCurrentInput("");
    setErrorMessage(null);
    setShowWin(false);
    setWinGameData(null);
  }, [lang, stats.dailyCompleted]);

  // Switch to Custom Puzzle
  const startCustom = useCallback((customPuz: PuzzleInfo) => {
    setMode("custom");
    setPuzzle(customPuz);
    setPath([customPuz.startWord]);
    setCurrentInput("");
    setIsWon(false);
    setErrorMessage(null);
    setShowWin(false);
    setWinGameData(null);
  }, []);

  // Trigger error shake & toast
  const triggerError = (msg: string) => {
    sounds.playError();
    setErrorMessage(msg);
    setShakeRow(true);
    setTimeout(() => setShakeRow(false), 400);
    setTimeout(() => setErrorMessage(null), 2500);
  };

  // Submit word guess
  const playWord = useCallback(
    (wordToPlay: string) => {
      if (isWon) return;

      const upper = wordToPlay.toUpperCase().trim();
      if (upper.length !== 4) {
        triggerError(lang === "cs" ? "Slovo musí mít 4 písmena!" : "Must be a 4-letter word!");
        return;
      }

      const wordSet = getValidWordsSet(lang);
      const lastWord = path[path.length - 1];
      const validation = validateGuess(upper, lastWord, path, wordSet);

      if (!validation.valid) {
        if (validation.reason === "NOT_IN_DICTIONARY") {
          triggerError(lang === "cs" ? `'${upper}' není v českém slovníku!` : `'${upper}' is not in dictionary!`);
        } else if (validation.reason === "NOT_ONE_LETTER_DIFF") {
          triggerError(lang === "cs" ? `Musíš změnit přesně 1 písmeno od '${lastWord}'!` : `Must change exactly 1 letter from '${lastWord}'!`);
        } else {
          triggerError(lang === "cs" ? "Neplatný tah!" : "Invalid move!");
        }
        return;
      }

      // Valid step! Compute direction delta
      const prevDist = calculatePar(lastWord, puzzle.targetWord, wordSet);
      const newDist = calculatePar(upper, puzzle.targetWord, wordSet);
      const delta = newDist - prevDist;
      sounds.playStep(delta);

      const newPath = [...path, upper];
      setPath(newPath);
      setCurrentInput("");
      setErrorMessage(null);

      // Check Win Condition
      if (upper === puzzle.targetWord) {
        sounds.playWin();
        setIsWon(true);
        launchConfetti(canvasRef.current);
        setWinGameData({ puzzle, path: newPath, mode });
        const updatedStats = recordGameWin(stats, mode, puzzle, newPath);
        setStats(updatedStats);
        setTimeout(() => setShowWin(true), 600);
      }
    },
    [isWon, lang, mode, path, puzzle, stats]
  );

  // Submit from current typed input
  const handleEnter = useCallback(() => {
    playWord(currentInput);
  }, [currentInput, playWord]);

  // Handle typing letter
  const handleChar = useCallback(
    (char: string) => {
      if (isWon) return;
      if (currentInput.length < 4) {
        sounds.playKey();
        setCurrentInput((prev) => prev + char.toUpperCase());
        setErrorMessage(null);
      }
    },
    [currentInput.length, isWon]
  );

  // Handle backspace
  const handleDelete = useCallback(() => {
    if (isWon) return;
    if (currentInput.length > 0) {
      sounds.playKey();
      setCurrentInput((prev) => prev.slice(0, -1));
      setErrorMessage(null);
    }
  }, [currentInput.length, isWon]);

  // Undo last step
  const handleUndo = useCallback(() => {
    if (isWon || path.length <= 1) return;
    sounds.playKey();
    setPath((prev) => prev.slice(0, -1));
    setCurrentInput("");
    setErrorMessage(null);
  }, [isWon, path.length]);

  // Restart current puzzle
  const handleRestart = useCallback(() => {
    if (isWon) return;
    setPath([puzzle.startWord]);
    setCurrentInput("");
    setErrorMessage(null);
  }, [isWon, puzzle.startWord]);

  // Hint button: Provides optimal next step
  const handleHint = useCallback(() => {
    if (isWon) return;
    const currentWord = path[path.length - 1];
    const wordSet = getValidWordsSet(lang);
    const hint = getNextHint(currentWord, puzzle.targetWord, wordSet);
    if (!hint) {
      triggerError(lang === "cs" ? "Z této pozice nelze dosáhnout cíle, zkus vrátit krok (Undo)!" : "No path from here, try Undo!");
      return;
    }

    setCurrentInput(hint.nextWord);
    setErrorMessage(
      lang === "cs"
        ? `Nápověda: Zkus '${hint.nextWord}' (posune tě o krok blíž)`
        : `Hint: Try '${hint.nextWord}' (takes you 1 step closer)`
    );
  }, [isWon, lang, path, puzzle.targetWord]);

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Don't capture when typing inside the WordVerifier text input
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (showHowToPlay || showStats || showWin || showCustom) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Enter") {
        e.preventDefault();
        handleEnter();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      } else if (/^[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]$/u.test(e.key)) {
        e.preventDefault();
        handleChar(e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleChar, handleDelete, handleEnter, handleUndo, showCustom, showHowToPlay, showStats, showWin]);

  const currentLadderWord = path[path.length - 1];

  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex flex-col justify-between relative overflow-x-hidden font-sans">
      {/* Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-40"
        aria-hidden="true"
      />

      {/* Top Navbar */}
      <header className="w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30 px-2.5 sm:px-6 py-2 flex items-center justify-between gap-1.5 touch-manipulation">
        {/* Left: Back to Portfolio */}
        <a
          href="https://jakubrollo.github.io/"
          className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition px-2 py-1.5 rounded-lg hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700 shrink-0"
          title={lang === "cs" ? "Zpět na portfolio" : "Portfolio"}
        >
          <ArrowLeft size={16} />
          <span className="hidden md:inline">{lang === "cs" ? "Portfolio" : "Portfolio"}</span>
        </a>

        {/* Center: Brand & Mode Badges */}
        <div className="flex flex-col items-center min-w-0 flex-1 px-1">
          <div className="flex items-center gap-1.5">
            <h1 className="font-extrabold tracking-wider text-sm sm:text-base text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 truncate">
              WORD LADDER
            </h1>
            <span className="hidden sm:inline-block text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded">
              GRAPH
            </span>
          </div>

          <div className="text-[10px] text-zinc-400 font-mono truncate max-w-full">
            {mode === "daily" && (
              <span>
                {lang === "cs" ? "Denní" : "Daily"} #{puzzle.puzzleNumber}: <span className="text-white font-bold">{puzzle.startWord}</span> ➔ <span className="text-amber-400 font-bold">{puzzle.targetWord}</span>
              </span>
            )}
            {mode === "unlimited" && (
              <span>
                {lang === "cs" ? "Trénink" : "Practice"}: <span className="text-white font-bold">{puzzle.startWord}</span> ➔ <span className="text-amber-400 font-bold">{puzzle.targetWord}</span>
              </span>
            )}
            {mode === "custom" && (
              <span>
                {lang === "cs" ? "Vlastní" : "Custom"}: <span className="text-white font-bold">{puzzle.startWord}</span> ➔ <span className="text-amber-400 font-bold">{puzzle.targetWord}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions & Segmented Lang */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer touch-manipulation"
            aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
            title={soundEnabled ? "Mute" : "Unmute"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            type="button"
            onClick={() => setShowHowToPlay(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer touch-manipulation"
            aria-label="How to play"
            title="How to Play"
          >
            <HelpCircle size={16} />
          </button>

          <button
            type="button"
            onClick={() => setShowStats(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer touch-manipulation"
            aria-label="Statistics"
            title="Stats"
          >
            <Trophy size={16} />
          </button>

          {/* Segmented Lang Switcher - Mobile optimized */}
          <div className="flex items-center bg-zinc-900 border border-zinc-700/80 rounded-md p-0.5 text-[11px] font-mono font-bold">
            <button
              type="button"
              onClick={() => setLang("cs")}
              className={`px-1.5 py-0.5 rounded transition cursor-pointer touch-manipulation ${
                lang === "cs"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Čeština"
            >
              CZ
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-1.5 py-0.5 rounded transition cursor-pointer touch-manipulation ${
                lang === "en"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="English"
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Mode Selector Pill Bar */}
      <div className="w-full max-w-lg mx-auto px-4 pt-2 pb-1 flex items-center justify-center">
        <div className="flex items-center bg-zinc-950/90 border border-zinc-800 rounded-xl p-1 gap-1 w-full text-xs">
          <button
            type="button"
            onClick={startDaily}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === "daily"
                ? "bg-amber-500 text-zinc-950 font-bold shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Calendar size={13} />
            <span>{lang === "cs" ? "Denní výzva" : "Daily"}</span>
          </button>

          <button
            type="button"
            onClick={startUnlimited}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === "unlimited"
                ? "bg-amber-500 text-zinc-950 font-bold shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <InfinityIcon size={13} />
            <span>{lang === "cs" ? "Trénink" : "Unlimited"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === "custom"
                ? "bg-amber-500 text-zinc-950 font-bold shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sliders size={13} />
            <span>{lang === "cs" ? "Vlastní" : "Custom"}</span>
          </button>
        </div>
      </div>

      {/* Main Game Layout: Side-by-side on desktop, stacked on mobile */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-2 sm:px-4 py-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4">
        {/* Left / Primary Area: Distance Elevation Ladder Board */}
        <div className="w-full max-w-xl flex flex-col items-center">
          <LadderBoard
            startWord={puzzle.startWord}
            targetWord={puzzle.targetWord}
            path={path}
            currentInput={currentInput}
            isWon={isWon}
            par={puzzle.par}
            shakeRow={shakeRow}
            errorMessage={errorMessage}
            onInputChange={setCurrentInput}
            onSubmitGuess={handleEnter}
            lang={lang}
          />

          {/* Mobile Verifier Toggle Button */}
          <div className="lg:hidden w-full px-4 mt-1">
            <button
              type="button"
              onClick={() => setMobileVerifierOpen((prev) => !prev)}
              className="w-full py-2 px-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition"
            >
              <Compass size={14} className="text-amber-400" />
              <span>
                {mobileVerifierOpen
                  ? lang === "cs"
                    ? "Skrýt ověřovač slovníku ▲"
                    : "Hide Word Verifier ▲"
                  : lang === "cs"
                  ? "Otevřít ověřovač slovníku ▼"
                  : "Open Word Verifier ▼"}
              </span>
            </button>
            {mobileVerifierOpen && (
              <div className="mt-2 animate-fadeIn">
                <WordVerifier
                  currentLadderWord={currentLadderWord}
                  ladderHistory={path}
                  onPlayWord={playWord}
                  lang={lang}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right / Desktop Sidebar: Word Verifier & Objective Card */}
        <div className="hidden lg:flex flex-col gap-3 w-72 lg:w-80 shrink-0 sticky top-16">
          {/* Mission Objective Card */}
          <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 shadow text-xs space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                {lang === "cs" ? "Cíl mise" : "Mission Goal"}
              </span>
              <span className="font-mono text-amber-400 font-bold">Par {puzzle.par}</span>
            </div>
            <div className="text-zinc-200 font-medium">
              {lang === "cs"
                ? `Proměň '${puzzle.startWord}' na '${puzzle.targetWord}' změnou 1 písmene v každém kroku.`
                : `Transform '${puzzle.startWord}' into '${puzzle.targetWord}' one letter at a time.`}
            </div>
            <div className="pt-1 text-[11px] text-zinc-400 border-t border-zinc-800/80 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span>↓</span> {lang === "cs" ? "Krok níže = přiblížení k cíli" : "Step below = closer to goal"}
              </div>
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span>→</span> {lang === "cs" ? "Vedle = stejná vzdálenost" : "Next to = same distance"}
              </div>
              <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span>↑</span> {lang === "cs" ? "Řádek výše = vzdálení od cíle" : "Line above = farther away"}
              </div>
            </div>
          </div>

          {/* Word Verifier Widget */}
          <WordVerifier
            currentLadderWord={currentLadderWord}
            ladderHistory={path}
            onPlayWord={playWord}
            lang={lang}
          />
        </div>
      </main>

      {/* Control Buttons (Undo / Hint / Reset / Keyboard Toggle) & Keyboard */}
      <footer className="w-full bg-zinc-950/90 border-t border-zinc-800/80 pt-1.5 pb-2 touch-manipulation">
        {/* QoL Helper Buttons */}
        <div className="w-full max-w-xl mx-auto px-3 flex items-center justify-between mb-1.5 text-xs text-zinc-400 gap-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={isWon || path.length <= 1}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-800 text-zinc-300 transition cursor-pointer touch-manipulation"
              title="Undo last move"
            >
              <Undo2 size={13} />
              <span>{lang === "cs" ? "Zpět" : "Undo"}</span>
            </button>

            <button
              type="button"
              onClick={handleHint}
              disabled={isWon}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 disabled:opacity-30 disabled:cursor-not-allowed border border-amber-800/60 text-amber-300 transition cursor-pointer touch-manipulation"
              title="Get optimal next hint"
            >
              <Lightbulb size={13} className="text-amber-400" />
              <span>{lang === "cs" ? "Nápověda" : "Hint"}</span>
            </button>

            <button
              type="button"
              onClick={handleRestart}
              disabled={isWon || path.length <= 1}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-800 text-zinc-300 transition cursor-pointer touch-manipulation"
              title="Restart puzzle"
            >
              <RotateCcw size={13} />
              <span>{lang === "cs" ? "Restart" : "Reset"}</span>
            </button>
          </div>

          {/* Virtual Keyboard Toggle for Mobile / Touch */}
          <button
            type="button"
            onClick={() => setShowVirtualKeyboard((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer touch-manipulation"
            title={showVirtualKeyboard ? "Use native phone keyboard" : "Show on-screen keyboard"}
          >
            {showVirtualKeyboard ? <Smartphone size={13} className="text-emerald-400" /> : <Keyboard size={13} />}
            <span>
              {showVirtualKeyboard
                ? lang === "cs"
                  ? "Klávesnice"
                  : "Native Keys"
                : lang === "cs"
                ? "Tlačítka"
                : "On-Screen"}
            </span>
          </button>
        </div>

        {/* On-screen Keyboard (optional on mobile, toggleable) */}
        {showVirtualKeyboard && (
          <VirtualKeyboard
            onChar={handleChar}
            onEnter={handleEnter}
            onDelete={handleDelete}
            targetWord={puzzle.targetWord}
            lang={lang}
          />
        )}
      </footer>

      {/* Modals */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        lang={lang}
      />

      <StatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        currentPuzzle={puzzle}
        currentPath={path}
        currentMode={mode}
        isWon={isWon}
        lang={lang}
      />

      <WinModal
        isOpen={showWin}
        onClose={() => setShowWin(false)}
        puzzle={winGameData?.puzzle || puzzle}
        userPath={winGameData?.path || path}
        mode={winGameData?.mode || mode}
        onNextPuzzle={startUnlimited}
        onSwitchToUnlimited={startUnlimited}
        lang={lang}
      />

      <CustomGameModal
        isOpen={showCustom}
        onClose={() => setShowCustom(false)}
        onStartCustom={startCustom}
        lang={lang}
      />
    </div>
  );
}
