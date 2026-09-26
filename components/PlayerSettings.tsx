'use client'

import { useState } from 'react'
import { writePlayerSettings, type PlayerSettings } from '@/lib/session'
import { supabase } from '@/lib/supabase'

type Props = {
  playerId: number
  initial: PlayerSettings
  onSaved: (settings: PlayerSettings) => void
  onClose: () => void
}

export default function PlayerSettings({ playerId, initial, onSaved, onClose }: Props) {
  const [twitchUser, setTwitchUser] = useState(initial.twitchUser)
  const [color, setColor] = useState(initial.color)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const next = { twitchUser: twitchUser.trim(), color }
    setSaving(true)
    setError('')
    if (supabase) {
      const { error: saveError } = await supabase
        .from('directos')
        .upsert(
          { jugador_id: playerId, twitch_user: next.twitchUser, color: next.color },
          { onConflict: 'jugador_id' }
        )
      if (saveError) {
        setError('No se pudieron guardar los ajustes.')
        setSaving(false)
        return
      }
    }
    writePlayerSettings(playerId, next)
    window.dispatchEvent(
      new CustomEvent('lockehub-player-settings-updated', {
        detail: { playerId, settings: next },
      })
    )
    onSaved(next)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={handleSave}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-teal-300">Ajustes</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            Cerrar
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Usuario de Twitch</span>
          <input
            value={twitchUser}
            onChange={(e) => setTwitchUser(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="tu_canal"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Color del nombre</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-full cursor-pointer rounded border border-zinc-700 bg-zinc-950"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-teal-500 py-2 text-sm font-bold text-zinc-950 hover:bg-teal-400"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </form>
    </div>
  )
}
