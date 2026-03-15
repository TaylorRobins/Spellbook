import { parseSpell } from './spell'
import type { Spell, SpellRow } from './spell'

export interface Character {
  id: number
  name: string
  class: string
  level: number
  tradition: string
}

export interface CharacterSpellRow extends SpellRow {
  is_prepared: 0 | 1
  slot_level: number | null
}

export interface CharacterSpell extends Spell {
  is_prepared: boolean
  slot_level: number | null
}

export function parseCharacterSpell(row: CharacterSpellRow): CharacterSpell {
  const { is_prepared, slot_level, ...spellRow } = row
  return {
    ...parseSpell(spellRow),
    is_prepared: is_prepared === 1,
    slot_level,
  }
}
