import assert from 'node:assert/strict'
import test from 'node:test'
import { buildZozoPageUrl, parseZozoNextData } from './zozo.mjs'

test('buildZozoPageUrl normalizes the category path and preserves filters', () => {
  assert.equal(
    buildZozoPageUrl('https://zozo.jp/category/skirt?sex=women', 3),
    'https://zozo.jp/category/skirt/?sex=women&pno=3',
  )
})

test('parseZozoNextData maps catalog products and paging', () => {
  const result = parseZozoNextData(JSON.stringify({
    props: {
      pageProps: {
        hitCount: 250,
        goodsCatalogContents: {
          page: { currentPage: 2, lastPage: 10 },
          goods: [{
            goodsId: 102666838,
            goodsName: 'ブラウス',
            goodsImageUrl: 'https://c.imgz.jp/product.jpg',
            goodsUrl: 'https://e.s4p.jp/product-link',
            properPrice: '¥3,990',
            salePrice: '¥2,690',
            brandName: 'Ada.',
            shopName: 'Ada.',
            goodsType: 1,
            isSoldOut: false,
          }],
        },
      },
    },
  }))

  assert.equal(result.currentPage, 2)
  assert.equal(result.lastPage, 10)
  assert.equal(result.totalResults, 250)
  assert.equal(result.products.length, 1)
  assert.deepEqual(result.products[0], {
    name: 'ブラウス',
    sku: 'zozo-102666838',
    brand: 'Ada.',
    brandSlug: 'ada',
    price: 2690,
    currencyCode: 'JPY',
    originalPrice: 3990,
    originalCurrencyCode: 'JPY',
    imageUrl: 'https://c.imgz.jp/product.jpg',
    sourceUrl: 'https://e.s4p.jp/product-link',
    condition: 'new',
    shopName: 'ZOZOTOWN',
    shopSlug: 'zozotown',
    isActive: true,
  })
})

test('parseZozoNextData rejects pages without a product catalog', () => {
  assert.throws(
    () => parseZozoNextData('{"props":{"pageProps":{}}}'),
    /отсутствует каталог товаров ZOZO/,
  )
})
