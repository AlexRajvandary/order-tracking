import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  CircleHelp,
  ClipboardList,
  KeyRound,
  Languages,
  ListChecks,
  LogOut,
  Menu,
  Package,
  User,
} from 'lucide-react'
import * as authApi from '@/features/auth/api/authApi'
import { useAuth } from '@/features/auth/model/AuthContext'
import { ApiError } from '@/shared/api/client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'
import { cn } from '@/shared/lib/utils'
import type { AdminRole } from '@/features/admins/types'
import { getTelegramWebApp, isTelegramMiniApp } from '@/shared/lib/telegram-mini-app'

const operationalRoles: AdminRole[] = ['Moderator', 'Admin', 'SuperAdmin']
const allRoles: AdminRole[] = ['Buyer', ...operationalRoles]

const navItems: Array<{
  to: string
  labelKey: string
  end?: boolean
  roles?: AdminRole[]
}> = [
  { to: '/admin', labelKey: 'nav.dashboard', end: true, roles: operationalRoles },
  { to: '/admin/orders', labelKey: 'nav.orders', roles: operationalRoles },
  { to: '/admin/procurements', labelKey: 'nav.procurements', roles: allRoles },
  { to: '/admin/customers', labelKey: 'nav.customers', roles: operationalRoles },
  { to: '/admin/products', labelKey: 'nav.products', roles: operationalRoles },
  { to: '/admin/catalog-analytics', labelKey: 'nav.catalogAnalytics', roles: operationalRoles },
  { to: '/admin/storefront-announcement', labelKey: 'nav.storefrontAnnouncement', roles: operationalRoles },
  { to: '/admin/admins', labelKey: 'nav.admins', roles: ['Admin', 'SuperAdmin'] },
]

