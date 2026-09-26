'use client'

import { useState } from 'react'
import { notifyCapturasUpdated } from '@/lib/constants'
import { importSaveFile } from '@/lib/importSave'
import { readSession } from '@/lib/session'

export default function SaveImport() {
  const [loading, setLoading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const session = readSession()
    if (!session) {
      alert('Debes entrar como jugador para subir tu partida.')
      return
    }

    setLoading(true)
    try {
      const mensaje = await importSaveFile(file, session)
      notifyCapturasUpdated()
      alert(mensaje)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Error leyendo la partida.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <label className="cursor-pointer rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-teal-400">
      {loading ? 'Leyendo…' : 'Cargar save'}
      <input
        type="file"
        accept=".rxdata,.sav"
        disabled={loading}
        onChange={handleFile}
        className="hidden"
      />
    </label>
  )
}
