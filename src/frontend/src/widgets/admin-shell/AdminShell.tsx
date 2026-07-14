import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, Package, LogOut } from 'lucide-react'
import { useAuth } from '@/features/auth/model/AuthContext'
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher'
import { Button } from '@/shared/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'
import { cn } from '@/shared/lib/utils'

const navItems: Array<{ to: string; labelKey: string; end?: boolean }> = [
  { to: '/admin', labelKey: 'nav.dashboard', end: true },
  { to: '/admin/orders', labelKey: 'nav.orders' },
  { to: '/admin/customers', labelKey: 'nav.customers' },
  { to: '/admin/admins', labelKey: 'nav.admins' },
  { to: '/admin/statuses', labelKey: 'nav.statuses' },
]

function NavLinks({
  onNavigate,
  className,
  itemClassName,
}: {
  onNavigate?: () => void
  className?: string
  itemClassName?: string
}) {
  const { t } = useTranslation()

  return (
    <nav className={className}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              itemClassName,
            )
          }
        >
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}

export function AdminShell() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.menu')}
          >
            <Menu />
          </Button>

          <Package className="h-5 w-5 shrink-0 text-primary" aria-hidden />

          <NavLinks
            className="hidden min-w-0 flex-1 items-center gap-1 md:flex"
            itemClassName="shrink-0 whitespace-nowrap"
          />

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void logout()}
              aria-label={t('nav.logout')}
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[280px] sm:max-w-[280px]">
          <SheetHeader>
            <SheetTitle>{t('nav.menu')}</SheetTitle>
          </SheetHeader>
          <NavLinks
            className="mt-4 flex flex-col gap-1 px-2"
            onNavigate={() => setMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
