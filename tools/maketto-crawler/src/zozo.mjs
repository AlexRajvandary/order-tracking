import { chromium } from 'playwright'

const ZOZO_ORIGIN = 'https://zozo.jp'

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff\u0400-\u04ff]+/giu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'item'
}

function parseYen(value) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '')
  if (!digits) return null
  const result = Number(digits)
  return Number.isFinite(result) ? result : null
}

function absoluteUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    return new URL(value.trim(), ZOZO_ORIGIN).toString()
  } catch {
    return null
  }
}

function productFromGood(good) {
  const id = String(good?.goodsId ?? good?.goodsCode ?? '').trim()
  const name = typeof good?.goodsName === 'string' ? good.goodsName.trim().slice(0, 500) : ''
  const imageUrl = absoluteUrl(good?.goodsImageUrl || good?.goodsImage215Url)
  const regularPrice = parseYen(good?.properPrice)
  const salePrice = parseYen(good?.salePrice)
  const price = salePrice ?? regularPrice
  if (!id || !name || !imageUrl || price == null) return null

  const brand = typeof good?.brandName === 'string' ? good.brandName.trim() : ''
  const shopName = 'ZOZOTOWN'
  const originalPrice = regularPrice != null && regularPrice > price ? regularPrice : null

  return {
    name,
    sku: `zozo-${id}`.slice(0, 100),
    brand: brand || null,
    brandSlug: brand ? slugify(brand) : null,
    price,
    currencyCode: 'JPY',
    originalPrice,
    originalCurrencyCode: originalPrice == null ? null : 'JPY',
    imageUrl,
    sourceUrl: absoluteUrl(good?.goodsUrl),
    condition: Number(good?.goodsType) === 2 ? 'used' : 'new',
    shopName,
    shopSlug: slugify(shopName),
    isActive: !good?.isSoldOut,
  }
}

export function parseZozoNextData(raw) {
  const nextData = JSON.parse(raw)
  const pageProps = nextData?.props?.pageProps
  const catalog = pageProps?.goodsCatalogContents
  if (!catalog || !Array.isArray(catalog.goods)) {
    throw new Error('В __NEXT_DATA__ отсутствует каталог товаров ZOZO.')
  }

  const currentPage = Number(catalog.page?.currentPage)
  const lastPage = Number(catalog.page?.lastPage ?? catalog.pager?.last)
  if (!Number.isInteger(currentPage) || currentPage < 1) {
    throw new Error('ZOZO не вернул номер текущей страницы.')
  }

  return {
    currentPage,
    lastPage: Number.isInteger(lastPage) && lastPage > 0 ? lastPage : currentPage,
    totalResults: Number(pageProps?.hitCount) || null,
    products: catalog.goods.map(productFromGood).filter(Boolean),
  }
}

function pageUrl(sourceUrl, pageNumber) {
  const url = new URL(sourceUrl)
  url.searchParams.set('pno', String(pageNumber))
  return url.toString()
}

async function readPage(page, sourceUrl, pageNumber, timeout) {
  const url = pageUrl(sourceUrl, pageNumber)
  await page.goto(url, { waitUntil: 'commit', timeout })
  await page.waitForSelector('#__NEXT_DATA__', { state: 'attached', timeout })
  const raw = await page.locator('#__NEXT_DATA__').textContent()
  if (!raw) throw new Error(`ZOZO вернул пустой __NEXT_DATA__ на странице ${pageNumber}.`)
  const listing = parseZozoNextData(raw)
  if (listing.currentPage !== pageNumber) {
    throw new Error(`Ожидалась страница ${pageNumber}, но ZOZO вернул страницу ${listing.currentPage}.`)
  }
  return listing
}

