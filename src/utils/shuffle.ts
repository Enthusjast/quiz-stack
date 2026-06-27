/**
 * Seeded pseudo-random number generator (mulberry32).
 * For deterministic shuffles when needed.
 */
export function mulberry32(seed: number): () => number {
  return () => {
    let s = seed | 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    seed = s
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Fisher-Yates shuffle (in-place).
 * Returns a new array; does not mutate the original.
 */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Shuffle the choices within a problem while tracking the correct answer.
 * Returns { shuffledChoices, mappedAnswer } where mappedAnswer points
 * to the new correct index/indices.
 */
export function shuffleChoices<T extends string>(
  choices: T[],
  answer: number | number[],
  rng: () => number = Math.random
): { shuffledChoices: T[]; mappedAnswer: number | number[] } {
  // Build index mapping: old index -> new position
  const indices = choices.map((_, i) => i)
  const shuffledIndices = shuffle(indices, rng)

  // Build reverse mapping: old position -> new index
  const oldToNew = new Map<number, number>()
  shuffledIndices.forEach((oldIdx, newIdx) => oldToNew.set(oldIdx, newIdx))

  const shuffledChoices = shuffledIndices.map((i) => choices[i])

  const mappedAnswer = Array.isArray(answer)
    ? answer.map((a) => oldToNew.get(a)!)
    : oldToNew.get(answer)!

  return { shuffledChoices, mappedAnswer }
}