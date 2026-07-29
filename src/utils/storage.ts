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

export function setItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.warn(`[quiz-stack] Failed to save "${key}" to localStorage:`, e)
    return false
  }
}

export function removeItem(key: string): boolean {
  try {
    localStorage.removeItem(key)
    return true
  } catch (e) {
    console.warn(`[quiz-stack] Failed to remove "${key}" from localStorage:`, e)
    return false
  }
}
