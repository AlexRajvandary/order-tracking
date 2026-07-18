import type { VisibilityState } from '@tanstack/react-table'

export type TableSettings = {
  columnVisibility?: VisibilityState
}

export type UserSettings = {
  tables?: Record<string, TableSettings>
}

export type CurrentUser = {
  id: string
  login: string
  displayName: string | null
  role: string
  settings: UserSettings
  telegramId?: number | null
  telegramUsername?: string | null
  telegramAvatarUrl?: string | null
}

export type AuthTokens = {
  accessToken: string
  accessTokenExpiresAt: string
  user: CurrentUser
}

export type LoginRequest = {
  login: string
  password: string
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
}
