import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const PROBLEM_TYPES = new Set([0, 1, 2, 3, 4])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function validateStringArray(value, field, errors, minimumLength = 1) {
  if (!Array.isArray(value) || value.length < minimumLength) {
    errors.push(`${field} must contain at least ${minimumLength} non-empty strings`)
    return false
  }

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push(`${field}[${index}] must be a non-empty string`)
    }
  })
  return true
}

export function validateProblem(problem, index = 0) {
  const errors = []
  const field = `problems[${index}]`

  if (!isRecord(problem)) {
    return [`${field} must be an object`]
  }

  if (!isNonEmptyString(problem.content)) {
    errors.push(`${field}.content must be a non-empty string`)
  }
  if (problem.hint !== undefined && typeof problem.hint !== 'string') {
    errors.push(`${field}.hint must be a string when provided`)
  }
  if (!Number.isInteger(problem.type) || !PROBLEM_TYPES.has(problem.type)) {
    errors.push(`${field}.type must be an integer from 0 to 4`)
    return errors
  }

  if (problem.choices !== undefined && !Array.isArray(problem.choices)) {
    errors.push(`${field}.choices must be an array when provided`)
  }

  switch (problem.type) {
    case 0:
      if (Array.isArray(problem.choices)) {
        validateStringArray(problem.choices, `${field}.choices`, errors)
      }
      if (
        problem.answer !== undefined
        && !isNonEmptyString(problem.answer)
        && (
          !Number.isInteger(problem.answer)
          || !Array.isArray(problem.choices)
          || problem.answer < 0
          || problem.answer >= problem.choices.length
        )
      ) {
        errors.push(`${field}.answer must be a non-empty string or a valid optional choice index`)
      }
      break
    case 1: {
      const validChoices = validateStringArray(problem.choices, `${field}.choices`, errors, 2)
      if (
        !Number.isInteger(problem.answer)
        || problem.answer < 0
        || (validChoices && problem.answer >= problem.choices.length)
      ) {
        errors.push(`${field}.answer must be a valid choice index`)
      }
      break
    }
    case 2: {
      const validChoices = validateStringArray(problem.choices, `${field}.choices`, errors, 2)
      if (!Array.isArray(problem.answer) || problem.answer.length === 0) {
        errors.push(`${field}.answer must contain at least one choice index`)
        break
      }

      const uniqueAnswers = new Set(problem.answer)
      if (uniqueAnswers.size !== problem.answer.length) {
        errors.push(`${field}.answer must not contain duplicate choice indices`)
      }
      problem.answer.forEach((answer, answerIndex) => {
        if (
          !Number.isInteger(answer)
          || answer < 0
          || (validChoices && answer >= problem.choices.length)
        ) {
          errors.push(`${field}.answer[${answerIndex}] must be a valid choice index`)
        }
      })
      break
    }
    case 3:
      if (!isNonEmptyString(problem.answer)) {
        errors.push(`${field}.answer must be a non-empty string`)
      }
      break
    case 4: {
      const validChoices = validateStringArray(problem.choices, `${field}.choices`, errors, 2)
      if (validChoices && problem.choices.length !== 2) {
        errors.push(`${field}.choices must contain exactly two options for a true/false problem`)
      }
      if (
        !Number.isInteger(problem.answer)
        || problem.answer < 0
        || (validChoices && problem.answer >= problem.choices.length)
      ) {
        errors.push(`${field}.answer must be a valid choice index`)
      }
      break
    }
  }

  return errors
}

function validateScore(score, errors) {
  if (!Array.isArray(score) || score.length !== 5) {
    errors.push('score must be an array of five non-negative numbers')
    return null
  }

  score.forEach((points, type) => {
    if (typeof points !== 'number' || !Number.isFinite(points) || points < 0) {
      errors.push(`score[${type}] must be a non-negative number`)
    }
  })
  return score
}

export function validateQuizBank(bank) {
  const errors = []

  if (!isRecord(bank)) {
    return ['bank must be an object']
  }
  if (!isNonEmptyString(bank.title)) {
    errors.push('title must be a non-empty string')
  }
  if (!Array.isArray(bank.problems) || bank.problems.length === 0) {
    errors.push('problems must contain at least one problem')
    return errors
  }

  const typeCounts = [0, 0, 0, 0, 0]
  bank.problems.forEach((problem, index) => {
    errors.push(...validateProblem(problem, index))
    if (isRecord(problem) && Number.isInteger(problem.type) && PROBLEM_TYPES.has(problem.type)) {
      typeCounts[problem.type] += 1
    }
  })

  const score = bank.score === undefined ? null : validateScore(bank.score, errors)
  if (bank.test === undefined) {
    return errors
  }
  if (score === null) {
    errors.push('score is required when test is configured')
  }

  if (typeof bank.test === 'number') {
    if (!Number.isInteger(bank.test) || bank.test <= 0) {
      errors.push('test must be a positive integer or an array of five counts')
    } else if (bank.test > bank.problems.length) {
      errors.push(`test requests ${bank.test} problems, but the bank only has ${bank.problems.length}`)
    }

    if (score !== null) {
      typeCounts.forEach((count, type) => {
        if (type !== 0 && count > 0 && score[type] <= 0) {
          errors.push(`score[${type}] must be positive because scalar test selection can include type ${type}`)
        }
      })
    }
    return errors
  }

  if (!Array.isArray(bank.test) || bank.test.length !== 5) {
    errors.push('test must be a positive integer or an array of five counts')
    return errors
  }

  let requestedTotal = 0
  bank.test.forEach((count, type) => {
    if (!Number.isInteger(count) || count < 0) {
      errors.push(`test[${type}] must be a non-negative integer`)
      return
    }
    requestedTotal += count
    if (count > typeCounts[type]) {
      errors.push(`test[${type}] requests ${count} problems, but only ${typeCounts[type]} are available`)
    }
    if (type !== 0 && count > 0 && score !== null && score[type] <= 0) {
      errors.push(`score[${type}] must be positive because test selects type ${type}`)
    }
  })
  if (requestedTotal === 0) {
    errors.push('test must request at least one problem')
  }

  return errors
}

