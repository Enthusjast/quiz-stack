/**
 * Type-safe localStorage helpers with JSON serialization.
 */

export function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`[quiz-stack] Failed to save "${key}" to localStorage:`, e)
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.warn(`[quiz-stack] Failed to remove "${key}" from localStorage:`, e)
  }
}

/** Array-specific helper: append and deduplicate by key function */
export function appendUnique<T>(arr: T[], item: T, keyFn: (item: T) => string): T[] {
  const key = keyFn(item)
  if (arr.some((existing) => keyFn(existing) === key)) {
    return arr
  }
  return [...arr, item]
}