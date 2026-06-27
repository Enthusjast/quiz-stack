import { ref, computed } from 'vue'
import { getItem, setItem } from '@/utils/storage'
import { hashCode } from '@/utils/format'
import type { Problem } from '@/types/problem'

const STORAGE_KEY = 'quiz-stack-wrong-problems'

/** Global wrong-problem list (singleton across the app). */
const wrongProblems = ref<Problem[]>(getItem<Problem[]>(STORAGE_KEY, []))

function problemKey(p: Problem): string {
  return String(hashCode(p.content))
}

export function useWrongProblems() {
  const count = computed(() => wrongProblems.value.length)

  /** Add a problem to the wrong list (deduplicated by content hash). */
  function addWrong(problem: Problem) {
    const key = problemKey(problem)
    if (wrongProblems.value.some((p) => problemKey(p) === key)) {
      return
    }
    wrongProblems.value = [...wrongProblems.value, problem]
    setItem(STORAGE_KEY, wrongProblems.value)
  }

  /** Remove a problem from the wrong list. */
  function removeWrong(problem: Problem) {
    const key = problemKey(problem)
    wrongProblems.value = wrongProblems.value.filter((p) => problemKey(p) !== key)
    setItem(STORAGE_KEY, wrongProblems.value)
  }

  /** Clear all wrong problems. */
  function clearAll() {
    wrongProblems.value = []
    setItem(STORAGE_KEY, wrongProblems.value)
  }

  /** Export wrong problems as a downloadable JSON file. */
  function exportJSON() {
    const data = JSON.stringify(wrongProblems.value, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quiz-stack-wrong-problems.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Import wrong problems from a JSON file. */
  function importJSON(file: File): Promise<{ success: boolean; count: number }> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string)
          if (!Array.isArray(parsed)) {
            resolve({ success: false, count: 0 })
            return
          }
          for (const item of parsed) {
            if (item.type && item.content) {
              addWrong(item as Problem)
            }
          }
          resolve({ success: true, count: wrongProblems.value.length })
        } catch {
          resolve({ success: false, count: 0 })
        }
      }
      reader.readAsText(file)
    })
  }

  return {
    wrongProblems,
    count,
    addWrong,
    removeWrong,
    clearAll,
    exportJSON,
    importJSON,
  }
}