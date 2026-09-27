'use client'

import { useEffect, useState } from 'react'
import { notifyCapturasUpdated } from '@/lib/constants'
import { readSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import type { Pokemon } from '@/lib/types'

export default function DeletePokemonButton({ pokemon }: { pokemon: Pokemon }) {
  const [canDelete, setCanDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setCanDelete(readSession()?.id === pokemon.playerId)
  }, [pokemon.playerId])

  if (!canDelete) return null

  const deletePokemon = async () => {
    if (!supabase || deleting) return
    if (!window.confirm(`¿Borrar a ${pokemon.name} del registro? Esta acción no se puede deshacer.`)) return

    setDeleting(true)
    setError('')
    const { data, error: deleteError } = await supabase
      .from('capturas')
      .delete()
      .eq('id', pokemon.id)
      .eq('jugador_id', pokemon.playerId)
      .select('id')

    if (deleteError) {
      console.error('Error borrando Pokémon:', deleteError)
      setError('No se pudo borrar.')
      setDeleting(false)
      return
    }

    if (!data?.length) {
      setError('No se borró: revisa los permisos de Supabase.')
      setDeleting(false)
      return
    }

    notifyCapturasUpdated()
  }

  return (
    <div className="absolute right-1 top-1 z-10 flex flex-col items-end">
      <button
        type="button"
        aria-label={`Borrar a ${pokemon.name}`}
        title="Borrar Pokémon"
        onClick={() => void deletePokemon()}
        disabled={deleting}
        className="rounded-md border border-zinc-700/70 bg-zinc-950/90 p-1.5 text-zinc-500 opacity-0 transition hover:border-rose-500/60 hover:text-rose-300 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
          <path d="M4 6h12M8 6V4h4v2m2 0-.7 10H6.7L6 6m2.5 3v4m3-4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {error && (
        <span role="alert" className="mt-1 rounded bg-zinc-950 px-1.5 py-1 text-[10px] text-rose-300">
          {error}
        </span>
      )}
    </div>
  )
}
