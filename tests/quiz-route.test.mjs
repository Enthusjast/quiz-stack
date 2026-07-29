import assert from 'node:assert/strict'
import test from 'node:test'
import { createRenderer, nextTick, reactive, ssrContextKey } from 'vue'
import { routeLocationKey, routerKey } from 'vue-router'
import { createServer } from 'vite'

class MemoryStorage {
  values = new Map()

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
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

async function waitFor(predicate, message) {
  const deadline = Date.now() + 2_000
  while (!predicate()) {
    if (Date.now() >= deadline) assert.fail(message)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await nextTick()
  }
}

test('quiz route sync follows query changes without replaying fresh cleanup', async () => {
  const originals = {
    document: globalThis.document,
    fetch: globalThis.fetch,
    localStorage: globalThis.localStorage,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    window: globalThis.window,
  }
  const storage = new MemoryStorage()
  const listeners = new Map()
  globalThis.localStorage = storage
  globalThis.document = {
    hidden: false,
    activeElement: null,
    body: { style: { overflow: '' } },
    addEventListener(type, listener) { listeners.set(`document:${type}`, listener) },
    removeEventListener(type) { listeners.delete(`document:${type}`) },
  }
  globalThis.window = {
    addEventListener(type, listener) { listeners.set(`window:${type}`, listener) },
    removeEventListener(type) { listeners.delete(`window:${type}`) },
  }
  globalThis.requestAnimationFrame = (callback) => {
    callback()
    return 1
  }

  const bank = {
    title: '路由回归题库',
    problems: [{ type: 1, content: '单选', choices: ['A', 'B'], answer: 0 }],
  }
  let fetchCount = 0
  globalThis.fetch = async () => {
    fetchCount += 1
    return { ok: true, status: 200, json: async () => bank }
  }

  const server = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })

  try {
    const { default: QuizPage } = await server.ssrLoadModule('/src/pages/QuizPage.vue')
    const route = reactive({
      name: 'quiz',
      params: { bankId: 'route-bank' },
      query: { mode: 'sequential' },
      path: '/quiz/route-bank',
      fullPath: '/quiz/route-bank?mode=sequential',
      hash: '',
      matched: [],
      meta: {},
    })
    const replacements = []
    const router = {
      async push() {},
      async replace(location) {
        replacements.push(location)
        route.query = { ...location.query }
        route.fullPath = '/quiz/route-bank?mode=random'
      },
    }
    const app = renderer.createApp(QuizPage)
    app.provide(routeLocationKey, route)
    app.provide(routerKey, router)
    app.provide(ssrContextKey, { modules: new Set() })
    app.config.warnHandler = () => {}
    app.mount({})

    await waitFor(
      () => storage.getItem('quiz-stack-snapshot-route-bank-sequential') !== null,
      'initial route did not finish loading',
    )
    route.query = { mode: 'random', fresh: '1' }
    route.fullPath = '/quiz/route-bank?mode=random&fresh=1'
    await nextTick()
    await waitFor(() => replacements.length === 1, 'query-only route change was ignored')
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.equal(fetchCount, 2, 'removing fresh must not trigger a third bank load')
    assert.deepEqual(route.query, { mode: 'random' })
    assert.ok(storage.getItem('quiz-stack-snapshot-route-bank-random'))
    app.unmount()
  } finally {
    await server.close()
    globalThis.document = originals.document
    globalThis.fetch = originals.fetch
    globalThis.localStorage = originals.localStorage
    globalThis.requestAnimationFrame = originals.requestAnimationFrame
    globalThis.window = originals.window
  }
})

test('an unmounted quiz route cannot replace a newer route after loading', async () => {
  const originals = {
    document: globalThis.document,
    fetch: globalThis.fetch,
    localStorage: globalThis.localStorage,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    window: globalThis.window,
  }
  globalThis.localStorage = new MemoryStorage()
  globalThis.document = {
    hidden: false,
    body: { style: { overflow: '' } },
    addEventListener() {},
    removeEventListener() {},
  }
  globalThis.window = { addEventListener() {}, removeEventListener() {} }
  globalThis.requestAnimationFrame = (callback) => {
    callback()
    return 1
  }

  const bank = {
    title: '延迟题库',
    problems: [{ type: 1, content: '单选', choices: ['A', 'B'], answer: 0 }],
  }
  let fetchCount = 0
  let resolveFetch
  globalThis.fetch = () => {
    fetchCount += 1
    return new Promise((resolve) => { resolveFetch = resolve })
  }

  const server = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })

  try {
    const { default: QuizPage } = await server.ssrLoadModule('/src/pages/QuizPage.vue')
    const route = reactive({
      name: 'quiz',
      params: { bankId: 'bank-a' },
      query: { mode: 'sequential' },
      path: '/quiz/bank-a',
      fullPath: '/quiz/bank-a?mode=sequential',
      hash: '',
      matched: [],
      meta: {},
    })
    const replacements = []
    const router = {
      async push() {},
      async replace(location) { replacements.push(location) },
    }
    const app = renderer.createApp(QuizPage)
    app.provide(routeLocationKey, route)
    app.provide(routerKey, router)
    app.provide(ssrContextKey, { modules: new Set() })
    app.config.warnHandler = () => {}
    app.mount({})

    await waitFor(() => fetchCount === 1, 'delayed route did not start loading')
    route.params = { bankId: 'bank-b' }
    route.query = { mode: 'random', fresh: '1' }
    route.path = '/quiz/bank-b'
    route.fullPath = '/quiz/bank-b?mode=random&fresh=1'
    app.unmount()
    resolveFetch({ ok: true, status: 200, json: async () => bank })
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.deepEqual(replacements, [])
  } finally {
    await server.close()
    globalThis.document = originals.document
    globalThis.fetch = originals.fetch
    globalThis.localStorage = originals.localStorage
    globalThis.requestAnimationFrame = originals.requestAnimationFrame
    globalThis.window = originals.window
  }
})
