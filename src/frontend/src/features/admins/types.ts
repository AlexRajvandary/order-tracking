export type AdminUser = {
  id: string
  login: string
  displayName: string | null
  role: string
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
}

export type UpdateAdminRequest = {
  displayName?: string | null
  isActive: boolean
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
