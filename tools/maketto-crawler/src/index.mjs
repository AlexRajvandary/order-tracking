import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const directory = path.dirname(fileURLToPath(import.meta.url))
const toolRoot = path.resolve(directory, '..')
let processStartedAt = Date.now()
let currentActivity = 'Запуск'
let crawlerLogSink = null

function elapsedSeconds() {
  return ((Date.now() - processStartedAt) / 1000).toFixed(1)
}

function log(message) {
  const line = `[${elapsedSeconds()} с] ${message}`
  console.log(line)
  crawlerLogSink?.({ level: 'info', message, line })
}

function logError(message) {
  const line = `[${elapsedSeconds()} с] ${message}`
  console.error(line)
  crawlerLogSink?.({ level: 'error', message, line })
}

function setActivity(message) {
  currentActivity = message
}

function printHelp() {
  console.log(`
Сборщик каталога Maketto.jp

Использование:
  .\\run.ps1 -Url <URL> -Pages <КОЛИЧЕСТВО> [параметры]

  или напрямую:
  node .\\src\\index.mjs --url <URL> --pages <КОЛИЧЕСТВО> [параметры]

Обязательные параметры:
  --url                 URL страницы каталога Maketto.jp
  --pages               Сколько страниц обработать

Дополнительные параметры:
  --output <ПУТЬ>       Итоговый JSON (в имя автоматически добавится категория)
  --delay <МС>          Задержка между страницами (1000)
  --timeout <МС>        Таймаут загрузки и ответа (45000)
  --category <НАЗВАНИЕ> Категория для всех товаров
  --parent-category <НАЗВАНИЕ> Родительская категория
  --headful             Показывать окно Chromium
  --help                Эта справка
`)
}

