import type { CurrencyCode } from '@/features/orders/types'

export const currencies: ReadonlyArray<{
  code: CurrencyCode
  symbol: string
}> = [
  { code: 'RUB', symbol: '₽' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
]

export function formatMoney(
  amount: number,
  currencyCode: CurrencyCode,
  locale = 'ru-RU',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'narrowSymbol',
  }).format(amount)
}
