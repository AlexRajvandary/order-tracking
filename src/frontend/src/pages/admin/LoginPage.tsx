import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/model/AuthContext'
import { getTelegramConfig } from '@/features/auth/api/telegramAuth'
import { TelegramLoginButton } from '@/features/auth/ui/TelegramLoginButton'
import { ApiError } from '@/shared/api/client'
import { LoginForm } from '@/shared/login-form'
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher'
import { Globe } from '@/shared/ui/globe'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const { login, loginWithTelegram, isAuthenticated, isLoading } = useAuth()
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [telegramHint, setTelegramHint] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: telegramConfig } = useQuery({
    queryKey: ['telegram-config'],
    queryFn: getTelegramConfig,
  })

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-2">
          <a href="/admin/login" className="font-medium">
            {t('login.brand')}
          </a>
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm
              loginValue={loginValue}
              password={password}
              error={error}
              submitting={submitting}
              telegramHint={telegramHint}
              onLoginChange={setLoginValue}
              onPasswordChange={setPassword}
              telegramSlot={
                telegramConfig?.enabled && telegramConfig.botUsername ? (
                  <TelegramLoginButton
                    botUsername={telegramConfig.botUsername}
                    onAuth={(payload) => {
                      setError(null)
                      setTelegramHint(null)
                      setSubmitting(true)
                      void loginWithTelegram(payload)
                        .catch((err: unknown) => {
                          setError(
                            err instanceof ApiError ? err.message : t('login.telegramError'),
                          )
                        })
                        .finally(() => setSubmitting(false))
                    }}
                    onError={(message) => setError(message)}
                  />
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    {t('login.telegramNotConfigured')}
                  </p>
                )
              }
              onSubmit={() => {
                setError(null)
                setTelegramHint(null)
                setSubmitting(true)
                void login(loginValue, password)
                  .catch((err: unknown) => {
                    setError(err instanceof ApiError ? err.message : t('login.error'))
                  })
                  .finally(() => setSubmitting(false))
              }}
            />
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-zinc-950 lg:block">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.12),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-20 top-1/2 h-[70%] -translate-y-1/2 bg-[radial-gradient(circle_at_center,rgba(120,120,130,0.25),transparent_60%)] blur-2xl"
        />
        <div className="absolute inset-0 flex items-center justify-center p-8 xl:p-12">
          <div className="relative flex aspect-square w-full max-w-[min(100%,560px)] items-center justify-center">
            <Globe className="opacity-95" size={560} />
          </div>
        </div>
      </div>
    </div>
  )
}
