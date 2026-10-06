const NATURE_NAMES = [
  'HARDY', 'LONELY', 'BRAVE', 'ADAMANT', 'NAUGHTY',
  'BOLD', 'DOCILE', 'RELAXED', 'IMPISH', 'LAX',
  'TIMID', 'HASTY', 'SERIOUS', 'JOLLY', 'NAIVE',
  'MODEST', 'MILD', 'QUIET', 'BASHFUL', 'RASH',
  'CALM', 'GENTLE', 'SASSY', 'CAREFUL', 'QUIRKY',
] as const

function natureId(value: unknown): number | null {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : null
  return parsed !== null && Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : null
}

export function natureFromId(value: unknown): string | null {
  const id = natureId(value)
  return id !== null && id < NATURE_NAMES.length ? NATURE_NAMES[id] : null
}

export function natureFromPersonalId(value: unknown): string | null {
  const personalId = natureId(value)
  return personalId === null
    ? null
    : NATURE_NAMES[personalId % NATURE_NAMES.length]
}
