import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

const locales = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
] as const

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation()

  const changeLanguage = (code: string) => {
    void i18n.changeLanguage(code)
    localStorage.setItem('locale', code)
    document.documentElement.lang = code
  }

  const current = i18n.language?.startsWith('en') ? 'EN' : 'RU'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          aria-label={t('language')}
        >
          <Languages />
          {current}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => changeLanguage(locale.code)}
          >
            {locale.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
