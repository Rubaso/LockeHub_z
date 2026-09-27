import { loadAll } from '@hyrious/marshal'
import { MAP_Z } from '@/lib/mapZ'
import { POKEMON_Z_SPECIES_BY_ID } from '@/lib/pokemonZSpecies'
import pokemonZAbilitySlots from '@/lib/pokemon-z-abilities.json'

export interface PokemonSaveData {
  species: string
  form: number
  pokemonId: number | null
  pokemonName: string
  personalID: string
  obtainMap: number
  obtainMethod: number
  randomized: boolean
  ruta: string | null
  shiny: boolean
  ability: string | null
  level: number | null
  nickname: string | null
  obtainLevel: number | null
  isTeam: boolean
  originalTrainerName: string | null
  originalTrainerId: number | null
}

export interface UnknownMapPokemon {
  mapId: number
  pokemonName: string
  personalID: string
}

interface PokemonApiInfo {
  name: string
  id: number
}

let cachedPokemonMap: Map<string, number> | null = null
let cachedPokemonNameMap: Map<number, string> | null = null
const cachedSpeciesVariants = new Map<string, PokemonApiInfo[]>()
const pokemonZAbilities = pokemonZAbilitySlots as Record<
  string,
  (number | null)[]
>

async function getPokemonIdMap(): Promise<Map<string, number>> {
  if (cachedPokemonMap) {
    return cachedPokemonMap
  }

  const response = await fetch(
    'https://pokeapi.co/api/v2/pokemon?limit=100000'
  )

  if (!response.ok) {
    throw new Error(
      'No se pudo cargar la lista de Pokémon desde PokeAPI.'
    )
  }

  const data = await response.json()

  cachedPokemonMap = new Map<string, number>()
  cachedPokemonNameMap = new Map<number, string>()

  for (const pokemon of data.results ?? []) {
    const name = String(pokemon.name ?? '')
      .trim()
      .toLowerCase()

    const id = Number(
      String(pokemon.url ?? '')
        .split('/')
        .filter(Boolean)
        .pop()
    )

    if (name && Number.isFinite(id)) {
      cachedPokemonMap.set(name, id)
      cachedPokemonNameMap.set(id, name)
    }
  }

  return cachedPokemonMap
}

