'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { APP_NAME, PLAYERS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { clearSession, readSession, writeSession } from '@/lib/session'

export default function GatePage() {
  const router = useRouter()
  const [playerId, setPlayerId] = useState(PLAYERS[0].id)
  const [pin, setPin] = useState('')
  const [showPlayerForm, setShowPlayerForm] = useState(false)
  const [session, setSession] = useState<{ id: number; name: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setSession(readSession())
  }, [])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!supabase) {
      setError('Error al inicializar Supabase')
      return
    }

    const player = PLAYERS.find((p) => p.id === playerId)
    if (!player) {
      setError('Jugador no encontrado')
      return
    }

    const {data: isValid, error: validationError} = await supabase.rpc(
      'validar_pin_jugador', {
        p_jugador_id: playerId,
        p_pin: pin.trim(),
      }
    )

    if (validationError) {
      console.error('Error al validar PIN', validationError)
      setError('Error al validar PIN')
      return
    }

    if (!isValid) {
      setError('PIN incorrecto')
      return
    }

    const next = { id: player.id, name: player.name }
    writeSession(next)
    setSession(next)
    router.push('/inicio')
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-teal-400">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-zinc-400">Elige cómo quieres entrar.</p>
        </div>

        <Link
          href="/inicio"
          className="block w-full rounded-xl bg-sky-500 py-4 text-center text-sm font-black uppercase tracking-wide text-white hover:bg-sky-400"
        >
          Entrar como espectador
        </Link>

        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          <span className="h-px flex-1 bg-zinc-800" />
          o participantes
          <span className="h-px flex-1 bg-zinc-800" />
        </div>

        {session ? (
          <div className="space-y-3 rounded-xl border border-teal-500/30 p-4 text-center">
            <p className="text-[10px] uppercase text-zinc-500">Sesión activa</p>
            <p className="font-bold text-teal-300">{session.name}</p>
            <div className="flex gap-2">
              <Link
                href="/inicio"
                className="flex-1 rounded-xl bg-teal-500 py-2 text-center text-xs font-black uppercase text-zinc-950"
              >
                Continuar
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearSession()
                  setSession(null)
                }}
                className="rounded-xl bg-zinc-800 px-3 text-xs text-zinc-300"
              >
                Salir
              </button>
            </div>
          </div>
        ) : !showPlayerForm ? (
          <button
            type="button"
            onClick={() => setShowPlayerForm(true)}
            className="w-full rounded-xl border border-zinc-800 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-200"
          >
            Acceso jugador
          </button>
        ) : (
          <form onSubmit={login} className="space-y-3 rounded-xl border border-zinc-800 p-4">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400">¿Quién eres?</span>
              <select
                value={playerId}
                onChange={(e) => setPlayerId(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              >
                {PLAYERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400">PIN</span>
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value)
                  setError('')
                }}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-center font-mono tracking-widest"
              />
            </label>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-xl bg-teal-500 py-2 text-xs font-black uppercase text-zinc-950"
            >
              Entrar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
