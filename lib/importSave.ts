import { SALA_ID } from './constants'
import { parseRxDataSave } from './rxdataParser'
import { supabase } from './supabase'
import type { SessionPlayer } from './types'

type CapturaSaveRow = {
  sala_id: string
  jugador_id: number
  ruta: string
  pokemon_name: string
  pokemon_nickname: string | null
  pokemon_id: number | null
  estado: string
  habilidad: string | null
  is_shiny: boolean
  is_team: boolean
  save_pokemon_id: string
  origen: string
}

type ExistingRow = {
  id: number
  save_pokemon_id: string
  estado: string
  ruta: string
  pokemon_name: string
  pokemon_nickname: string | null
  pokemon_id: number | null
  habilidad: string | null
  is_shiny: boolean
  is_team: boolean
}

type ActivityRow = {
  sala_id: string
  jugador_id: number
  tipo: 'captura' | 'muerte' | 'medalla'
  medalla_id?: number | null
  save_pokemon_id: string
  pokemon_name: string
  pokemon_nickname?: string | null
  pokemon_id: number | null
  ruta: string
  is_shiny: boolean
  ocurrido_en: string
}

type EncounterRouteSaveRow = {
  sala_id: string
  jugador_id: number
  ruta: string
  estado: 'available' | 'caught' | 'missed'
  pokemon_name: string | null
  pokemon_id: number | null
}

