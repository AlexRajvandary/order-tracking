import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { VisibilityState } from '@tanstack/react-table'
import * as authApi from '@/features/auth/api/authApi'
import { loginWithTelegram as telegramLoginApi } from '@/features/auth/api/telegramAuth'
import type { TelegramAuthPayload } from '@/features/admins/types'
import {
  getTableColumnVisibility,
  mergeUserSettings,
  normalizeUserSettings,
  readLocalUserSettings,
  withTableColumnVisibility,
  writeLocalUserSettings,
} from '@/features/auth/lib/userSettingsStorage'
import type { CurrentUser, UserSettings } from '@/features/auth/types'
import { registerAuthHolder } from '@/shared/api/authorizedClient'

type AuthState = {
  user: CurrentUser | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  settings: UserSettings
}

type AuthContextValue = AuthState & {
  login: (login: string, password: string) => Promise<void>
  loginWithTelegram: (payload: TelegramAuthPayload) => Promise<void>
  logout: () => Promise<void>
  refreshCurrentUser: () => Promise<void>
  setTableColumnVisibility: (tableId: string, visibility: VisibilityState) => void
  getTableColumnVisibility: (tableId: string) => VisibilityState
}

const AuthContext = createContext<AuthContextValue | null>(null)

function hydrateUser(user: CurrentUser): CurrentUser {
  const serverSettings = normalizeUserSettings(user.settings)
  const localSettings = readLocalUserSettings(user.id)
  const settings = mergeUserSettings(serverSettings, localSettings)
  writeLocalUserSettings(user.id, settings)
  return { ...user, settings }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const accessTokenRef = useRef<string | null>(null)
  const settingsRef = useRef<UserSettings>({})
  const userIdRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [settings, setSettings] = useState<UserSettings>({})
  const [isLoading, setIsLoading] = useState(true)

  const setAccessToken = useCallback((token: string | null) => {
    accessTokenRef.current = token
  }, [])

  const applyUser = useCallback((nextUser: CurrentUser | null) => {
    if (!nextUser) {
      userIdRef.current = null
      settingsRef.current = {}
      setUser(null)
      setSettings({})
      return
    }

    const hydrated = hydrateUser(nextUser)
    userIdRef.current = hydrated.id
    settingsRef.current = hydrated.settings
    setUser(hydrated)
    setSettings(hydrated.settings)
  }, [])

  const clearSession = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    accessTokenRef.current = null
    applyUser(null)
  }, [applyUser])

  const handleUnauthorized = useCallback(() => {
    clearSession()
    navigate('/admin/login', { replace: true })
  }, [clearSession, navigate])

  useEffect(() => {
    registerAuthHolder({
      getAccessToken: () => accessTokenRef.current,
      setAccessToken,
      onUnauthorized: handleUnauthorized,
    })
  }, [setAccessToken, handleUnauthorized])

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      try {
        const tokens = await authApi.refreshSession()
        if (cancelled) return
        setAccessToken(tokens.accessToken)
        applyUser(tokens.user)
      } catch {
        if (!cancelled) {
          clearSession()
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [applyUser, clearSession, setAccessToken])

  // Presence heartbeat while logged in (~1 lightweight request / minute)
  useEffect(() => {
    if (!user) return

    const tick = () => {
      void authApi.sendHeartbeat().catch(() => {
        // ignore transient errors; next tick retries
      })
    }

    tick()
    const id = window.setInterval(tick, 45_000)

    return () => {
      window.clearInterval(id)
    }
  }, [user])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const persistSettingsToServer = useCallback((next: UserSettings) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      void authApi.updateUserSettings(next).catch(() => {
        // local cache already updated; retry on next change
      })
    }, 400)
  }, [])

  const setTableColumnVisibility = useCallback(
    (tableId: string, visibility: VisibilityState) => {
      const userId = userIdRef.current
      if (!userId) return

      const next = withTableColumnVisibility(settingsRef.current, tableId, visibility)
      settingsRef.current = next
      setSettings(next)
      setUser((prev) => (prev ? { ...prev, settings: next } : prev))
      writeLocalUserSettings(userId, next)
      persistSettingsToServer(next)
    },
    [persistSettingsToServer],
  )

  const getColumnVisibility = useCallback(
    (tableId: string) => getTableColumnVisibility(settingsRef.current, tableId),
    [],
  )

  const login = useCallback(
    async (loginValue: string, password: string) => {
      const tokens = await authApi.login({ login: loginValue, password })
      setAccessToken(tokens.accessToken)
      applyUser(tokens.user)

      const merged = settingsRef.current
      if (Object.keys(merged.tables ?? {}).length > 0) {
        void authApi.updateUserSettings(merged).catch(() => {})
      }

      navigate('/admin', { replace: true })
    },
    [applyUser, navigate, setAccessToken],
  )

  const loginWithTelegram = useCallback(
    async (payload: TelegramAuthPayload) => {
      const tokens = await telegramLoginApi(payload)
      setAccessToken(tokens.accessToken)
      applyUser(tokens.user)

      const merged = settingsRef.current
      if (Object.keys(merged.tables ?? {}).length > 0) {
        void authApi.updateUserSettings(merged).catch(() => {})
      }

      navigate('/admin', { replace: true })
    },
    [applyUser, navigate, setAccessToken],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
      navigate('/admin/login', { replace: true })
    }
  }, [clearSession, navigate])

  const refreshCurrentUser = useCallback(async () => {
    const me = await authApi.getCurrentUser()
    applyUser(me)
  }, [applyUser])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken: accessTokenRef.current,
      isLoading,
      isAuthenticated: user !== null,
      settings,
      login,
      loginWithTelegram,
      logout,
      refreshCurrentUser,
      setTableColumnVisibility,
      getTableColumnVisibility: getColumnVisibility,
    }),
    [
      user,
      isLoading,
      settings,
      login,
      loginWithTelegram,
      logout,
      refreshCurrentUser,
      setTableColumnVisibility,
      getColumnVisibility,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
