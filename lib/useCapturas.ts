'use client'

import { useEffect, useState } from 'react'
import { CAPTURAS_UPDATED_EVENT, SALA_ID } from './constants'
import { fetchCapturas, type CapturaRow } from './capturas'
import { supabase } from './supabase'

export function useCapturas() {
  const [rows, setRows] = useState<CapturaRow[] | null>(null)
  const [fromDatabase, setFromDatabase] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const data = await fetchCapturas()
      if (cancelled) return
      if (data) {
        setRows(data)
        setFromDatabase(true)
      } else {
        setRows(null)
        setFromDatabase(false)
      }
    }

    load()
    const refreshInterval = window.setInterval(() => void load(), 10_000)
    window.addEventListener(CAPTURAS_UPDATED_EVENT, load)
    const channel = supabase
      ?.channel('realtime_capturas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'capturas', filter: `sala_id=eq.${SALA_ID}` },
        () => void load()
      )
      .subscribe()
    return () => {
      cancelled = true
      window.clearInterval(refreshInterval)
      window.removeEventListener(CAPTURAS_UPDATED_EVENT, load)
      if (channel) void supabase?.removeChannel(channel)
    }
  }, [])

  return { rows, fromDatabase }
}
