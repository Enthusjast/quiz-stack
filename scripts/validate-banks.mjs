#!/usr/bin/env node
import path from 'node:path'
import process from 'node:process'
import { validateBankDirectory } from './bank-validation.mjs'

const dataDirectory = path.resolve(process.cwd(), process.argv[2] ?? 'public/data')
const result = await validateBankDirectory(dataDirectory)

if (result.errors.length > 0) {
  console.error(`Question bank validation failed with ${result.errors.length} error(s):`)
  result.errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(`Validated ${result.bankCount} banks and ${result.questionCount} problems.`)
}