export function validateRegistry(registry) {
  const errors = []

  if (!isRecord(registry)) {
    return ['list.json must contain an object']
  }

  const categories = new Set()
  if (validateStringArray(registry.categories, 'categories', errors)) {
    registry.categories.forEach((category) => {
      if (categories.has(category)) {
        errors.push(`categories contains duplicate value ${JSON.stringify(category)}`)
      }
      categories.add(category)
    })
  }

  if (!Array.isArray(registry.recommended)) {
    errors.push('recommended must be an array')
  }
  if (!isRecord(registry.banks) || Object.keys(registry.banks).length === 0) {
    errors.push('banks must contain at least one entry')
    return errors
  }

  for (const [bankId, metadata] of Object.entries(registry.banks)) {
    const field = `banks.${bankId}`
    if (!/^[A-Za-z0-9_-]+$/.test(bankId)) {
      errors.push(`${field} has an unsafe bank id`)
    }
    if (!isRecord(metadata)) {
      errors.push(`${field} must be an object`)
      continue
    }
    if (!isNonEmptyString(metadata.title)) {
      errors.push(`${field}.title must be a non-empty string`)
    }
    if (validateStringArray(metadata.categories, `${field}.categories`, errors)) {
      metadata.categories.forEach((category) => {
        if (!categories.has(category)) {
          errors.push(`${field}.categories references unknown category ${JSON.stringify(category)}`)
        }
      })
    }
    if (!Number.isInteger(metadata.questionCount) || metadata.questionCount <= 0) {
      errors.push(`${field}.questionCount must be a positive integer`)
    }
    if (metadata.time !== undefined && (!Number.isInteger(metadata.time) || metadata.time <= 0)) {
      errors.push(`${field}.time must be a positive integer when provided`)
    }
    if (metadata.new !== undefined && typeof metadata.new !== 'boolean') {
      errors.push(`${field}.new must be a boolean when provided`)
    }
  }

  if (Array.isArray(registry.recommended)) {
    const recommended = new Set()
    registry.recommended.forEach((bankId, index) => {
      if (!isNonEmptyString(bankId)) {
        errors.push(`recommended[${index}] must be a non-empty string`)
      } else if (!(bankId in registry.banks)) {
        errors.push(`recommended[${index}] references unknown bank ${JSON.stringify(bankId)}`)
      } else if (recommended.has(bankId)) {
        errors.push(`recommended contains duplicate bank ${JSON.stringify(bankId)}`)
      }
      recommended.add(bankId)
    })
  }

  return errors
}

async function parseJsonFile(filePath) {
  const contents = await readFile(filePath, 'utf8')
  return JSON.parse(contents)
}

export async function validateBankDirectory(dataDirectory) {
  const errors = []
  let registry

  try {
    registry = await parseJsonFile(path.join(dataDirectory, 'list.json'))
  } catch (error) {
    return {
      errors: [`list.json could not be parsed: ${error instanceof Error ? error.message : String(error)}`],
      bankCount: 0,
      questionCount: 0,
    }
  }

  errors.push(...validateRegistry(registry).map((error) => `list.json: ${error}`))
  if (!isRecord(registry.banks)) {
    return { errors, bankCount: 0, questionCount: 0 }
  }

  let questionCount = 0
  const registeredIds = new Set(Object.keys(registry.banks))
  for (const [bankId, metadata] of Object.entries(registry.banks)) {
    const filename = `${bankId}.json`
    let bank
    try {
      bank = await parseJsonFile(path.join(dataDirectory, filename))
    } catch (error) {
      errors.push(`${filename} could not be parsed: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }

    errors.push(...validateQuizBank(bank).map((error) => `${filename}: ${error}`))
    if (Array.isArray(bank.problems)) {
      questionCount += bank.problems.length
      if (isRecord(metadata) && metadata.questionCount !== bank.problems.length) {
        errors.push(
          `list.json: banks.${bankId}.questionCount is ${metadata.questionCount}, but ${filename} contains ${bank.problems.length} problems`,
        )
      }
    }
  }

  const jsonFiles = (await readdir(dataDirectory))
    .filter((filename) => filename.endsWith('.json') && filename !== 'list.json')
  jsonFiles.forEach((filename) => {
    const bankId = filename.slice(0, -'.json'.length)
    if (!registeredIds.has(bankId)) {
      errors.push(`${filename} is not registered in list.json`)
    }
  })

  return {
    errors,
    bankCount: registeredIds.size,
    questionCount,
  }
}
