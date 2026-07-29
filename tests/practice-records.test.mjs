import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function createMemoryStorage() {
  const values = new Map()
  let failNextWrite = false

  return {
    storage: {
      get length() {
        return values.size
      },
      clear() {
        values.clear()
      },
      getItem(key) {
        return values.get(key) ?? null
      },
      key(index) {
        return Array.from(values.keys())[index] ?? null
      },
      removeItem(key) {
        values.delete(key)
      },
      setItem(key, value) {
        if (failNextWrite) {
          failNextWrite = false
          throw new Error('simulated quota failure')
        }
        values.set(key, String(value))
      },
    },
    failOnce() {
      failNextWrite = true
    },
  }
}

test('a failed record write does not disable later reads and deletes', async () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const memory = createMemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: memory.storage,
  })

  const server = await createServer({
    root: projectRoot,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })

  try {
    const records = await server.ssrLoadModule('/src/composables/usePracticeRecords.ts')
    const first = records.createRecord({
      bankId: 'first',
      bankTitle: 'First bank',
      mode: 'sequential',
      totalQuestions: 1,
      correctCount: 1,
      attemptedCount: 1,
      elapsedSeconds: 10,
      accuracy: 100,
      snapshot: null,
      completed: true,
    })
    assert.equal(records.saveRecord(first), true)

    const second = records.createRecord({
      bankId: 'second',
      bankTitle: 'Second bank',
      mode: 'random',
      totalQuestions: 1,
      correctCount: 0,
      attemptedCount: 1,
      elapsedSeconds: 5,
      accuracy: 0,
      snapshot: null,
      completed: true,
    })
    memory.failOnce()
    const originalWarn = console.warn
    console.warn = () => {}
    try {
      assert.equal(records.saveRecord(second), false)
    } finally {
      console.warn = originalWarn
    }

    memory.failOnce()
    const originalRollbackWarn = console.warn
    console.warn = () => {}
    try {
      assert.equal(records.purgeRecord(first.id), false)
    } finally {
      console.warn = originalRollbackWarn
    }
    assert.equal(records.getRecord(first.id)?.id, first.id)
    assert.equal(records.getRecords(1, 10).total, 1)

    assert.equal(records.purgeRecord(first.id), true)
    assert.equal(records.getRecord(first.id), null)
  } finally {
    await server.close()
    if (previousStorage) {
      Object.defineProperty(globalThis, 'localStorage', previousStorage)
    } else {
      delete globalThis.localStorage
    }
  }
})

test('bank history and aggregate stats include records beyond the first 1000', async () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const memory = createMemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: memory.storage,
  })

  const recordIds = Array.from({ length: 1001 }, (_, index) => `record-${index}`)
  memory.storage.setItem('quiz-stack-records-index', JSON.stringify(recordIds))
  const now = Date.now()
  for (const [index, id] of recordIds.entries()) {
    memory.storage.setItem(`quiz-stack-record-${id}`, JSON.stringify({
      id,
      bankId: index === 1000 ? 'oldest-target' : 'other-bank',
      bankTitle: index === 1000 ? 'Oldest target' : 'Other bank',
      mode: 'sequential',
      totalQuestions: 1,
      correctCount: 1,
      attemptedCount: 1,
      elapsedSeconds: 1,
      accuracy: 100,
      snapshot: null,
      createdAt: now - index,
      updatedAt: now - index,
      completed: true,
    }))
  }

  const server = await createServer({
    root: projectRoot,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })

  try {
    const records = await server.ssrLoadModule('/src/composables/usePracticeRecords.ts')
    assert.deepEqual(
      records.getRecordsForBank('oldest-target').map((record) => record.id),
      ['record-1000'],
    )
    assert.equal(records.getPracticeStats().totalSessions, 1001)
    assert.equal(records.getPracticeStats().totalAttempted, 1001)
  } finally {
    await server.close()
    if (previousStorage) {
      Object.defineProperty(globalThis, 'localStorage', previousStorage)
    } else {
      delete globalThis.localStorage
    }
  }
})