function parseArgs(argv) {
  const result = {
    url: '',
    pages: 0,
    output: path.join(toolRoot, 'output', 'maketto-products.json'),
    delay: 1000,
    timeout: 45000,
    category: '',
    parentCategory: '',
    headless: true,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') {
      printHelp()
      process.exit(0)
    }
    if (argument === '--headful') {
      result.headless = false
      continue
    }

    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Не указано значение для ${argument}`)
    index += 1

    switch (argument) {
      case '--url': result.url = value; break
      case '--pages': result.pages = Number(value); break
      case '--output': result.output = path.resolve(value); break
      case '--delay': result.delay = Number(value); break
      case '--timeout': result.timeout = Number(value); break
      case '--category': result.category = value.trim(); break
      case '--parent-category': result.parentCategory = value.trim(); break
      default: throw new Error(`Неизвестный параметр: ${argument}`)
    }
  }

  if (!result.url) throw new Error('Укажите URL через --url.')
  const url = new URL(result.url)
  if (!/(^|\.)maketto\.jp$/i.test(url.hostname)) {
    throw new Error('Поддерживаются только URL сайта maketto.jp.')
  }
  if (!Number.isInteger(result.pages) || result.pages < 1) {
    throw new Error('--pages должен быть целым числом больше нуля.')
  }
  if (!Number.isFinite(result.delay) || result.delay < 0) {
    throw new Error('--delay должен быть числом не меньше нуля.')
  }
  if (!Number.isFinite(result.timeout) || result.timeout < 1000) {
    throw new Error('--timeout должен быть не меньше 1000 мс.')
  }

  result.url = url.toString()
  const categoryId = url.searchParams.get('category')?.trim()
  const fileCategory = result.category
    || url.searchParams.get('query')?.trim()
    || (categoryId ? `категория-${categoryId}` : 'каталог')
  result.outputBase = result.output
  result.output = addCategoryToFileName(result.output, fileCategory)
  return result
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'item'
}

function addCategoryToFileName(filePath, category) {
  const parsed = path.parse(filePath)
  const categorySlug = slugify(category)
  const suffix = `-${categorySlug}`
  const name = parsed.name.toLowerCase().endsWith(suffix.toLowerCase())
    ? parsed.name
    : `${parsed.name}${suffix}`
  return path.join(parsed.dir, `${name}${parsed.ext || '.json'}`)
}

function marketplaceName(value) {
  const names = {
    rakuten: 'Rakuten',
    mercari: 'Mercari',
    yauction: 'Yahoo Auctions',
    yahooauction: 'Yahoo Auctions',
    yshopping: 'Yahoo Shopping',
    uniqlo: 'Uniqlo',
  }
  return names[value.toLowerCase()] ?? value
}

function findListingData(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return null
  seen.add(value)

  if (
    Array.isArray(value.products)
    && value.pageInfo
    && typeof value.pageInfo === 'object'
    && Number.isFinite(Number(value.pageInfo.page))
  ) {
    return value
  }

  for (const child of Object.values(value)) {
    const found = findListingData(child, seen)
    if (found) return found
  }
  return null
}

function findCurrencyData(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return null
  seen.add(value)

  if (
    Array.isArray(value)
    && value.some((item) => item?.code === 'JPY')
    && value.some((item) => typeof item?.rate === 'number')
  ) {
    return value
  }

  for (const child of Object.values(value)) {
    const found = findCurrencyData(child, seen)
    if (found) return found
  }
  return null
}

function parseNextData(raw) {
  const nextData = JSON.parse(raw)
  const state = nextData?.props?.pageProps?.initialReduxState ?? {}
  const listing = findListingData(state?.globalPages?.queries)
  const currencies = findCurrencyData(state?.globalPages?.queries) ?? []
  const currencyCode = typeof state?.currency?.code === 'string'
    ? state.currency.code.toUpperCase()
    : 'RUB'
  return { listing, currencies, currencyCode }
}

function categoryFromListing(listing) {
  if (typeof listing?.category?.label === 'string' && listing.category.label.trim()) {
    return listing.category.label.trim()
  }
  if (Array.isArray(listing?.breadcrumbs)) {
    const last = [...listing.breadcrumbs].reverse().find((item) =>
      typeof item?.label === 'string' && item.label.trim(),
    )
    if (last) return last.label.trim()
  }
  return ''
}

function convertPrice(value, targetCurrency, currencies) {
  const price = Number(value)
  if (!Number.isFinite(price) || price < 0) return null
  if (targetCurrency === 'JPY') return price

  const currency = currencies.find((item) => item?.code === targetCurrency)
  const rate = Number(currency?.rate)
  if (!Number.isFinite(rate) || rate <= 0) return price
  const decimals = Number.isInteger(currency?.decimals) ? currency.decimals : 0
  return Number((price * rate).toFixed(Math.max(0, decimals)))
}

function toImportProduct(raw, context) {
  const shop = typeof raw?.shop === 'string' ? raw.shop.trim() : ''
  const id = typeof raw?.id === 'string' || typeof raw?.id === 'number'
    ? String(raw.id).trim()
    : ''
  const name = typeof raw?.title === 'string' ? raw.title.trim().slice(0, 500) : ''
  const originalPrice = Number(raw?.price)
  const imageUrl = typeof raw?.image === 'string' ? raw.image.trim() : ''
  if (!shop || !id || !name || !Number.isFinite(originalPrice) || !imageUrl) return null

  const price = convertPrice(originalPrice, context.currencyCode, context.currencies)
  if (price == null) return null

  const shopName = marketplaceName(shop)
  const nameSaysUsed = /(^|[^\p{L}\p{N}])б\s*(?:\/|-)\s*у(?![\p{L}\p{N}])/iu.test(name)
  const condition = nameSaysUsed || shop.toLowerCase().includes('auction') || shop === 'mercari'
    ? 'used'
    : 'new'

  return {
    name,
    sku: `maketto-${slugify(shop)}-${id}`.slice(0, 100),
    price,
    currencyCode: context.currencyCode,
    originalPrice,
    originalCurrencyCode: 'JPY',
    imageUrl,
    sourceUrl: typeof raw?.url === 'string' && raw.url.trim()
      ? raw.url.trim()
      : null,
    condition,
    shopName,
    shopSlug: slugify(shopName),
    categoryName: context.categoryName || null,
    parentCategoryName: context.parentCategoryName || null,
    isActive: true,
  }
}

async function saveOutput(filePath, state) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.tmp`
  await fs.writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  await fs.rename(tempPath, filePath)
}