export async function importSaveFile(file: File, player: SessionPlayer) {
  if (!supabase) {
    throw new Error(
      'Falta la conexión a Supabase. Copia nuztracker/.env.local a lockehub/.env.local y reinicia el servidor.'
    )
  }

  const save = await parseRxDataSave(file)

  const pokemonDelSave: CapturaSaveRow[] = save.pokemon.map((pokemon) => ({
    sala_id: SALA_ID,
    jugador_id: player.id,
    ruta: pokemon.ruta ?? `Zona desconocida (ID ${pokemon.obtainMap})`,
    pokemon_name: pokemon.pokemonName,
    pokemon_nickname: pokemon.nickname,
    pokemon_id: pokemon.pokemonId ?? null,
    estado: pokemon.diedAt ? 'MUERTO' : 'VIVO',
    habilidad: pokemon.ability ?? null,
    is_shiny: !!pokemon.shiny,
    is_team: !!pokemon.isTeam,
    save_pokemon_id: `${save.trainerId}:${pokemon.personalID}`,
    origen: 'save',
  }))

  const { data: existentes, error: errorExistentes } = await supabase
    .from('capturas')
    .select('id, save_pokemon_id, estado, ruta, pokemon_name, pokemon_nickname, pokemon_id, habilidad, is_shiny, is_team')
    .eq('sala_id', SALA_ID)
    .eq('jugador_id', player.id)
    .not('save_pokemon_id', 'is', null)

  if (errorExistentes) {
    throw new Error('La partida se ha leído, pero no se pudieron comprobar las capturas anteriores.')
  }

  const existentesPorSaveId = new Map(
    (existentes as ExistingRow[] | null)?.map((row) => [row.save_pokemon_id, row]) ?? []
  )

  const nuevos: CapturaSaveRow[] = []
  const actualizaciones: { id: number; payload: Partial<ExistingRow> }[] = []

  for (const pokemon of pokemonDelSave) {
    const existente = existentesPorSaveId.get(pokemon.save_pokemon_id)

    if (!existente) {
      nuevos.push(pokemon)
      continue
    }

    const payload: Partial<ExistingRow> = {}
    if (pokemon.estado === 'MUERTO' && existente.estado !== 'MUERTO') {
      payload.estado = 'MUERTO'
    }
    if (existente.ruta !== pokemon.ruta) payload.ruta = pokemon.ruta
    if (existente.pokemon_name !== pokemon.pokemon_name) payload.pokemon_name = pokemon.pokemon_name
    if ((existente.pokemon_nickname ?? null) !== pokemon.pokemon_nickname) payload.pokemon_nickname = pokemon.pokemon_nickname
    if (existente.pokemon_id !== pokemon.pokemon_id) payload.pokemon_id = pokemon.pokemon_id
    if ((existente.habilidad ?? null) !== pokemon.habilidad) payload.habilidad = pokemon.habilidad
    if (pokemon.is_shiny && !existente.is_shiny) payload.is_shiny = true
    if (!!existente.is_team !== pokemon.is_team) payload.is_team = pokemon.is_team

    if (Object.keys(payload).length > 0) {
      actualizaciones.push({ id: existente.id, payload })
    }
  }

  let insertados = 0
  if (nuevos.length > 0) {
    const { data, error } = await supabase.from('capturas').insert(nuevos).select('id')
    if (error) {
      throw new Error('La partida se leyó, pero hubo un error guardando los Pokémon nuevos.')
    }
    insertados = data?.length ?? 0
  }

  let actualizados = 0
  for (const cambio of actualizaciones) {
    const { error } = await supabase.from('capturas').update(cambio.payload).eq('id', cambio.id)
    if (error) {
      throw new Error('La partida se leyó, pero hubo un error actualizando un Pokémon existente.')
    }
    actualizados++
  }

  const encuentrosRuta: EncounterRouteSaveRow[] = save.encounters.map((encounter) => ({
    sala_id: SALA_ID,
    jugador_id: player.id,
    ruta: encounter.route,
    estado: encounter.status,
    pokemon_name: encounter.pokemonName,
    pokemon_id: encounter.pokemonId,
  }))

  if (encuentrosRuta.length > 0) {
    const { error } = await supabase
      .from('encuentros_ruta')
      .upsert(encuentrosRuta, {
        onConflict: 'sala_id,jugador_id,ruta',
      })

    if (error) {
      throw new Error('Los Pokémon se guardaron, pero no se pudieron guardar los estados de encuentros. Comprueba que la migración 20260929_encuentros_ruta.sql esté aplicada en Supabase.')
    }
  }

  const medallasObtenidas = save.medals.flatMap((obtenida, medallaId) =>
    obtenida
      ? [{ sala_id: SALA_ID, jugador_id: player.id, medalla_id: medallaId }]
      : []
  )

  const { data: medallasAnteriores, error: errorMedallasAnteriores } = await supabase
    .from('medallas_jugadores')
    .select('medalla_id')
    .eq('sala_id', SALA_ID)
    .eq('jugador_id', player.id)

  if (errorMedallasAnteriores) {
    throw new Error('Los Pokémon se guardaron, pero no se pudieron comprobar las medallas anteriores.')
  }

  const medallasPrevias = new Set((medallasAnteriores ?? []).map((row) => row.medalla_id))
  const medallasNuevas = medallasObtenidas.filter((medalla) => !medallasPrevias.has(medalla.medalla_id))

  if (medallasObtenidas.length > 0) {
    const { error } = await supabase
      .from('medallas_jugadores')
      .upsert(medallasObtenidas, {
        onConflict: 'sala_id,jugador_id,medalla_id',
        ignoreDuplicates: true,
      })

    if (error) {
      throw new Error('Los Pokémon se guardaron, pero no se pudieron actualizar las medallas. Comprueba que la migración 20260930_medallas_jugadores.sql esté aplicada en Supabase.')
    }
  }

  const actividad: ActivityRow[] = []
  for (const medalla of medallasNuevas) {
    actividad.push({
      sala_id: SALA_ID,
      jugador_id: player.id,
      tipo: 'medalla',
      medalla_id: medalla.medalla_id,
      save_pokemon_id: `medalla:${medalla.medalla_id}`,
      pokemon_name: `Medalla ${medalla.medalla_id + 1}`,
      pokemon_nickname: null,
      pokemon_id: null,
      ruta: 'Medallas',
      is_shiny: false,
      ocurrido_en: new Date().toISOString(),
    })
  }

  for (const pokemon of save.pokemon) {
    const savePokemonId = `${save.trainerId}:${pokemon.personalID}`
    const ruta = pokemon.ruta ?? `Zona desconocida (ID ${pokemon.obtainMap})`

    if (pokemon.capturedAt || pokemon.shiny) {
      actividad.push({
        sala_id: SALA_ID,
        jugador_id: player.id,
        tipo: 'captura',
        save_pokemon_id: savePokemonId,
        pokemon_name: pokemon.pokemonName,
        pokemon_nickname: pokemon.nickname,
        pokemon_id: pokemon.pokemonId,
        ruta,
        is_shiny: pokemon.shiny,
        ocurrido_en: pokemon.capturedAt ?? new Date().toISOString(),
      })
    }

    if (pokemon.diedAt) {
      actividad.push({
        sala_id: SALA_ID,
        jugador_id: player.id,
        tipo: 'muerte',
        save_pokemon_id: savePokemonId,
        pokemon_name: pokemon.pokemonName,
        pokemon_nickname: pokemon.nickname,
        pokemon_id: pokemon.pokemonId,
        ruta: pokemon.deathArea ?? ruta,
        is_shiny: pokemon.shiny,
        ocurrido_en: pokemon.diedAt,
      })
    }
  }

  if (actividad.length > 0) {
    const { data: actividadesAnteriores, error: errorActividadesAnteriores } = await supabase
      .from('feed_eventos')
      .select('save_pokemon_id, tipo, is_shiny')
      .eq('sala_id', SALA_ID)
      .eq('jugador_id', player.id)
      .in('tipo', ['captura', 'muerte'])

    if (errorActividadesAnteriores) {
      throw new Error('Los Pokémon se guardaron, pero no se pudieron comprobar los eventos anteriores.')
    }

    const shiniesAnteriores = new Set(
      (actividadesAnteriores ?? [])
        .filter((evento) => evento.is_shiny)
        .map((evento) => `${evento.save_pokemon_id}:${evento.tipo}`)
    )

    for (const evento of actividad) {
      if (shiniesAnteriores.has(`${evento.save_pokemon_id}:${evento.tipo}`)) {
        evento.is_shiny = true
      }
    }

    const { error } = await supabase
      .from('feed_eventos')
      .upsert(actividad, {
        onConflict: 'sala_id,jugador_id,save_pokemon_id,tipo',
      })

    if (error) {
      console.error('No se pudo actualizar la actividad:', error)
      throw new Error(
        `Los Pokémon se guardaron, pero no se pudo actualizar la actividad: ${error.message}`
      )
    }
  }

  const eventosDetectados = actividad.length
  const zonasReconocidas = save.pokemon.filter((pokemon) => pokemon.ruta !== null).length
  const yaExistentes = pokemonDelSave.length - nuevos.length

  let mensaje =
    `Partida importada.\n\n` +
    `Entrenador: ${save.trainerName || 'Desconocido'}\n` +
    `Pokémon encontrados: ${save.pokemon.length}\n` +
    `Zonas reconocidas: ${zonasReconocidas}\n` +
    `Zonas desconocidas: ${save.unknownMapPokemon.length}\n` +
    `Nuevos añadidos: ${insertados}\n` +
    `Ya existentes: ${yaExistentes}\n` +
    `Actualizados: ${actualizados}\n` +
    `Eventos de actividad detectados: ${eventosDetectados}\n` +
    `Estados de zonas importados: ${encuentrosRuta.length}\n` +
    `Medallas detectadas: ${medallasObtenidas.length}/12`

  if (save.unknownMapIds.length > 0) {
    mensaje += `\n\nIDs de mapa desconocidos:\n` + save.unknownMapIds.map((id) => `- ${id}`).join('\n')
  }

  if (!save.hasStorage) {
    mensaje += '\n\nEste archivo solo contiene el equipo activo; no incluye datos de las cajas.'
  }

  return mensaje
}
