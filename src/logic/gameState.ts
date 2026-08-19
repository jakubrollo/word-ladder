import { COMMON_START_WORDS, VALID_WORDS_SET } from "./wordList";
import { findShortestPath, getNeighbors } from "./solver";

export type GameMode = "daily" | "unlimited" | "custom";

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  parOrBetter: number;
  distribution: Record<number, number>; // step count -> frequency
  dailyCompleted: Record<string, { steps: number; par: number; won: boolean; path: string[]; startWord: string; targetWord: string }>;
}

export interface PuzzleInfo {
  id: string;
  puzzleNumber: number;
  startWord: string;
  targetWord: string;
  par: number;
  optimalPath: string[];
}

const LAUNCH_EPOCH = new Date(2025, 0, 1).getTime(); // Jan 1, 2025
const STATS_STORAGE_KEY = "word_ladder_game_stats_v2";
const commonWordSet = new Set(COMMON_START_WORDS);

/**
 * Returns formatted local date YYYY-MM-DD.
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Pseudo-random generator based on integer seed.
 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Finds all familiar target words reachable from startWord within [minDist, maxDist] steps.
 */
export function findReachableTargets(
  startWord: string,
  minDist: number = 3,
  maxDist: number = 6
): Array<{ word: string; dist: number; path: string[] }> {
  const start = startWord.toUpperCase();
  const queue: Array<{ word: string; path: string[] }> = [{ word: start, path: [start] }];
  const visited = new Set<string>([start]);
  const reachable: Array<{ word: string; dist: number; path: string[] }> = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = current.path.length - 1;

    if (currentDist > maxDist) break;

    if (currentDist >= minDist && commonWordSet.has(current.word) && current.word !== start) {
      reachable.push({ word: current.word, dist: currentDist, path: current.path });
    }

    const nbrs = getNeighbors(current.word, VALID_WORDS_SET);
    for (const nbr of nbrs) {
      if (!visited.has(nbr)) {
        visited.add(nbr);
        queue.push({ word: nbr, path: [...current.path, nbr] });
      }
    }
  }

  return reachable;
}

/**
 * Generates the daily challenge puzzle for today (or a specific date).
 * Changes both start AND target word deterministically every day!
 */
export function getDailyPuzzle(dateStr: string = getTodayDateString()): PuzzleInfo {
  const today = new Date(dateStr + "T00:00:00");
  const diffTime = today.getTime() - LAUNCH_EPOCH;
  const dayIndex = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  const puzzleNumber = dayIndex + 1;

  const rng = seededRandom(dayIndex * 9973 + 4391);

  // Pick start word deterministically
  const startIndex = Math.floor(rng() * COMMON_START_WORDS.length);
  let startWord = COMMON_START_WORDS[startIndex] || "BOAT";

  // Find reachable targets at distance 3 to 5
  const targets = findReachableTargets(startWord, 3, 5);
  let chosenTarget = "COOP";
  let optimalPath = [startWord, "COAT", "CHAT", "CHOP", "COOP"];
  let par = 4;

  if (targets.length > 0) {
    const targetIndex = Math.floor(rng() * targets.length);
    const chosen = targets[targetIndex];
    chosenTarget = chosen.word;
    optimalPath = chosen.path;
    par = chosen.dist;
  } else {
    // Fallback known pair
    const fallbackPath = findShortestPath("BOAT", "COOP") || ["BOAT", "COOP"];
    startWord = "BOAT";
    chosenTarget = "COOP";
    optimalPath = fallbackPath;
    par = fallbackPath.length - 1;
  }

  return {
    id: `daily-${dateStr}`,
    puzzleNumber,
    startWord,
    targetWord: chosenTarget,
    par,
    optimalPath,
  };
}

/**
 * Generates a fresh random puzzle with dynamic start and target words for Unlimited mode.
 */
