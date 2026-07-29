import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createProblemIds,
  isAnswerForProblem,
  isCustomPracticeConfig,
  isProblem,
  problemFingerprint,
  questionBankDigest,
} from '../src/utils/problem.ts'

const firstChoice = {
  type: 1,
  content: '重复题干',
  choices: ['甲', '乙'],
  answer: 0,
}

test('problem identity includes choices and answers, not only the prompt', () => {
  const differentAnswer = { ...firstChoice, answer: 1 }
  const differentChoices = { ...firstChoice, choices: ['甲', '丙'] }

  assert.notEqual(problemFingerprint(firstChoice), problemFingerprint(differentAnswer))
  assert.notEqual(problemFingerprint(firstChoice), problemFingerprint(differentChoices))
  assert.notEqual(
    questionBankDigest([firstChoice]),
    questionBankDigest([differentAnswer]),
  )
})

test('identical duplicate occurrences receive stable, distinct IDs', () => {
  const ids = createProblemIds([firstChoice, firstChoice, { ...firstChoice, answer: 1 }])

  assert.equal(ids.length, 3)
  assert.notEqual(ids[0], ids[1])
  assert.match(ids[0], /:0$/)
  assert.match(ids[1], /:1$/)
  assert.match(ids[2], /:0$/)
  assert.deepEqual(ids, createProblemIds([firstChoice, firstChoice, { ...firstChoice, answer: 1 }]))
})

test('type 0 supports acknowledgement and legacy-choice forms', () => {
  const acknowledgement = { type: 0, content: '阅读后确认' }
  const legacyChoice = {
    type: 0,
    content: '任选一项即可',
    choices: ['已阅读', '已了解'],
    answer: 0,
  }

  assert.equal(isProblem(acknowledgement), true)
  assert.equal(isProblem(legacyChoice), true)
  assert.equal(isAnswerForProblem('__warmup_confirmed__', acknowledgement), true)
  assert.equal(isAnswerForProblem(1, legacyChoice), true)
  assert.equal(isAnswerForProblem(2, legacyChoice), false)
})

test('problem and custom-practice schemas reject partial invalid data', () => {
  assert.equal(isProblem({ ...firstChoice, answer: 3 }), false)
  assert.equal(isProblem({ type: 2, content: '多选', choices: ['甲', '乙'], answer: [0, 0] }), false)
  assert.equal(isAnswerForProblem([], {
    type: 2,
    content: '多选',
    choices: ['甲', '乙'],
    answer: [0],
  }), false)
  assert.equal(isCustomPracticeConfig({ enabledTypes: [0, 1, 4], shuffle: true }), true)
  assert.equal(isCustomPracticeConfig({ enabledTypes: [1, 1], shuffle: true }), false)
  assert.equal(isCustomPracticeConfig({ enabledTypes: [5], shuffle: false }), false)
})
