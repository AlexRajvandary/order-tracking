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

export function isFiniteMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function formatMoney(
  amount: number,
  currencyCode: CurrencyCode,
  locale = 'ru-RU',
): string {
  if (!isFiniteMoney(amount)) return ''

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'narrowSymbol',
  }).format(amount)
}