export function getRandomPuzzle(minPar: number = 3, maxPar: number = 5): PuzzleInfo {
  for (let attempt = 0; attempt < 30; attempt++) {
    const randIndex = Math.floor(Math.random() * COMMON_START_WORDS.length);
    const startWord = COMMON_START_WORDS[randIndex];

    const targets = findReachableTargets(startWord, minPar, maxPar);
    if (targets.length > 0) {
      const chosen = targets[Math.floor(Math.random() * targets.length)];
      return {
        id: `unlimited-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        puzzleNumber: Math.floor(Math.random() * 9000) + 1000,
        startWord,
        targetWord: chosen.word,
        par: chosen.dist,
        optimalPath: chosen.path,
      };
    }
  }

  // Fallback
  const path = findShortestPath("BOAT", "COOP") || ["BOAT", "COOP"];
  return {
    id: `unlimited-${Date.now()}`,
    puzzleNumber: 999,
    startWord: "BOAT",
    targetWord: "COOP",
    par: path.length - 1,
    optimalPath: path,
  };
}

/**
 * Creates a custom puzzle from user input.
 */
export function getCustomPuzzle(startWord: string, targetWord: string): PuzzleInfo | null {
  const s = startWord.toUpperCase().trim();
  const t = targetWord.toUpperCase().trim();
  if (s.length !== 4 || t.length !== 4) return null;

  const path = findShortestPath(s, t);
  if (!path) return null;

  return {
    id: `custom-${s}-${t}`,
    puzzleNumber: 0,
    startWord: s,
    targetWord: t,
    par: path.length - 1,
    optimalPath: path,
  };
}

/**
 * Loads statistics from localStorage.
 */
export function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load stats", e);
  }

  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    parOrBetter: 0,
    distribution: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
    dailyCompleted: {},
  };
}

/**
 * Saves statistics to localStorage.
 */
export function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error("Failed to save stats", e);
  }
}

/**
 * Record a completed game into stats.
 */
export function recordGameWin(
  stats: GameStats,
  mode: GameMode,
  puzzle: PuzzleInfo,
  path: string[]
): GameStats {
  const steps = path.length - 1;
  const isDaily = mode === "daily";
  const dateStr = getTodayDateString();

  if (isDaily && stats.dailyCompleted[dateStr]) {
    return stats;
  }

  const newPlayed = stats.gamesPlayed + 1;
  const newWon = stats.gamesWon + 1;
  const newStreak = stats.currentStreak + 1;
  const newMaxStreak = Math.max(stats.maxStreak, newStreak);
  const newParOrBetter = steps <= puzzle.par ? stats.parOrBetter + 1 : stats.parOrBetter;

  const newDist = { ...stats.distribution };
  newDist[steps] = (newDist[steps] || 0) + 1;

  const newDaily = { ...stats.dailyCompleted };
  if (isDaily) {
    newDaily[dateStr] = {
      steps,
      par: puzzle.par,
      won: true,
      path,
      startWord: puzzle.startWord,
      targetWord: puzzle.targetWord,
    };
  }

  const updated: GameStats = {
    gamesPlayed: newPlayed,
    gamesWon: newWon,
    currentStreak: newStreak,
    maxStreak: newMaxStreak,
    parOrBetter: newParOrBetter,
    distribution: newDist,
    dailyCompleted: newDaily,
  };

  saveStats(updated);
  return updated;
}

/**
 * Generates formatted share text for clipboard.
 */
export function generateShareText(
  mode: GameMode,
  puzzle: PuzzleInfo,
  path: string[]
): string {
  const steps = path.length - 1;
  const parDiff = steps - puzzle.par;
  let parRemark = "";
  if (parDiff < 0) parRemark = ` 🔥 ${Math.abs(parDiff)} under Par!`;
  else if (parDiff === 0) parRemark = ` ⭐ Par Match!`;
  else parRemark = ` (+${parDiff} over Par)`;

  const title = mode === "daily" ? `Word Ladder #${puzzle.puzzleNumber}` : `Word Ladder Unlimited`;
  const route = `${puzzle.startWord} ➔ ${puzzle.targetWord}`;
  const scoreLine = `Steps: ${steps} | Par: ${puzzle.par}${parRemark}`;

  const ladderRows: string[] = [];
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const rowEmojis: string[] = [];
    for (let c = 0; c < 4; c++) {
      if (curr[c] === prev[c]) {
        rowEmojis.push("🟩");
      } else {
        rowEmojis.push("🟨");
      }
    }
    ladderRows.push(rowEmojis.join(""));
  }

  return `${title}\n${route}\n${scoreLine}\n${ladderRows.join("\n")}\n\nhttps://jakubrollo.github.io/poople.html`;
}

// -------------------------------------------------------------
// Web Audio Sound Synthesizer
// -------------------------------------------------------------
class SoundEffects {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playKey() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440 + Math.random() * 40, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {
      // Ignore audio errors
    }
  }

  playStep() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.14);
    } catch {
      // Ignore audio errors
    }
  }

  playError() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // Ignore audio errors
    }
  }

  playWin() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.09, this.ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + i * 0.1);
        osc.stop(this.ctx.currentTime + i * 0.1 + 0.35);
      });
    } catch {
      // Ignore audio errors
    }
  }
}

export const sounds = new SoundEffects();
