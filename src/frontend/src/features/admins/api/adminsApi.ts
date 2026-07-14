import { authorizedJson } from '@/shared/api/authorizedClient'
import type {
  AdminUser,
  CreateAdminRequest,
  TelegramAuthPayload,
  UpdateAdminRequest,
} from '../types'

export function getAdmins() {
  return authorizedJson<AdminUser[]>('/admins')
}

export function createAdmin(request: CreateAdminRequest) {
  return authorizedJson<AdminUser>('/admins', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function updateAdmin(id: string, request: UpdateAdminRequest) {
  return authorizedJson<AdminUser>(`/admins/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export function bindTelegram(id: string, payload: TelegramAuthPayload) {
  return authorizedJson<AdminUser>(`/admins/${id}/telegram`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function unbindTelegram(id: string) {
  return authorizedJson<AdminUser>(`/admins/${id}/telegram`, {
    method: 'DELETE',
  })
}
