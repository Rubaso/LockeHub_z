export function twitchLogin(value: string | null | undefined): string | null {
  const input = value?.trim()
  if (!input) return null

  let candidate = input
  if (/^https?:\/\//i.test(candidate) || /^www\./i.test(candidate)) {
    try {
      const url = new URL(
        /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`
      )
      if (!/(^|\.)twitch\.tv$/i.test(url.hostname)) {
        return null
      }
      const pathSegments = url.pathname.split('/').filter(Boolean)
      if (pathSegments.length !== 1) {
        return null
      }
      candidate = pathSegments[0]
    } catch {
      return null
    }
  }

  candidate = candidate.replace(/^@/, '')
  return /^[a-zA-Z0-9_]{1,25}$/.test(candidate)
    ? candidate.toLowerCase()
    : null
}

export function twitchChannelUrl(value: string | null | undefined): string | null {
  const login = twitchLogin(value)
  return login ? `https://www.twitch.tv/${login}` : null
}
