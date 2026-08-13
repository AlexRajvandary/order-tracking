import type { ImportProductItem } from '../types'

export type HtmlProductParserId = 'zenplus' | 'lamoda' | 'maketto'

export const HTML_PRODUCT_PARSERS: ReadonlyArray<{ id: HtmlProductParserId }> = [
  { id: 'zenplus' },
  { id: 'lamoda' },
  { id: 'maketto' },
]

const ZENPLUS_ORIGIN = 'https://www.zenplus.jp'
const LAMODA_ORIGIN = 'https://www.lamoda.ru'
const MAKETTO_ORIGIN = 'https://maketto.jp'

function decodeHtmlEntities(value: string): string {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

function stripTags(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'item'
}

function parsePositiveNumber(value?: string): number | null {
  if (!value) return null
  const parsed = Number(value.replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function absoluteUrl(value: string, origin: string): string {
  const decoded = decodeHtmlEntities(value).trim()
  if (!decoded) return ''
  if (decoded.startsWith('//')) return `https:${decoded}`
  try {
    return new URL(decoded, origin).toString()
  } catch {
    return decoded
  }
}

function parseZenPlusHtml(html: string): ImportProductItem[] {
  const cardPattern =
    /<a class="product-item product-link"[^>]*href="([^"]+)"[\s\S]*?<\/a>\s*<\/div>/g
  const products: ImportProductItem[] = []
  const seen = new Set<string>()

  for (const match of html.matchAll(cardPattern)) {
    const body = match[0]
    const href = match[1]
    const titleAttribute = body.match(/class="item-title[^"]*"[^>]*title="([^"]*)"/)?.[1]
    const titleContent = body.match(/class="item-title[^"]*"[^>]*>([\s\S]*?)<\/h3>/)?.[1]
    const name = stripTags(titleAttribute || titleContent || '').slice(0, 500)
    if (!name) continue

    const rawImage = body.match(/<img[^>]*src="([^"]+)"/)?.[1] ?? ''
    const imageUrl = absoluteUrl(rawImage, ZENPLUS_ORIGIN).replace(
      /-small(\.[a-z0-9]+)(\?|$)/i,
      '$1$2',
    )
    const price = parsePositiveNumber(body.match(/data-rub="([^"]+)"/)?.[1])
    if (!imageUrl || price == null) continue

    const originalPrice = parsePositiveNumber(body.match(/data-jpy="([^"]+)"/)?.[1])
    const shopBadge = body.match(/product-badge-shop">\s*([^<]+)/)?.[1]
    const storeBadge = body.match(/product-badge-store">\s*([^<]+)/)?.[1]
    const conditionBadge = body.match(/product-badge-condition-[^"]*">\s*([^<]+)/)?.[1]
    const shopName = decodeHtmlEntities(storeBadge || shopBadge || '')
      .split('|')[0]
      ?.trim() || null
    const conditionLabel = decodeHtmlEntities(conditionBadge || '').trim().toLowerCase()
    const condition = conditionLabel.includes('новое') || conditionLabel.includes('new')
      ? 'new'
      : 'used'

    const categories: string[] = []
    const categoryBlock = body.match(/ssv2-card-cats[\s\S]*?<\/div>/)?.[0]
    if (categoryBlock) {
      for (const categoryMatch of categoryBlock.matchAll(/ssv2-cat-link[^>]*>([^<]+)/g)) {
        const category = stripTags(categoryMatch[1])
        if (category && !categories.includes(category)) categories.push(category)
      }
    }

    const zenplusUrl = absoluteUrl(href, ZENPLUS_ORIGIN)
    let sourceUrl = zenplusUrl
    let externalId: string | null = null
    try {
      const url = new URL(zenplusUrl)
      const nestedUrl = url.searchParams.get('u')
      if (nestedUrl && /^https?:\/\//i.test(nestedUrl)) sourceUrl = nestedUrl
      for (const key of ['id', 'itemCode', 'pid']) {
        const value = url.searchParams.get(key)
        if (value) {
          externalId = value
          break
        }
      }
      if (!externalId) externalId = url.pathname.match(/\/(t\d+)\b/i)?.[1] ?? null
    } catch {
      // Keep the resolved URL without an external id.
    }

    const sku = externalId ? `zenplus-${externalId}` : null
    const dedupeKey = sku || sourceUrl || `${name}|${imageUrl}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    products.push({
      name,
      price,
      currencyCode: 'RUB',
      imageUrl,
      sku,
      brand: 'Louis Vuitton',
      shopName,
      shopSlug: shopName ? slugify(shopName) : null,
      condition,
      categories,
      sourceUrl,
      originalPrice,
      originalCurrencyCode: originalPrice == null ? null : 'JPY',
      isActive: true,
    })
  }

  return products
}

const LAMODA_CATEGORY_NAMES: Record<string, string> = {
  'женские-сумки': 'Женские сумки',
  'клатчи': 'Клатчи',
  'кросс-боди': 'Кросс-боди',
  'женские-рюкзаки': 'Женские рюкзаки',
  'сумки-на-плечо': 'Сумки на плечо',
}

function normalizeLamodaHtml(value: string): string {
  if (value.includes('x-product-card__card')) return value
  return value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\//g, '/')
}

function parseLamodaHtml(source: string): ImportProductItem[] {
  const html = normalizeLamodaHtml(source)
  const parts = html.split(/<div id="([A-Z0-9]+)" class="x-product-card__card/)
  const products: ImportProductItem[] = []
  const seen = new Set<string>()

  for (let index = 1; index < parts.length; index += 2) {
    const id = parts[index]
    const body = parts[index + 1] || ''
    if (!body.includes('x-product-card-description')) continue

    const href = body.match(/href="(\/p\/[^"?]+)/)?.[1] ?? ''
    const imageCandidates = [
      ...body.matchAll(/(?:data-src|src)="(\/\/a\.lmcdn\.ru\/img[^"]+)"/g),
    ].map((match) => match[1])
    const rawImage = imageCandidates.find((url) => url.includes('img389x562'))
      || imageCandidates[0]
      || ''
    const imageUrl = absoluteUrl(rawImage, LAMODA_ORIGIN)

    const brand = stripTags(
      body.match(/x-product-card-description__brand-name[^>]*>([^<]+)/)?.[1] ?? '',
    )
    const productName = stripTags(
      body.match(/x-product-card-description__product-name[^>]*>([^<]+)/)?.[1]
        ?? 'Сумка',
    )
    const name = `${brand} ${productName}`.trim().slice(0, 500)

    const priceText = body.match(/price-new[^>]*>\s*([\d\s]+)\s*(?:₽|&#8381;)/)?.[1]
      || body.match(/price-single[^>]*>\s*([\d\s]+)\s*(?:₽|&#8381;)/)?.[1]
    const price = parsePositiveNumber(priceText)
    if (!id || !imageUrl || price == null) continue

    const originalPrice = parsePositiveNumber(
      body.match(/price-old[^>]*>\s*([\d\s]+)/)?.[1],
    )
    const pathParts = href.split('/').filter(Boolean)
    const pathSlug = pathParts.at(-1) || id.toLowerCase()
    const categoryPath = (pathParts[2] || '').toLowerCase()
    let categorySlug = 'женские-сумки'
    if (categoryPath.includes('klatch')) categorySlug = 'клатчи'
    else if (categoryPath.includes('poyasnaya')) categorySlug = 'кросс-боди'
    else if (categoryPath.includes('ryukzak')) categorySlug = 'женские-рюкзаки'
    else if (
      categoryPath.includes('xbody')
      || categoryPath.includes('crossbody')
      || categoryPath.includes('через')
    ) categorySlug = 'кросс-боди'
    else if (categoryPath.includes('sportivnaya') || categoryPath.includes('duffel')) {
      categorySlug = 'сумки-на-плечо'
    }

    const sku = `lamoda-${id}`
    if (seen.has(sku)) continue
    seen.add(sku)
    products.push({
      name,
      slug: pathSlug,
      sku,
      brand: brand || null,
      price,
      currencyCode: 'RUB',
      originalPrice,
      originalCurrencyCode: originalPrice == null ? null : 'RUB',
      imageUrl,
      sourceUrl: absoluteUrl(href, LAMODA_ORIGIN),
      categoryName: LAMODA_CATEGORY_NAMES[categorySlug],
      categorySlug,
      parentCategoryName: 'Сумки',
      parentCategorySlug: 'bags',
      condition: 'new',
      shopName: 'Lamoda',
      shopSlug: 'lamoda',
      isActive: true,
    })
  }

  return products
}

type MakettoProduct = {
  shop?: unknown
  id?: unknown
  title?: unknown
  price?: unknown
  image?: unknown
  url?: unknown
}

type MakettoNextData = {
  locale?: unknown
  props?: {
    pageProps?: {
      initialReduxState?: {
        currency?: { code?: unknown }
        activeCategory?: { category?: { label?: unknown } }
        globalPages?: { queries?: Record<string, unknown> }
      }
    }
  }
}

function makettoMarketplaceName(value: string): string {
  const normalized = value.trim().toLowerCase()
  const names: Record<string, string> = {
    rakuten: 'Rakuten',
    mercari: 'Mercari',
    yauction: 'Yahoo Auctions',
    yahooauction: 'Yahoo Auctions',
    yshopping: 'Yahoo Shopping',
    uniqlo: 'Uniqlo',
  }
  return names[normalized] ?? value.trim()
}

function findMakettoProducts(queries: Record<string, unknown>): MakettoProduct[] {
  let result: MakettoProduct[] = []

  for (const query of Object.values(queries)) {
    if (!query || typeof query !== 'object') continue
    const data = (query as { data?: unknown }).data
    if (!data || typeof data !== 'object') continue
    const products = (data as { products?: unknown }).products
    if (!Array.isArray(products) || products.length <= result.length) continue
    result = products.filter(
      (product): product is MakettoProduct =>
        product != null && typeof product === 'object' && !Array.isArray(product),
    )
  }

  return result
}

function findMakettoProductUrl(
  html: string,
  shop: string,
  id: string,
  locale: string,
): string {
  const escapedShop = shop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = html.match(
    new RegExp(`href="([^"]*/product/shopping/${escapedShop}/${escapedId})"`, 'i'),
  )
  if (match?.[1]) return absoluteUrl(match[1], MAKETTO_ORIGIN)

  const localePrefix = locale.toLowerCase() === 'ru' ? '/ru' : ''
  return absoluteUrl(
    `${localePrefix}/product/shopping/${encodeURIComponent(shop)}/${encodeURIComponent(id)}`,
    MAKETTO_ORIGIN,
  )
}

function parseMakettoHtml(html: string): ImportProductItem[] {
  const nextDataText = html.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  )?.[1]
  if (!nextDataText) return []

  let nextData: MakettoNextData
  try {
    nextData = JSON.parse(nextDataText) as MakettoNextData
  } catch {
    return []
  }

  const state = nextData.props?.pageProps?.initialReduxState
  const queries = state?.globalPages?.queries
  if (!queries) return []

  const currencyValue = state.currency?.code
  const currencyCode = typeof currencyValue === 'string' && currencyValue.trim().length === 3
    ? currencyValue.trim().toUpperCase()
    : 'RUB'
  const categoryValue = state.activeCategory?.category?.label
  const categoryName = typeof categoryValue === 'string' && categoryValue.trim()
    ? categoryValue.trim().slice(0, 200)
    : null
  const locale = typeof nextData.locale === 'string' ? nextData.locale : 'ru'
  const products: ImportProductItem[] = []
  const seen = new Set<string>()

  for (const product of findMakettoProducts(queries)) {
    const shop = typeof product.shop === 'string' ? product.shop.trim() : ''
    const id = typeof product.id === 'string' || typeof product.id === 'number'
      ? String(product.id).trim()
      : ''
    const name = typeof product.title === 'string'
      ? product.title.trim().slice(0, 500)
      : ''
    const price = typeof product.price === 'number'
      ? product.price
      : parsePositiveNumber(typeof product.price === 'string' ? product.price : undefined)
    const imageUrl = typeof product.image === 'string'
      ? absoluteUrl(product.image, MAKETTO_ORIGIN)
      : ''
    if (!shop || !id || !name || price == null || !imageUrl) continue

    const sku = `maketto-${slugify(shop)}-${id}`.slice(0, 100)
    if (seen.has(sku)) continue
    seen.add(sku)

    const originalUrl = typeof product.url === 'string'
      ? absoluteUrl(product.url, MAKETTO_ORIGIN)
      : ''
    const makettoUrl = findMakettoProductUrl(html, shop, id, locale)
    const shopName = makettoMarketplaceName(shop)
    const normalizedShop = shop.toLowerCase()
    const condition = normalizedShop.includes('auction') || normalizedShop === 'mercari'
      ? 'used'
      : 'new'

    products.push({
      name,
      sku,
      price,
      currencyCode,
      imageUrl,
      sourceUrl: originalUrl || makettoUrl,
      condition,
      shopName,
      shopSlug: slugify(shopName),
      categoryName,
      categorySlug: categoryName ? slugify(categoryName) : null,
      isActive: true,
    })
  }

  return products
}

export function parseProductsHtml(
  parserId: HtmlProductParserId,
  html: string,
): ImportProductItem[] {
  if (!html.trim()) throw new Error('htmlEmpty')
  const products = parserId === 'zenplus'
    ? parseZenPlusHtml(html)
    : parserId === 'lamoda'
      ? parseLamodaHtml(html)
      : parseMakettoHtml(html)
  if (products.length === 0) throw new Error('htmlNoProducts')
  return products
}
