import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getCountryLabel, getCountryOptions, isCountryCode } from '@/shared/lib/countries'
import { SearchableSelect } from '@/shared/ui/searchable-select'

const NONE_VALUE = '__none__'

type CountrySelectProps = {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function CountrySelect({
  value,
  onValueChange,
  disabled,
  className,
}: CountrySelectProps) {
  const { t, i18n } = useTranslation('statuses')

  const items = useMemo(() => {
    const countries = getCountryOptions(i18n.language).map((c) => ({
      code: c.code,
      label: c.label,
      searchText: `${c.label} ${c.code}`,
    }))

    const list = [
      {
        code: NONE_VALUE,
        label: t('country.none'),
        searchText: t('country.none'),
      },
      ...countries,
    ]

    // Preserve legacy free-text values so the trigger still shows them.
    if (value && value !== NONE_VALUE && !isCountryCode(value)) {
      list.push({
        code: value,
        label: value,
        searchText: value,
      })
    }

    return list
  }, [i18n.language, t, value])

  const selectedValue = value || NONE_VALUE

  return (
    <SearchableSelect
      items={items}
      value={selectedValue}
      onValueChange={(next) => onValueChange(next === NONE_VALUE ? '' : next)}
      placeholder={t('country.placeholder')}
      searchPlaceholder={t('country.searchPlaceholder')}
      emptyText={t('country.empty')}
      getLabel={(item) => item.label}
      getValue={(item) => item.code}
      getSearchText={(item) => item.searchText}
      disabled={disabled}
      className={className}
    />
  )
}

export function formatCountryDisplay(
  country: string | null | undefined,
  locale: string,
): string {
  return getCountryLabel(country, locale)
}
