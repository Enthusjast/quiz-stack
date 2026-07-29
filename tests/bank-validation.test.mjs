import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  validateBankDirectory,
  validateProblem,
  validateQuizBank,
  validateRegistry,
} from '../scripts/bank-validation.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('all committed question banks and registry metadata are valid', async () => {
  const result = await validateBankDirectory(path.join(projectRoot, 'public', 'data'))

  assert.deepEqual(result.errors, [])
  assert.ok(result.bankCount > 0)
  assert.ok(result.questionCount > 0)
})

test('per-type exam config cannot request unavailable problems', () => {
  const errors = validateQuizBank({
    title: 'Invalid exam',
    test: [0, 1, 0, 0, 1],
    score: [0, 1, 1, 1, 1],
    problems: [
      { type: 1, content: 'Question', choices: ['A', 'B'], answer: 0 },
    ],
  })

  assert.ok(errors.some((error) => error.includes('test[4] requests 1 problems')))
})

test('scalar exam config cannot exceed the bank size', () => {
  const errors = validateQuizBank({
    title: 'Invalid scalar exam',
    test: 2,
    score: [0, 1, 1, 1, 1],
    problems: [
      { type: 3, content: 'Question', answer: 'answer' },
    ],
  })

  assert.ok(errors.some((error) => error.includes('requests 2 problems')))
})

test('problem answer indices and multi-choice duplicates are validated', () => {
  assert.ok(validateProblem({
    type: 1,
    content: 'Question',
    choices: ['A', 'B'],
    answer: 2,
  }).some((error) => error.includes('valid choice index')))

  assert.ok(validateProblem({
    type: 2,
    content: 'Question',
    choices: ['A', 'B'],
    answer: [0, 0],
  }).some((error) => error.includes('duplicate')))

  assert.ok(validateProblem({
    type: 0,
    content: 'Warmup',
    choices: ['Continue'],
    answer: 1,
  }).some((error) => error.includes('valid optional choice index')))
})

test('registry references must point to declared banks and categories', () => {
  const errors = validateRegistry({
    categories: ['Known'],
    recommended: ['missing'],
    banks: {
      demo: {
        title: 'Demo',
        categories: ['Unknown'],
        questionCount: 1,
        time: 2026,
      },
    },
  })

  assert.ok(errors.some((error) => error.includes('unknown category')))
  assert.ok(errors.some((error) => error.includes('unknown bank')))
})
