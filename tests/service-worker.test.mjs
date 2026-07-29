import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import { runInNewContext } from 'node:vm'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const generatorPath = path.join(projectRoot, 'scripts', 'generate-service-worker.mjs')
const serviceWorkerPath = path.join(projectRoot, 'public', 'sw.js')

async function generateServiceWorker(outputDirectory) {
  await execFileAsync(process.execPath, [generatorPath, outputDirectory], {
    cwd: projectRoot,
  })
  return readFile(path.join(outputDirectory, 'sw.js'), 'utf8')
}

function buildVersion(source) {
  const match = source.match(/const BUILD_VERSION = '([a-f0-9]+)'/)
  assert.ok(match, 'generated service worker should contain a build version')
  return match[1]
}

test('service worker generation precaches and fingerprints data/list.json', async (t) => {
  const outputDirectory = await mkdtemp(path.join(projectRoot, '.sw-test-'))
  t.after(() => rm(outputDirectory, { recursive: true, force: true }))

  await mkdir(path.join(outputDirectory, 'assets'), { recursive: true })
  await mkdir(path.join(outputDirectory, 'data'), { recursive: true })
  await writeFile(path.join(outputDirectory, 'index.html'), '<main>Quiz Stack</main>')
  await writeFile(path.join(outputDirectory, 'assets', 'app.js'), 'console.log("quiz")')
  await writeFile(path.join(outputDirectory, 'data', 'list.json'), '{"banks":{"demo":{}}}')
  await writeFile(path.join(outputDirectory, 'data', 'demo.json'), '{"problems":[]}')

  const first = await generateServiceWorker(outputDirectory)
  assert.match(first, /"\/data\/list\.json"/)
  assert.doesNotMatch(first, /"\/data\/demo\.json"/)

  await writeFile(path.join(outputDirectory, 'data', 'list.json'), '{"banks":{"updated":{}}}')
  const second = await generateServiceWorker(outputDirectory)
  assert.notEqual(buildVersion(first), buildVersion(second))
})

test('network-first offline fallback searches every cache', async () => {
  const source = await readFile(serviceWorkerPath, 'utf8')
  const cachedResponse = { source: 'app-cache' }
  const request = new Request('https://quiz-stack.test/data/list.json')
  const context = {
    AbortController,
    Request,
    Response,
    clearTimeout,
    console,
    fetch: async () => { throw new Error('offline') },
    setTimeout,
    caches: {
      match: async (candidate) => candidate === request ? cachedResponse : undefined,
      open: async () => ({
        match: async () => undefined,
        put: async () => undefined,
      }),
      keys: async () => [],
    },
    self: {
      addEventListener: () => undefined,
      clients: { claim: async () => undefined },
      skipWaiting: async () => undefined,
    },
  }

  runInNewContext(`${source}\n;globalThis.testNetworkFirst = networkFirst`, context)
  const response = await context.testNetworkFirst(request)
  assert.equal(response, cachedResponse)
})
