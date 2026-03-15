import { useState, useEffect, useCallback } from 'react'
import type { SidebarView, Spell } from '../types/spell'
import { parseSpell } from '../types/spell'
import type { SpellRow } from '../types/spell'

export function useSpells(view: SidebarView, search: string) {
  const [spells, setSpells] = useState<Spell[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (view.type === 'spellbook') {
      setSpells([])
      setLoading(false)
      return
    }

    setLoading(true)

    const filters: Record<string, unknown> = {}
    if (search) filters.search = search
    if (view.type === 'tradition') filters.tradition = view.tradition
    if (view.type === 'level') filters.level = view.level

    window.api
      .getSpells(filters as Parameters<typeof window.api.getSpells>[0])
      .then((rows: SpellRow[]) => {
        setSpells(rows.map(parseSpell))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [view, search])

  const toggleFavorite = useCallback(
    async (id: number): Promise<boolean> => {
      const nowFavorited = await window.api.toggleFavorite(id)
      setSpells((prev) => {
        return prev.map((s) => (s.id === id ? { ...s, is_favorite: nowFavorited } : s))
      })
      return nowFavorited
    },
    []
  )

  return { spells, loading, toggleFavorite }
}
