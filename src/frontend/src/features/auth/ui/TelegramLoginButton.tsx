import { useEffect, useRef } from 'react'
import { mapTelegramWidgetUser } from '@/features/auth/api/telegramAuth'
import type { TelegramAuthPayload } from '@/features/admins/types'

type TelegramLoginButtonProps = {
  botUsername: string
  onAuth: (payload: TelegramAuthPayload) => void
  onError?: (message: string) => void
  className?: string
}

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void
  }
}

/**
 * Renders Telegram Login Widget script button.
 * Requires BotFather domain allowlist for the current host.
 */
export function TelegramLoginButton({
  botUsername,
  onAuth,
  onError,
  className,
}: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onAuthRef = useRef(onAuth)
  const onErrorRef = useRef(onError)
  onAuthRef.current = onAuth
  onErrorRef.current = onError

  useEffect(() => {
    const container = containerRef.current
    if (!container || !botUsername) return

    const callbackName = `onTelegramAuth_${botUsername.replace(/\W/g, '_')}_${Date.now()}`

    ;(window as unknown as Record<string, unknown>)[callbackName] = (
      user: Record<string, unknown>,
    ) => {
      try {
        onAuthRef.current(mapTelegramWidgetUser(user))
      } catch (err) {
        onErrorRef.current?.(err instanceof Error ? err.message : 'Telegram auth failed')
      }
    }

    container.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-onauth', `${callbackName}(user)`)
    script.setAttribute('data-request-access', 'write')
    container.appendChild(script)

    return () => {
      delete (window as unknown as Record<string, unknown>)[callbackName]
      container.innerHTML = ''
    }
  }, [botUsername])

  return <div ref={containerRef} className={className} />
}
