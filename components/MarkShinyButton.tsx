'use client'

import { useState } from 'react'
import { notifyCapturasUpdated, SALA_ID } from '@/lib/constants'
import { readSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import type { Pokemon } from '@/lib/types'

export default function MarkShinyButton({ pokemon }: { pokemon: Pokemon }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canMark = readSession()?.id === pokemon.playerId && !pokemon.shiny

  if (!canMark) return null

  const markShiny = async () => {
    if (!supabase || saving) return
    if (!window.confirm(`¿Confirmas que ${pokemon.name} es shiny? Se avisará a todos los jugadores.`)) return

    setSaving(true)
    setError('')
    const { data, error: updateError } = await supabase
      .from('capturas')
      .update({ is_shiny: true })
      .eq('id', pokemon.id)
      .eq('jugador_id', pokemon.playerId)
      .select('id')

    if (updateError || !data?.length) {
      console.error('Error marcando shiny:', updateError)
      setError('No se pudo marcar.')
      setSaving(false)
      return
    }

    const { data: activityRows, error: activityError } = await supabase
      .from('feed_eventos')
      .update({
        is_shiny: true,
      })
      .eq('sala_id', SALA_ID)
      .eq('jugador_id', pokemon.playerId)
      .eq('tipo', 'captura')
      .eq('save_pokemon_id', pokemon.savePokemonId)
      .select('id')

    if (activityError || !activityRows?.length) {
      console.error('Error creando aviso shiny:', activityError)
      setError('Se marcó, pero no se encontró su actividad.')
      setSaving(false)
      notifyCapturasUpdated()
      return
    }

    notifyCapturasUpdated()
  }

  return (
    <div className="absolute bottom-1 left-1 right-1 z-10">
      <button
        type="button"
        onClick={() => void markShiny()}
        disabled={saving}
        className="w-full rounded bg-purple-700/90 px-1 py-1 text-[9px] font-bold text-purple-100 hover:bg-purple-600 disabled:opacity-50"
      >
        {saving ? 'Marcando…' : '✦ Marcar shiny'}
      </button>
      {error && <span role="alert" className="mt-1 block rounded bg-zinc-950 px-1 py-0.5 text-[9px] text-rose-300">{error}</span>}
    </div>
  )
}
