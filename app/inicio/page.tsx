'use client'

import Link from 'next/link'
import PokepasteStatus from '@/components/PokepasteStatus'
import { EVENT_NAME } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function InicioPage() {
  const [tournament, setTournament] = useState<{ name: string; locked: boolean } | null>(null)

  useEffect(() => {
    const loadTournament = async () => {
      if (!supabase) return
      const { data } = await supabase
        .from('torneo')
        .select('tournament_name, is_locked')
        .eq('id', 1)
        .maybeSingle()
      if (data?.is_locked) {
        setTournament({ name: data.tournament_name || 'Torneo', locked: true })
      } else {
        setTournament(null)
      }
    }
    void loadTournament()
  }, [])

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Evento</p>
        <h1 className="text-3xl font-black text-zinc-100">{EVENT_NAME}</h1>
        <p className="text-sm text-zinc-400">Centro informativo de la partida.</p>
      </section>

      {tournament?.locked && (
        <section className="group relative isolate overflow-hidden rounded-2xl border border-amber-400/50 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.12)]">
          <div
            className="absolute inset-0 scale-100 bg-cover bg-center opacity-35 transition-transform duration-500 ease-out group-hover:scale-110"
            style={{ backgroundImage: "url('/sprites/lideres/1poster.png')" }}
          />
          <div className="absolute inset-0 bg-zinc-950/65" />
          <div className="relative p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Torneo iniciado</p>
            <h2 className="mt-1 text-2xl font-black text-amber-100">{tournament.name}</h2>
            <p className="mt-1 text-sm text-amber-200/70">
              El cuadro está bloqueado y la competición ha comenzado.
            </p>
          </div>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Actividad</h2>
            <div className="rounded-xl border border-zinc-800 p-4">
              <p className="text-sm text-zinc-500">
                La actividad aparecerá aquí cuando se registren capturas y eventos de la partida.
              </p>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: '/jugadores', label: 'Jugadores' },
              { href: '/rutas', label: 'Rutas' },
              { href: '/tramos', label: 'Tramos' },
              { href: '/torneo', label: 'Torneo' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-5 text-center font-bold hover:border-teal-500/50"
              >
                {link.label}
              </Link>
            ))}
          </section>
        </div>

        <PokepasteStatus />
      </div>
    </div>
  )
}