export async function crawlZozo(options) {
  const startedAt = Date.now()
  const startPage = Math.max(1, Math.floor(Number(options.startPage) || 1))
  const productsBySku = new Map()
  let browser = null
  let scrapedPages = 0
  let currentPage = startPage
  let totalResults = null
  let lastPage = null

  const elapsedSeconds = () => ((Date.now() - startedAt) / 1000).toFixed(1)
  const log = (message, level = 'info') => {
    const line = `[${elapsedSeconds()} с] ${message}`
    if (level === 'error') console.error(line)
    else console.log(line)
    options.onLog?.({ level, message, line })
  }
  const ensureActive = () => {
    if (options.signal?.aborted) throw new Error('Задача crawler отменена.')
  }
  const makeOutput = () => ({
    source: {
      site: 'zozo.jp',
      url: options.url,
      requestedPages: options.pages,
      scrapedPages,
      currentPage,
      ...(totalResults ? { totalResults } : {}),
      ...(lastPage ? { lastPage } : {}),
      generatedAt: new Date().toISOString(),
      elapsedSeconds: Number(elapsedSeconds()),
    },
    products: [...productsBySku.values()],
    errors: [],
  })

  const handleAbort = () => { void browser?.close().catch(() => {}) }
  options.signal?.addEventListener('abort', handleAbort, { once: true })

  try {
    ensureActive()
    browser = await chromium.launch({ headless: options.headless !== false })
    const context = await browser.newContext({
      locale: 'ja-JP',
      viewport: { width: 1440, height: 1000 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36',
      extraHTTPHeaders: { 'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.7' },
    })
    const page = await context.newPage()
    page.setDefaultTimeout(options.timeout)
    page.setDefaultNavigationTimeout(options.timeout)
    await page.route('**/*', async (route) => {
      const request = route.request()
      const resourceType = request.resourceType()
      let hostname = ''
      try { hostname = new URL(request.url()).hostname } catch { /* ignore */ }
      if (
        ['image', 'media', 'font', 'stylesheet'].includes(resourceType)
        || /(?:google-analytics|googletagmanager|yahoo|criteo|facebook|tiktok|pinterest)/i.test(hostname)
      ) {
        await route.abort()
        return
      }
      await route.continue()
    })

    log(`Открываем каталог ZOZO: ${options.url}`)
    for (let index = 0; index < options.pages; index += 1) {
      ensureActive()
      currentPage = startPage + index
      if (lastPage != null && currentPage > lastPage) {
        log(`Достигнута последняя страница каталога ZOZO: ${lastPage}.`)
        break
      }

      const listing = await readPage(page, options.url, currentPage, options.timeout)
      totalResults = listing.totalResults ?? totalResults
      lastPage = listing.lastPage
      if (startPage > lastPage) {
        throw new Error(`Нельзя продолжить со страницы ${startPage}: в каталоге ZOZO только ${lastPage} страниц.`)
      }

      await options.onPageStart?.({
        pageNumber: currentPage,
        scrapedPages,
        requestedPages: options.pages,
        totalProducts: productsBySku.size,
      })

      const newProducts = []
      for (const product of listing.products) {
        if (productsBySku.has(product.sku)) continue
        productsBySku.set(product.sku, product)
        newProducts.push(product)
      }

      scrapedPages += 1
      log(`Страница ${currentPage}: товаров ${listing.products.length}, новых ${newProducts.length}, всего ${productsBySku.size}.`)
      await options.onPage?.({
        pageNumber: currentPage,
        scrapedPages,
        requestedPages: options.pages,
        newProducts,
        totalProducts: productsBySku.size,
      })

      if (currentPage >= lastPage || index === options.pages - 1) break
      if (options.delay > 0) await page.waitForTimeout(options.delay)
    }

    log(`Обход ZOZO завершён. Страниц: ${scrapedPages}, товаров: ${productsBySku.size}.`)
    return makeOutput()
  } catch (error) {
    if (!options.signal?.aborted) {
      log(`Обход ZOZO прерван: ${error instanceof Error ? error.message : String(error)}`, 'error')
    }
    throw error
  } finally {
    options.signal?.removeEventListener('abort', handleAbort)
    await browser?.close().catch(() => {})
  }
}
