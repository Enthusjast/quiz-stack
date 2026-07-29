import { ref, computed } from 'vue'
import { getItem, setItem } from '@/utils/storage'
import type { Problem } from '@/types/problem'
import { isProblem, problemFingerprint } from '@/utils/problem'

const STORAGE_KEY = 'quiz-stack-wrong-problems'
const WRONG_PROBLEMS_EXPORT_VERSION = 1
export const MAX_WRONG_PROBLEMS_IMPORT_BYTES = 5 * 1024 * 1024
export const MAX_WRONG_PROBLEMS_IMPORT_COUNT = 5000

export interface WrongProblemsImportResult {
  success: boolean
  count: number
  error?: string
}

function problemKey(p: Problem): string {
  return problemFingerprint(p)
}

function normalizeProblems(value: unknown): Problem[] {
  if (!Array.isArray(value)) return []
  const result: Problem[] = []
  const keys = new Set<string>()
  for (const candidate of value) {
    if (!isProblem(candidate)) continue
    const key = problemKey(candidate)
    if (keys.has(key)) continue
    keys.add(key)
    result.push(candidate)
  }
  return result
}

/** Global wrong-problem list (singleton across the app). */
const wrongProblems = ref<Problem[]>(normalizeProblems(getItem<unknown>(STORAGE_KEY, [])))

function persist(next: Problem[]): boolean {
  if (!setItem(STORAGE_KEY, next)) return false
  wrongProblems.value = next
  return true
}

export function useWrongProblems() {
  const count = computed(() => wrongProblems.value.length)

  /** Add multiple problems with one atomic storage write. */
  function addManyWrong(problems: readonly Problem[]): boolean {
    const keys = new Set(wrongProblems.value.map(problemKey))
    const next = [...wrongProblems.value]
    for (const problem of problems) {
      const key = problemKey(problem)
      if (keys.has(key)) continue
      keys.add(key)
      next.push(problem)
    }
    if (next.length === wrongProblems.value.length) return true
    return persist(next)
  }

  /** Add a problem to the wrong list (deduplicated by its complete stable identity). */
  function addWrong(problem: Problem): boolean {
    return addManyWrong([problem])
  }

  /** Remove a problem from the wrong list. */
  function removeWrong(problem: Problem): boolean {
    return removeManyWrong([problem])
  }

  /** Remove multiple problems with one atomic storage write. */
  function removeManyWrong(problems: readonly Problem[]): boolean {
    if (problems.length === 0) return true
    const keys = new Set(problems.map(problemKey))
    const next = wrongProblems.value.filter((problem) => !keys.has(problemKey(problem)))
    if (next.length === wrongProblems.value.length) return true
    return persist(next)
  }

  /** Clear all wrong problems. */
  function clearAll(): boolean {
    return persist([])
  }

  /** Export wrong problems as a downloadable JSON file. */
  function exportJSON() {
    const data = JSON.stringify({
      schemaVersion: WRONG_PROBLEMS_EXPORT_VERSION,
      exportedAt: Date.now(),
      problems: wrongProblems.value,
    }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quiz-stack-wrong-problems.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Import wrong problems from a JSON file. */
  function importJSON(file: File): Promise<WrongProblemsImportResult> {
    if (file.size > MAX_WRONG_PROBLEMS_IMPORT_BYTES) {
      return Promise.resolve({
        success: false,
        count: wrongProblems.value.length,
        error: '文件过大，错题导入文件不能超过 5 MB。',
      })
    }

    return new Promise((resolve) => {
      let reader: FileReader
      try {
        reader = new FileReader()
      } catch {
        resolve({ success: false, count: wrongProblems.value.length, error: '当前浏览器无法读取所选文件。' })
        return
      }
      reader.onload = () => {
        try {
          if (typeof reader.result !== 'string') {
            resolve({ success: false, count: wrongProblems.value.length, error: '文件读取失败，请重试。' })
            return
          }

          const parsed: unknown = JSON.parse(reader.result)
          let imported: unknown

          // Raw arrays are accepted for backward compatibility with earlier exports.
          if (Array.isArray(parsed)) {
            imported = parsed
          } else if (typeof parsed === 'object' && parsed !== null && 'schemaVersion' in parsed) {
            if (parsed.schemaVersion !== WRONG_PROBLEMS_EXPORT_VERSION) {
              resolve({ success: false, count: wrongProblems.value.length, error: '不支持此错题文件版本。' })
              return
            }
            if ('problems' in parsed) imported = parsed.problems
          }

          if (!Array.isArray(imported)) {
            resolve({ success: false, count: wrongProblems.value.length, error: '文件内容不是有效的错题数据。' })
            return
          }
          if (imported.length > MAX_WRONG_PROBLEMS_IMPORT_COUNT) {
            resolve({ success: false, count: wrongProblems.value.length, error: '题目过多，单次最多导入 5000 道错题。' })
            return
          }
          if (!imported.every(isProblem)) {
            resolve({ success: false, count: wrongProblems.value.length, error: '文件包含格式无效的题目。' })
            return
          }

          const keys = new Set(wrongProblems.value.map(problemKey))
          const next = [...wrongProblems.value]
          for (const problem of imported) {
            const key = problemKey(problem)
            if (!keys.has(key)) {
              keys.add(key)
              next.push(problem)
            }
          }
          if (next.length > MAX_WRONG_PROBLEMS_IMPORT_COUNT) {
            resolve({ success: false, count: wrongProblems.value.length, error: '导入后错题总数不能超过 5000 道。' })
            return
          }

          // Commit once, after every item has passed validation.
          const success = persist(next)
          resolve({
            success,
            count: success ? next.length : wrongProblems.value.length,
            error: success ? undefined : '保存失败，请检查浏览器存储权限或剩余空间。',
          })
        } catch {
          resolve({ success: false, count: wrongProblems.value.length, error: 'JSON 解析失败，请检查文件内容。' })
        }
      }
      reader.onerror = () => resolve({ success: false, count: wrongProblems.value.length, error: '文件读取失败，请重试。' })
      reader.onabort = () => resolve({ success: false, count: wrongProblems.value.length, error: '文件读取已取消。' })
      try {
        reader.readAsText(file)
      } catch {
        resolve({ success: false, count: wrongProblems.value.length, error: '无法读取所选文件。' })
      }
    })
  }

  return {
    wrongProblems,
    count,
    addWrong,
    addManyWrong,
    removeWrong,
    removeManyWrong,
    clearAll,
    exportJSON,
    importJSON,
  }
}
