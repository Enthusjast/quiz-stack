import assert from 'node:assert/strict'
import test from 'node:test'
import { createRenderer } from 'vue'
import { createServer } from 'vite'

class MemoryStorage {
  values = new Map()
  failingSetKeys = new Set()

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
    if (this.failingSetKeys.has(key)) throw new Error(`blocked write: ${key}`)
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

const renderer = createRenderer({
  patchProp() {},
  insert() {},
  remove() {},
  createElement: () => ({}),
  createText: (text) => ({ text }),
  createComment: (text) => ({ text }),
  setText(node, text) { node.text = text },
  setElementText(node, text) { node.text = text },
  parentNode: () => null,
  nextSibling: () => null,
})

test('quiz sessions enforce wrong-review, snapshot, record, and lifecycle invariants', async () => {
  const originalStorage = globalThis.localStorage
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window
  const storage = new MemoryStorage()
  globalThis.localStorage = storage
  storage.setItem('quiz-stack-wrong-problems', JSON.stringify([
    { type: 1, content: '错题', choices: ['正确', '错误'], answer: 0 },
  ]))

  const listeners = new Map()
  globalThis.document = {
    hidden: true,
    addEventListener(type, listener) { listeners.set(`document:${type}`, listener) },
    removeEventListener(type) { listeners.delete(`document:${type}`) },
  }
  globalThis.window = {
    addEventListener(type, listener) { listeners.set(`window:${type}`, listener) },
    removeEventListener(type) { listeners.delete(`window:${type}`) },
  }

  const server = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })

  try {
    const { useQuiz, WRONG_REVIEW_BANK_ID } = await server.ssrLoadModule('/src/composables/useQuiz.ts')

    function mountQuiz(bankId) {
      let quiz
      const app = renderer.createApp({
        setup() {
          quiz = useQuiz(bankId)
          return () => null
        },
      })
      app.mount({})
      return { quiz, unmount: () => app.unmount() }
    }

    const untouched = mountQuiz('untouched')
    untouched.unmount()
    assert.equal(storage.getItem('quiz-stack-snapshot-untouched-sequential'), null)

    let fetchCount = 0
    globalThis.fetch = async () => {
      fetchCount += 1
      throw new Error('wrong-review must not fetch a question bank')
    }
    const wrongReview = mountQuiz(WRONG_REVIEW_BANK_ID)
    await wrongReview.quiz.loadBank('wrong-review')
    assert.equal(fetchCount, 0)
    assert.equal(wrongReview.quiz.error.value, null)
    assert.equal(wrongReview.quiz.title.value, '错题复习')
    assert.equal(wrongReview.quiz.problems.value.length, 1)
    wrongReview.quiz.finish()
    wrongReview.unmount()

    const invalidWrongReview = mountQuiz('demo')
    await invalidWrongReview.quiz.loadBank('wrong-review')
    assert.match(invalidWrongReview.quiz.error.value, /专用入口/)
    assert.equal(fetchCount, 0)
    invalidWrongReview.unmount()

    const bank = {
      title: '回归题库',
      problems: [{ type: 1, content: '单选', choices: ['A', 'B'], answer: 0 }],
    }
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => bank,
    })

    const resumeGuard = mountQuiz('resume-guard')
    await resumeGuard.quiz.loadBank('sequential')
    await resumeGuard.quiz.loadBank('sequential')
    assert.equal(resumeGuard.quiz.showResumePrompt.value, true)
    storage.removeItem('quiz-stack-snapshot-resume-guard-sequential')
    assert.equal(resumeGuard.quiz.resumeSession(), false)
    assert.equal(resumeGuard.quiz.resumeError.value, '保存的练习进度已失效，请重新开始。')
    assert.equal(resumeGuard.quiz.showResumePrompt.value, true)
    assert.equal(resumeGuard.quiz.startFresh(), true)
    assert.equal(resumeGuard.quiz.resumeError.value, null)
    await resumeGuard.quiz.loadBank('sequential')
    assert.equal(resumeGuard.quiz.showResumePrompt.value, true)
    globalThis.fetch = async () => { throw new Error('route switch failed') }
    await resumeGuard.quiz.loadBank('random')
    assert.match(resumeGuard.quiz.error.value, /route switch failed/)
    assert.equal(resumeGuard.quiz.showResumePrompt.value, false)
    resumeGuard.unmount()

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => bank,
    })
    const switching = mountQuiz('switching')
    await switching.quiz.loadBank('sequential')
    switching.quiz.elapsedSeconds.value = 7
    await switching.quiz.loadBank('random')
    const savedSequential = JSON.parse(
      storage.getItem('quiz-stack-snapshot-switching-sequential'),
    )
    assert.equal(savedSequential.elapsedSeconds, 7)
    switching.unmount()

    storage.setItem('quiz-stack-sessions', JSON.stringify({ stale: ['sequential'] }))
    storage.failingSetKeys.add('quiz-stack-snapshot-stale-sequential')
    const stale = mountQuiz('stale')
    const originalWarn = console.warn
    console.warn = () => {}
    try {
      await stale.quiz.loadBank('sequential')
    } finally {
      console.warn = originalWarn
    }
    assert.deepEqual(JSON.parse(storage.getItem('quiz-stack-sessions') ?? '{}'), {})
    storage.failingSetKeys.clear()
    stale.quiz.finish()
    stale.unmount()

    const regular = mountQuiz('regular')
    await regular.quiz.loadBank('sequential')
    const snapshotKey = 'quiz-stack-snapshot-regular-sequential'
    const tampered = JSON.parse(storage.getItem(snapshotKey))
    const mappedAnswer = regular.quiz.problems.value[0].mappedAnswer
    tampered.answers[0] = mappedAnswer === 0 ? 1 : 0
    tampered.problemStates[0] = 2
    assert.match(regular.quiz.importSession(JSON.stringify(tampered)), /评分状态与答案不一致/)
    assert.deepEqual(regular.quiz.answers.value, [null])
    assert.deepEqual(regular.quiz.problemStates.value, [0])

    regular.quiz.finish()
    const recordIds = JSON.parse(storage.getItem('quiz-stack-records-index'))
    const recordId = recordIds.find((id) => id.startsWith('regular-'))
    const record = JSON.parse(storage.getItem(`quiz-stack-record-${recordId}`))
    assert.equal(record.attemptedCount, 0)
    regular.unmount()

    let resolveFetch
    globalThis.fetch = () => new Promise((resolve) => { resolveFetch = resolve })
    const pending = mountQuiz('pending')
    const pendingLoad = pending.quiz.loadBank('sequential')
    pending.unmount()
    resolveFetch({ ok: true, status: 200, json: async () => bank })
    await pendingLoad
    pending.quiz.startFresh()
    assert.equal(storage.getItem('quiz-stack-snapshot-pending-sequential'), null)
  } finally {
    await server.close()
    globalThis.localStorage = originalStorage
    globalThis.fetch = originalFetch
    globalThis.document = originalDocument
    globalThis.window = originalWindow
  }
})
