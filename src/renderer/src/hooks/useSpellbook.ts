import { useState, useEffect, useCallback, useMemo } from 'react'
import type { CharacterSpell, CharacterSpellRow } from '../types/character'
import { parseCharacterSpell } from '../types/character'

export function useSpellbook(characterId: number | null) {
  const [characterSpells, setCharacterSpells] = useState<CharacterSpell[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (characterId === null) {
      setCharacterSpells([])
      setLoading(false)
      return
    }
    setLoading(true)
    window.api
      .getCharacterSpells(characterId)
      .then((rows: CharacterSpellRow[]) => {
        setCharacterSpells(rows.map(parseCharacterSpell))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [characterId])

  const spellbookIds = useMemo(() => new Set(characterSpells.map((s) => s.id)), [characterSpells])

  const addSpell = useCallback(
    async (spellId: number) => {
      if (characterId === null) return
      await window.api.addSpellToCharacter(characterId, spellId)
      const rows: CharacterSpellRow[] = await window.api.getCharacterSpells(characterId)
      setCharacterSpells(rows.map(parseCharacterSpell))
    },
    [characterId]
  )

  const removeSpell = useCallback(
    async (spellId: number) => {
      if (characterId === null) return
      await window.api.removeSpellFromCharacter(characterId, spellId)
      setCharacterSpells((prev) => prev.filter((s) => s.id !== spellId))
    },
    [characterId]
  )

  const togglePrepared = useCallback(
    async (spellId: number) => {
      if (characterId === null) return
      const nowPrepared = await window.api.toggleSpellPrepared(characterId, spellId)
      setCharacterSpells((prev) =>
        prev.map((s) => (s.id === spellId ? { ...s, is_prepared: nowPrepared } : s))
      )
    },
    [characterId]
  )

  const setFavoriteStatus = useCallback((spellId: number, val: boolean) => {
    setCharacterSpells((prev) =>
      prev.map((s) => (s.id === spellId ? { ...s, is_favorite: val } : s))
    )
  }, [])

  return {
    characterSpells,
    loading,
    spellbookIds,
    addSpell,
    removeSpell,
    togglePrepared,
    setFavoriteStatus,
  }
}