async function readInitialPage(page, timeout) {
  await page.waitForSelector('#__NEXT_DATA__', { state: 'attached', timeout })
  const startedAt = Date.now()
  let lastError = null

  while (Date.now() - startedAt < timeout) {
    const raw = await page.locator('#__NEXT_DATA__').textContent()
    if (raw) {
      try {
        const parsed = parseNextData(raw)
        if (parsed.listing) return parsed
        lastError = new Error('В __NEXT_DATA__ пока нет данных каталога Maketto.')
      } catch (error) {
        lastError = error
      }
    }
    await page.waitForTimeout(250)
  }

  throw new Error(
    `Не удалось дождаться полных данных каталога: ${lastError?.message ?? 'пустой __NEXT_DATA__'}`,
  )
}

async function findVisibleNextButton(page) {
  const marked = await page.locator('button').evaluateAll((buttons) => {
    for (const button of buttons) button.removeAttribute('data-maketto-crawler-next')
    const next = buttons.find((button) => {
      const use = button.querySelector('use')
      const icon = use?.getAttribute('href') || use?.getAttribute('xlink:href') || ''
      const styles = window.getComputedStyle(button)
      const visible = button.getClientRects().length > 0
        && styles.display !== 'none'
        && styles.visibility !== 'hidden'
      return visible && !button.disabled && icon.endsWith('#next-arrow')
    })
    if (!next) return false
    next.setAttribute('data-maketto-crawler-next', 'true')
    return true
  })

  return marked ? page.locator('[data-maketto-crawler-next="true"]') : null
}

function waitForListingAfterClick(page, currentPage, timeout) {
  return new Promise((resolve) => {
    const requests = []
    let finished = false

    const finish = (result) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      page.off('response', handleResponse)
      resolve({ ...result, requests })
    }

    const timer = setTimeout(() => finish({ listing: null }), timeout)

    async function handleResponse(response) {
      const request = response.request()
      if (['fetch', 'xhr'].includes(request.resourceType())) {
        requests.push(response.url())
        if (requests.length > 5) requests.shift()
      }

      try {
        const text = await response.text()
        if (!text || (!text.startsWith('{') && !text.startsWith('['))) return
        const payload = JSON.parse(text)
        const listing = findListingData(payload)
        if (!listing || Number(listing.pageInfo?.page) <= currentPage) return
        finish({ listing })
      } catch {
        // Ответ не относится к данным каталога.
      }
    }

    page.on('response', handleResponse)
  })
}

async function waitForHydratedNextButton(page, timeout) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeout) {
    const nextButton = await findVisibleNextButton(page)
    if (nextButton) {
      const hydrated = await nextButton.evaluate((button) => {
        const reactPropsKey = Object.keys(button).find((key) => key.startsWith('__reactProps$'))
        return Boolean(reactPropsKey && typeof button[reactPropsKey]?.onClick === 'function')
      }).catch(() => false)
      if (hydrated) return nextButton
    }
    await page.waitForTimeout(250)
  }

  throw new Error(`Кнопка #next-arrow не стала активной за ${timeout} мс.`)
}

async function clickNextPage(page, pageNumber, timeout, headless) {
  const expectedPage = pageNumber + 1
  setActivity(`Ждём активацию стрелки для страницы ${expectedPage}`)
  log(`Ждём, когда React подключит обработчик к #next-arrow для страницы ${expectedPage}...`)
  const nextButton = await waitForHydratedNextButton(page, timeout)
  log('Стрелка активна и готова к нажатию.')

  await nextButton.scrollIntoViewIfNeeded()
  if (!headless) {
    await nextButton.evaluate((button) => {
      button.style.outline = '4px solid #ef4444'
      button.style.outlineOffset = '4px'
      button.style.boxShadow = '0 0 0 8px rgba(239, 68, 68, 0.25)'
    })
    const box = await nextButton.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 })
    }
    await page.waitForTimeout(750)
  }

  setActivity(`Нажимаем стрелку для страницы ${expectedPage}`)
  log(`Нажимаем #next-arrow: страница ${pageNumber} → ${expectedPage}.`)
  const listingAfterClick = waitForListingAfterClick(page, pageNumber, timeout)
  await nextButton.click()
  const result = await listingAfterClick

  if (result.listing) {
    log(`Кнопка сработала: Maketto вернул данные страницы ${Number(result.listing.pageInfo?.page)}.`)
    if (!headless) await page.waitForTimeout(750)
    return { listing: result.listing }
  }

  const details = result.requests.length > 0
    ? ` Последние запросы: ${result.requests.join(', ')}`
    : ' Запросов fetch/xhr после клика не обнаружено.'
  throw new Error(`После клика по #next-arrow Maketto не вернул страницу ${expectedPage}.${details}`)
}

