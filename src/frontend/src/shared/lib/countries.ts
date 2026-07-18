/** ISO 3166-1 alpha-2 country codes. Labels come from Intl.DisplayNames (ru/en). */
export const COUNTRY_CODES = [
  'AF', 'AX', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AQ', 'AG', 'AR', 'AM', 'AW', 'AU', 'AT',
  'AZ', 'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BM', 'BT', 'BO', 'BQ', 'BA', 'BW',
  'BV', 'BR', 'IO', 'BN', 'BG', 'BF', 'BI', 'CV', 'KH', 'CM', 'CA', 'KY', 'CF', 'TD', 'CL',
  'CN', 'CX', 'CC', 'CO', 'KM', 'CG', 'CD', 'CK', 'CR', 'CI', 'HR', 'CU', 'CW', 'CY', 'CZ',
  'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FK', 'FO', 'FJ',
  'FI', 'FR', 'GF', 'PF', 'TF', 'GA', 'GM', 'GE', 'DE', 'GH', 'GI', 'GR', 'GL', 'GD', 'GP',
  'GU', 'GT', 'GG', 'GN', 'GW', 'GY', 'HT', 'HM', 'VA', 'HN', 'HK', 'HU', 'IS', 'IN', 'ID',
  'IR', 'IQ', 'IE', 'IM', 'IL', 'IT', 'JM', 'JP', 'JE', 'JO', 'KZ', 'KE', 'KI', 'KP', 'KR',
  'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MO', 'MG', 'MW', 'MY',
  'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU', 'YT', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MS',
  'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NL', 'NC', 'NZ', 'NI', 'NE', 'NG', 'NU', 'NF', 'MK',
  'MP', 'NO', 'OM', 'PK', 'PW', 'PS', 'PA', 'PG', 'PY', 'PE', 'PH', 'PN', 'PL', 'PT', 'PR',
  'QA', 'RE', 'RO', 'RU', 'RW', 'BL', 'SH', 'KN', 'LC', 'MF', 'PM', 'VC', 'WS', 'SM', 'ST',
  'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SX', 'SK', 'SI', 'SB', 'SO', 'ZA', 'GS', 'SS', 'ES',
  'LK', 'SD', 'SR', 'SJ', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TK', 'TO',
  'TT', 'TN', 'TR', 'TM', 'TC', 'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UM', 'UY', 'UZ', 'VU',
  'VE', 'VN', 'VG', 'VI', 'WF', 'EH', 'YE', 'ZM', 'ZW',
] as const

export type CountryCode = (typeof COUNTRY_CODES)[number]

export type CountryOption = {
  code: string
  label: string
}

const displayNamesCache = new Map<string, Intl.DisplayNames>()

function getDisplayNames(locale: string) {
  const lang = locale.toLowerCase().startsWith('ru') ? 'ru' : 'en'
  let cached = displayNamesCache.get(lang)
  if (!cached) {
    cached = new Intl.DisplayNames([lang], { type: 'region' })
    displayNamesCache.set(lang, cached)
  }
  return cached
}

export function isCountryCode(value: string | null | undefined): value is CountryCode {
  if (!value) return false
  return (COUNTRY_CODES as readonly string[]).includes(value.toUpperCase())
}

/** Localized country name for an ISO code; falls back to the raw value. */
export function getCountryLabel(code: string | null | undefined, locale: string): string {
  if (!code?.trim()) return ''
  const normalized = code.trim().toUpperCase()
  if (normalized.length === 2) {
    const label = getDisplayNames(locale).of(normalized)
    if (label) return label
  }
  return code.trim()
}

export function getCountryOptions(locale: string): CountryOption[] {
  const displayNames = getDisplayNames(locale)
  return [...COUNTRY_CODES]
    .map((code) => ({
      code,
      label: displayNames.of(code) ?? code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale.toLowerCase().startsWith('ru') ? 'ru' : 'en'))
}
