import { useState, useEffect, useCallback } from 'react'
import type { Character } from '../types/character'

const STORAGE_KEY = 'activeCharacterId'

export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [activeCharacterIdState, setActiveCharacterIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? parseInt(stored, 10) : null
  })

  useEffect(() => {
    window.api.getCharacters().then(setCharacters)
  }, [])

  useEffect(() => {
    if (characters.length === 0) return
    if (activeCharacterIdState === null || !characters.find((c) => c.id === activeCharacterIdState)) {
      const first = characters[0]
      if (first) setActiveCharacterIdState(first.id)
    }
  }, [characters])

  const setActiveCharacterId = useCallback((id: number) => {
    setActiveCharacterIdState(id)
    localStorage.setItem(STORAGE_KEY, String(id))
  }, [])

  const createCharacter = useCallback(async (data: Omit<Character, 'id'>) => {
    const created = await window.api.createCharacter(data)
    setCharacters((prev) => [...prev, created])
    setActiveCharacterId(created.id)
    return created
  }, [setActiveCharacterId])

  const updateCharacter = useCallback(async (id: number, data: Partial<Omit<Character, 'id'>>) => {
    const updated = await window.api.updateCharacter(id, data)
    if (updated) {
      setCharacters((prev) => prev.map((c) => (c.id === id ? updated : c)))
    }
    return updated
  }, [])

  const deleteCharacter = useCallback(
    async (id: number) => {
      await window.api.deleteCharacter(id)
      setCharacters((prev) => {
        const next = prev.filter((c) => c.id !== id)
        if (id === activeCharacterIdState) {
          const nextActive = next[0] ?? null
          if (nextActive) {
            setActiveCharacterId(nextActive.id)
          } else {
            setActiveCharacterIdState(null)
            localStorage.removeItem(STORAGE_KEY)
          }
        }
        return next
      })
    },
    [activeCharacterIdState, setActiveCharacterId]
  )

  const activeCharacter = characters.find((c) => c.id === activeCharacterIdState) ?? null

  return {
    characters,
    activeCharacterId: activeCharacterIdState,
    activeCharacter,
    setActiveCharacterId,
    createCharacter,
    updateCharacter,
    deleteCharacter,
  }
}
