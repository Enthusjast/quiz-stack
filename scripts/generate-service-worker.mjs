#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, '..')
const outputDirectory = path.resolve(projectRoot, process.argv[2] ?? 'dist')
const templatePath = path.join(projectRoot, 'public', 'sw.js')
const requiredPrecacheFiles = ['index.html', 'data/list.json']

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFiles(path.join(directory, entry.name), relativePath))
    } else {
      files.push(relativePath)
    }
  }
  return files
}

const outputFiles = (await listFiles(outputDirectory))
  .filter((filename) => (
    filename !== 'sw.js'
    && (filename === 'data/list.json' || !filename.startsWith('data/'))
    && !filename.endsWith('.map')
  ))
  .sort()

for (const filename of requiredPrecacheFiles) {
  if (!outputFiles.includes(filename)) {
    throw new Error(`Cannot generate service worker: ${outputDirectory} does not contain ${filename}`)
  }
}

const fingerprint = createHash('sha256')
for (const filename of outputFiles) {
  fingerprint.update(filename)
  fingerprint.update(await readFile(path.join(outputDirectory, filename)))
}
const buildVersion = fingerprint.digest('hex').slice(0, 16)
const precacheUrls = Array.from(new Set([
  '/',
  ...outputFiles.map((filename) => `/${filename}`),
]))

const template = await readFile(templatePath, 'utf8')
const generated = template
  .replace('__QUIZ_STACK_BUILD_VERSION__', buildVersion)
  .replace('/* __QUIZ_STACK_PRECACHE__ */ null', JSON.stringify(precacheUrls, null, 2))

if (generated === template || generated.includes('__QUIZ_STACK_')) {
  throw new Error('Cannot generate service worker: injection markers are missing from public/sw.js')
}

try {
  Function(generated)
} catch (error) {
  throw new Error('Cannot generate service worker: generated source is invalid', { cause: error })
}

await writeFile(path.join(outputDirectory, 'sw.js'), generated)
console.log(`Generated service worker ${buildVersion} with ${precacheUrls.length} app-shell assets.`)
