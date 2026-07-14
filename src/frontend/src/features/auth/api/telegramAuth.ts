import { apiFetch } from '@/shared/api/client'
import type { AuthTokens } from '@/features/auth/types'
import type { TelegramAuthPayload, TelegramConfig } from '@/features/admins/types'

export function getTelegramConfig() {
  return apiFetch<TelegramConfig>('/auth/telegram-config')
}

export function loginWithTelegram(payload: TelegramAuthPayload) {
  return apiFetch<AuthTokens>('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Telegram Login Widget raw user → API payload */
export function mapTelegramWidgetUser(user: Record<string, unknown>): TelegramAuthPayload {
  return {
    id: Number(user.id),
    firstName: String(user.first_name ?? ''),
    lastName: user.last_name != null ? String(user.last_name) : null,
    username: user.username != null ? String(user.username) : null,
    photoUrl: user.photo_url != null ? String(user.photo_url) : null,
    authDate: Number(user.auth_date),
    hash: String(user.hash ?? ''),
  }
}
