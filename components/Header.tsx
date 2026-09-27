'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { APP_NAME, NAV_LINKS, PLAYERS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import {
  clearSession,
  readAllSettings,
  readSession,
  type PlayerSettings,
} from '@/lib/session'
import type { SessionPlayer } from '@/lib/types'
import PlayerSettingsModal from './PlayerSettings'
import SaveImport from './SaveImport'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [session, setSession] = useState<SessionPlayer | null>(null)
  const [liveIds, setLiveIds] = useState<Set<number>>(new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<PlayerSettings | null>(null)
  const [playerSettings, setPlayerSettings] = useState<Record<number, PlayerSettings>>({})

  useEffect(() => {
    const current = readSession()
    const all = readAllSettings()
    setSession(current)
    if (current) {
      setPlayerSettings(all)
      const player = PLAYERS.find((p) => p.id === current.id)
      setSettings(
        all[current.id] ?? {
          twitchUser: player?.twitchUser ?? '',
          color: player?.color ?? '#5ec4a0',
        }
      )
    }
    const loadSettings = async () => {
      if (!supabase) return
      const { data } = await supabase.from('directos').select('jugador_id, twitch_user, color')
      if (!data) return
      const remote = Object.fromEntries(
        data.map((row: { jugador_id: number; twitch_user: string | null; color: string | null }) => [
          row.jugador_id,
          {
            twitchUser: row.twitch_user ?? '',
            color: row.color ?? PLAYERS.find((player) => player.id === row.jugador_id)?.color ?? '#5ec4a0',
          },
        ])
      )
      setPlayerSettings(remote)
      if (current) setSettings(remote[current.id] ?? all[current.id] ?? {
        twitchUser: PLAYERS.find((player) => player.id === current.id)?.twitchUser ?? '',
        color: PLAYERS.find((player) => player.id === current.id)?.color ?? '#5ec4a0',
      })
    }
    void loadSettings()

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ playerId: number; settings: PlayerSettings }>).detail
      if (!detail || !current || detail.playerId !== current.id) return
      setSettings(detail.settings)
      setPlayerSettings((previous) => ({ ...previous, [detail.playerId]: detail.settings }))
    }
    window.addEventListener('lockehub-player-settings-updated', handleSettingsUpdated)
    return () => window.removeEventListener('lockehub-player-settings-updated', handleSettingsUpdated)
  }, [pathname])

  useEffect(() => {
    let cancelled = false

    const loadLivePlayers = async () => {
      if (!supabase) return

      const { data, error } = await supabase
        .from('directos')
        .select('jugador_id, is_live')

      if (cancelled || error || !data) return
      setLiveIds(
        new Set(
          data
            .filter((row: { jugador_id: number; is_live: boolean }) => row.is_live)
            .map((row: { jugador_id: number }) => row.jugador_id)
        )
      )
    }

    loadLivePlayers()

    const channel = supabase
      ? supabase.channel('realtime_directos_header')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'directos' }, (payload) => {
        const row = payload.new as { jugador_id?: number; is_live?: boolean }
        if (row.jugador_id === undefined || row.is_live === undefined) return
        const playerId = row.jugador_id
        setLiveIds((previous) => {
          const next = new Set(previous)
          if (row.is_live) next.add(playerId)
          else next.delete(playerId)
          return next
        })
      })
      .subscribe()
      : null

    return () => {
      cancelled = true
      if (channel) supabase?.removeChannel(channel)
    }
  }, [])

  if (pathname === '/') return null

  const handleLogout = () => {
    clearSession()
    setSession(null)
    router.push('/')
  }

  const livePlayers = PLAYERS
    .map((player) => ({ ...player, ...(playerSettings[player.id] ?? {}) }))
    .filter((player) => liveIds.has(player.id) && player.twitchUser)

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/inicio" className="text-lg font-black tracking-tight text-teal-400">
          {APP_NAME}
        </Link>

        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="font-bold uppercase tracking-wide text-zinc-500">En directo:</span>
          {livePlayers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {livePlayers.map((player) => (
                <a
                  key={player.id}
                  href={`https://www.twitch.tv/${player.twitchUser}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 font-bold text-rose-300 hover:bg-rose-500/20"
                >
                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
                  {player.name}
                </a>
              ))}
            </div>
          ) : (
            <span className="text-zinc-600">Nadie emitiendo</span>
          )}
        </div>

        <nav className="flex flex-wrap gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  active ? 'bg-teal-500 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {session ? (
          <div className="flex items-center gap-2">
            <SaveImport />
            <span className="text-sm font-semibold" style={{ color: settings?.color }}>
              {session.name}
            </span>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-teal-500"
              title="Ajustes"
            >
              ⚙
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:text-rose-400"
            >
              Salir
            </button>
          </div>
        ) : (
          <span className="text-xs font-semibold text-sky-400">Espectador</span>
        )}
      </div>

      {settingsOpen && session && settings && (
        <PlayerSettingsModal
          playerId={session.id}
          initial={settings}
          onSaved={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </header>
  )
}
