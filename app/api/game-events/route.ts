import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PLAYERS, SALA_ID } from '@/lib/constants'

type GameEvent = {
  eventType: 'capture' | 'death'
  playerId: number
  trainerId: string
  personalId: string
  pokemonId: number
  pokemonName: string
  speciesName: string
  route: string
  isShiny: boolean
  isTeam: boolean
}

function isValidGameEvent(value: unknown): value is GameEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<GameEvent>
  return (
    (event.eventType === 'capture' || event.eventType === 'death') &&
    Number.isInteger(event.playerId) &&
    PLAYERS.some((player) => player.id === event.playerId) &&
    typeof event.trainerId === 'string' &&
    event.trainerId.length > 0 &&
    event.trainerId.length <= 80 &&
    typeof event.personalId === 'string' &&
    event.personalId.length > 0 &&
    event.personalId.length <= 80 &&
    Number.isInteger(event.pokemonId) &&
    Number(event.pokemonId) > 0 &&
    Number(event.pokemonId) <= 5000 &&
    typeof event.pokemonName === 'string' &&
    event.pokemonName.length <= 100 &&
    typeof event.speciesName === 'string' &&
    event.speciesName.length > 0 &&
    event.speciesName.length <= 100 &&
    typeof event.route === 'string' &&
    event.route.length <= 160 &&
    typeof event.isShiny === 'boolean' &&
    typeof event.isTeam === 'boolean'
  )
}

export async function POST(request: Request) {
  const syncToken = process.env.POKEMON_Z_SYNC_TOKEN
  if (!syncToken) {
    return NextResponse.json({ error: 'La sincronización del juego no está configurada.' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${syncToken}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es JSON válido.' }, { status: 400 })
  }
  if (!isValidGameEvent(body)) {
    return NextResponse.json({ error: 'El evento de juego no tiene un formato válido.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Falta configurar el acceso de servidor a Supabase.' }, { status: 503 })
  }

  const database = createClient(supabaseUrl, serviceRoleKey)
  const savePokemonId = `${body.trainerId}:${body.personalId}`
  const { data: matches, error: lookupError } = await database
    .from('capturas')
    .select('id, estado')
    .eq('sala_id', SALA_ID)
    .eq('jugador_id', body.playerId)
    .eq('save_pokemon_id', savePokemonId)
    .limit(1)

  if (lookupError) {
    console.error('Error buscando Pokémon sincronizado:', lookupError)
    return NextResponse.json({ error: 'No se pudo buscar el Pokémon en Lockehub.' }, { status: 500 })
  }

  const existing = matches?.[0] as { id: number; estado: string } | undefined
  const nextStatus =
    body.eventType === 'death' || existing?.estado === 'MUERTO' ? 'MUERTO' : 'VIVO'

  if (existing) {
    const values =
      body.eventType === 'death'
        ? { estado: 'MUERTO', is_team: false }
        : {
            ruta: body.route || 'Zona desconocida',
            pokemon_name: body.pokemonName || body.speciesName,
            pokemon_id: body.pokemonId,
            estado: nextStatus,
            is_shiny: body.isShiny,
            is_team: body.isTeam,
          }
    const { error } = await database.from('capturas').update(values).eq('id', existing.id)
    if (error) {
      console.error('Error actualizando evento del juego:', error)
      return NextResponse.json({ error: 'No se pudo actualizar el Pokémon en Lockehub.' }, { status: 500 })
    }
  } else {
    const { error } = await database.from('capturas').insert({
      sala_id: SALA_ID,
      jugador_id: body.playerId,
      ruta: body.route || 'Zona desconocida',
      pokemon_name: body.pokemonName || body.speciesName,
      pokemon_id: body.pokemonId,
      estado: nextStatus,
      habilidad: null,
      is_shiny: body.isShiny,
      is_team: body.eventType === 'death' ? false : body.isTeam,
      save_pokemon_id: savePokemonId,
      origen: 'game',
    })
    if (error) {
      console.error('Error insertando evento del juego:', error)
      return NextResponse.json({ error: 'No se pudo guardar el Pokémon en Lockehub.' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