export async function crawl(options) {
  processStartedAt = Date.now()
  currentActivity = 'Запуск'
  crawlerLogSink = typeof options.onLog === 'function' ? options.onLog : null
  const productsBySku = new Map()
  const errors = []
  let scrapedPages = 0
  let currentPage = null
  let totalResults = null
  let pageSize = null
  let browser = null
  let stopping = false
  let saveQueue = Promise.resolve()

  const makeOutput = (incomplete = false, stopReason = '') => ({
    source: {
      site: 'maketto.jp',
      url: options.url,
      requestedPages: options.pages,
      scrapedPages,
      ...(currentPage ? { currentPage } : {}),
      ...(totalResults ? { totalResults } : {}),
      ...(pageSize ? { pageSize } : {}),
      generatedAt: new Date().toISOString(),
      elapsedSeconds: Number(elapsedSeconds()),
      ...(incomplete ? { incomplete: true, stopReason } : {}),
    },
    products: [...productsBySku.values()],
    errors: [...errors],
  })

  const persist = (incomplete = false, stopReason = '') => {
    if (options.persistOutput === false) return Promise.resolve()
    const output = makeOutput(incomplete, stopReason)
    saveQueue = saveQueue.catch(() => {}).then(() => saveOutput(options.output, output))
    return saveQueue
  }

  const stopForSignal = async (signal) => {
    if (stopping) {
      logError('Получен повторный сигнал остановки. Завершаем процесс.')
      process.exit(130)
    }
    stopping = true
    const message = `Обход остановлен пользователем (${signal}).`
    setActivity('Сохраняем товары перед остановкой')
    logError(`${message} Сохраняем уже собранные товары...`)
    errors.push({ date: new Date().toISOString(), message })

    try {
      await persist(true, message)
      logError(`Сохранено товаров: ${productsBySku.size}. JSON: ${options.output}`)
    } catch (saveError) {
      logError(`Не удалось сохранить JSON: ${saveError instanceof Error ? saveError.message : String(saveError)}`)
    }

    await browser?.close().catch(() => {})
    process.exit(130)
  }

  const handleSigint = () => { void stopForSignal('Ctrl+C') }
  const handleSigterm = () => { void stopForSignal('SIGTERM') }
  process.once('SIGINT', handleSigint)
  process.once('SIGTERM', handleSigterm)

  const heartbeat = setInterval(() => {
    log(`Таймер · ${currentActivity}`)
  }, 5000)
  heartbeat.unref()

  try {
    setActivity('Запускаем Chromium')
    browser = await chromium.launch({
      headless: options.headless,
      slowMo: options.headless ? 0 : 250,
    })
    const context = await browser.newContext({
      locale: 'ru-RU',
      viewport: { width: 1440, height: 1000 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36',
    })
    const page = await context.newPage()
    page.setDefaultTimeout(options.timeout)
    page.setDefaultNavigationTimeout(options.timeout)
    await page.route('**/*', async (route) => {
      const request = route.request()
      const resourceType = request.resourceType()
      const hostname = new URL(request.url()).hostname
      if (
        ['media', 'font'].includes(resourceType)
        || (options.headless && resourceType === 'image')
        || /(?:^|\.)(?:yandex\.ru|mc\.yandex\.ru|google-analytics\.com|googletagmanager\.com)$/i.test(hostname)
      ) {
        await route.abort()
        return
      }
      await route.continue()
    })

    setActivity('Открываем страницу каталога')
    log(`Открываем: ${options.url}`)
    await page.goto(options.url, { waitUntil: 'commit' })
    setActivity('Ждём данные первой страницы')
    let initial = await readInitialPage(page, options.timeout)
    let listing = initial.listing
    const queryCategory = new URL(options.url).searchParams.get('query')?.trim()
    const detectedFileCategory = options.category || queryCategory || categoryFromListing(listing)
    if (detectedFileCategory) {
      options.output = addCategoryToFileName(options.outputBase, detectedFileCategory)
    }
    log(`JSON будет сохранён в: ${options.output}`)
    totalResults = Number(listing.pageInfo?.totalResults) || null
    pageSize = Number(listing.pageInfo?.pageSize) || null

    for (let index = 0; index < options.pages; index += 1) {
      const pageNumber = Number(listing.pageInfo?.page) || index + 1
      currentPage = pageNumber
      setActivity(`Обрабатываем страницу ${pageNumber}`)
      if (typeof options.onPageStart === 'function') {
        await options.onPageStart({
          pageNumber,
          scrapedPages,
          requestedPages: options.pages,
          totalProducts: productsBySku.size,
        })
      }
      const detectedCategory = categoryFromListing(listing)
      const categoryName = options.category || detectedCategory
      let added = 0
      const newProducts = []

      for (const rawProduct of listing.products ?? []) {
        const product = toImportProduct(rawProduct, {
          currencyCode: initial.currencyCode,
          currencies: initial.currencies,
          categoryName,
          parentCategoryName: options.parentCategory,
        })
        if (!product) continue
        const existed = productsBySku.has(product.sku)
        productsBySku.set(product.sku, product)
        if (!existed) {
          added += 1
          newProducts.push(product)
        }
      }

      scrapedPages += 1
      setActivity(`Сохраняем страницу ${pageNumber}`)
      await persist()
      log(`Страница ${pageNumber}: найдено ${listing.products?.length ?? 0}, новых ${added}, всего ${productsBySku.size}`)
      if (typeof options.onPage === 'function') {
        await options.onPage({
          pageNumber,
          scrapedPages,
          requestedPages: options.pages,
          newProducts,
          totalProducts: productsBySku.size,
        })
      }

      if (index === options.pages - 1) break
      if (pageSize && totalResults && pageNumber * pageSize >= totalResults) {
        log('Достигнута последняя страница каталога.')
        break
      }
      setActivity(`Открываем страницу ${pageNumber + 1}`)
      const nextPage = await clickNextPage(
        page,
        pageNumber,
        options.timeout,
        options.headless,
      )
      listing = nextPage.listing
      const loadedPageNumber = Number(listing.pageInfo?.page)
      if (loadedPageNumber !== pageNumber + 1) {
        throw new Error(`Ожидалась страница ${pageNumber + 1}, но Maketto вернул страницу ${loadedPageNumber || 'без номера'}.`)
      }
      log(`Страница ${loadedPageNumber} загружена.`)
      if (options.delay > 0) {
        setActivity(`Пауза перед страницей ${pageNumber + 1}`)
        await page.waitForTimeout(options.delay)
      }
    }

    setActivity('Обход завершён')
    log(`Готово. Страниц: ${scrapedPages}, товаров: ${productsBySku.size}`)
    log(`JSON: ${options.output}`)
    return makeOutput()
  } catch (error) {
    if (stopping) return
    const message = error instanceof Error ? error.message : String(error)
    errors.push({ date: new Date().toISOString(), message })
    setActivity('Сохраняем товары после ошибки')
    await persist(true, message)
    logError(`Обход прерван, но ${productsBySku.size} товаров сохранены в ${options.output}`)
    throw error
  } finally {
    clearInterval(heartbeat)
    process.off('SIGINT', handleSigint)
    process.off('SIGTERM', handleSigterm)
    await browser?.close().catch(() => {})
    crawlerLogSink = null
  }
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  try {
    const options = parseArgs(process.argv.slice(2))
    await crawl(options)
  } catch (error) {
    logError(`Ошибка: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
