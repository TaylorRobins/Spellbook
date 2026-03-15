export type Tradition = 'arcane' | 'divine' | 'occult' | 'primal'

export type School =
  | 'abjuration'
  | 'conjuration'
  | 'divination'
  | 'enchantment'
  | 'evocation'
  | 'illusion'
  | 'necromancy'
  | 'transmutation'

export interface HeightenedEffect {
  level: string
  effect: string
}

export interface Spell {
  id: number
  name: string
  level: number
  traditions: Tradition[]
  school: School
  cast_time: string
  components: string
  range: string
  area: string
  duration: string
  saving_throw: string
  description: string
  heightened_effects: HeightenedEffect[]
  is_favorite: boolean
}

export interface SpellRow {
  id: number
  name: string
  level: number
  traditions: string
  school: string
  cast_time: string
  components: string
  range: string
  area: string
  duration: string
  saving_throw: string
  description: string
  heightened_effects: string
  is_favorite: 0 | 1
}

export function parseSpell(row: SpellRow): Spell {
  return {
    ...row,
    school: row.school as School,
    traditions: row.traditions
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean) as Tradition[],
    heightened_effects: JSON.parse(row.heightened_effects || '[]') as HeightenedEffect[],
    is_favorite: row.is_favorite === 1
  }
}

export type SidebarView =
  | { type: 'all' }
  | { type: 'tradition'; tradition: Tradition }
  | { type: 'level'; level: number }
  | { type: 'spellbook' }
