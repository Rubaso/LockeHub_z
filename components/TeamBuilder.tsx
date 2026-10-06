'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Pokemon } from '@/lib/types'
import { teamToShowdown } from '@/lib/pokepaste'
import { readSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

export default function TeamBuilder({ pokemon }: { pokemon: Pokemon[] }) {
  const storageKey = `lockehub_team_builder_${pokemon[0]?.playerId ?? 'unknown'}`
  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    if (typeof window === 'undefined') return []

    try {
      const stored = window.localStorage.getItem(storageKey)
      if (!stored) return []
      const parsed: unknown = JSON.parse(stored)
      if (!Array.isArray(parsed)) return []

      const availableIds = new Set(pokemon.map((item) => item.id))
      return [...new Set(parsed.filter(
        (id): id is number => Number.isInteger(id) && availableIds.has(id)
      ))].slice(0, 6)
    } catch (error) {
      console.error('No se pudo recuperar el equipo seleccionado:', error)
      return []
    }
  })
  const [open, setOpen] = useState(false)
  const [pasteUrl, setPasteUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(selectedIds))
    } catch (error) {
      console.error('No se pudo guardar el equipo seleccionado:', error)
    }
  }, [selectedIds, storageKey])

  const selected = useMemo(
    () => selectedIds.map((id) => pokemon.find((item) => item.id === id)).filter((item): item is Pokemon => Boolean(item)),
    [pokemon, selectedIds]
  )
  const text = useMemo(() => teamToShowdown(selected), [selected])
  const visiblePokemon = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return pokemon
    return pokemon.filter((item) =>
      `${item.name} ${item.nickname ?? ''}`.toLocaleLowerCase().includes(query)
    )
  }, [pokemon, search])

  const togglePokemon = (id: number) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 6 ? [...current, id] : current)
    setPasteUrl('')
  }

  const copyText = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const createPaste = async () => {
    if (!text || selected.length === 0) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/pokepaste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paste: text }),
      })
      const data = await response.json()
      if (!response.ok || !data.url) throw new Error(data.error || 'No se pudo crear el PokéPaste.')
      setPasteUrl(data.url)
      const session = readSession()
      if (supabase && session) {
        const { error: saveError } = await supabase.from('directos').upsert(
          { jugador_id: session.id, pokepaste_text: text.trim() },
          { onConflict: 'jugador_id' }
        )
        if (saveError) {
          console.error('Error guardando el PokéPaste generado:', saveError)
          throw new Error('El PokéPaste se creó, pero no se pudo guardar en el torneo.')
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear el PokéPaste.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-teal-500/30 bg-teal-950/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-teal-100">Formar equipo</h2>
          <p className="text-sm text-teal-200/70">Elige hasta seis Pokémon vivos para generar tu PokéPaste.</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-teal-400">
          {open ? 'Cerrar' : 'FORMAR EQUIPO'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por Pokémon o mote..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-teal-400"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {visiblePokemon.map((item) => {
              const active = selectedIds.includes(item.id)
              return (
                <button key={item.id} type="button" onClick={() => togglePokemon(item.id)} className={`rounded-lg border p-2 text-left text-sm ${active ? 'border-teal-400 bg-teal-500/20 text-teal-100' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}>
                  <span className="block font-bold">{selectedIds.indexOf(item.id) + 1}. {item.nickname || item.name}</span>
                  <span className="text-xs text-zinc-500">{item.name}</span>
                </button>
              )
            })}
          </div>
          {visiblePokemon.length === 0 && <p className="text-sm text-zinc-500">No hay Pokémon que coincidan con la búsqueda.</p>}
          <textarea readOnly value={text} rows={12} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200" placeholder="Selecciona Pokémon para generar el equipo..." />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!text} onClick={() => void copyText()} className="rounded-lg border border-teal-500/50 px-3 py-2 text-sm font-bold text-teal-300 disabled:opacity-40">{copied ? 'Copiado' : 'Copiar texto'}</button>
            <button type="button" disabled={!text || loading} onClick={() => void createPaste()} className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-zinc-950 disabled:opacity-40">{loading ? 'Creando…' : 'Crear PokéPaste'}</button>
            {pasteUrl && <a href={pasteUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-amber-400/50 px-3 py-2 text-sm font-bold text-amber-300">Abrir PokéPaste</a>}
          </div>
          {pasteUrl && <p className="break-all text-xs text-zinc-400">{pasteUrl}</p>}
          {error && <p className="text-sm text-rose-300">{error}</p>}
        </div>
      )}
    </section>
  )
}
