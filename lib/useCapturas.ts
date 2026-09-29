'use client'

import { useEffect, useState } from 'react'
import { CAPTURAS_UPDATED_EVENT, SALA_ID } from './constants'
import {
  fetchCapturas,
  fetchEncuentrosRuta,
  type CapturaRow,
  type EncounterRouteRow,
} from './capturas'
import { supabase } from './supabase'

export function useCapturas() {
  const [rows, setRows] = useState<CapturaRow[] | null>(null)
  const [encounters, setEncounters] = useState<EncounterRouteRow[] | null>(null)
  const [fromDatabase, setFromDatabase] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [data, encounterData] = await Promise.all([
        fetchCapturas(),
        fetchEncuentrosRuta(),
      ])
      if (cancelled) return
      if (data) {
        setRows(data)
        setFromDatabase(true)
      } else {
        setRows(null)
        setFromDatabase(false)
      }
      setEncounters(encounterData)
    }

    load()
    window.addEventListener(CAPTURAS_UPDATED_EVENT, load)
    const channel = supabase
      ?.channel('realtime_capturas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'capturas', filter: `sala_id=eq.${SALA_ID}` },
        () => void load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'encuentros_ruta', filter: `sala_id=eq.${SALA_ID}` },
        () => void load()
      )
      .subscribe()
    return () => {
      cancelled = true
      window.removeEventListener(CAPTURAS_UPDATED_EVENT, load)
      if (channel) void supabase?.removeChannel(channel)
    }
  }, [])

  return { rows, encounters, fromDatabase }
}
