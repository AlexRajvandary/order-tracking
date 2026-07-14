import type { VisibilityState } from '@tanstack/react-table'
import type { UserSettings } from '@/features/auth/types'

const STORAGE_PREFIX = 'ot:user-settings:'

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

export function readLocalUserSettings(userId: string): UserSettings | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserSettings
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function writeLocalUserSettings(userId: string, settings: UserSettings) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(settings))
  } catch {
    // ignore quota / private mode
  }
}

export function normalizeUserSettings(settings: unknown): UserSettings {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return {}
  }
  return settings as UserSettings
}

/** Prefer local table overrides, fill gaps from server. */
export function mergeUserSettings(server: UserSettings, local: UserSettings | null): UserSettings {
  if (!local) return server

  return {
    ...server,
    ...local,
    tables: {
      ...server.tables,
      ...local.tables,
    },
  }
}

export function getTableColumnVisibility(
  settings: UserSettings,
  tableId: string,
): VisibilityState {
  const visibility = settings.tables?.[tableId]?.columnVisibility
  return visibility && typeof visibility === 'object' ? { ...visibility } : {}
}

export function withTableColumnVisibility(
  settings: UserSettings,
  tableId: string,
  columnVisibility: VisibilityState,
): UserSettings {
  return {
    ...settings,
    tables: {
      ...settings.tables,
      [tableId]: {
        ...settings.tables?.[tableId],
        columnVisibility,
      },
    },
  }
}
