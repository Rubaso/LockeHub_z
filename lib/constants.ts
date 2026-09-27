import type { Player, Tramo } from './types'

export const APP_NAME = 'LockeHub'
export const EVENT_NAME = 'Pokemon Z Locke 2026'
export const SALA_ID = 'anil-locke-2026'
export const SESSION_KEY = 'lockehub_session'
export const SETTINGS_KEY = 'lockehub_settings'
export const CAPTURAS_UPDATED_EVENT = 'lockehub-capturas-updated'
export const ORGANIZER_PLAYER_ID = 1

export function notifyCapturasUpdated() {
  window.dispatchEvent(new Event(CAPTURAS_UPDATED_EVENT))
}

export const PLAYERS: Player[] = [
  { id: 1, name: "Rubaso", twitchUser: "", color: "#5ec4a0" },
  { id: 2, name: "Ciaran", twitchUser: "", color: "#5ec4a0" },
  { id: 3, name: "Senapi", twitchUser: "", color: "#5ec4a0" },
  { id: 4, name: "Ferrox", twitchUser: "", color: "#5ec4a0" },
  { id: 5, name: "Malza", twitchUser: "", color: "#5ec4a0" },
  { id: 6, name: "Fyros", twitchUser: "", color: "#5ec4a0" },
  { id: 7, name: "Finghin", twitchUser: "", color: "#5ec4a0" },
  { id: 8, name: "Doorman", twitchUser: "", color: "#5ec4a0" },
  { id: 9, name: "Traint​", twitchUser: "", color: "#5ec4a0" },
  { id: 10, name: "Coca", twitchUser: "", color: "#5ec4a0" },
  { id: 11, name: "Manguera", twitchUser: "", color: "#5ec4a0" },
  { id: 12, name: "Raisa", twitchUser: "", color: "#5ec4a0" },
  { id: 13, name: "Sebas", twitchUser: "", color: "#5ec4a0" },
  { id: 14, name: "Skoll", twitchUser: "", color: "#5ec4a0" },
]

export function sortPlayers(players: Player[], loggedId: number | null) {
  if (!loggedId) return players

  const mine = players.find((player) => player.id === loggedId)
  const rest = players.filter((player) => player.id !== loggedId)

  return mine ? [mine, ...rest] : players
}

export const TRAMOS: Tramo[] = [
  { id: 1, title: 'Tramo UNO (1)', leader: 'Canola', leaderSprite: 'sprites/lideres/canola.png' },
  { id: 2, title: 'Tramo DOS (2)', leader: 'Hisopo', leaderSprite: 'sprites/lideres/hisopo.png' },
  { id: 3, title: 'Tramo TRES (3)', leader: 'F3', leaderSprite: ' sprites/lideres/f3.png' },
  { id: 4, title: 'Tramo CUATRO (4)', leader: 'Zafra', leaderSprite: 'sprites/lideres/zafra.png' },
  { id: 5, title: 'Tramo CINCO (5)', leader: 'Clavelina', leaderSprite: 'sprites/lideres/clavelina.png' },
  { id: 6, title: 'Tramo SEIS (6)', leader: 'Belladona', leaderSprite: 'sprites/lideres/belladona.png' },
  { id: 7, title: 'Tramo SIETE (7)', leader: 'Hibis', leaderSprite: 'sprites/lideres/hibis.png' },
  { id: 8, title: 'Tramo OCHO (8)', leader: 'Anturia', leaderSprite: 'sprites/lideres/anturia.png' },
  { id: 9, title: 'Tramo NUEVE (9)', leader: 'Rúpico', leaderSprite: 'sprites/lideres/rupico.png' },
  { id: 10, title: 'Tramo DIEZ (10)', leader: 'Cendera', leaderSprite: 'sprites/lideres/cendera.png' },
  { id: 11, title: 'Tramo ONCE (11)', leader: '¿?', leaderSprite: 'sprites/lideres/tramo11.png' },
  { id: 12, title: 'Tramo DOCE (12)', leader: '¿?', leaderSprite: 'sprites/lideres/tramo12.png' },
]

export const ROUTES = [
  // Tramo 1 — Inicio → Canola
  'Ruta 1',
  'Ruta 2',
  'Bosque Ladera',
  'Cueva Grisalla',

  // Tramo 2 — Canola → Hisopo
  'Ruta 3',
  'Ruta 4',
  'Cueva Lóbrega',
  'Bosque Errante',

  // Tramo 3 — Hisopo → F3
  'Ruta 5',
  'Ruta 6',
  'Cueva Psique',
  'Cueva Refulgente',

  // Tramo 4 — F3 → Zafra
  'Ruta 7 Norte',
  'Ruta 7 Sur',
  'Ruta 8 Este',
  'Ruta 8 Oeste',
  'Cueva Talasia',
  'Cueva de la Cascada',

  // Tramo 5 — Zafra → Clavelina
  'Ruta 9',
  'Ruta 10',
  'Cueva de los Reflejos',
  'Cueva Desenlace',
  'Gruta Helada',

  // Tramo 6 — Clavelina → Belladona
  'Ruta 11',
  'Ruta 12',
  'Ruta 13',
  'Catacumbas Meridionales',
  'Catacumbas Occidentales',
  'Pantano Profano',

  // Tramo 7 — Belladona → Fortunia
  'Ruta 14',
  'Ruta 15',
  'Ruta 16',
  'Catacumbas Orientales',
  'Catacumbas Septentrionales',
  'Gruta Tierraunida',

  // Tramo 8 — Fortunia → Anturia
  'Ruta 17',
  'Ruta 18',
  'Ruta 19',
  'Costa Sanguina',
  'Bahía Azul',
  'Fondo Marino',

  // Tramo 9 — Anturia → Rúpico
  'Ruta 20',
  'Ruta 21',
  'Isla Certijo',
  'Isla Montesanto',
  'Fondo del Lago',
  'Maraña Oscura',

  // Tramo 10 — Rúpico → Cendera
  'Ruta 22',
  'Ruta 23',
  'Colina de Tormenta',
  'Pirineos de Kalos',
  'Huerto Vánitas',
  'Manantial Profundo',

  // Tramo 11 — Cendera → Gimnasio 11
  'Ruta 24',
  'Ruta 25',
  'Petrocueva',
  'Madriguera Profunda',
  'Sima Ardiente',
  'Santuario de los Reyes',

  // Tramo 12 — Gimnasio 11 → Final
  'Ruta 26',
  'Cámara Druídica',
  'Santuario Prosperidad',
  'Viejo Vánitas',
  'Torre Oscura',
  'Torre Oscura P0',
  'Torre Oscura P1',
  'Torre Oscura P2',
  'Torre Oscura P3',
]

export const NAV_LINKS = [
  { href: '/inicio', label: 'Inicio' },
  { href: '/jugadores', label: 'Jugadores' },
  { href: '/rutas', label: 'Rutas' },
  { href: '/tramos', label: 'Tramos' },
  { href: '/torneo', label: 'Torneo' },
]
