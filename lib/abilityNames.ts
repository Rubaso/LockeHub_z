import abilityNames from './ability-names.es.json'

const spanishBySlug = abilityNames.bySlug as Record<string, string>
const spanishById = abilityNames.byId as Record<string, string>

export function abilityNameInSpanish(value: string | null | undefined) {
  const original = value?.trim()
  if (!original || original === '—') return '—'

  if (/^\d+$/.test(original) && spanishById[original]) {
    return spanishById[original]
  }

  const slug = original
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return spanishBySlug[slug] ?? original
}
