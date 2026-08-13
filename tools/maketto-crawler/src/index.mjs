import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const directory = path.dirname(fileURLToPath(import.meta.url))
const toolRoot = path.resolve(directory, '..')

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
  --output <ПУТЬ>       Итоговый JSON (output/maketto-products.json)
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

async function markNextButton(page) {
  return page.locator('button').evaluateAll((buttons) => {
    for (const button of buttons) button.removeAttribute('data-maketto-crawler-next')
    const next = buttons.find((button) =>
      !button.disabled
      && /#(?:next|next-arrow|right-arrow)/i.test(button.innerHTML),
    )
    if (!next) return false
    next.setAttribute('data-maketto-crawler-next', 'true')
    return true
  })
}

async function ensureCatalogHydrated(page, timeout) {
  const catalogChunk = page.waitForResponse(
    (response) => /\/_next\/static\/chunks\/pages\/catalog-[^/]+\.js(?:\?|$)/i.test(response.url()),
    { timeout: Math.min(timeout, 20000) },
  ).catch(() => null)

  await page.locator('[data-maketto-crawler-next="true"]').click({ force: true })
  const response = await catalogChunk
  if (response) await page.waitForTimeout(750)
  return response != null
}

function waitForNextListing(page, currentPage, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      page.off('response', handleResponse)
      reject(new Error(`Maketto не вернул данные следующей страницы за ${timeout} мс.`))
    }, timeout)

    async function handleResponse(response) {
      const contentType = response.headers()['content-type'] ?? ''
      if (!contentType.includes('json')) return
      try {
        const payload = await response.json()
        const listing = findListingData(payload)
        if (!listing || Number(listing.pageInfo.page) <= currentPage) return
        clearTimeout(timer)
        page.off('response', handleResponse)
        resolve(listing)
      } catch {
        // This JSON response is unrelated to the catalog.
      }
    }

    page.on('response', handleResponse)
  })
}

async function crawl(options) {
  const browser = await chromium.launch({ headless: options.headless })
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
      ['image', 'media', 'font'].includes(resourceType)
      || /(?:^|\.)(?:yandex\.ru|mc\.yandex\.ru|google-analytics\.com|googletagmanager\.com)$/i.test(hostname)
    ) {
      await route.abort()
      return
    }
    await route.continue()
  })

  const productsBySku = new Map()
  const errors = []
  let scrapedPages = 0

  try {
    console.log(`Открываем: ${options.url}`)
    await page.goto(options.url, { waitUntil: 'commit' })
    let initial = await readInitialPage(page, options.timeout)
    let listing = initial.listing
    const totalResults = Number(listing.pageInfo?.totalResults) || null
    const pageSize = Number(listing.pageInfo?.pageSize) || null

    for (let index = 0; index < options.pages; index += 1) {
      const pageNumber = Number(listing.pageInfo?.page) || index + 1
      const detectedCategory = categoryFromListing(listing)
      const categoryName = options.category || detectedCategory
      let added = 0

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
        if (!existed) added += 1
      }

      scrapedPages += 1
      const output = {
        source: {
          site: 'maketto.jp',
          url: options.url,
          requestedPages: options.pages,
          scrapedPages,
          currentPage: pageNumber,
          totalResults,
          pageSize,
          generatedAt: new Date().toISOString(),
        },
        products: [...productsBySku.values()],
        errors,
      }
      await saveOutput(options.output, output)
      console.log(`Страница ${pageNumber}: найдено ${listing.products?.length ?? 0}, новых ${added}, всего ${productsBySku.size}`)

      if (index === options.pages - 1) break
      if (pageSize && totalResults && pageNumber * pageSize >= totalResults) {
        console.log('Достигнута последняя страница каталога.')
        break
      }
      if (!(await markNextButton(page))) {
        console.log('Кнопка следующей страницы не найдена. Обход завершён.')
        break
      }

      await ensureCatalogHydrated(page, options.timeout)
      if (!(await markNextButton(page))) {
        console.log('После загрузки каталога следующая страница недоступна.')
        break
      }
      const nextListing = waitForNextListing(page, pageNumber, options.timeout)
      await page.locator('[data-maketto-crawler-next="true"]').click({ force: true })
      listing = await nextListing
      if (options.delay > 0) await page.waitForTimeout(options.delay)
    }

    console.log(`\nГотово. Страниц: ${scrapedPages}, товаров: ${productsBySku.size}`)
    console.log(`JSON: ${options.output}`)
  } catch (error) {
    errors.push({ date: new Date().toISOString(), message: error.message })
    if (productsBySku.size > 0) {
      await saveOutput(options.output, {
        source: {
          site: 'maketto.jp',
          url: options.url,
          requestedPages: options.pages,
          scrapedPages,
          generatedAt: new Date().toISOString(),
          incomplete: true,
        },
        products: [...productsBySku.values()],
        errors,
      })
      console.error(`Обход прерван, но ${productsBySku.size} товаров сохранены в ${options.output}`)
    }
    throw error
  } finally {
    await browser.close()
  }
}

try {
  const options = parseArgs(process.argv.slice(2))
  await crawl(options)
} catch (error) {
  console.error(`Ошибка: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
