// Quiz Stack Service Worker - offline support
const BUILD_VERSION = '__QUIZ_STACK_BUILD_VERSION__'
const APP_CACHE = `quiz-stack-app-${BUILD_VERSION}`
const RUNTIME_CACHE = 'quiz-stack-runtime-v1'
const DEFAULT_PRECACHE = ['/', '/index.html', '/favicon.svg', '/manifest.json']
const PRE_CACHE = /* __QUIZ_STACK_PRECACHE__ */ null || DEFAULT_PRECACHE
const NETWORK_TIMEOUT_MS = 4000

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(APP_CACHE).then((cache) => cache.addAll(
        PRE_CACHE.map((url) => new Request(url, { cache: 'reload' })),
      )),
      self.skipWaiting(),
    ]),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys
          .filter((key) => (
            (key.startsWith('quiz-stack-app-') && key !== APP_CACHE)
            || key === 'quiz-stack-v2'
          ))
          .map((key) => caches.delete(key))),
      ),
      self.clients.claim(),
    ]),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, '/index.html', APP_CACHE))
    return
  }

  // Question banks stay fresh online and remain available after their first use.
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(networkFirst(event.request))
    return
  }

  event.respondWith(cacheFirst(event.request))
})

async function cacheFirst(request) {
  const appCache = await caches.open(APP_CACHE)
  const cached = (await appCache.match(request)) ?? (await caches.match(request))
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok && response.status === 200) {
      await cacheResponse(RUNTIME_CACHE, request, response)
    }
    return response
  } catch {
    return new Response('Offline - resource not cached', { status: 503 })
  }
}

async function networkFirst(request, fallbackUrl, cacheName = RUNTIME_CACHE) {
  try {
    const response = await fetchWithTimeout(request)
    if (response.ok && response.status === 200) {
      await cacheResponse(cacheName, request, response)
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl)
      if (fallback) return fallback
    }
    return new Response('Offline - resource not available', { status: 503 })
  }
}

async function cacheResponse(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
  } catch {
    // A full or unavailable cache must not turn a successful network request into an error.
  }
}

async function fetchWithTimeout(request) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS)
  try {
    return await fetch(new Request(request, { signal: controller.signal }))
  } finally {
    clearTimeout(timeout)
  }
}
