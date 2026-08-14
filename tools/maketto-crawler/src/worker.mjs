import path from 'node:path'
import process from 'node:process'
import { crawl } from './index.mjs'

const apiBase = (process.env.PRODUCTS_API_URL || 'http://products-api:8080/api/products').replace(/\/$/, '')
const apiKey = process.env.CRAWLER_API_KEY || ''
const pollInterval = positiveNumber(process.env.CRAWLER_POLL_INTERVAL_MS, 5000)
const batchSize = Math.min(100, positiveNumber(process.env.CRAWLER_BATCH_SIZE, 50))
const pageDelay = positiveNumber(process.env.CRAWLER_PAGE_DELAY_MS, 1000)
const pageTimeout = positiveNumber(process.env.CRAWLER_PAGE_TIMEOUT_MS, 60000)

if (!apiKey) throw new Error('CRAWLER_API_KEY is required.')

function positiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class WorkerApiError extends Error {
  constructor(status, detail) {
    super(`API ${status}: ${detail}`)
    this.name = 'WorkerApiError'
    this.status = status
  }
}

async function api(pathname, init = {}, attempts = 5) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const headers = new Headers(init.headers)
      headers.set('X-Crawler-Key', apiKey)
      if (init.body != null) headers.set('Content-Type', 'application/json')
      const response = await fetch(`${apiBase}/crawler-jobs${pathname}`, {
        ...init,
        headers,
        signal: AbortSignal.timeout(30000),
      })
      if (response.status === 204) return null
      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new WorkerApiError(response.status, detail || response.statusText)
      }
      const contentType = response.headers.get('content-type') || ''
      return contentType.includes('application/json') ? response.json() : null
    } catch (error) {
      lastError = error
      if (error instanceof WorkerApiError && error.status < 500) throw error
      if (attempt < attempts) await sleep(Math.min(15000, 1000 * (2 ** (attempt - 1))))
    }
  }
  throw lastError
}

function chunks(items, size) {
  const result = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

async function processJob(job) {
  console.log(`Запущена задача ${job.id}: ${job.url}, страниц ${job.requestedPages}`)
  let processedPages = job.processedPages || 0
  let currentPage = 1
  let productsFound = 0
  let wasCancelled = false
  const abortController = new AbortController()
  const logBuffer = []
  const pushLog = (line) => {
    // Таймер остаётся в stdout контейнера, но не раздувает историю задания в БД.
    if (line.includes('Таймер ·')) return
    logBuffer.push(line)
    if (logBuffer.length > 100) logBuffer.shift()
  }
  const drainLogs = () => logBuffer.splice(0, logBuffer.length)

  const heartbeat = setInterval(() => {
    void api(`/${job.id}/worker/heartbeat`, { method: 'POST' }, 2)
      .catch((error) => {
        if (error instanceof WorkerApiError && error.status === 404) {
          wasCancelled = true
          abortController.abort()
          return
        }
        console.error(`Heartbeat ${job.id}: ${error.message}`)
      })
  }, 30000)
  heartbeat.unref()

  try {
    const output = await crawl({
      url: job.url,
      pages: job.requestedPages,
      output: path.join('/tmp', `crawler-${job.id}.json`),
      outputBase: path.join('/tmp', `crawler-${job.id}.json`),
      delay: pageDelay,
      timeout: pageTimeout,
      category: job.categoryName,
      parentCategory: '',
      headless: true,
      persistOutput: false,
      signal: abortController.signal,
      onLog: ({ line }) => pushLog(line),
      onPageStart: async (page) => {
        currentPage = page.pageNumber
        await api(`/${job.id}/worker/progress`, {
          method: 'POST',
          body: JSON.stringify({
            processedPages,
            productsFound,
            currentPage,
            logs: drainLogs(),
          }),
        })
      },
      onPage: async (page) => {
        currentPage = page.pageNumber
        processedPages = page.scrapedPages
        productsFound = page.totalProducts
        for (const batch of chunks(page.newProducts, batchSize)) {
          await api(`/${job.id}/worker/batch`, {
            method: 'POST',
            body: JSON.stringify({ products: batch, productsFound }),
          })
        }
        await api(`/${job.id}/worker/progress`, {
          method: 'POST',
          body: JSON.stringify({
            processedPages,
            productsFound,
            currentPage,
            logs: drainLogs(),
          }),
        })
      },
    })

    processedPages = output.source.scrapedPages
    productsFound = output.products.length
    await api(`/${job.id}/worker/complete`, {
      method: 'POST',
      body: JSON.stringify({ processedPages, productsFound, currentPage, logs: drainLogs() }),
    })
    console.log(`Задача ${job.id} завершена: страниц ${processedPages}, товаров ${productsFound}`)
  } catch (error) {
    if (wasCancelled || (error instanceof WorkerApiError && error.status === 404)) {
      console.log(`Задача ${job.id} отменена, crawler остановлен.`)
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Задача ${job.id} завершилась с ошибкой: ${message}`)
    await api(`/${job.id}/worker/fail`, {
      method: 'POST',
      body: JSON.stringify({
        error: message,
        processedPages,
        productsFound,
        currentPage,
        logs: drainLogs(),
      }),
    }).catch((reportError) => {
      console.error(`Не удалось записать ошибку задачи ${job.id}: ${reportError.message}`)
    })
  } finally {
    clearInterval(heartbeat)
  }
}

async function run() {
  console.log(`Maketto crawler worker запущен. Product API: ${apiBase}`)
  while (true) {
    try {
      const job = await api('/worker/claim', { method: 'POST' })
      if (job) await processJob(job)
      else await sleep(pollInterval)
    } catch (error) {
      console.error(`Ошибка очереди crawler: ${error instanceof Error ? error.message : String(error)}`)
      await sleep(pollInterval)
    }
  }
}

await run()
