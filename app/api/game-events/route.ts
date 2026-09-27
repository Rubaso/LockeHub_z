import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PLAYERS, SALA_ID } from '@/lib/constants'

type GameEvent = {
  eventType: 'capture' | 'death' | 'encounter_missed'
  playerId: number
  trainerId: string
  personalId: string
  pokemonId: number
  pokemonName: string
  speciesName: string
  ability?: string | null
  route: string
  isShiny: boolean
  isTeam: boolean
  level?: number
  occurredAt?: number
  captureSource?: 'wild' | 'gift' | 'egg' | 'static' | null
  reason?: 'fainted' | 'fled' | 'defeated' | 'other' | null
}

function isValidGameEvent(value: unknown): value is GameEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<GameEvent>
  return (
    (event.eventType === 'capture' ||
      event.eventType === 'death' ||
      event.eventType === 'encounter_missed') &&
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
    (event.ability === undefined ||
      event.ability === null ||
      (typeof event.ability === 'string' && event.ability.length <= 80)) &&
    typeof event.route === 'string' &&
    event.route.length <= 160 &&
    typeof event.isShiny === 'boolean' &&
    typeof event.isTeam === 'boolean' &&
    (event.level === undefined ||
      (Number.isInteger(event.level) && Number(event.level) >= 1 && Number(event.level) <= 100)) &&
    (event.occurredAt === undefined ||
      (Number.isInteger(event.occurredAt) &&
        Number(event.occurredAt) > 0 &&
        Number(event.occurredAt) <= 4_102_444_800)) &&
    (event.captureSource === undefined ||
      event.captureSource === null ||
      event.captureSource === 'wild' ||
      event.captureSource === 'gift' ||
      event.captureSource === 'egg' ||
      event.captureSource === 'static') &&
    (event.reason === undefined ||
      event.reason === null ||
      event.reason === 'fainted' ||
      event.reason === 'fled' ||
      event.reason === 'defeated' ||
      event.reason === 'other')
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
  const occurredAt = new Date((body.occurredAt ?? Math.floor(Date.now() / 1000)) * 1000).toISOString()
  const eventLevel = body.level ?? null
  const nextStatus =
    body.eventType === 'death'
      ? 'MUERTO'
      : body.eventType === 'encounter_missed'
        ? 'ESCAPADO'
        : existing?.estado === 'MUERTO'
          ? 'MUERTO'
          : 'VIVO'

  if (body.eventType === 'encounter_missed' && existing && existing.estado !== 'ESCAPADO') {
    return NextResponse.json({ success: true, ignored: true })
  }

  if (existing) {
    const values = {
      ruta: body.route || 'Zona desconocida',
      pokemon_name: body.pokemonName || body.speciesName,
      pokemon_id: body.pokemonId,
      ...(body.ability && { habilidad: body.ability }),
      estado: nextStatus,
      is_shiny: body.isShiny,
      is_team: body.eventType === 'capture' && nextStatus === 'VIVO' && body.isTeam,
      level: eventLevel,
      event_at: occurredAt,
      event_reason: body.reason ?? null,
      ...(body.eventType !== 'death' && {
        capture_source: body.captureSource ?? null,
      }),
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
      habilidad: body.ability || null,
      estado: nextStatus,
      is_shiny: body.isShiny,
      is_team: body.eventType === 'death' ? false : body.isTeam,
      save_pokemon_id: savePokemonId,
      origen: body.eventType === 'encounter_missed' ? 'encounter' : 'game',
      level: eventLevel,
      event_at: occurredAt,
      event_reason: body.reason ?? null,
      capture_source: body.captureSource ?? null,
    })
    if (error) {
      console.error('Error insertando evento del juego:', error)
      return NextResponse.json({ error: 'No se pudo guardar el Pokémon en Lockehub.' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
