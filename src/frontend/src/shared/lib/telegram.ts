const telegramHosts = ['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me']

export function telegramUsername(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('@')) return cleanUsername(trimmed.slice(1))

  try {
    const candidate =
      trimmed.includes('://') || !telegramHosts.some((host) => trimmed.startsWith(`${host}/`))
        ? trimmed
        : `https://${trimmed}`
    const url = new URL(candidate)

    if (url.protocol === 'tg:') {
      return cleanUsername(url.searchParams.get('domain'))
    }

    if (telegramHosts.includes(url.host.toLowerCase())) {
      return cleanUsername(url.pathname.split('/').filter(Boolean)[0])
    }
  } catch {
    // Plain username.
  }

  return cleanUsername(trimmed)
}

export function formatTelegram(value: string | null | undefined): string {
  const username = telegramUsername(value)
  return username ? `@${username}` : value?.trim() || ''
}

export function telegramHref(value: string | null | undefined): string | null {
  const username = telegramUsername(value)
  return username ? `https://t.me/${username}` : null
}

function cleanUsername(value: string | null | undefined): string | null {
  const username = value?.trim().replace(/^@/, '').replace(/^\/|\/$/g, '')
  return username && /^[a-zA-Z0-9_]+$/.test(username) ? username : null
}
