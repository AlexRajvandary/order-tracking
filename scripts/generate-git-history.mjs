import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..')
const outputPath = path.join(
  repositoryRoot,
  'src',
  'frontend',
  'src',
  'generated',
  'git-history.json',
)

const recordSeparator = '\u001e'
const fieldSeparator = '\u001f'
const output = execFileSync(
  'git',
  [
    'log',
    `--pretty=format:%H${fieldSeparator}%h${fieldSeparator}%an${fieldSeparator}%aI${fieldSeparator}%s${recordSeparator}`,
  ],
  { cwd: repositoryRoot, encoding: 'utf8' },
)

const commits = output
  .split(recordSeparator)
  .map((record) => record.trim())
  .filter(Boolean)
  .map((record) => {
    const [hash, shortHash, author, date, subject] = record.split(fieldSeparator)
    return { hash, shortHash, author, date, subject }
  })

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({ count: commits.length, commits }, null, 2)}\n`,
  'utf8',
)

console.log(`Generated ${commits.length} commits -> ${path.relative(repositoryRoot, outputPath)}`)
