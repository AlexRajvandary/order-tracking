export type TelegramSafeArea = { top: number; right: number; bottom: number; left: number }

export type TelegramWebApp = {
  initData: string
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: { bg_color?: string; secondary_bg_color?: string; text_color?: string }
  safeAreaInset?: TelegramSafeArea
  contentSafeAreaInset?: TelegramSafeArea
  viewportStableHeight?: number
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
  ready: () => void
  expand: () => void
  requestFullscreen?: () => void
  isFullscreen?: boolean
  isVersionAtLeast?: (version: string) => boolean
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  setBottomBarColor?: (color: string) => void
  onEvent: (event: string, callback: () => void) => void
  offEvent: (event: string, callback: () => void) => void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

/**
 * Telegram normally exposes the signed payload through WebApp.initData. Reading
 * tgWebAppData from the launch URL as a fallback also covers clients where the
 * SDK object becomes available before it has copied launch parameters.
 */
export function getTelegramInitData(): string {
  const fromSdk = getTelegramWebApp()?.initData
  if (fromSdk) return fromSdk

  const query = new URLSearchParams(window.location.search)
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return query.get('tgWebAppData') || fragment.get('tgWebAppData') || ''
}

export function isTelegramMiniApp(): boolean {
  return Boolean(getTelegramWebApp() || getTelegramInitData())
}

function writeInsets(webApp: TelegramWebApp) {
  const root = document.documentElement
  const safe = webApp.safeAreaInset
  const content = webApp.contentSafeAreaInset
  root.style.setProperty('--tg-safe-top', `${safe?.top ?? 0}px`)
  root.style.setProperty('--tg-safe-right', `${safe?.right ?? 0}px`)
  root.style.setProperty('--tg-safe-bottom', `${safe?.bottom ?? 0}px`)
  root.style.setProperty('--tg-safe-left', `${safe?.left ?? 0}px`)
  root.style.setProperty('--tg-content-safe-top', `${content?.top ?? 0}px`)
  root.style.setProperty('--tg-content-safe-right', `${content?.right ?? 0}px`)
  root.style.setProperty('--tg-content-safe-bottom', `${content?.bottom ?? 0}px`)
  root.style.setProperty('--tg-content-safe-left', `${content?.left ?? 0}px`)
  root.style.setProperty('--tg-viewport-height', `${webApp.viewportStableHeight ?? window.innerHeight}px`)
}

export function initializeTelegramMiniApp() {
  const webApp = getTelegramWebApp()
  if (!webApp || !isTelegramMiniApp()) return () => undefined

  const root = document.documentElement
  const viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  const originalViewport = viewportMeta?.content
  root.classList.add('telegram-mini-app')
  viewportMeta?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')

  const preventGestureZoom = (event: Event) => event.preventDefault()
  const preventPinchZoom = (event: TouchEvent) => {
    if (event.touches.length > 1) event.preventDefault()
  }
  document.addEventListener('gesturestart', preventGestureZoom, { passive: false })
  document.addEventListener('touchmove', preventPinchZoom, { passive: false })

  const updateThemeAndInsets = () => {
    // The admin UI currently uses its light palette; keep Telegram chrome in sync with it.
    const background = '#ffffff'
    root.style.setProperty('--tg-app-background', background)
    webApp.setHeaderColor?.(background)
    webApp.setBackgroundColor?.(background)
    webApp.setBottomBarColor?.(background)
    writeInsets(webApp)
  }
  const updateInsets = () => writeInsets(webApp)
  const requestFullscreen = () => {
    webApp.expand()
    try {
      webApp.requestFullscreen?.()
    } catch {
      // Older Telegram clients can reject fullscreen; expand() remains the fallback.
    }
  }
  const retryFullscreenOnInteraction = () => {
    if (webApp.isFullscreen) return
    requestFullscreen()
  }
  webApp.onEvent('themeChanged', updateThemeAndInsets)
  webApp.onEvent('safeAreaChanged', updateInsets)
  webApp.onEvent('contentSafeAreaChanged', updateInsets)
  webApp.onEvent('viewportChanged', updateInsets)
  webApp.onEvent('fullscreenChanged', updateInsets)
  webApp.onEvent('fullscreenFailed', updateInsets)
  webApp.ready()
  requestFullscreen()
  // Some clients only allow fullscreen after a user gesture.
  document.addEventListener('pointerdown', retryFullscreenOnInteraction, { once: true })
  updateThemeAndInsets()

  return () => {
    webApp.offEvent('themeChanged', updateThemeAndInsets)
    webApp.offEvent('safeAreaChanged', updateInsets)
    webApp.offEvent('contentSafeAreaChanged', updateInsets)
    webApp.offEvent('viewportChanged', updateInsets)
    webApp.offEvent('fullscreenChanged', updateInsets)
    webApp.offEvent('fullscreenFailed', updateInsets)
    document.removeEventListener('pointerdown', retryFullscreenOnInteraction)
    document.removeEventListener('gesturestart', preventGestureZoom)
    document.removeEventListener('touchmove', preventPinchZoom)
    root.classList.remove('telegram-mini-app')
    root.style.removeProperty('--tg-safe-top')
    root.style.removeProperty('--tg-safe-right')
    root.style.removeProperty('--tg-safe-bottom')
    root.style.removeProperty('--tg-safe-left')
    root.style.removeProperty('--tg-content-safe-top')
    root.style.removeProperty('--tg-content-safe-right')
    root.style.removeProperty('--tg-content-safe-bottom')
    root.style.removeProperty('--tg-content-safe-left')
    root.style.removeProperty('--tg-viewport-height')
    root.style.removeProperty('--tg-app-background')
    if (originalViewport && viewportMeta) viewportMeta.setAttribute('content', originalViewport)
  }
}
