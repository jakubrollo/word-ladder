import { VALID_WORDS_SET } from "./wordList";

/**
 * Checks if two words have the same length and differ by exactly one letter.
 */
export function isOneLetterDiff(w1: string, w2: string): boolean {
  if (w1.length !== w2.length) return false;
  let diffCount = 0;
  for (let i = 0; i < w1.length; i++) {
    if (w1[i] !== w2[i]) {
      diffCount++;
      if (diffCount > 1) return false;
    }
  }
  return diffCount === 1;
}

/**
 * Returns the index (0..3) where two words differ, or -1 if they don't differ by exactly 1 letter.
 */
export function getDiffIndex(w1: string, w2: string): number {
  if (w1.length !== w2.length) return -1;
  let diffIndex = -1;
  let diffCount = 0;
  for (let i = 0; i < w1.length; i++) {
    if (w1[i] !== w2[i]) {
      diffCount++;
      diffIndex = i;
      if (diffCount > 1) return -1;
    }
  }
  return diffCount === 1 ? diffIndex : -1;
}

/**
 * Returns all valid 4-letter words in the dictionary that differ from `word` by 1 letter.
 */
export function getNeighbors(word: string, wordSet: ReadonlySet<string> = VALID_WORDS_SET): string[] {
  const neighbors: string[] = [];
  const upper = word.toUpperCase();
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (let i = 0; i < 4; i++) {
    const origChar = upper[i];
    for (let c = 0; c < 26; c++) {
      const ch = alphabet[c];
      if (ch === origChar) continue;
      const candidate = upper.slice(0, i) + ch + upper.slice(i + 1);
      if (wordSet.has(candidate)) {
        neighbors.push(candidate);
      }
    }
  }
  return neighbors;
}

/**
 * Finds the shortest path from startWord to targetWord using Breadth-First Search (BFS).
 * Returns array of words [start, ..., target] or null if no path exists.
 */
export function findShortestPath(
  startWord: string,
  targetWord: string,
  wordSet: ReadonlySet<string> = VALID_WORDS_SET
): string[] | null {
  const start = startWord.toUpperCase();
  const target = targetWord.toUpperCase();

  if (start === target) return [start];
  if (!wordSet.has(start) || !wordSet.has(target)) return null;

  const queue: Array<{ word: string; path: string[] }> = [{ word: start, path: [start] }];
  const visited = new Set<string>([start]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = getNeighbors(current.word, wordSet);

    for (const neighbor of neighbors) {
      if (neighbor === target) {
        return [...current.path, target];
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ word: neighbor, path: [...current.path, neighbor] });
      }
    }
  }

  return null;
}

/**
 * Calculates Par (the minimum number of single-letter steps from start to target).
 * Returns -1 if unreachable.
 */
export function calculatePar(
  startWord: string,
  targetWord: string,
  wordSet: ReadonlySet<string> = VALID_WORDS_SET
): number {
  const path = findShortestPath(startWord, targetWord, wordSet);
  if (!path) return -1;
  return path.length - 1;
}

export interface HintResult {
  nextWord: string;
  changedIndex: number;
  newLetter: string;
  remainingSteps: number;
}

/**
 * Provides an optimal next step hint from the current word towards targetWord.
 */
export function getNextHint(
  currentWord: string,
  targetWord: string,
  wordSet: ReadonlySet<string> = VALID_WORDS_SET
): HintResult | null {
  const path = findShortestPath(currentWord, targetWord, wordSet);
  if (!path || path.length < 2) return null;

  const nextWord = path[1];
  const changedIndex = getDiffIndex(currentWord, nextWord);
  const newLetter = nextWord[changedIndex];

  return {
    nextWord,
    changedIndex,
    newLetter,
    remainingSteps: path.length - 1,
  };
}

/**
 * Returns all valid 1-letter neighbors of currentWord that decrease the distance to target (delta === -1).
 */
export function getAllOptimalNextMoves(
  currentWord: string,
  targetWord: string,
  wordSet: ReadonlySet<string> = VALID_WORDS_SET
): string[] {
  const currentDist = calculatePar(currentWord, targetWord, wordSet);
  if (currentDist <= 0) return [];

  const neighbors = getNeighbors(currentWord, wordSet);
  return neighbors.filter((nbr) => calculatePar(nbr, targetWord, wordSet) === currentDist - 1);
}

export interface ValidationResult {
  valid: boolean;
  reason?: "NOT_4_LETTERS" | "NOT_IN_DICTIONARY" | "NOT_ONE_LETTER_DIFF";
}

/**
 * Validates whether a guess is valid according to Word Ladder rules.
 * Allows repeating previously written words (e.g. HERO -> HERB -> HERO).
 */
export function validateGuess(
  guess: string,
  previousWord: string,
  _history?: string[],
  wordSet: ReadonlySet<string> = VALID_WORDS_SET
): ValidationResult {
  const upper = guess.toUpperCase().trim();
  if (upper.length !== 4) {
    return { valid: false, reason: "NOT_4_LETTERS" };
  }
  if (!wordSet.has(upper)) {
    return { valid: false, reason: "NOT_IN_DICTIONARY" };
  }
  if (!isOneLetterDiff(previousWord, upper)) {
    return { valid: false, reason: "NOT_ONE_LETTER_DIFF" };
  }
  return { valid: true };
}

export interface StepDistanceInfo {
  word: string;
  distance: number;
  delta: number; // -1 (closer / down), 0 (same / neutral), +1 (farther / up)
  stepIndex: number;
  changedIndex: number;
}

/**
 * Computes the distance to target and delta (direction) for each step in a path.
 */
export function getPathDistanceInfo(
  path: string[],
  targetWord: string,
  wordSet: ReadonlySet<string> = VALID_WORDS_SET
): StepDistanceInfo[] {
  return path.map((word, index) => {
    const dist = calculatePar(word, targetWord, wordSet);
    const prevWord = index > 0 ? path[index - 1] : word;
    const prevDist = index > 0 ? calculatePar(prevWord, targetWord, wordSet) : dist;
    const changedIndex = index > 0 ? getDiffIndex(prevWord, word) : -1;

    return {
      word,
      distance: dist,
      delta: index === 0 ? 0 : dist - prevDist,
      stepIndex: index,
      changedIndex,
    };
  });
}

