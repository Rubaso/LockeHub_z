import { SESSION_KEY, SETTINGS_KEY } from './constants'
import type { SessionPlayer } from './types'

export type PlayerSettings = {
  twitchUser: string
  color: string
}

export function readSession(): SessionPlayer | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionPlayer
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function writeSession(player: SessionPlayer) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(player))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function readAllSettings(): Record<number, PlayerSettings> {
  if (typeof window === 'undefined') return {}
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<number, PlayerSettings>
  } catch {
    return {}
  }
}

export function writePlayerSettings(playerId: number, settings: PlayerSettings) {
  const all = readAllSettings()
  all[playerId] = settings
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(all))
}