async function getSpeciesVariants(
  species: string
): Promise<PokemonApiInfo[]> {
  const cached = cachedSpeciesVariants.get(species)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(species)}`
    )

    if (!response.ok) {
      cachedSpeciesVariants.set(species, [])
      return []
    }

    const data = await response.json()
    const variants: PokemonApiInfo[] = []

    for (const variety of data.varieties ?? []) {
      const name = String(variety.pokemon?.name ?? '')
        .trim()
        .toLowerCase()

      const id = Number(
        String(variety.pokemon?.url ?? '')
          .split('/')
          .filter(Boolean)
          .pop()
      )

      if (name && Number.isFinite(id)) {
        variants.push({ name, id })
      }
    }

    cachedSpeciesVariants.set(species, variants)
    return variants
  } catch (error) {
    console.error(
      `No se pudieron obtener las variantes de ${species}:`,
      error
    )
    cachedSpeciesVariants.set(species, [])
    return []
  }
}

/**
 * Pokémon Essentials guarda la forma como un índice entero (@form).
 * En PokeAPI las variantes de una especie están expuestas mediante
 * pokemon-species.varieties. Para una forma 0 usamos la variante marcada
 * como default; para las siguientes usamos el mismo índice dentro de
 * varieties.
 */
async function resolvePokemonApiInfo(
  species: string,
  form: number,
  pokemonMap: Map<string, number>
): Promise<PokemonApiInfo | null> {
  if (!pokemonMap.has(species)) {
    return null
  }

  const variants = await getSpeciesVariants(species)

  if (variants.length > 0) {
    const responseIndex = Math.max(0, form)

    if (variants[responseIndex]) {
      return variants[responseIndex]
    }

    // Fallback por si el índice de la partida no coincide con el orden
    // de PokeAPI: primero intentamos la variante cuyo nombre empiece
    // por la especie.
    const fallback = variants.find(v =>
      v.name === species || v.name.startsWith(`${species}-`)
    )

    if (fallback) {
      return fallback
    }
  }

  const baseId = pokemonMap.get(species)

  return baseId
    ? { name: species, id: baseId }
    : null
}

function getIvar(obj: any, name: string): any {
  if (!obj || typeof obj !== 'object') {
    return undefined
  }

  for (const symbol of Object.getOwnPropertySymbols(obj)) {
    if (symbol.description === name) {
      return obj[symbol]
    }
  }

  return obj[name]
}

const DON_PRODIGIO_MAP_ROUTES: Record<number, string> = {
  11: 'Don Prodigio Monte Moon',
  59: 'Don Prodigio SS ANNE',
  78: 'Don Prodigio Centro Comercial',
  116: 'Don Prodigio Isla Canela',
  145: 'Don Prodigio Estación Magnetotrén',
  149: 'Don Prodigio Zona Safari',
  166: 'Don Prodigio Ruta 25 Norte',
  214: 'Don Prodigio Almacén Rocket'
}

function normalizeTrainerName(value: any): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function isDonProdigio(
  originalTrainerName: string | null,
  originalTrainerId: number | null
): boolean {
  // En la Partida 1.rxdata comprobamos que los Pokémon de Don Prodigio
  // llevan @owner.@name = "Don Prodigio" y @owner.@id = 1204.
  return (
    normalizeTrainerName(originalTrainerName) === 'don prodigio' ||
    originalTrainerId === 1204
  )
}

function resolveSpecialRoute(
  obtainMap: number,
  obtainMethod: number,
  obtainLevel: number | null,
  randomized: boolean,
  originalTrainerName: string | null,
  originalTrainerId: number | null
): string | null {
  /*
   * EVENTOS ESPECIALES DE AÑIL 4.1
   *
   * La prioridad es identificar el ORIGEN real del Pokémon.
   * Para Don Prodigio usamos el Entrenador Original (Pokemon::Owner),
   * que es mucho más fiable que mirar la especie porque el randomizer
   * puede convertir el Pokémon recibido en cualquier otra especie.
   *
   * En la Partida 1.rxdata comprobamos:
   *   @owner.@name = "Don Prodigio"
   *   @owner.@id   = 1204
   *   @obtain_method = 2
   *
   * El mapa determina qué Don Prodigio concreto fue utilizado.
   */
  if (
    obtainMethod === 2 &&
    isDonProdigio(originalTrainerName, originalTrainerId)
  ) {
    return DON_PRODIGIO_MAP_ROUTES[obtainMap] ?? 'Don Prodigio'
  }

  // Magikarp especial de Map070.
  // El evento original ejecuta pbAddPokemon(:MAGIKARP, 5), pero con el
  // randomizer la especie guardada puede ser completamente distinta.
  // Por eso NO comprobamos species === 'magikarp'.
  if (obtainMap === 70 && obtainMethod !== 2) {
    return 'Magikarp'
  }

  // Eevee regalo: Map080.
  // El Pokémon puede estar randomizado, así que no comprobamos su especie.
  if (obtainMap === 80) {
    return 'Eevee'
  }

  // Lapras regalo: Map102.
  // Igual que Eevee, la especie resultante puede haber sido randomizada.
  if (obtainMap === 102 && obtainMethod === 4) {
    return 'Lapras'
  }

  /*
   * Pikachu:
   * La recompensa de la misión queda registrada en Ciudad Plateada
   * (Map009). En la Partida 1.rxdata comprobamos que Borjamari, que es
   * el Pikachu de la misión ya evolucionado a Quaxwell, conserva:
   *   @obtain_map    = 9
   *   @obtain_method = 0
   *   @obtain_level  = 10
   *   @randomized    = true
   *
   * Por eso la condición anterior (method = 4) nunca podía reconocerlo.
   *
   * Map009 también tiene Pokémon salvajes. En el save comprobado el otro
   * Pokémon de esa zona tiene @obtain_level = 11, así que usamos el nivel
   * de obtención 10 como dato adicional para separar la recompensa del
   * encuentro salvaje en esta versión.
   */
  if (
    obtainMap === 9 &&
    obtainMethod === 0 &&
    obtainLevel === 10 &&
    randomized
  ) {
    return 'Pikachu'
  }

  return null
}

function getHashValue(obj: any, key: string): any {
  if (!obj || typeof obj !== 'object') {
    return undefined
  }

  if (obj[key] !== undefined) {
    return obj[key]
  }

  for (const symbol of Object.getOwnPropertySymbols(obj)) {
    if (symbol.description === key) {
      return obj[symbol]
    }
  }

  return undefined
}

function symbolName(value: any): string | null {
  if (typeof value === 'symbol') {
    return value.description ?? null
  }

  return typeof value === 'string'
    ? value
    : null
}

function numberValue(value: any): number | null {
  return typeof value === 'number' &&
    Number.isFinite(value)
    ? value
    : null
}

function normalizeSpecies(value: any): string {
  if (typeof value === 'number') {
    const pokemonZSpecies = POKEMON_Z_SPECIES_BY_ID[value]
    if (pokemonZSpecies) {
      return pokemonZSpecies
    }

    return cachedPokemonNameMap?.get(value) ?? String(value)
  }

  return (
    symbolName(value) ??
    String(value ?? '')
  )
    .trim()
    .toLowerCase()
}

function normalizeAbility(value: any): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const name = symbolName(value)

  return name
    ? name.toLowerCase()
    : String(value).toLowerCase()
}

function getPokemonAbility(
  pokemon: any,
  speciesRaw: unknown,
  globalMetadata: any
): string | null {
  if (typeof speciesRaw !== 'number') {
    return normalizeAbility(
      getIvarFromNames(pokemon, ['@ability', '@abilityID', '@abilityId'])
    )
  }

  const slots = pokemonZAbilities[String(speciesRaw)]
  if (!slots) {
    return normalizeAbility(
      getIvarFromNames(pokemon, ['@ability', '@abilityID', '@abilityId'])
    )
  }

  const abilityFlag = numberValue(getIvar(pokemon, '@abilityflag'))
  const personalId = numberValue(getIvar(pokemon, '@personalID'))
  const abilityIndex = abilityFlag ?? (personalId === null ? null : personalId & 1)
  if (abilityIndex === null) {
    return null
  }

  const form = numberValue(getIvar(pokemon, '@form')) ?? 0
  const abilityMode = symbolName(
    getIvar(globalMetadata, '@random_ability_mode')
  )

  if (abilityMode === 'FULL_RANDOM_ABS') {
    const randomizedAbilities = getHashValue(
      getHashValue(
        getIvar(globalMetadata, '@random_abs_pokemon'),
        String(speciesRaw)
      ),
      String(form)
    ) ?? getHashValue(
      getHashValue(
        getIvar(globalMetadata, '@random_abs_pokemon'),
        String(speciesRaw)
      ),
      '0'
    )

    if (Array.isArray(randomizedAbilities)) {
      const ability = randomizedAbilities.find(
        (entry) =>
          Array.isArray(entry) &&
          numberValue(entry[1]) === abilityIndex
      )
      const randomizedAbilityId = Array.isArray(ability)
        ? numberValue(ability[0])
        : null

      if (randomizedAbilityId !== null) {
        return String(randomizedAbilityId)
      }
    }
  }

  const fallbackIndex = abilityIndex >= 2 && personalId !== null
    ? personalId & 1
    : abilityIndex
  const baseAbilityId = slots[abilityIndex] ??
    slots[fallbackIndex] ??
    slots[0] ??
    null

  if (baseAbilityId === null) {
    return null
  }

  if (abilityMode === 'MAP_RANDOM_ABS') {
    const randomizedAbilityId = numberValue(
      getHashValue(
        getIvar(globalMetadata, '@ability_hash'),
        String(baseAbilityId)
      )
    )

    if (randomizedAbilityId !== null) {
      return String(randomizedAbilityId)
    }
  }

  return String(baseAbilityId)
}

function normalizeNickname(value: any): string | null {
  const nickname = value instanceof Uint8Array
    ? new TextDecoder().decode(value).trim()
    : typeof value === 'string'
      ? value.trim()
      : ''

  return nickname.length > 0
    ? nickname
    : null
}

function getIvarFromNames(obj: unknown, names: readonly string[]): unknown {
  for (const name of names) {
    const value = getIvar(obj, name)
    if (value !== undefined) {
      return value
    }
  }

  return undefined
}

async function extractPokemon(
  pokemon: any,
  isTeam: boolean,
  pokemonMap: Map<string, number>,
  globalMetadata: any
): Promise<PokemonSaveData | null> {
  if (!pokemon) {
    return null
  }

  const speciesRaw = getIvar(pokemon, '@species')
  const personalIDRaw = getIvar(pokemon, '@personalID')

  if (
    speciesRaw === undefined ||
    personalIDRaw === undefined
  ) {
    return null
  }

  const species = normalizeSpecies(speciesRaw)

  if (!species) {
    return null
  }

  // Este campo existe realmente en el save de Pokémon Añil 4.1.
  // Ejemplo comprobado en Partida 1.rxdata: Toxtricity tiene @form = 0.
  const form = numberValue(getIvar(pokemon, '@form')) ?? 0

  const apiInfo = await resolvePokemonApiInfo(
    species,
    form,
    pokemonMap
  )

  const obtainMapRaw = getIvarFromNames(pokemon, [
    '@obtain_map',
    '@obtainMap'
  ])
  const obtainMap = numberValue(obtainMapRaw) ?? 0

  const obtainMethodRaw = getIvarFromNames(pokemon, [
    '@obtain_method',
    '@obtainMethod',
    '@obtainMode'
  ])
  const obtainMethod = numberValue(obtainMethodRaw) ?? 0

  const obtainLevel = numberValue(
    getIvar(pokemon, '@obtain_level')
  )

  const owner = getIvar(pokemon, '@owner')
  const originalTrainerName = normalizeNickname(
    getIvar(owner, '@name') ?? getIvar(pokemon, '@ot')
  )
  const originalTrainerId = numberValue(
    getIvar(owner, '@id') ?? getIvar(pokemon, '@trainerID')
  )

  // El randomizer de Pokémon Añil guarda @randomized en el propio Pokémon.
  // Es true cuando la especie original fue sustituida por el randomizer.
  const randomized = getIvar(pokemon, '@randomized') === true

  const ruta =
    resolveSpecialRoute(
      obtainMap,
      obtainMethod,
      obtainLevel,
      randomized,
      originalTrainerName,
      originalTrainerId
    ) ??
    MAP_Z[String(obtainMap)] ??
    null

  return {
    species,
    form,
    pokemonId: apiInfo?.id ?? null,
    // Para variantes guardamos el nombre de la variante de PokeAPI.
    // Ej.: toxtricity-amped / toxtricity-low-key.
    pokemonName: apiInfo?.name ?? species,
    personalID: String(personalIDRaw),
    obtainMap,
    obtainMethod,
    randomized,
    ruta,
    shiny: getIvar(pokemon, '@shiny') === true,
    ability: getPokemonAbility(pokemon, speciesRaw, globalMetadata),
    level: numberValue(getIvar(pokemon, '@level')),
    obtainLevel,
    nickname: normalizeNickname(getIvar(pokemon, '@name')),
    isTeam,
    originalTrainerName,
    originalTrainerId
  }
}

export async function parseRxDataSave(
  file: File
): Promise<{
  trainerId: string
  trainerName: string
  pokemon: PokemonSaveData[]
  unknownMapIds: number[]
  unknownMapPokemon: UnknownMapPokemon[]
  hasStorage: boolean
}> {
  const pokemonMap = await getPokemonIdMap()
  const buffer = await file.arrayBuffer()
  const saveObjects = loadAll(buffer)
  const save: any = saveObjects[0]
  const globalMetadata = saveObjects[11]

  const player = getHashValue(save, 'player') ??
    (getIvar(save, '@id') !== undefined &&
      Array.isArray(getIvar(save, '@party'))
      ? save
      : undefined)

  if (!player) {
    throw new Error(
      'No se encontró el jugador dentro de la partida.'
    )
  }

  const trainerIdValue = getIvar(player, '@id')
  const trainerNameValue = getIvar(player, '@name')
  const trainerId = String(trainerIdValue ?? '')
  const trainerName = normalizeNickname(trainerNameValue) ?? ''

  if (!trainerId) {
    throw new Error(
      'No se pudo encontrar el ID del entrenador.'
    )
  }

  const result: PokemonSaveData[] = []

  const party = getIvar(player, '@party')

  if (Array.isArray(party)) {
    for (const pokemon of party) {
      const extracted = await extractPokemon(
        pokemon,
        true,
        pokemonMap,
        globalMetadata
      )

      if (extracted) {
        result.push(extracted)
      }
    }
  }

  const storageSystem = saveObjects[14] ?? getHashValue(save, 'storage_system')
  let hasStorage = false

  if (storageSystem) {
    const boxes = getIvar(storageSystem, '@boxes')

    if (Array.isArray(boxes)) {
      hasStorage = true
      for (const box of boxes) {
        if (!box) {
          continue
        }

        const pokemonArray = getIvar(box, '@pokemon')

        if (!Array.isArray(pokemonArray)) {
          continue
        }

        for (const pokemon of pokemonArray) {
          const extracted = await extractPokemon(
            pokemon,
            false,
            pokemonMap,
            globalMetadata
          )

          if (extracted) {
            result.push(extracted)
          }
        }
      }
    }
  }

  const unique = new Map<string, PokemonSaveData>()

  for (const pokemon of result) {
    const key = `${trainerId}:${pokemon.personalID}`

    if (!unique.has(key)) {
      unique.set(key, pokemon)
    }
  }

  const pokemonUnicos = Array.from(unique.values())

  const unknownMapIdsSet = new Set<number>()
  const unknownMapPokemon: UnknownMapPokemon[] = []

  for (const pokemon of pokemonUnicos) {
    if (
      pokemon.ruta === null &&
      pokemon.obtainMap > 0
    ) {
      unknownMapIdsSet.add(pokemon.obtainMap)

      unknownMapPokemon.push({
        mapId: pokemon.obtainMap,
        pokemonName: pokemon.pokemonName,
        personalID: pokemon.personalID
      })
    }
  }

  const unknownMapIds = Array.from(unknownMapIdsSet).sort(
    (a, b) => a - b
  )

  return {
    trainerId,
    trainerName,
    pokemon: pokemonUnicos,
    unknownMapIds,
    unknownMapPokemon,
    hasStorage
  }
}
