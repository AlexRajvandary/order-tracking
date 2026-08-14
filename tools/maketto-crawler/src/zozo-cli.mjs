import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { crawlZozo } from './zozo.mjs'

function parseArgs(argv) {
  const options = {
    url: '',
    pages: 0,
    output: path.resolve('output', 'zozo-products.json'),
    delay: 1000,
    timeout: 60000,
    headless: true,
    channel: 'chrome',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--headful') {
      options.headless = false
      continue
    }
    if (argument === '--chromium') {
      options.channel = undefined
      continue
    }
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Не указано значение для ${argument}.`)
    index += 1
    if (argument === '--url') options.url = value
    else if (argument === '--pages') options.pages = Number(value)
    else if (argument === '--output') options.output = path.resolve(value)
    else if (argument === '--delay') options.delay = Number(value)
    else if (argument === '--timeout') options.timeout = Number(value)
    else throw new Error(`Неизвестный параметр: ${argument}.`)
  }

  const url = new URL(options.url)
  if (!/(^|\.)zozo\.jp$/i.test(url.hostname)) throw new Error('Поддерживаются только URL сайта zozo.jp.')
  if (!Number.isInteger(options.pages) || options.pages < 1) throw new Error('--pages должен быть целым числом больше нуля.')
  if (!Number.isFinite(options.delay) || options.delay < 0) throw new Error('--delay должен быть не меньше нуля.')
  if (!Number.isFinite(options.timeout) || options.timeout < 1000) throw new Error('--timeout должен быть не меньше 1000 мс.')
  options.url = url.toString()
  return options
}

async function saveJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp`
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await fs.rename(temporaryPath, filePath)
}

const options = parseArgs(process.argv.slice(2))
const products = new Map()
let scrapedPages = 0
let currentPage = 0

function output(incomplete = false, error = null) {
  return {
    source: {
      site: 'zozo.jp',
      url: options.url,
      requestedPages: options.pages,
      scrapedPages,
      currentPage,
      generatedAt: new Date().toISOString(),
      ...(incomplete ? { incomplete: true, stopReason: error } : {}),
    },
    products: [...products.values()],
    errors: error ? [{ date: new Date().toISOString(), message: error }] : [],
  }
}

try {
  console.log(`JSON будет сохранён в: ${options.output}`)
  const result = await crawlZozo({
    ...options,
    startPage: 1,
    persistOutput: false,
    onPage: async (page) => {
      currentPage = page.pageNumber
      scrapedPages = page.scrapedPages
      for (const product of page.newProducts) products.set(product.sku, product)
      await saveJson(options.output, output())
      console.log(`Промежуточный JSON сохранён: страниц ${scrapedPages}, товаров ${products.size}.`)
    },
  })
  scrapedPages = result.source.scrapedPages
  currentPage = result.source.currentPage
  for (const product of result.products) products.set(product.sku, product)
  await saveJson(options.output, output())
  console.log(`Готово: ${options.output}. Страниц ${scrapedPages}, товаров ${products.size}.`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  await saveJson(options.output, output(true, message))
  console.error(`Обход прерван, промежуточный JSON сохранён: ${options.output}. ${message}`)
  process.exitCode = 1
}
