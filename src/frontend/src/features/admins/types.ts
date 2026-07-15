export type AdminRole = 'Moderator' | 'Admin' | 'SuperAdmin'

export type AdminUser = {
  id: string
  login: string
  displayName: string | null
  role: AdminRole | string
  isActive: boolean
  isOnline: boolean
  lastSeenAt: string | null
  telegramId: number | null
  telegramUsername: string | null
  createdAt: string
}

export type CreateAdminRequest = {
  login: string
  password: string
  displayName?: string | null
  role: AdminRole
}

export type UpdateAdminRequest = {
  displayName?: string | null
  isActive: boolean
  role?: AdminRole | null
}

export type TelegramAuthPayload = {
  id: number
  firstName: string
  lastName?: string | null
  username?: string | null
  photoUrl?: string | null
  authDate: number
  hash: string
}

export type TelegramConfig = {
  enabled: boolean
  botUsername: string | null
}

export function isAdminRole(value: string | null | undefined): value is AdminRole {
  return value === 'Moderator' || value === 'Admin' || value === 'SuperAdmin'
}