function NavLinks({
  onNavigate,
  className,
  itemClassName,
  userRole,
}: {
  onNavigate?: () => void
  className?: string
  itemClassName?: string
  userRole?: string | null
}) {
  const { t } = useTranslation()

  return (
    <nav className={className}>
      {navItems
        .filter((item) => !item.roles || (userRole != null && item.roles.includes(userRole as AdminRole)))
        .map((item) => (
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
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const currentLanguage = i18n.language?.startsWith('en') ? 'en' : 'ru'
  const miniApp = isTelegramMiniApp()

  useEffect(() => {
    if (!miniApp) return
    const webApp = getTelegramWebApp()
    if (!webApp) return

    const back = () => {
      if (menuOpen) {
        setMenuOpen(false)
        return
      }
      if (passwordDialogOpen) {
        setPasswordDialogOpen(false)
        return
      }

      const path = location.pathname
      const parent = path === '/admin/orders/new' ? '/admin/orders'
        : /^\/admin\/orders\/[^/]+/.test(path) ? '/admin/orders'
          : /^\/admin\/customers\/[^/]+/.test(path) ? '/admin/customers'
            : /^\/admin\/products\/[^/]+/.test(path) ? '/admin/products'
              : /^\/admin\/audit\/[^/]+/.test(path) ? '/admin/audit'
                : path.startsWith('/admin/procurements/') ? '/admin/procurements'
                  : '/admin'
      navigate(parent, { replace: true })
    }

    if (location.pathname === '/admin') webApp.BackButton.hide()
    else webApp.BackButton.show()
    webApp.BackButton.onClick(back)
    return () => webApp.BackButton.offClick(back)
  }, [location.pathname, menuOpen, miniApp, navigate, passwordDialogOpen])

  useEffect(() => {
    if (user?.role === 'Buyer' && location.pathname !== '/admin/procurements') {
      navigate('/admin/procurements', { replace: true })
    }
  }, [location.pathname, navigate, user?.role])

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError(null)
      setPasswordChanged(true)
    },
    onError: (error: unknown) => {
      setPasswordChanged(false)
      setPasswordError(
        error instanceof ApiError && error.detail === 'Current password is incorrect'
          ? t('changePassword.currentPasswordIncorrect', { ns: 'auth' })
          : error instanceof ApiError
            ? error.message
            : t('error'),
      )
    },
  })

  const changeLanguage = (language: string) => {
    void i18n.changeLanguage(language)
    localStorage.setItem('locale', language)
    document.documentElement.lang = language
  }

  return (
    <div
      className={cn('min-h-screen bg-background', miniApp && 'telegram-mini-app-shell')}
      style={miniApp ? { minHeight: 'var(--tg-viewport-height, 100dvh)' } : undefined}
    >
      <header
        className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80"
        style={miniApp ? { backgroundColor: 'var(--tg-app-background, var(--card))' } : undefined}
      >
        <div
          className={cn(
            'mx-auto flex max-w-6xl items-center gap-3 px-4 py-3',
            miniApp && 'telegram-mini-app-header-inner',
          )}
          style={miniApp ? {
            paddingLeft: 'max(1rem, env(safe-area-inset-left), var(--tg-safe-left, 0px), var(--tg-content-safe-left, 0px))',
            paddingRight: 'max(1rem, env(safe-area-inset-right), var(--tg-safe-right, 0px), var(--tg-content-safe-right, 0px))',
          } : undefined}
        >
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
            userRole={user?.role}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="ml-auto min-w-0 max-w-48 gap-2">
                <Avatar className="after:border-0">
                  {user?.telegramAvatarUrl ? (
                    <AvatarImage
                      src={user.telegramAvatarUrl}
                      alt={user.displayName ?? user.login ?? 'Аватар администратора'}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-transparent text-foreground">
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{user?.displayName || user?.login}</span>
                <ChevronDown className="shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Languages className="size-4" />
                {t('language')}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={currentLanguage}
                onValueChange={changeLanguage}
              >
                <DropdownMenuRadioItem value="ru">Русский</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              {user?.role !== 'Buyer' ? (
                <>
                  <DropdownMenuItem onClick={() => navigate('/admin/statuses')}>
                    <ListChecks />
                    {t('nav.statuses')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/audit')}>
                    <ClipboardList />
                    {t('nav.audit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/help')}>
                    <CircleHelp />
                    {t('nav.help')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem
                onClick={() => {
                  setPasswordError(null)
                  setPasswordChanged(false)
                  setPasswordDialogOpen(true)
                }}
              >
                <KeyRound />
                {t('changePassword.menu', { ns: 'auth' })}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
                <LogOut />
                {t('nav.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className={cn(
            'w-[280px] sm:max-w-[280px]',
            miniApp && 'telegram-mini-app-navigation-panel',
          )}
        >
          <SheetHeader>
            <SheetTitle>{t('nav.menu')}</SheetTitle>
          </SheetHeader>
          <NavLinks
            className="mt-4 flex flex-col gap-1 px-2"
            onNavigate={() => setMenuOpen(false)}
            userRole={user?.role}
          />
        </SheetContent>
      </Sheet>

      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open)
          if (!open) {
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setPasswordError(null)
            setPasswordChanged(false)
            changePasswordMutation.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changePassword.title', { ns: 'auth' })}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              setPasswordChanged(false)

              if (newPassword !== confirmPassword) {
                setPasswordError(t('changePassword.passwordsDoNotMatch', { ns: 'auth' }))
                return
              }

              setPasswordError(null)
              changePasswordMutation.mutate({ currentPassword, newPassword })
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="current-password">
                {t('changePassword.currentPassword', { ns: 'auth' })}
              </Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                required
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">
                {t('changePassword.newPassword', { ns: 'auth' })}
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                required
                minLength={4}
                autoComplete="new-password"
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">
                {t('changePassword.confirmPassword', { ns: 'auth' })}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                required
                minLength={4}
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            {passwordError ? (
              <Alert variant="destructive">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            ) : null}
            {passwordChanged ? (
              <Alert>
                <AlertDescription>
                  {t('changePassword.success', { ns: 'auth' })}
                </AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordDialogOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {t('changePassword.submit', { ns: 'auth' })}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <main
        className="mx-auto max-w-6xl px-4 py-6"
        style={miniApp ? {
          paddingLeft: 'max(1rem, env(safe-area-inset-left), var(--tg-safe-left, 0px), var(--tg-content-safe-left, 0px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right), var(--tg-safe-right, 0px), var(--tg-content-safe-right, 0px))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom), var(--tg-safe-bottom, 0px), var(--tg-content-safe-bottom, 0px))',
        } : undefined}
      >
        <Outlet />
      </main>
    </div>
  )
}
