import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..')
const sourcePath = path.join(repositoryRoot, 'docs', 'change-history.html')
const outputPath = path.join(
  repositoryRoot,
  'src',
  'frontend',
  'src',
  'generated',
  'change-history.json',
)

const html = fs.readFileSync(sourcePath, 'utf8')
const content = html.replace(/<!--[\s\S]*?-->/g, '')
const entries = [...content.matchAll(
  /<article\b[^>]*class=["'][^"']*\bchange-entry\b[^"']*["'][^>]*data-date=["']([^"']+)["'][^>]*>[\s\S]*?<h2\b[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<\/article>/gi,
)].map((match, index) => {
  const date = match[1].trim()
  const title = match[2]
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

  if (!title) throw new Error(`Change history entry #${index + 1} has no title.`)
  if (Number.isNaN(Date.parse(date))) {
    throw new Error(`Change history entry #${index + 1} has an invalid date: ${date}`)
  }

  return { id: `${date}-${index}`, title, date }
})

entries.sort((left, right) => Date.parse(right.date) - Date.parse(left.date))

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({ count: entries.length, entries }, null, 2)}\n`,
  'utf8',
)

console.log(`Generated ${entries.length} changes -> ${path.relative(repositoryRoot, outputPath)}`)
