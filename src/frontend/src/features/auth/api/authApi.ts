import { apiFetch } from '@/shared/api/client'
import { authorizedJson } from '@/shared/api/authorizedClient'
import type {
  AuthTokens,
  ChangePasswordRequest,
  CurrentUser,
  LoginRequest,
  UserSettings,
} from '../types'

export function login(request: LoginRequest) {
  return apiFetch<AuthTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function refreshSession() {
  return apiFetch<AuthTokens>('/auth/refresh', {
    method: 'POST',
  })
}

export function logout() {
  return apiFetch<void>('/auth/logout', {
    method: 'POST',
  })
}

export function getCurrentUser() {
  return authorizedJson<CurrentUser>('/auth/me')
}

export function updateUserSettings(settings: UserSettings) {
  return authorizedJson<void>('/auth/me/settings', {
    method: 'PUT',
    body: JSON.stringify(settings ?? {}),
  })
}

export function changePassword(request: ChangePasswordRequest) {
  return authorizedJson<void>('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export function sendHeartbeat() {
  return authorizedJson<void>('/auth/heartbeat', {
    method: 'POST',
  })
}
