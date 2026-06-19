/**
 * Simple string hash (for deduplication).
 */
export function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Format elapsed seconds into MM:SS display.
 */
export function formatTime(totalSeconds: number): string {
  const min = Math.floor(totalSeconds / 60)
  const sec = totalSeconds % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/**
 * Deep copy via structuredClone (available in all modern browsers).
 */
export function deepCopy<T>(value: T): T {
  return structuredClone(value)
}