import { supabase } from './supabase'

function isPokepastUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'pokepast.es'
  } catch {
    return false
  }
}

export async function openPokepasteForPlayer(playerId: number): Promise<void> {
  const popup = window.open('about:blank', '_blank')
  if (!popup) throw new Error('El navegador bloqueó la ventana de PokéPaste.')
  popup.opener = null

  try {
    if (!supabase) throw new Error('No hay conexión configurada con Supabase.')

    const { data, error } = await supabase
      .from('directos')
      .select('pokepaste_text, pokepaste_url')
      .eq('jugador_id', playerId)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('Esta persona todavía no ha guardado su PokéPaste.')

    const pasteText = data.pokepaste_text?.trim()
    if (!pasteText) throw new Error('Esta persona todavía no ha guardado su PokéPaste.')

    let url = data.pokepaste_url
    if (!isPokepastUrl(url)) {
      const response = await fetch('/api/pokepaste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paste: pasteText }),
      })
      const result = await response.json() as { url?: unknown; error?: string }
      if (!response.ok || !isPokepastUrl(result.url)) {
        throw new Error(result.error || 'No se pudo crear el enlace de PokéPaste.')
      }

      url = result.url
      const { error: saveError } = await supabase
        .from('directos')
        .update({ pokepaste_url: url })
        .eq('jugador_id', playerId)
      if (saveError) throw saveError
    }

    popup.location.replace(url)
  } catch (error) {
    popup.close()
    throw error
  }
}
